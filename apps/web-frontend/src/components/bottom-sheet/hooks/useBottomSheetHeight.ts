import { useMemo } from 'react'
import { getBottomSheetHeight } from '../../../config/ui-rules'

type Level = 'hidden' | 'peek' | 'mid' | 'full' | 'searchResults' | 'poiFromSearch' | 'poiFromMap'

type UseBottomSheetHeightProps = {
  level: Level
  menuVisible: boolean
  devBlockHeight: number
  isDesktop: boolean
}

export function useBottomSheetHeight({
  level,
  menuVisible,
  devBlockHeight,
  isDesktop,
}: UseBottomSheetHeightProps) {
  // Calculer la hauteur en pixels pour chaque niveau (avec règles UI)
  const getLevelHeight = useMemo(() => {
    return (lvl: Level): number => {
      if (lvl === 'hidden') return 0
      
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800
      const heightPercent = getBottomSheetHeight(lvl)
      const calculatedHeight = vh * (heightPercent / 100)
      
      // Calculer dynamiquement la position du search-overlay (uniquement pour mobile)
      if (!isDesktop) {
        const searchOverlay = typeof document !== 'undefined' ? document.getElementById('search-overlay') : null
        // Pour recouvrir complètement le champ de saisie, on utilise le top du search-overlay au lieu du bottom
        // Cela permet au panneau de monter jusqu'au niveau du search-overlay
        const searchOverlayTop = searchOverlay 
          ? searchOverlay.getBoundingClientRect().top
          : 12 // Fallback si le search-overlay n'est pas trouvé
        
        // Calculer la hauteur maximale: viewportHeight - bottom du sheet - top du search-overlay
        // Le panneau peut monter jusqu'au top du search-overlay pour le recouvrir complètement
        const sheetBottom = menuVisible ? (devBlockHeight + 64) : 0
        const maxHeight = vh - sheetBottom - searchOverlayTop
        
        return Math.min(calculatedHeight, maxHeight)
      }
      
      // Desktop: retourner la hauteur calculée sans limitation (géré par top/bottom)
      return calculatedHeight
    }
  }, [menuVisible, devBlockHeight, isDesktop])

  // Si le menu n'est pas visible (recherche), le panneau est en bas (bottom: 0)
  // Sinon, il se déploie au-dessus du menu : bottom = devBlockHeight + 64px (hauteur du menu)
  const BOTTOM_MENU_HEIGHT = 64
  const bottom = isDesktop ? 'auto' : (menuVisible ? devBlockHeight + BOTTOM_MENU_HEIGHT : 0)
  
  // Pour mobile, utiliser getLevelHeight qui calcule dynamiquement avec limitation
  // Pour desktop, utiliser 'auto' (géré par top/bottom)
  const height = isDesktop ? 'auto' : `${getLevelHeight(level)}px`

  return {
    height,
    bottom,
    getLevelHeight,
  }
}
