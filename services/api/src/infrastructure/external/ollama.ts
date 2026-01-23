/**
 * Service de génération d'audio-guides via Ollama (LLM local)
 * 
 * Génère des segments modulaires pour permettre une lecture adaptative :
 * - Express (1-2 min) : Accroche + Essentiel + Transition
 * - Standard (3-4 min) : + Contexte
 * - Complet (5-7 min) : + Anecdotes + Détails
 */

export interface AudioSegment {
  id: string
  type: 'hook' | 'essential' | 'context' | 'anecdotes' | 'details' | 'transition'
  title: string
  content: string
  durationEstimate: number // en secondes (basé sur ~150 mots/min pour la lecture)
}

export interface AudioGuideResult {
  segments: AudioSegment[]
  totalDuration: number
  generatedAt: Date
  model: string
}

// Configuration par défaut
const DEFAULT_OLLAMA_URL = 'http://localhost:11434'
const DEFAULT_MODEL = 'mistral:7b'

// Prompt système pour la génération de segments
const SYSTEM_PROMPT = `Tu es un guide touristique expert et passionnant. Tu génères des audio-guides captivants qui commencent par l'essentiel et vont progressivement vers les détails.

RÈGLES IMPORTANTES :
- Utilise un ton engageant, comme si tu parlais directement à la personne
- Commence toujours par capter l'attention
- Va du général au particulier
- Chaque segment doit être autonome et compréhensible seul
- Utilise des transitions fluides entre les segments
- Évite le jargon technique sauf si expliqué simplement
- Intègre des éléments sensoriels (imagine, observe, ressens...)

STRUCTURE DES SEGMENTS :
1. HOOK (15-30 sec) : Une phrase d'accroche captivante + identification du lieu
2. ESSENTIAL (30-60 sec) : Ce que c'est, quand ça date, pourquoi c'est remarquable
3. CONTEXT (60-90 sec) : L'histoire complète, l'évolution dans le temps
4. ANECDOTES (30-60 sec) : Histoires surprenantes, faits méconnus, légendes
5. DETAILS (30-60 sec) : Architecture, art, technique pour les passionnés
6. TRANSITION (15 sec) : Invitation à explorer, ouverture

FORMAT DE SORTIE (JSON strict) :
{
  "segments": [
    {"type": "hook", "title": "Accroche", "content": "..."},
    {"type": "essential", "title": "L'essentiel", "content": "..."},
    {"type": "context", "title": "Contexte historique", "content": "..."},
    {"type": "anecdotes", "title": "Anecdotes", "content": "..."},
    {"type": "details", "title": "Détails", "content": "..."},
    {"type": "transition", "title": "Transition", "content": "..."}
  ]
}`

export class OllamaService {
  private readonly baseUrl: string
  private readonly model: string

  constructor(baseUrl = DEFAULT_OLLAMA_URL, model = DEFAULT_MODEL) {
    this.baseUrl = baseUrl
    this.model = model
  }

  /**
   * Vérifie si Ollama est accessible
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Liste les modèles disponibles
   */
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`)
    if (!response.ok) throw new Error('Ollama not available')
    
    const data = (await response.json()) as { models?: Array<{ name: string }> }
    return data.models?.map(m => m.name) || []
  }

  /**
   * Génère un audio-guide segmenté pour un POI
   */
  async generateAudioGuide(
    poiName: string,
    wikipediaContent: string,
    category: string,
    customPrompt?: string
  ): Promise<AudioGuideResult> {
    const userPrompt = customPrompt || this.buildDefaultPrompt(poiName, wikipediaContent, category)

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
        stream: false,
        format: 'json',
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`)
    }

    const result = (await response.json()) as { response: string }
    
    // Parser la réponse JSON
    let parsed: { segments: Array<{ type: string; title: string; content: string }> }
    try {
      parsed = JSON.parse(result.response)
    } catch {
      // Si le JSON est mal formé, essayer d'extraire les segments manuellement
      console.error('Failed to parse Ollama response as JSON, trying fallback...')
      parsed = this.extractSegmentsFromText(result.response)
    }

    // Construire les segments avec IDs et durées estimées
    const segments: AudioSegment[] = parsed.segments.map((seg, index) => ({
      id: `seg-${index + 1}`,
      type: seg.type as AudioSegment['type'],
      title: seg.title,
      content: seg.content,
      durationEstimate: this.estimateDuration(seg.content),
    }))

    const totalDuration = segments.reduce((sum, seg) => sum + seg.durationEstimate, 0)

    return {
      segments,
      totalDuration,
      generatedAt: new Date(),
      model: this.model,
    }
  }

  /**
   * Construit le prompt par défaut pour un POI
   */
  private buildDefaultPrompt(poiName: string, wikipediaContent: string, category: string): string {
    return `Génère un audio-guide en français pour ce point d'intérêt :

NOM : ${poiName}
CATÉGORIE : ${category}

CONTENU SOURCE (Wikipedia) :
${wikipediaContent.substring(0, 4000)}

Génère les 6 segments (hook, essential, context, anecdotes, details, transition) en JSON.
Assure-toi que chaque segment est captivant et adapté à l'écoute en marchant ou en voiture.`
  }

  /**
   * Estime la durée de lecture d'un texte (en secondes)
   * Basé sur ~150 mots/minute pour une lecture naturelle
   */
  private estimateDuration(text: string): number {
    const words = text.split(/\s+/).length
    return Math.round((words / 150) * 60)
  }

  /**
   * Fallback : extrait les segments d'une réponse texte mal formatée
   */
  private extractSegmentsFromText(text: string): { segments: Array<{ type: string; title: string; content: string }> } {
    const segments: Array<{ type: string; title: string; content: string }> = []

    // Essayer d'extraire du JSON partiel
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        // Continue avec le fallback
      }
    }

    // Fallback : créer un segment unique avec tout le contenu
    segments.push({
      type: 'essential',
      title: "L'essentiel",
      content: text.replace(/```json|```/g, '').trim(),
    })

    return { segments }
  }
}

// Singleton avec configuration par variables d'environnement
let ollamaService: OllamaService | null = null

export function getOllamaService(): OllamaService {
  if (!ollamaService) {
    const url = process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL
    const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL
    ollamaService = new OllamaService(url, model)
  }
  return ollamaService
}

/**
 * Modes de lecture prédéfinis
 */
export const PLAYBACK_MODES = {
  express: {
    name: 'Express',
    description: '1-2 min - Idéal en voiture ou visite rapide',
    segments: ['hook', 'essential', 'transition'],
  },
  standard: {
    name: 'Standard', 
    description: '3-4 min - Visite à pied classique',
    segments: ['hook', 'essential', 'context', 'transition'],
  },
  complete: {
    name: 'Complet',
    description: '5-7 min - Pour les passionnés',
    segments: ['hook', 'essential', 'context', 'anecdotes', 'details', 'transition'],
  },
} as const

export type PlaybackMode = keyof typeof PLAYBACK_MODES

/**
 * Filtre les segments selon le mode de lecture
 */
export function getSegmentsForMode(segments: AudioSegment[], mode: PlaybackMode): AudioSegment[] {
  const allowedTypes = PLAYBACK_MODES[mode].segments as readonly string[]
  return segments.filter(seg => allowedTypes.includes(seg.type))
}
