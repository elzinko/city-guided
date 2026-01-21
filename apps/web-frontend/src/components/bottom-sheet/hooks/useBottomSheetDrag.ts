import { useRef, useCallback } from 'react'

type Level = 'hidden' | 'peek' | 'mid' | 'full' | 'searchResults' | 'poiFromSearch' | 'poiFromMap'

type UseBottomSheetDragProps = {
  level: Level
  setLevel: (v: Level) => void
  menuVisible: boolean
  devBlockHeight: number
  selectedPoi: any
  getLevelHeight: (lvl: Level) => number
  onHeightChange?: (heightPx: number) => void
}

export function useBottomSheetDrag({
  level,
  setLevel,
  menuVisible,
  devBlockHeight,
  selectedPoi,
  getLevelHeight,
  onHeightChange,
}: UseBottomSheetDragProps) {
  // Refs pour le drag
  const startYRef = useRef<number | null>(null)
  const startLevelRef = useRef<Level>(level)
  const sheetRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const currentOffsetRef = useRef(0)
  const velocityRef = useRef(0)
  const lastYRef = useRef(0)
  const lastTimeRef = useRef(0)

  // Ordre des niveaux pour la navigation (sans les niveaux contextuels)
  const order: Level[] = ['peek', 'mid', 'full']

  // Trouver le niveau le plus proche d'une hauteur donnée, avec prise en compte de la vélocité
  const findClosestLevel = useCallback((currentHeight: number, velocity: number): Level => {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const BOTTOM_MENU_HEIGHT = 64
    const minSheetHeight = menuVisible ? devBlockHeight + BOTTOM_MENU_HEIGHT : 0
    
    // Pour les résultats de recherche, permettre de fermer en tirant vers le bas
    if (!selectedPoi && currentHeight <= minSheetHeight + 80) {
      return 'hidden'
    }
    
    // Si vélocité forte vers le bas (positive) et on est sur les résultats de recherche
    // Permettre de fermer le panneau en tirant vers le bas
    if (velocity > 600 && level === 'searchResults') {
      return 'hidden'
    }
    
    // Si on est sur un niveau contextuel POI
    if (level === 'poiFromSearch' || level === 'poiFromMap') {
      // Pour les POI, NE PAS fermer en tirant vers le bas
      // Le panneau reste au minimum à la hauteur du poi-header
      // L'utilisateur doit utiliser le bouton X pour fermer
      return level
    }
    
    // Si on est sur searchResults, permettre de descendre mais pas de fermer
    if (level === 'searchResults') {
      if (velocity > 600) {
        return 'hidden'
      }
      return level
    }
    
    // Si vélocité forte vers le haut (négative), aller au niveau supérieur
    if (velocity < -500) {
      const currentIdx = order.indexOf(level)
      if (currentIdx < order.length - 1) return order[currentIdx + 1]
    }
    // Si vélocité forte vers le bas (positive), aller au niveau inférieur
    if (velocity > 500) {
      const currentIdx = order.indexOf(level)
      if (currentIdx > 0) return order[currentIdx - 1]
    }
    
    // Sinon, trouver le niveau le plus proche parmi les niveaux de base
    // S'assurer que la hauteur permet de recouvrir complètement le search-overlay (calcul dynamique)
    const searchOverlay = typeof document !== 'undefined' ? document.getElementById('search-overlay') : null
    // Utiliser le top pour permettre au panneau de recouvrir complètement le champ de saisie
    const searchOverlayTop = searchOverlay 
      ? searchOverlay.getBoundingClientRect().top
      : 12 // Fallback si le search-overlay n'est pas trouvé
    const maxAllowedHeight = vh - (menuVisible ? (devBlockHeight + 64) : 0) - searchOverlayTop
    const clampedHeight = Math.min(currentHeight, maxAllowedHeight)
    
    let closest: Level = 'peek'
    let minDiff = Infinity
    for (const lvl of order) {
      const h = getLevelHeight(lvl)
      const diff = Math.abs(clampedHeight - h)
      if (diff < minDiff) {
        minDiff = diff
        closest = lvl
      }
    }
    return closest
  }, [level, menuVisible, devBlockHeight, selectedPoi, getLevelHeight])

  const handlePointerEnd = useCallback((clientY: number | null) => {
    if (clientY === null || startYRef.current === null) {
      isDraggingRef.current = false
      currentOffsetRef.current = 0
      return
    }
    
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    // Calculer dynamiquement la position du search-overlay
    const searchOverlay = typeof document !== 'undefined' ? document.getElementById('search-overlay') : null
    // Utiliser le top pour permettre au panneau de recouvrir complètement le champ de saisie
    const searchOverlayTop = searchOverlay 
      ? searchOverlay.getBoundingClientRect().top
      : 12 // Fallback si le search-overlay n'est pas trouvé
    const maxHeight = vh - (menuVisible ? (devBlockHeight + 64) : 0) - searchOverlayTop // Permettre de recouvrir le search-overlay
    
    const startHeight = getLevelHeight(startLevelRef.current)
    const dragOffset = startYRef.current - clientY
    const newHeight = Math.min(startHeight + dragOffset, maxHeight) // Limiter aussi ici
    const target = findClosestLevel(newHeight, velocityRef.current)
    
    setLevel(target)
    startYRef.current = null
    isDraggingRef.current = false
    currentOffsetRef.current = 0
    velocityRef.current = 0
    
    if (sheetRef.current) {
      sheetRef.current.style.transform = ''
      sheetRef.current.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      // Notifier la hauteur finale après la transition
      const finalHeight = getLevelHeight(target)
      if (onHeightChange) {
        onHeightChange(finalHeight)
      }
    }
  }, [menuVisible, devBlockHeight, getLevelHeight, findClosestLevel, setLevel, onHeightChange])

  const handlePointerDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    const clientY =
      (e as any).clientY ??
      (e as React.TouchEvent).touches?.[0]?.clientY ??
      (e as React.TouchEvent).changedTouches?.[0]?.clientY ??
      null
    if (clientY === null) return
    
    startYRef.current = clientY
    startLevelRef.current = level
    isDraggingRef.current = true
    lastYRef.current = clientY
    lastTimeRef.current = Date.now()
    velocityRef.current = 0

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none'
    }

    const move = (ev: any) => {
      if (!isDraggingRef.current) return
      const y = ev.clientY ?? ev.touches?.[0]?.clientY ?? ev.changedTouches?.[0]?.clientY ?? null
      if (y === null || startYRef.current === null) return

      // Calculer la vélocité
      const now = Date.now()
      const dt = now - lastTimeRef.current
      if (dt > 0) {
        velocityRef.current = (y - lastYRef.current) / dt * 1000 // pixels par seconde
      }
      lastYRef.current = y
      lastTimeRef.current = now

      const dragOffset = startYRef.current - y
      currentOffsetRef.current = dragOffset
      
      if (sheetRef.current) {
        // Calculer la nouvelle hauteur basée sur le drag
        // Limiter la hauteur maximale pour recouvrir complètement le search-overlay (calcul dynamique)
        const vh = window.innerHeight
        const searchOverlay = document.getElementById('search-overlay')
        // Utiliser le top pour permettre au panneau de recouvrir complètement le champ de saisie
        const searchOverlayTop = searchOverlay 
          ? searchOverlay.getBoundingClientRect().top
          : 12 // Fallback si le search-overlay n'est pas trouvé
        const maxHeight = vh - (menuVisible ? (devBlockHeight + 64) : 0) - searchOverlayTop
        const startHeight = getLevelHeight(startLevelRef.current)
        
        // Hauteur minimale pour garder le poi-header visible (environ 140px = header + padding)
        // Uniquement si un POI est sélectionné
        const poiMinHeight = selectedPoi ? 140 : 0
        const newHeight = Math.max(poiMinHeight, Math.min(startHeight + dragOffset, maxHeight))
        sheetRef.current.style.height = `${newHeight}px`
        
        // Notifier le parent de la nouvelle hauteur en temps réel
        if (onHeightChange) {
          onHeightChange(newHeight)
        }
      }
    }

    const up = (ev: any) => {
      const y = ev.clientY ?? ev.touches?.[0]?.clientY ?? ev.changedTouches?.[0]?.clientY ?? null
      handlePointerEnd(y)

      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('touchmove', move)
    window.addEventListener('touchend', up)
  }, [level, menuVisible, devBlockHeight, selectedPoi, getLevelHeight, handlePointerEnd, onHeightChange])

  return {
    sheetRef,
    isDragging: isDraggingRef.current,
    handlePointerDown,
  }
}
