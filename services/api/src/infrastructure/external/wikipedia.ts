/**
 * Service de récupération de contenu Wikipedia
 * https://en.wikipedia.org/api/rest_v1/
 * 
 * Utilise l'API REST de Wikipedia pour récupérer le contenu des articles
 * Pas de rate limit strict, mais usage raisonnable recommandé
 */

export interface WikipediaContent {
  title: string
  extract: string // Résumé de l'article
  content: string // Contenu complet (texte brut)
  url: string
  language: string
}

// Cache simple pour éviter requêtes dupliquées
const cache = new Map<string, WikipediaContent>()

// Simple rate limiter
class RateLimiter {
  private lastRequest = 0
  private readonly minInterval = 200 // 5 req/sec max

  async acquire(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequest
    if (elapsed < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - elapsed))
    }
    this.lastRequest = Date.now()
  }
}

export class WikipediaService {
  private readonly userAgent = 'CityGuided/1.0 (https://github.com/elzinko/city-guided; contact@city-guided.app)'
  private readonly rateLimiter = new RateLimiter()

  /**
   * Récupère le contenu Wikipedia à partir d'un wikidataId
   * Utilise Wikidata pour trouver le titre Wikipedia, puis récupère le contenu
   */
  async getContentByWikidataId(wikidataId: string, preferredLang = 'fr'): Promise<WikipediaContent | null> {
    if (!wikidataId) return null

    // Normaliser l'ID
    const qid = wikidataId.startsWith('Q') ? wikidataId : `Q${wikidataId}`
    
    // Vérifier le cache
    const cacheKey = `${qid}:${preferredLang}`
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!
    }

    try {
      // 1. Récupérer le titre Wikipedia depuis Wikidata
      const wikiTitle = await this.getWikipediaTitleFromWikidata(qid, preferredLang)
      if (!wikiTitle) {
        // Essayer en anglais si pas disponible dans la langue préférée
        if (preferredLang !== 'en') {
          return this.getContentByWikidataId(wikidataId, 'en')
        }
        return null
      }

      // 2. Récupérer le contenu Wikipedia
      const content = await this.getArticleContent(wikiTitle.title, wikiTitle.lang)
      if (content) {
        cache.set(cacheKey, content)
      }
      
      return content
    } catch (error) {
      console.error(`Error fetching Wikipedia content for ${qid}:`, error)
      return null
    }
  }

  /**
   * Récupère le titre Wikipedia depuis Wikidata
   */
  private async getWikipediaTitleFromWikidata(
    qid: string, 
    preferredLang: string
  ): Promise<{ title: string; lang: string } | null> {
    await this.rateLimiter.acquire()

    const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Wikidata API error: ${response.status}`)
    }

    const data = (await response.json()) as {
      entities: Record<string, {
        sitelinks?: Record<string, { title: string }>
      }>
    }

    const entity = data.entities[qid]
    if (!entity?.sitelinks) return null

    // Chercher le sitelink Wikipedia dans l'ordre de préférence
    const langPreferences = [preferredLang, 'en', 'de', 'es', 'it']
    
    for (const lang of langPreferences) {
      const siteKey = `${lang}wiki`
      if (entity.sitelinks[siteKey]) {
        return {
          title: entity.sitelinks[siteKey].title,
          lang,
        }
      }
    }

    return null
  }

  /**
   * Récupère le contenu complet d'un article Wikipedia
   */
  private async getArticleContent(title: string, lang: string): Promise<WikipediaContent | null> {
    await this.rateLimiter.acquire()

    // Utiliser l'API REST de Wikipedia pour le contenu en texte brut
    const encodedTitle = encodeURIComponent(title)
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/mobile-text/${encodedTitle}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Wikipedia API error: ${response.status}`)
    }

    const data = (await response.json()) as {
      title: string
      extract?: string
      sections?: Array<{
        id: number
        text: string
      }>
    }

    // Extraire le texte de toutes les sections
    let fullContent = ''
    if (data.sections) {
      for (const section of data.sections) {
        if (section.text) {
          // Nettoyer le HTML basique
          const cleanText = this.stripHtml(section.text)
          if (cleanText.trim()) {
            fullContent += cleanText + '\n\n'
          }
        }
      }
    }

    // Si pas de contenu via sections, essayer l'API de résumé
    if (!fullContent) {
      const summaryContent = await this.getArticleSummary(title, lang)
      if (summaryContent) {
        fullContent = summaryContent
      }
    }

    if (!fullContent) return null

    return {
      title: data.title || title,
      extract: data.extract || fullContent.substring(0, 500),
      content: fullContent.trim(),
      url: `https://${lang}.wikipedia.org/wiki/${encodedTitle}`,
      language: lang,
    }
  }

  /**
   * Récupère le résumé d'un article (fallback)
   */
  private async getArticleSummary(title: string, lang: string): Promise<string | null> {
    await this.rateLimiter.acquire()

    const encodedTitle = encodeURIComponent(title)
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) return null

    const data = (await response.json()) as {
      extract?: string
      extract_html?: string
    }

    return data.extract || null
  }

  /**
   * Nettoie le HTML pour obtenir du texte brut
   */
  private stripHtml(html: string): string {
    return html
      // Supprimer les balises script et style
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Convertir les balises de bloc en nouvelles lignes
      .replace(/<\/?(p|div|br|h[1-6]|li|tr)[^>]*>/gi, '\n')
      // Supprimer toutes les autres balises HTML
      .replace(/<[^>]+>/g, '')
      // Décoder les entités HTML courantes
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Nettoyer les espaces multiples
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim()
  }

  /**
   * Récupère le contenu Wikipedia pour plusieurs POIs en batch
   */
  async enrichPoisBatch(
    wikidataIds: string[],
    preferredLang = 'fr',
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, WikipediaContent>> {
    const results = new Map<string, WikipediaContent>()
    const total = wikidataIds.length

    for (let i = 0; i < wikidataIds.length; i++) {
      const wikidataId = wikidataIds[i]
      
      try {
        const content = await this.getContentByWikidataId(wikidataId, preferredLang)
        if (content) {
          results.set(wikidataId, content)
        }
      } catch (error) {
        console.error(`Error fetching Wikipedia for ${wikidataId}:`, error)
      }

      onProgress?.(i + 1, total)
    }

    console.log(`Wikipedia: enriched ${results.size}/${total} POIs with content`)
    return results
  }
}

// Singleton
let wikipediaService: WikipediaService | null = null

export function getWikipediaService(): WikipediaService {
  if (!wikipediaService) {
    wikipediaService = new WikipediaService()
  }
  return wikipediaService
}
