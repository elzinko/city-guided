/**
 * Service d'enrichissement Wikidata via SPARQL
 * https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service
 * 
 * Pas de rate limit dur, mais usage raisonnable recommandé
 */

export interface WikidataEnrichment {
  wikidataId: string
  description: string | null
  imageUrl: string | null
  wikipediaUrl: string | null
}

const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'

// Cache simple pour éviter requêtes dupliquées
const cache = new Map<string, WikidataEnrichment>()

export class WikidataService {
  private readonly userAgent = 'CityGuided/1.0 (https://github.com/elzinko/city-guided)'

  /**
   * Enrichit un POI avec les données Wikidata
   */
  async enrichPoi(wikidataId: string): Promise<WikidataEnrichment | null> {
    if (!wikidataId) return null

    // Normaliser l'ID (ajouter Q si absent)
    const qid = wikidataId.startsWith('Q') ? wikidataId : `Q${wikidataId}`

    // Vérifier le cache
    if (cache.has(qid)) {
      return cache.get(qid)!
    }

    try {
      const result = await this.fetchWikidataInfo(qid)
      if (result) {
        cache.set(qid, result)
      }
      return result
    } catch (error) {
      console.error(`Error fetching Wikidata for ${qid}:`, error)
      return null
    }
  }

  /**
   * Enrichit plusieurs POIs en batch (plus efficace)
   */
  async enrichPoisBatch(
    wikidataIds: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, WikidataEnrichment>> {
    const results = new Map<string, WikidataEnrichment>()
    
    // Normaliser les IDs et filtrer les déjà cachés
    const normalizedIds = wikidataIds
      .filter(id => id)
      .map(id => id.startsWith('Q') ? id : `Q${id}`)
    
    const uncachedIds = normalizedIds.filter(id => !cache.has(id))
    
    // Ajouter les résultats cachés
    for (const id of normalizedIds) {
      if (cache.has(id)) {
        results.set(id, cache.get(id)!)
      }
    }

    // Traiter par batches de 50 pour éviter de surcharger
    const batchSize = 50
    let processed = normalizedIds.length - uncachedIds.length

    for (let i = 0; i < uncachedIds.length; i += batchSize) {
      const batch = uncachedIds.slice(i, i + batchSize)
      
      try {
        const batchResults = await this.fetchWikidataBatch(batch)
        
        for (const [id, enrichment] of batchResults) {
          cache.set(id, enrichment)
          results.set(id, enrichment)
        }
      } catch (error) {
        console.error(`Error fetching Wikidata batch:`, error)
      }

      processed += batch.length
      onProgress?.(processed, normalizedIds.length)

      // Petite pause entre les batches
      if (i + batchSize < uncachedIds.length) {
        await this.sleep(100)
      }
    }

    return results
  }

  private async fetchWikidataInfo(qid: string): Promise<WikidataEnrichment | null> {
    const query = `
      SELECT ?description ?image ?articleFr WHERE {
        OPTIONAL { wd:${qid} schema:description ?description. FILTER(LANG(?description) = "fr") }
        OPTIONAL { wd:${qid} wdt:P18 ?image. }
        OPTIONAL { ?articleFr schema:about wd:${qid}; schema:isPartOf <https://fr.wikipedia.org/>. }
      }
      LIMIT 1
    `

    const response = await this.executeSparqlQuery(query)
    
    if (!response?.results?.bindings?.length) {
      return {
        wikidataId: qid,
        description: null,
        imageUrl: null,
        wikipediaUrl: null,
      }
    }

    const binding = response.results.bindings[0]
    
    return {
      wikidataId: qid,
      description: binding.description?.value || null,
      imageUrl: binding.image?.value || null,
      wikipediaUrl: binding.articleFr?.value || null,
    }
  }

  private async fetchWikidataBatch(qids: string[]): Promise<Map<string, WikidataEnrichment>> {
    const results = new Map<string, WikidataEnrichment>()
    
    if (qids.length === 0) return results

    const values = qids.map(id => `wd:${id}`).join(' ')
    
    const query = `
      SELECT ?item ?description ?image ?articleFr WHERE {
        VALUES ?item { ${values} }
        OPTIONAL { ?item schema:description ?description. FILTER(LANG(?description) = "fr") }
        OPTIONAL { ?item wdt:P18 ?image. }
        OPTIONAL { ?articleFr schema:about ?item; schema:isPartOf <https://fr.wikipedia.org/>. }
      }
    `

    const response = await this.executeSparqlQuery(query)
    
    // Initialiser tous les résultats avec valeurs nulles
    for (const qid of qids) {
      results.set(qid, {
        wikidataId: qid,
        description: null,
        imageUrl: null,
        wikipediaUrl: null,
      })
    }

    if (!response?.results?.bindings) {
      return results
    }

    // Remplir avec les données trouvées
    for (const binding of response.results.bindings) {
      const itemUri = binding.item?.value
      if (!itemUri) continue
      
      // Extraire le QID de l'URI
      const qid = itemUri.split('/').pop()
      if (!qid) continue

      const existing = results.get(qid) || {
        wikidataId: qid,
        description: null,
        imageUrl: null,
        wikipediaUrl: null,
      }

      // Mettre à jour avec les nouvelles valeurs (si présentes)
      if (binding.description?.value && !existing.description) {
        existing.description = binding.description.value
      }
      if (binding.image?.value && !existing.imageUrl) {
        existing.imageUrl = binding.image.value
      }
      if (binding.articleFr?.value && !existing.wikipediaUrl) {
        existing.wikipediaUrl = binding.articleFr.value
      }

      results.set(qid, existing)
    }

    return results
  }

  private async executeSparqlQuery(query: string): Promise<SparqlResponse> {
    const url = new URL(WIKIDATA_SPARQL_ENDPOINT)
    url.searchParams.set('query', query)
    url.searchParams.set('format', 'json')

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': this.userAgent,
      },
    })

    if (!response.ok) {
      throw new Error(`Wikidata SPARQL error: ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as SparqlResponse
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Types SPARQL
interface SparqlResponse {
  results: {
    bindings: Array<{
      [key: string]: { value: string } | undefined
    }>
  }
}

// Export singleton
let instance: WikidataService | null = null

export function getWikidataService(): WikidataService {
  if (!instance) {
    instance = new WikidataService()
  }
  return instance
}
