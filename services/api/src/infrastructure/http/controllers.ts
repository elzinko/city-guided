import { distanceMeters } from '../geo/haversine'
import { FastifyRequest, FastifyReply } from 'fastify'
import { Poi, Category } from '@city-guided/domain'

interface PoiRepository {
  findAll(): Promise<Poi[]>
  findById(id: string): Promise<Poi | null>
  create(p: Omit<Poi, 'id'>): Promise<Poi>
  update(id: string, p: Partial<Poi>): Promise<Poi | null>
  delete(id: string): Promise<boolean>
}

interface GetNearbyPoisQuery {
  lat: string
  lng: string
  radius?: string
  category?: string
  q?: string
}

interface CreatePoiBody {
  name: string
  lat: number
  lng: number
  radiusMeters: number
  category: Category
  shortDescription: string
  ttsText?: string
}

interface UpdatePoiBody extends Partial<CreatePoiBody> {}

export function createPoiController({ poiRepo }: { poiRepo: PoiRepository }) {
  async function getNearbyPois(req: FastifyRequest<{ Querystring: GetNearbyPoisQuery }>, reply: FastifyReply) {
    const q = req.query
    const lat = Number(q.lat)
    const lng = Number(q.lng)
    const radiusRaw = q.radius
    const radius =
      radiusRaw === undefined || radiusRaw === null || String(radiusRaw).toLowerCase() === 'all'
        ? Infinity
        : Number(radiusRaw) // if NaN, filter below will drop everything by distance <= NaN
    const category = q.category

    const qText = q.q ? String(q.q).toLowerCase() : null
    const all = await poiRepo.findAll()
    const nearby = all
      .filter((p: any) => (category ? p.category === category : true))
      .map((p: any) => ({
        ...p,
        distanceMeters: distanceMeters(lat, lng, p.lat, p.lng),
      }))
      .filter((p: any) => (Number.isFinite(radius) ? p.distanceMeters <= radius : true))
      .filter((p: any) => {
        if (!qText) return true
        return (
          p.name.toLowerCase().includes(qText) ||
          p.shortDescription.toLowerCase().includes(qText) ||
          (p.ttsText && p.ttsText.toLowerCase().includes(qText))
        )
      })
      .sort((a: any, b: any) => a.distanceMeters - b.distanceMeters)

    return reply.send(nearby)
  }

  async function getPoiById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const p = await poiRepo.findById(req.params.id)
    if (!p) {
      return reply.status(404).send({ error: 'Not found' })
    }
    return reply.send(p)
  }

  async function proxyOsrmRoute(req: FastifyRequest, reply: FastifyReply) {
    const q = req.query as Record<string, string>
    const base = (process.env.OSRM_URL || 'http://localhost:5001').replace(/\/$/, '')
    const coords =
      q.coords ||
      (q.startLng !== undefined && q.startLat !== undefined && q.endLng !== undefined && q.endLat !== undefined
        ? `${q.startLng},${q.startLat};${q.endLng},${q.endLat}`
        : null)
    if (!coords) return reply.status(400).send({ error: 'coords or start/end required' })

    const url = new URL(`${base}/route/v1/driving/${coords}`)
    const allowParams = ['overview', 'geometries', 'steps', 'annotations', 'alternatives']
    allowParams.forEach((k) => {
      if (q[k] !== undefined) url.searchParams.set(k, String(q[k]))
    })
    // defaults if not provided
    if (!url.searchParams.has('overview')) url.searchParams.set('overview', 'full')
    if (!url.searchParams.has('geometries')) url.searchParams.set('geometries', 'geojson')
    if (!url.searchParams.has('steps')) url.searchParams.set('steps', 'true')
    if (!url.searchParams.has('annotations')) url.searchParams.set('annotations', 'distance,duration,speed')

    const res = await fetch(url.toString())
    if (!res.ok) return reply.status(res.status).send({ error: `OSRM ${res.status}` })
    const data = await res.json()
    return reply.send(data)
  }

  // Simple admin auth (token in X-ADMIN-TOKEN)
  function checkAdmin(req: FastifyRequest): boolean {
    const token = (req.headers as any)['x-admin-token']
    const expected = process.env.ADMIN_TOKEN || 'dev-secret'
    return token === expected
  }

  function validatePoiPayload(body: any): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!body) {
      errors._ = 'Body is required'
      return errors
    }
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      errors.name = 'Name is required'
    }
    if (typeof body.lat !== 'number' || Number.isNaN(body.lat) || body.lat < -90 || body.lat > 90) {
      errors.lat = 'Latitude must be a number between -90 and 90'
    }
    if (typeof body.lng !== 'number' || Number.isNaN(body.lng) || body.lng < -180 || body.lng > 180) {
      errors.lng = 'Longitude must be a number between -180 and 180'
    }
    if (typeof body.radiusMeters !== 'number' || Number.isNaN(body.radiusMeters) || body.radiusMeters <= 0) {
      errors.radiusMeters = 'radiusMeters must be a positive number'
    }
    const allowedCategories: Category[] = ['Monuments', 'Musees', 'Art', 'Insolite', 'Autre']
    if (!body.category || typeof body.category !== 'string' || !allowedCategories.includes(body.category as Category)) {
      errors.category = `category must be one of ${allowedCategories.join(', ')}`
    }
    if (!body.shortDescription || typeof body.shortDescription !== 'string') {
      errors.shortDescription = 'shortDescription is required'
    }
    // ttsText optional but if present must be string
    if (body.ttsText && typeof body.ttsText !== 'string') {
      errors.ttsText = 'ttsText must be a string'
    }
    return errors
  }

  async function createPoi(req: FastifyRequest<{ Body: CreatePoiBody }>, reply: FastifyReply) {
    if (!checkAdmin(req)) return reply.status(401).send({ error: 'Unauthorized' })
    const body = req.body
    const errors = validatePoiPayload(body)
    if (Object.keys(errors).length) return reply.status(400).send({ error: 'Invalid payload', details: errors })
    const created = await poiRepo.create(body)
    return reply.status(201).send(created)
  }

  async function updatePoi(req: FastifyRequest<{ Params: { id: string }; Body: UpdatePoiBody }>, reply: FastifyReply) {
    if (!checkAdmin(req)) return reply.status(401).send({ error: 'Unauthorized' })
    const id = req.params.id
    const body = req.body
    const errors = validatePoiPayload(body)
    if (Object.keys(errors).length) return reply.status(400).send({ error: 'Invalid payload', details: errors })
    const updated = await poiRepo.update(id, body)
    if (!updated) return reply.status(404).send({ error: 'Not found' })
    return reply.send(updated)
  }

  async function deletePoi(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    if (!checkAdmin(req)) return reply.status(401).send({ error: 'Unauthorized' })
    const id = req.params.id
    const ok = await poiRepo.delete(id)
    if (!ok) return reply.status(404).send({ error: 'Not found' })
    return reply.status(204).send()
  }

  return { getNearbyPois, getPoiById, proxyOsrmRoute, createPoi, updatePoi, deletePoi }
}
