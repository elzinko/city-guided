/**
 * Types pour le système de narration audio des POI
 * 
 * Chaque POI possède une liste chaînée de "chapitres" (StorySegment)
 * qui forment ensemble la visite guidée du lieu.
 */

/**
 * Un segment d'histoire = un chapitre de la narration
 * - Texte court (~20 secondes de lecture)
 * - Média optionnel pour illustrer le propos
 */
export type StorySegment = {
  /** Identifiant unique du segment */
  id: string
  /** Texte de la narration (max ~20s de lecture) */
  text: string
  /** Titre court du chapitre (optionnel) */
  title?: string
  /** URL de l'image/média associé */
  mediaUrl?: string
  /** Type de média */
  mediaType?: 'image' | 'video' | 'audio'
  /** Légende du média */
  mediaCaption?: string
  /** Durée estimée en secondes */
  durationSeconds?: number
}

/**
 * POI enrichi avec segments d'histoire
 */
export type PoiWithStory = {
  id: string
  name: string
  lat: number
  lng: number
  radiusMeters: number
  category: string
  shortDescription: string
  /** Image principale du POI */
  image?: string
  /** Ancienne méthode : texte TTS simple */
  ttsText?: string
  /** Ancienne méthode : segments texte simples */
  storySegments?: string[]
  /** Nouvelle méthode : chapitres riches avec médias */
  chapters?: StorySegment[]
}

/**
 * État de lecture d'une story
 */
export type StoryPlaybackState = {
  /** POI en cours de lecture */
  poiId: string
  /** Index du chapitre actuel */
  chapterIndex: number
  /** Est en pause */
  isPaused: boolean
  /** Temps écoulé dans le chapitre actuel (en secondes) */
  elapsedTime: number
  /** Le chapitre a été complété (audio terminé) */
  isChapterComplete: boolean
  /** Tous les chapitres ont été lus */
  isStoryComplete: boolean
}

/**
 * Convertit les anciens formats de segments en nouveaux chapitres
 */
export function convertToChapters(poi: PoiWithStory): StorySegment[] {
  // Si déjà des chapitres riches, les utiliser
  if (poi.chapters && poi.chapters.length > 0) {
    return poi.chapters
  }
  
  // Sinon, convertir les anciens formats
  let texts: string[] = []
  
  if (poi.storySegments && poi.storySegments.length > 0) {
    texts = poi.storySegments
  } else if (poi.ttsText) {
    texts = [poi.ttsText]
  } else {
    texts = [poi.shortDescription]
  }
  
  return texts.map((text, index) => ({
    id: `${poi.id}_chapter_${index}`,
    text,
    title: index === 0 ? 'Introduction' : `Partie ${index + 1}`,
    // Utiliser l'image du POI pour le premier chapitre
    mediaUrl: index === 0 ? poi.image : undefined,
    durationSeconds: Math.ceil(text.length / 15), // ~15 caractères par seconde
  }))
}
