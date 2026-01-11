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
  full: 95, // 95% - Presque toute la hauteur

  // Règles spécifiques selon le contexte
  searchResults: 66, // 2/3 de l'écran pour la liste de recherche
  poiFromSearch: 90,  // Presque toute la hauteur (jusqu'au niveau haut de la barre de recherche)
  poiFromMap: 50,     // Moitié de l'écran quand cliqué depuis la carte
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
