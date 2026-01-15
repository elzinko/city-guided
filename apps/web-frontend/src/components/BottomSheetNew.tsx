import React, { useRef, useState } from 'react'
import { distanceMeters } from '../utils/distance'
import { Z_INDEX } from '../config/constants'
import { getBottomSheetHeight } from '../config/ui-rules'
import type { MenuTab } from './BottomMenu'
import { ChapterPlayer } from './ChapterPlayer'
import { PoiHeader, PoiImage, PoiDescription } from './poi'
import type { PoiWithStory } from '../types/story'
import { convertToChapters } from '../types/story'

// Composant bouton Play/Pause avec bordure pointillée (rappel visuel)
function PlayPauseButton({ 
  isPlaying, 
  onToggle, 
  size = 40 
}: { 
  isPlaying: boolean
  onToggle: () => void
  size?: number 
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation() // Empêcher le clic sur la carte
        onToggle()
      }}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px dashed #94a3b8', // Bordure pointillée comme rappel
        background: isPlaying 
          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
          : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: isPlaying 
          ? '0 4px 12px rgba(239, 68, 68, 0.4)' 
          : '0 4px 12px rgba(34, 197, 94, 0.4)',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
      aria-label={isPlaying ? 'Pause' : 'Écouter la description'}
      title={isPlaying ? 'Pause' : 'Écouter la description audio'}
    >
      {isPlaying ? (
        <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  )
}

