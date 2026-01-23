/**
 * Service d'intégration OpenTripMap
 * https://opentripmap.io/docs
 * 
 * Limites: 5000 req/jour, recommandé max 10 req/sec
 */

import type { Category } from '@city-guided/domain'

// Types OpenTripMap
export interface OtmPoi {
  xid: string
  name: string
  dist?: number
  rate?: number // 1-7, qualité/importance
  osm?: string
  wikidata?: string
  kinds: string
  point: {
    lon: number
    lat: number
  }
}

export interface OtmPoiDetails extends OtmPoi {
  preview?: {
    source: string
    width: number
    height: number
  }
  wikipedia_extracts?: {
    title: string
    text: string
    html: string
  }
  info?: {
    descr?: string
    image?: string
    url?: string
  }
}

export interface ImportedPoi {
  otmId: string
  name: string
  lat: number
  lng: number
  category: Category
  shortDescription: string
  otmKinds: string[]
  otmRate: number | null
  wikidataId: string | null
}

// Catégories OpenTripMap à importer (tourisme, pas restaurants)
const TOURISM_KINDS = [
  'interesting_places',
  'architecture',
  'historic',
  'historic_architecture',
  'cultural',
  'museums',
  'religion',
  'natural',
  'natural_monuments',
  'view_points',
  'fountains',
  'monuments_and_memorials',
  'theatres_and_entertainments',
  'urban_environment',
]

// Mapping OpenTripMap kinds → Category interne
const KIND_TO_CATEGORY: Record<string, Category> = {
  'museums': 'Musees',
  'historic': 'Monuments',
  'historic_architecture': 'Monuments',
  'architecture': 'Monuments',
  'monuments_and_memorials': 'Monuments',
  'religion': 'Monuments',
  'cultural': 'Art',
  'theatres_and_entertainments': 'Art',
  'natural': 'Insolite',
  'natural_monuments': 'Insolite',
  'view_points': 'Insolite',
  'fountains': 'Insolite',
  'urban_environment': 'Autre',
  'interesting_places': 'Autre',
}

// Rate limiter simple (10 req/sec max)
class RateLimiter {
  private queue: Array<() => void> = []
  private processing = false
  private lastRequestTime = 0
  private minInterval = 100 // 100ms = 10 req/sec

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve)
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return
    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLast = now - this.lastRequestTime
      
      if (timeSinceLast < this.minInterval) {
        await this.sleep(this.minInterval - timeSinceLast)
      }
      
      this.lastRequestTime = Date.now()
      const resolve = this.queue.shift()
      resolve?.()
    }

    this.processing = false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export class OpenTripMapService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.opentripmap.com/0.1/en/places'
  private readonly rateLimiter = new RateLimiter()

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENTRIPMAP_API_KEY || process.env.SECRET_OPENTRIPMAP_API_KEY || ''
    if (!this.apiKey) {
      console.warn('OpenTripMap API key not configured. Set SECRET_OPENTRIPMAP_API_KEY env var.')
    }
  }

  /**
   * Récupère les POIs dans un rayon autour d'un point
   */
  async getPoisByRadius(
    lat: number,
    lng: number,
    radiusKm: number,
    options: { minRate?: number } = {}
  ): Promise<ImportedPoi[]> {
    const { minRate = 2 } = options
    const radiusMeters = radiusKm * 1000
    const kinds = TOURISM_KINDS.join(',')

    await this.rateLimiter.acquire()
    
    const url = `${this.baseUrl}/radius?radius=${radiusMeters}&lon=${lng}&lat=${lat}&kinds=${kinds}&rate=${minRate}&format=json&apikey=${this.apiKey}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`OpenTripMap API error: ${response.status} ${response.statusText}`)
    }

    const data: unknown = await response.json()
    
    // OpenTripMap retourne {} ou {error} au lieu d'un tableau vide quand pas de résultats
    if (!Array.isArray(data)) {
      const maybeError = data as { error?: string }
      if (maybeError.error) {
        throw new Error(`OpenTripMap API error: ${maybeError.error}`)
      }
      console.log('OpenTripMap returned no results (empty object)')
      return []
    }
    
    const pois = data as OtmPoi[]
    
    // Filtrer les POIs sans nom ou trop mal notés
    const validPois = pois.filter(poi => 
      poi.name && 
      poi.name.trim() !== '' &&
      poi.xid
    )

    return validPois.map(poi => this.mapToImportedPoi(poi))
  }

  /**
   * Récupère les détails d'un POI spécifique
   */
  async getPoiDetails(xid: string): Promise<OtmPoiDetails | null> {
    await this.rateLimiter.acquire()
    
    const url = `${this.baseUrl}/xid/${xid}?apikey=${this.apiKey}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`OpenTripMap API error: ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as OtmPoiDetails
  }

  /**
   * Import enrichi: récupère les POIs puis leurs détails
   */
  async importPoisWithDetails(
    lat: number,
    lng: number,
    radiusKm: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<ImportedPoi[]> {
    const pois = await this.getPoisByRadius(lat, lng, radiusKm)
    const enrichedPois: ImportedPoi[] = []

    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i]
      
      try {
        const details = await this.getPoiDetails(poi.otmId)
        
        if (details) {
          // Enrichir avec les détails
          const enriched: ImportedPoi = {
            ...poi,
            shortDescription: this.extractDescription(details),
          }
          enrichedPois.push(enriched)
        } else {
          enrichedPois.push(poi)
        }
      } catch (error) {
        console.error(`Error fetching details for ${poi.otmId}:`, error)
        enrichedPois.push(poi)
      }

      onProgress?.(i + 1, pois.length)
    }

    return enrichedPois
  }

  private mapToImportedPoi(poi: OtmPoi): ImportedPoi {
    const kinds = poi.kinds.split(',').map(k => k.trim())
    const category = this.determineCategory(kinds)

    return {
      otmId: poi.xid,
      name: poi.name,
      lat: poi.point.lat,
      lng: poi.point.lon,
      category,
      shortDescription: '', // Sera enrichi par Wikidata ou détails
      otmKinds: kinds,
      otmRate: poi.rate || null,
      wikidataId: poi.wikidata || null,
    }
  }

  private determineCategory(kinds: string[]): Category {
    // Chercher la première correspondance dans l'ordre de priorité
    for (const kind of kinds) {
      if (KIND_TO_CATEGORY[kind]) {
        return KIND_TO_CATEGORY[kind]
      }
    }
    return 'Autre'
  }

  private extractDescription(details: OtmPoiDetails): string {
    // Priorité: wikipedia_extracts > info.descr
    if (details.wikipedia_extracts?.text) {
      // Limiter à ~200 caractères pour shortDescription
      const text = details.wikipedia_extracts.text
      if (text.length > 200) {
        return text.slice(0, 197) + '...'
      }
      return text
    }

    if (details.info?.descr) {
      const text = details.info.descr
      if (text.length > 200) {
        return text.slice(0, 197) + '...'
      }
      return text
    }

    return ''
  }
}

// Export singleton
let instance: OpenTripMapService | null = null

export function getOpenTripMapService(): OpenTripMapService {
  if (!instance) {
    instance = new OpenTripMapService()
  }
  return instance
}
