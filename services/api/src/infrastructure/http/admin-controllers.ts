import { FastifyRequest, FastifyReply } from 'fastify'
import type { ExtendedPoiRepository, ZoneRepository, ExtendedPoi } from '../persistence/prisma-poi-repo'
import { getOpenTripMapService, type ImportedPoi } from '../external/opentripmap'
import { getWikidataService } from '../external/wikidata'

// État des imports en cours (en mémoire pour simplifier)
const importStatus = new Map<string, {
  zoneId: string
  status: 'pending' | 'fetching' | 'enriching' | 'saving' | 'completed' | 'error'
  progress: number
  total: number
  created: number
  updated: number
  error?: string
  startedAt: Date
  completedAt?: Date
}>()

interface CreateZoneBody {
  name: string
  lat: number
  lng: number
  radiusKm?: number
}

export function createAdminController({ 
  poiRepo, 
  zoneRepo 
}: { 
  poiRepo: ExtendedPoiRepository
  zoneRepo: ZoneRepository 
}) {
  
  // Simple admin auth
  function checkAdmin(req: FastifyRequest): boolean {
    const token = (req.headers as Record<string, string | undefined>)['x-admin-token']
    const expected = process.env.ADMIN_TOKEN || 'dev-secret'
    return token === expected
  }

  // === ZONES ===
  
  async function getZones(_req: FastifyRequest, reply: FastifyReply) {
    const zones = await zoneRepo.findAll()
    return reply.send(zones)
  }

  async function getZone(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const zone = await zoneRepo.findById(req.params.id)
    if (!zone) {
      return reply.status(404).send({ error: 'Zone not found' })
    }
    return reply.send(zone)
  }

  async function createZone(req: FastifyRequest<{ Body: CreateZoneBody }>, reply: FastifyReply) {
    if (!checkAdmin(req)) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const { name, lat, lng, radiusKm = 5 } = req.body

    if (!name || typeof lat !== 'number' || typeof lng !== 'number') {
      return reply.status(400).send({ error: 'name, lat, lng are required' })
    }

    // Vérifier si la zone existe déjà
    const existing = await zoneRepo.findByName(name)
    if (existing) {
      return reply.status(409).send({ error: 'Zone already exists', zone: existing })
    }

    const zone = await zoneRepo.create({ name, lat, lng, radiusKm })
    return reply.status(201).send(zone)
  }

  // === POIs par Zone ===

  async function getZonePois(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const zone = await zoneRepo.findById(req.params.id)
    if (!zone) {
      return reply.status(404).send({ error: 'Zone not found' })
    }

    const pois = await poiRepo.findByZone(req.params.id)
    return reply.send({ zone, pois })
  }

  // === IMPORT ===

  async function startImport(
    req: FastifyRequest<{ Params: { id: string } }>, 
    reply: FastifyReply
  ) {
    if (!checkAdmin(req)) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const zoneId = req.params.id
    const zone = await zoneRepo.findById(zoneId)
    
    if (!zone) {
      return reply.status(404).send({ error: 'Zone not found' })
    }

    // Vérifier si un import est déjà en cours
    const currentStatus = importStatus.get(zoneId)
    if (currentStatus && ['pending', 'fetching', 'enriching', 'saving'].includes(currentStatus.status)) {
      return reply.status(409).send({ 
        error: 'Import already in progress', 
        status: currentStatus 
      })
    }

    // Initialiser le statut
    const status = {
      zoneId,
      status: 'pending' as const,
      progress: 0,
      total: 0,
      created: 0,
      updated: 0,
      startedAt: new Date(),
    }
    importStatus.set(zoneId, status)

    // Lancer l'import en arrière-plan
    runImport(zoneId, zone.lat, zone.lng, zone.radiusKm).catch(err => {
      const s = importStatus.get(zoneId)
      if (s) {
        s.status = 'error'
        s.error = err.message
        s.completedAt = new Date()
      }
    })

    return reply.status(202).send({ 
      message: 'Import started', 
      statusUrl: `/api/admin/import/${zoneId}/status` 
    })
  }

  async function runImport(zoneId: string, lat: number, lng: number, radiusKm: number) {
    const status = importStatus.get(zoneId)!
    
    try {
      // 1. Récupérer les POIs depuis OpenTripMap
      status.status = 'fetching'
      const otmService = getOpenTripMapService()
      const otmPois = await otmService.getPoisByRadius(lat, lng, radiusKm)
      status.total = otmPois.length

      if (otmPois.length === 0) {
        status.status = 'completed'
        status.completedAt = new Date()
        return
      }

      // 2. Enrichir avec Wikidata
      status.status = 'enriching'
      const wikidataService = getWikidataService()
      const wikidataIds = otmPois
        .filter(p => p.wikidataId)
        .map(p => p.wikidataId!)
      
      const wikidataMap = await wikidataService.enrichPoisBatch(
        wikidataIds,
        (current, total) => {
          status.progress = Math.floor((current / total) * 50)
        }
      )

      // 3. Sauvegarder en base
      status.status = 'saving'
      const poisToSave: Array<Omit<ExtendedPoi, 'id'>> = otmPois.map((poi: ImportedPoi) => {
        const wikidata = poi.wikidataId ? wikidataMap.get(poi.wikidataId) : null
        
        return {
          name: poi.name,
          lat: poi.lat,
          lng: poi.lng,
          radiusMeters: 50,
          category: poi.category,
          shortDescription: poi.shortDescription || wikidata?.description || '',
          otmId: poi.otmId,
          otmKinds: poi.otmKinds,
          otmRate: poi.otmRate,
          wikidataId: poi.wikidataId,
          wikidataDescription: wikidata?.description,
          imageUrl: wikidata?.imageUrl,
          wikipediaUrl: wikidata?.wikipediaUrl,
        }
      })

      const result = await poiRepo.bulkUpsertFromImport(poisToSave, zoneId)
      status.created = result.created
      status.updated = result.updated
      status.progress = 100

      // Mettre à jour les stats de la zone
      await zoneRepo.updateImportStats(zoneId, result.created + result.updated)

      status.status = 'completed'
      status.completedAt = new Date()

    } catch (error) {
      status.status = 'error'
      status.error = error instanceof Error ? error.message : 'Unknown error'
      status.completedAt = new Date()
      throw error
    }
  }

  async function getImportStatus(
    req: FastifyRequest<{ Params: { id: string } }>, 
    reply: FastifyReply
  ) {
    const zoneId = req.params.id
    const status = importStatus.get(zoneId)
    
    if (!status) {
      return reply.status(404).send({ error: 'No import found for this zone' })
    }

    return reply.send(status)
  }

  return {
    getZones,
    getZone,
    createZone,
    getZonePois,
    startImport,
    getImportStatus,
  }
}
