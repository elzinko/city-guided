/**
 * UI Rules - Business rules orientées UI
 * 
 * Ce fichier centralise toutes les règles d'interface utilisateur
 * pour garantir la cohérence et faciliter la maintenance.
 */

/**
 * Hauteurs du bottom-sheet selon le contexte
 */
export const BOTTOM_SHEET_HEIGHTS = {
  // Niveaux de base (utilisés pour la navigation générale)
  peek: 20, // 20% - Aperçu minimal
  mid: 50,  // 50% - Moitié de l'écran
  full: 75, // 75% - S'arrête avant la barre de recherche (réduit de 90%)

  // Règles spécifiques selon le contexte
  searchResults: 66, // 2/3 de l'écran pour la liste de recherche
  poiFromSearch: 75, // 75% - S'arrête avant la barre de recherche (réduit de 90%)
  poiFromMap: 60,    // 60% pour voir le carousel + lecteur dès l'ouverture
} as const

/**
 * Type pour les niveaux du bottom-sheet
 */
export type BottomSheetLevel = 
  | 'peek' 
  | 'mid' 
  | 'full' 
  | 'searchResults' 
  | 'poiFromSearch' 
  | 'poiFromMap'

/**
 * Fonction utilitaire pour obtenir la hauteur en pourcentage selon le niveau
 */
export function getBottomSheetHeight(level: BottomSheetLevel | string): number {
  if (level in BOTTOM_SHEET_HEIGHTS) {
    return BOTTOM_SHEET_HEIGHTS[level as keyof typeof BOTTOM_SHEET_HEIGHTS]
  }
  // Fallback vers les niveaux de base
  switch (level) {
    case 'peek':
      return BOTTOM_SHEET_HEIGHTS.peek
    case 'mid':
      return BOTTOM_SHEET_HEIGHTS.mid
    case 'full':
      return BOTTOM_SHEET_HEIGHTS.full
    default:
      return BOTTOM_SHEET_HEIGHTS.peek
  }
}
