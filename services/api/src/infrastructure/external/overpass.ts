/**
 * Service d'intégration Overpass API (OpenStreetMap)
 * https://wiki.openstreetmap.org/wiki/Overpass_API
 * 
 * Pas de clé API requise, fair use policy
 */

import type { Category } from '@city-guided/domain'

// Types Overpass
interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements: OverpassElement[]
}

export interface ImportedPoi {
  osmId: string
  osmType: 'node' | 'way' | 'relation'
  name: string
  lat: number
  lng: number
  category: Category
  osmTags: string[]
  wikidataId: string | null
  wikipediaUrl: string | null
}

// Mapping OSM tags → Category interne
function mapToCategory(tags: Record<string, string>): Category {
  if (tags.tourism === 'museum' || tags.amenity === 'arts_centre') return 'Musees'
  if (tags.tourism === 'artwork' || tags.tourism === 'gallery') return 'Art'
  if (tags.historic) return 'Monuments'
  if (tags.building && ['church', 'cathedral', 'chapel', 'mosque', 'synagogue', 'temple'].includes(tags.building)) return 'Monuments'
  if (tags.amenity === 'place_of_worship') return 'Monuments'
  if (tags.leisure) return 'Autre'
  if (tags.tourism === 'viewpoint') return 'Insolite'
  return 'Autre'
}

// Simple rate limiter pour respecter le fair use
class RateLimiter {
  private lastRequest = 0
  private readonly minInterval = 1000 // 1 req/sec pour Overpass

  async acquire(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequest
    if (elapsed < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - elapsed))
    }
    this.lastRequest = Date.now()
  }
}

export class OverpassService {
  private readonly baseUrl = 'https://overpass-api.de/api/interpreter'
  private readonly rateLimiter = new RateLimiter()

  /**
   * Récupère les POIs touristiques dans un rayon autour d'un point
   * Filtre uniquement les POIs avec un tag wikidata pour garantir des données enrichies
   */
  async getPoisByRadius(
    lat: number,
    lng: number,
    radiusKm: number
  ): Promise<ImportedPoi[]> {
    const radiusMeters = radiusKm * 1000

    // Construire la requête Overpass QL
    // On ajoute ["wikidata"] pour ne récupérer que les POIs avec données Wikidata
    const query = `
      [out:json][timeout:60];
      (
        // Tourism avec wikidata
        node["tourism"~"museum|artwork|attraction|viewpoint|gallery"]["wikidata"](around:${radiusMeters},${lat},${lng});
        way["tourism"~"museum|artwork|attraction|viewpoint|gallery"]["wikidata"](around:${radiusMeters},${lat},${lng});
        relation["tourism"~"museum|artwork|attraction|viewpoint|gallery"]["wikidata"](around:${radiusMeters},${lat},${lng});
        
        // Historic avec wikidata
        node["historic"~"monument|memorial|castle|ruins|archaeological_site|church|cathedral|palace|fort|manor|tower"]["wikidata"](around:${radiusMeters},${lat},${lng});
        way["historic"~"monument|memorial|castle|ruins|archaeological_site|church|cathedral|palace|fort|manor|tower"]["wikidata"](around:${radiusMeters},${lat},${lng});
        relation["historic"~"monument|memorial|castle|ruins|archaeological_site|church|cathedral|palace|fort|manor|tower"]["wikidata"](around:${radiusMeters},${lat},${lng});
        
        // Amenity cultural avec wikidata
        node["amenity"~"theatre|arts_centre|place_of_worship"]["wikidata"](around:${radiusMeters},${lat},${lng});
        way["amenity"~"theatre|arts_centre|place_of_worship"]["wikidata"](around:${radiusMeters},${lat},${lng});
        
        // Notable buildings avec wikidata
        node["building"~"church|cathedral|chapel|mosque|synagogue|temple"]["wikidata"](around:${radiusMeters},${lat},${lng});
        way["building"~"church|cathedral|chapel|mosque|synagogue|temple"]["wikidata"](around:${radiusMeters},${lat},${lng});
      );
      out center tags;
    `

    await this.rateLimiter.acquire()

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as OverpassResponse

    // Filtrer et mapper les résultats
    const pois: ImportedPoi[] = []
    const seenIds = new Set<string>()

    for (const element of data.elements) {
      // Ignorer les éléments sans nom
      if (!element.tags?.name) continue

      // Créer un ID unique
      const osmId = `${element.type[0].toUpperCase()}${element.id}`
      
      // Éviter les doublons
      if (seenIds.has(osmId)) continue
      seenIds.add(osmId)

      // Obtenir les coordonnées
      let poiLat: number
      let poiLng: number
      
      if (element.type === 'node' && element.lat && element.lon) {
        poiLat = element.lat
        poiLng = element.lon
      } else if (element.center) {
        poiLat = element.center.lat
        poiLng = element.center.lon
      } else {
        continue // Pas de coordonnées, skip
      }

      // Extraire les tags pertinents
      const tags = element.tags
      const osmTags: string[] = []
      
      if (tags.tourism) osmTags.push(`tourism:${tags.tourism}`)
      if (tags.historic) osmTags.push(`historic:${tags.historic}`)
      if (tags.amenity) osmTags.push(`amenity:${tags.amenity}`)
      if (tags.building) osmTags.push(`building:${tags.building}`)
      if (tags.leisure) osmTags.push(`leisure:${tags.leisure}`)

      // Extraire Wikidata et Wikipedia
      const wikidataId = tags.wikidata || null
      const wikipediaUrl = tags.wikipedia 
        ? `https://en.wikipedia.org/wiki/${tags.wikipedia.replace(/^en:/, '').replace(/ /g, '_')}`
        : null

      pois.push({
        osmId,
        osmType: element.type,
        name: tags.name,
        lat: poiLat,
        lng: poiLng,
        category: mapToCategory(tags),
        osmTags,
        wikidataId,
        wikipediaUrl,
      })
    }

    console.log(`Overpass: found ${pois.length} POIs with wikidata out of ${data.elements.length} elements`)
    
    return pois
  }
}

// Singleton
let overpassService: OverpassService | null = null

export function getOverpassService(): OverpassService {
  if (!overpassService) {
    overpassService = new OverpassService()
  }
  return overpassService
}