function GuidePlaceholder({ title }: { title?: string }) {
  const hue = title ? title.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 200
  return (
    <div
      style={{
        width: 70,
        height: 70,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        background: `linear-gradient(135deg, hsl(${hue}, 70%, 60%) 0%, hsl(${hue + 30}, 60%, 50%) 100%)`,
      }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
  )
}

type Level = 'hidden' | 'peek' | 'mid' | 'full' | 'searchResults' | 'poiFromSearch' | 'poiFromMap'

type Poi = {
  id: string
  name: string
  shortDescription: string
  text?: string
  ttsText?: string
  lat: number
  lng: number
  radiusMeters: number
  image?: string
  category: string
  rating?: number
  notes?: string
}

type Props = {
  level: Level
  setLevel: (v: Level) => void
  query: string
  items: any[]
  speak: (text: string) => void
  stopSpeech?: () => void // Callback pour arrêter la lecture audio
  pauseSpeech?: () => void // Callback pour mettre en pause la lecture audio
  resumeSpeech?: () => void // Callback pour reprendre la lecture audio
  pos: { lat: number; lng: number } | null
  mode: 'ambience' | 'results'
  activeTab: MenuTab
  menuVisible?: boolean // Si false, le panneau est en bas (bottom: 0), sinon au-dessus du menu
  devBlockHeight?: number // Hauteur du bloc dev pour calculer la position du menu
  guideMode?: boolean
  guideTitle?: string
  guideSubtitle?: string
  guideImage?: string
  guideText?: string
  onPrev?: () => void
  onNext?: () => void
  onPlayPause?: () => void
  playing?: boolean
  isDesktop?: boolean // Pour le layout Google Maps style (panneau latéral)
  selectedPoi?: PoiWithStory | null // POI sélectionné pour afficher les détails (avec support chapitres)
  onSelectPoi?: (poi: Poi) => void // Callback pour sélectionner un POI et voir ses détails
  onClosePoi?: () => void // Callback pour fermer les détails du POI
  onClose?: () => void // Callback pour fermer complètement le panneau
  onCenterOnPoi?: (poi: Poi) => void // Callback pour centrer la carte sur un POI
  onHeightChange?: (heightPx: number) => void // Callback pour notifier les changements de hauteur en temps réel (pendant le drag)
  previousDiscoverLevel?: 'peek' | 'mid' | 'full' | null // Niveau du panneau avant l'ouverture d'un POI depuis la recherche
}

export function BottomSheetNew({
  level,
  setLevel,
  query,
  items,
  speak,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  pos,
  mode,
  activeTab,
  menuVisible = true, // Par défaut, le menu est visible
  devBlockHeight = 0, // Hauteur du bloc dev
  guideMode,
  guideTitle,
  guideSubtitle,
  guideImage: _guideImage, // eslint-disable-line @typescript-eslint/no-unused-vars
  guideText,
  onPrev,
  onNext,
  onPlayPause,
  playing,
  isDesktop = false,
  selectedPoi = null,
  onSelectPoi,
  onClosePoi,
  onClose: _onClose, // eslint-disable-line @typescript-eslint/no-unused-vars
  onCenterOnPoi,
  onHeightChange,
  previousDiscoverLevel: _previousDiscoverLevel, // eslint-disable-line @typescript-eslint/no-unused-vars
}: Props) {
  // === TOUS LES HOOKS DOIVENT ÊTRE DÉCLARÉS AU DÉBUT ===
  // État pour suivre quel POI est en cours de lecture audio
  const [playingPoiId, setPlayingPoiId] = useState<string | null>(null)
  
  // État pour suivre le chapitre courant (pour afficher l'image du chapitre)
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  
  // Refs pour le drag du bottom sheet
  const startYRef = useRef<number | null>(null)
  const startLevelRef = useRef<Level>(level)
  const sheetRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const currentOffsetRef = useRef(0)
  const velocityRef = useRef(0)
  const lastYRef = useRef(0)
  const lastTimeRef = useRef(0)

  // Fonction pour gérer le play/pause d'un POI
  const handlePoiPlayPause = (poi: Poi) => {
    if (playingPoiId === poi.id) {
      // Si ce POI est en cours de lecture, on arrête
      if (stopSpeech) stopSpeech()
      setPlayingPoiId(null)
    } else {
      // Sinon on lance la lecture de ce POI
      if (stopSpeech) stopSpeech() // Arrêter toute lecture en cours
      speak(poi.ttsText || poi.text || poi.shortDescription)
      setPlayingPoiId(poi.id)
    }
  }

  // Fonction pour gérer le clic sur une carte POI depuis le panneau de recherche
  const handlePoiCardClick = (poi: Poi) => {
    if (onSelectPoi) {
      onSelectPoi(poi)
    }
    if (onCenterOnPoi) {
      onCenterOnPoi(poi)
    }
    // Réinitialiser le chapitre courant
    setCurrentChapterIndex(0)
    // Le niveau est déjà géré dans index.tsx via onSelectPoi
    // On ne change plus le niveau ici pour permettre la gestion centralisée
  }

  // Early return APRÈS tous les hooks
  if (level === 'hidden') return null

  // Desktop: panneau latéral gauche style Google Maps
  // Mobile: bottom sheet classique avec règles UI
  
  // Helper pour convertir les niveaux contextuels en niveaux de base pour les composants
  const getBaseLevel = (lvl: Level): 'peek' | 'mid' | 'full' => {
    if (lvl === 'searchResults' || lvl === 'poiFromSearch' || lvl === 'poiFromMap') {
      return 'full'
    }
    return lvl as 'peek' | 'mid' | 'full'
  }
  
  // Ordre des niveaux pour la navigation (sans les niveaux contextuels)
  // Les niveaux contextuels (searchResults, poiFromSearch, poiFromMap) sont gérés séparément
  const order: Level[] = ['peek', 'mid', 'full']
  
  // Calculer la hauteur en pixels pour chaque niveau (avec règles UI)
  // Limiter la hauteur maximale pour ne pas dépasser le search-overlay (calcul dynamique)
  // Cette fonction est utilisée pour mobile uniquement (desktop utilise top/bottom)
  const getLevelHeight = (lvl: Level): number => {
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
  
  // Si le menu n'est pas visible (recherche), le panneau est en bas (bottom: 0)
  // Sinon, il se déploie au-dessus du menu : bottom = devBlockHeight + 64px (hauteur du menu)
  const BOTTOM_MENU_HEIGHT = 64
  const bottom = isDesktop ? 'auto' : (menuVisible ? devBlockHeight + BOTTOM_MENU_HEIGHT : 0)
  
  // Pour mobile, utiliser getLevelHeight qui calcule dynamiquement avec limitation
  // Pour desktop, utiliser 'auto' (géré par top/bottom)
  // Note: level ne peut pas être 'hidden' ici car on a déjà fait un early return
  const height = isDesktop ? 'auto' : `${getLevelHeight(level)}px`

  // Trouver le niveau le plus proche d'une hauteur donnée, avec prise en compte de la vélocité
  const findClosestLevel = (currentHeight: number, velocity: number): Level => {
    // Si on est sur un niveau contextuel, ne pas permettre le drag vers d'autres niveaux
    // (on garde le niveau actuel)
    if (level === 'searchResults' || level === 'poiFromSearch' || level === 'poiFromMap') {
      return level
    }
    
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const BOTTOM_MENU_HEIGHT = 64
    const minSheetHeight = menuVisible ? devBlockHeight + BOTTOM_MENU_HEIGHT : 0
    
    // Si on approche très près du bas (près du menu), fermer le panneau
    const threshold = 50 // pixels de tolérance
    if (currentHeight <= minSheetHeight + threshold) {
      return 'hidden'
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
  }

  const handlePointerEnd = (clientY: number | null) => {
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
  }

  const handlePointerDown = (e: React.PointerEvent | React.TouchEvent) => {
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
        const newHeight = Math.max(0, Math.min(startHeight + dragOffset, maxHeight))
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
  }

  const sorted = items
    .slice()
    .map((p: any) => ({
      ...p,
      dist: pos ? Math.round(distanceMeters(pos.lat, pos.lng, p.lat, p.lng)) : null,
    }))
    .sort((a: any, b: any) => (a.dist || 0) - (b.dist || 0))

  const featured = sorted.slice(0, 5)

  // Title based on active tab or search query
  const tabTitles: Record<MenuTab, string> = {
    discover: 'Découvrir',
    saved: 'Enregistrés',
    contribute: 'Contribuer',
  }
  // Si on a une query (recherche), l'utiliser, sinon le titre du tab
  const title = query && query !== 'Découvrir' ? query : tabTitles[activeTab]

  // Déterminer si le panneau est grand (dépasse le milieu)
  // Note: level ne peut pas être 'hidden' ici car on a déjà fait un early return
  const isLargePanel = !isDesktop && level !== 'peek'
  
  // Style différent selon desktop/mobile
  const containerStyle = isDesktop ? {
    // Desktop: panneau latéral gauche style Google Maps
    position: 'fixed' as const,
    left: 0,
    top: 70, // Sous la barre de recherche
    bottom: 16,
    width: 380,
    maxHeight: 'calc(100vh - 86px)',
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 20px rgba(15,23,42,0.12)',
    // Le bottom-sheet peut être derrière le menu quand il est très bas
    // Mais passe au-dessus du DevControlBlock et des map-control-buttons quand un POI est sélectionné ou panneau grand
    zIndex: (selectedPoi || isLargePanel) ? Z_INDEX.mapControlButtons + 1 : Z_INDEX.bottomSheet,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    color: '#0f172a',
    marginLeft: 12,
    overflow: 'hidden' as const,
  } : {
    // Mobile: bottom sheet classique
    position: 'fixed' as const,
    left: 0,
    right: 0,
    bottom,
    height,
    background: '#f8fafc',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    border: '1px solid #e2e8f0',
    boxShadow: '0 -12px 30px rgba(15,23,42,0.08)',
    // Le bottom-sheet peut être derrière le menu quand il est très bas
    // Mais passe au-dessus du DevControlBlock et des map-control-buttons quand un POI est sélectionné ou panneau grand
    zIndex: (selectedPoi || isLargePanel) ? Z_INDEX.mapControlButtons + 1 : Z_INDEX.bottomSheet,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    color: '#0f172a',
  }

  return (
    <div
      id="bottom-sheet"
      ref={sheetRef}
      style={containerStyle}
    >
      {/* Drag handle - caché sur desktop */}
      {!isDesktop && (
        <div
          id="sheet-drag-handle"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid #e2e8f0',
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
          }}
          onPointerDown={handlePointerDown as any}
          onTouchStart={handlePointerDown as any}
        >
          {/* Handle visuel - ne déclenche PAS de cycle au clic, seulement le drag */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 48,
                height: 4,
                borderRadius: 999,
                background: '#9ca3af',
                margin: '0 auto',
              }}
            />
          </div>
          <button
            id="sheet-close-button"
            onClick={() => {
              // Si un POI est sélectionné, revenir aux résultats de recherche
              // Sinon, fermer le panneau
              if (selectedPoi && onClosePoi) {
                onClosePoi()
              } else {
                setLevel('hidden')
              }
            }}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer',
            }}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Header desktop avec bouton fermer */}
      {isDesktop && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <button
            onClick={() => setLevel('hidden')}
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 14,
            }}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Content */}
      <div
        id="sheet-content"
        style={{
          padding: '8px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflow: 'hidden', // Masquer le contenu qui dépasse progressivement
          flex: 1,
          // Le contenu interne garde sa taille naturelle et est masqué progressivement
        }}
      >
        {/* Affichage des détails du POI sélectionné */}
        {selectedPoi ? (
          <div
            id="poi-details"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              // Ne pas forcer height: 100% pour que le contenu garde sa taille naturelle
              // Le contenu sera masqué progressivement par overflow: hidden du parent
              overflowY: 'auto', // Toujours permettre le scroll pour accéder à tout le contenu
            }}
          >
            {/* Header avec icône de type et titre - toujours visible */}
            <PoiHeader
              id="poi-header"
              name={selectedPoi.name}
              category={selectedPoi.category}
              level={getBaseLevel(level)}
            />

            {/* Image du POI - Toujours visible, affiche l'image du chapitre courant si disponible */}
            {(() => {
              const chapters = convertToChapters(selectedPoi)
              const currentChapter = chapters[currentChapterIndex]
              return (
                <PoiImage
                  id="poi-image"
                  name={selectedPoi.name}
                  imageUrl={selectedPoi.image}
                  chapterImageUrl={currentChapter?.mediaUrl}
                />
              )
            })()}

            {/* Description - toujours présente, accessible via scroll */}
            <PoiDescription
              id="poi-description"
              shortDescription={selectedPoi.shortDescription}
              longDescription={selectedPoi.ttsText}
            />

            {/* Lecteur de chapitres audio - toujours présent, accessible via scroll */}
            <ChapterPlayer
              id="poi-chapter-player"
              poi={selectedPoi}
              speak={speak}
              stopSpeech={stopSpeech}
              pauseSpeech={pauseSpeech}
              resumeSpeech={resumeSpeech}
              compact={true}
              onChapterChange={(index) => setCurrentChapterIndex(index)}
            />

            {/* Espacement pour éviter le chevauchement avec le DevControlBlock */}
            <div id="poi-details-spacer" style={{ height: 200 }} />
          </div>
        ) : (
          <>
            {/* Titre - caché sur desktop car affiché dans le header */}
            {!isDesktop && (
              <div
                id="sheet-title"
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: '#0f172a',
                }}
              >
                {title}
              </div>
            )}

        {guideMode && (
          <div
            id="guide-mode-panel"
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 12,
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <GuidePlaceholder title={guideTitle} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{guideTitle || 'Visite guidée'}</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>{guideSubtitle || 'Audio guide en cours'}</div>
              </div>
            </div>
            {guideText && (level === 'mid' || level === 'full') && (
              <div
                style={{
                  color: '#334155',
                  fontSize: 14,
                  lineHeight: 1.5,
                  paddingTop: 8,
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                {guideText}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                justifyContent: 'center',
                paddingTop: 4,
              }}
            >
              <button
                id="guide-prev-button"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  border: 'none',
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: 0.8,
                }}
                onClick={onPrev}
                aria-label="Précédent"
              >
                ⏮
              </button>
              <button
                id="guide-play-pause-button"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  border: 'none',
                  fontSize: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: playing ? '#ef4444' : '#22c55e',
                  color: '#fff',
                }}
                onClick={onPlayPause}
                aria-label="Play/Pause"
              >
                {playing ? '⏸' : '▶️'}
              </button>
              <button
                id="guide-next-button"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  border: 'none',
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: 0.8,
                }}
                onClick={onNext}
                aria-label="Suivant"
              >
                ⏭
              </button>
            </div>
          </div>
        )}

        {mode === 'ambience' && !guideMode && (
          <div
            id="ambience-actions"
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Suggestions à venir…</div>
          </div>
        )}

        {mode === 'results' && level === 'peek' && (
          <div
            id="results-peek"
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {featured.map((p: any) => (
              <button
                key={p.id}
                id={`poi-chip-${p.id}`}
                onClick={() => handlePoiCardClick(p)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  background: '#f5f7fb',
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: 14 }}>
                  {p.category === 'Château' ? '🏰' :
                   p.category === 'Musée' ? '🏛️' :
                   p.category === 'Forêt' ? '🌲' :
                   p.category === 'Street Art' ? '🎨' :
                   p.category === 'Patrimoine' ? '🏛️' :
                   p.category === 'Balade' ? '🚶' : '📍'}
                </span>
                {p.name}
              </button>
            ))}
          </div>
        )}

        {mode === 'results' && (level === 'mid' || level === 'full') && (
          <div
            id="results-list"
            style={{
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              paddingBottom: 20,
              // Ne pas limiter la hauteur pour que le contenu garde sa taille naturelle
              // Le contenu sera masqué progressivement par overflow: hidden du parent
            }}
          >
            {sorted.map((p: any) => (
              <div
                key={p.id}
                id={`poi-card-${p.id}`}
                onClick={() => handlePoiCardClick(p)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  background: '#f5f7fb',
                  display: 'flex',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#eef2f7'
                  e.currentTarget.style.borderColor = '#cbd5e1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f5f7fb'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                }}
              >
                {/* Image miniature du POI */}
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, 
                      hsl(${(p.name || '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360}, 60%, 70%) 0%, 
                      hsl(${((p.name || '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) + 40) % 360}, 50%, 60%) 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 28 }}>
                    {p.category === 'Château' ? '🏰' :
                     p.category === 'Musée' ? '🏛️' :
                     p.category === 'Forêt' ? '🌲' :
                     p.category === 'Street Art' ? '🎨' :
                     p.category === 'Patrimoine' ? '🏛️' :
                     p.category === 'Balade' ? '🚶' : '📍'}
                  </span>
                </div>

                {/* Contenu texte */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{p.name}</div>
                  <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>
                    {p.shortDescription}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 'auto' }}>
                    {p.dist !== null && (
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                        📍 {p.dist} m
                      </span>
                    )}
                    {p.category && (
                      <span style={{ 
                        fontSize: 11, 
                        color: '#64748b', 
                        background: '#e2e8f0', 
                        padding: '2px 6px', 
                        borderRadius: 4 
                      }}>
                        {p.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bouton Play/Pause avec bordure pointillée */}
                <PlayPauseButton
                  isPlaying={playingPoiId === p.id}
                  onToggle={() => handlePoiPlayPause(p)}
                  size={44}
                />
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}
