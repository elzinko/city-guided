import { FastifyRequest, FastifyReply } from 'fastify'
import type { ExtendedPoiRepository, ZoneRepository, ExtendedPoi } from '../persistence/prisma-poi-repo'
import { getOverpassService, type ImportedPoi } from '../external/overpass'
import { getWikidataService } from '../external/wikidata'
import { getWikipediaService } from '../external/wikipedia'
import { getOllamaService, PLAYBACK_MODES } from '../external/ollama'

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
      // 1. Récupérer les POIs depuis Overpass (OpenStreetMap)
      status.status = 'fetching'
      const overpassService = getOverpassService()
      const osmPois = await overpassService.getPoisByRadius(lat, lng, radiusKm)
      status.total = osmPois.length

      if (osmPois.length === 0) {
        status.status = 'completed'
        status.completedAt = new Date()
        return
      }

      // 2. Enrichir avec Wikidata (descriptions courtes, images)
      status.status = 'enriching'
      const wikidataService = getWikidataService()
      const wikidataIds = osmPois
        .filter(p => p.wikidataId)
        .map(p => p.wikidataId!)
      
      let wikidataMap = new Map<string, { description: string | null; imageUrl: string | null; wikipediaUrl: string | null }>()
      
      if (wikidataIds.length > 0) {
        wikidataMap = await wikidataService.enrichPoisBatch(
          wikidataIds,
          (current, total) => {
            status.progress = Math.floor((current / total) * 25)
          }
        )
      }

      // 3. Enrichir avec Wikipedia (contenu complet pour audio)
      const wikipediaService = getWikipediaService()
      const wikipediaMap = await wikipediaService.enrichPoisBatch(
        wikidataIds,
        'fr', // Préférer le français
        (current, total) => {
          status.progress = 25 + Math.floor((current / total) * 50)
        }
      )

      // 4. Sauvegarder en base
      status.status = 'saving'
      const poisToSave: Array<Omit<ExtendedPoi, 'id'>> = osmPois.map((poi: ImportedPoi) => {
        const wikidata = poi.wikidataId ? wikidataMap.get(poi.wikidataId) : null
        const wikipedia = poi.wikidataId ? wikipediaMap.get(poi.wikidataId) : null
        
        return {
          name: poi.name,
          lat: poi.lat,
          lng: poi.lng,
          radiusMeters: 50,
          category: poi.category,
          shortDescription: wikidata?.description || '',
          // Store OSM data instead of OTM
          otmId: poi.osmId, // Reusing field for OSM ID
          otmKinds: poi.osmTags, // Reusing field for OSM tags
          otmRate: null, // OSM doesn't have ratings
          wikidataId: poi.wikidataId,
          wikidataDescription: wikidata?.description,
          imageUrl: wikidata?.imageUrl,
          wikipediaUrl: wikipedia?.url || poi.wikipediaUrl || wikidata?.wikipediaUrl,
          wikipediaContent: wikipedia?.content || null,
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

  // === AUDIO GUIDE GENERATION ===

  async function checkOllamaStatus(_req: FastifyRequest, reply: FastifyReply) {
    const ollama = getOllamaService()
    
    try {
      const available = await ollama.isAvailable()
      if (!available) {
        return reply.send({ 
          available: false, 
          error: 'Ollama not reachable',
          url: process.env.OLLAMA_URL || 'http://localhost:11434'
        })
      }

      const models = await ollama.listModels()
      return reply.send({ 
        available: true, 
        models,
        currentModel: process.env.OLLAMA_MODEL || 'mistral:7b',
        playbackModes: PLAYBACK_MODES
      })
    } catch (error) {
      return reply.send({ 
        available: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async function generateAudioGuide(
    req: FastifyRequest<{ 
      Params: { id: string }
      Body?: { customPrompt?: string }
    }>, 
    reply: FastifyReply
  ) {
    if (!checkAdmin(req)) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const poiId = req.params.id
    const { customPrompt } = req.body || {}

    // Récupérer le POI (cast as ExtendedPoi car poiRepo est un ExtendedPoiRepository)
    const poi = await poiRepo.findById(poiId) as ExtendedPoi | null
    if (!poi) {
      return reply.status(404).send({ error: 'POI not found' })
    }

    // Vérifier qu'on a du contenu Wikipedia
    if (!poi.wikipediaContent) {
      return reply.status(400).send({ 
        error: 'POI has no Wikipedia content. Import data first.',
        poiName: poi.name 
      })
    }

    // Vérifier Ollama
    const ollama = getOllamaService()
    const available = await ollama.isAvailable()
    if (!available) {
      return reply.status(503).send({ 
        error: 'Ollama service not available',
        hint: 'Make sure Ollama is running: docker start city-guided-ollama'
      })
    }

    try {
      // Générer l'audio-guide
      console.log(`Generating audio guide for POI: ${poi.name}`)
      const result = await ollama.generateAudioGuide(
        poi.name,
        poi.wikipediaContent,
        poi.category,
        customPrompt
      )

      // Sauvegarder les segments en base
      await poiRepo.updateStorySegments(poiId, result.segments)

      // Générer aussi le ttsText complet (concaténation de tous les segments)
      const fullText = result.segments.map(s => s.content).join('\n\n')
      await poiRepo.updateTtsText(poiId, fullText)

      return reply.send({
        success: true,
        poiId,
        poiName: poi.name,
        segments: result.segments,
        totalDuration: result.totalDuration,
        model: result.model,
        generatedAt: result.generatedAt
      })
    } catch (error) {
      console.error('Error generating audio guide:', error)
      return reply.status(500).send({ 
        error: 'Failed to generate audio guide',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async function getPoiSegments(
    req: FastifyRequest<{ Params: { id: string } }>, 
    reply: FastifyReply
  ) {
    const poi = await poiRepo.findById(req.params.id) as ExtendedPoi | null
    if (!poi) {
      return reply.status(404).send({ error: 'POI not found' })
    }

    return reply.send({
      poiId: poi.id,
      poiName: poi.name,
      segments: poi.storySegments || [],
      ttsText: poi.ttsText,
      hasWikipediaContent: !!poi.wikipediaContent,
      playbackModes: PLAYBACK_MODES
    })
  }

  return {
    getZones,
    getZone,
    createZone,
    getZonePois,
    startImport,
    getImportStatus,
    checkOllamaStatus,
    generateAudioGuide,
    getPoiSegments,
  }
}
