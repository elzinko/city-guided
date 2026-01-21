import React, { useState } from 'react'
import { distanceMeters } from '../utils/distance'
import { Z_INDEX } from '../config/constants'
import type { MenuTab } from './BottomMenu'
import { ChapterPlayer } from './ChapterPlayer'
import { PoiHeader, PoiCarousel } from './poi'
import { GuidePlaceholder, PoiCard } from './shared'
import { useBottomSheetDrag, useBottomSheetHeight } from './bottom-sheet/hooks'
import type { PoiWithStory } from '../types/story'

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

export function BottomSheet({
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
  guideImage: _guideImage,  
  guideText,
  onPrev,
  onNext,
  onPlayPause,
  playing,
  isDesktop = false,
  selectedPoi = null,
  onSelectPoi,
  onClosePoi,
  onClose: _onClose,  
  onCenterOnPoi,
  onHeightChange,
  previousDiscoverLevel: _previousDiscoverLevel,  
}: Props) {
  // État pour suivre quel POI est en cours de lecture audio
  const [playingPoiId, setPlayingPoiId] = useState<string | null>(null)
  
  // État pour suivre le chapitre courant (pour afficher l'image du chapitre)
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  
  // Hooks pour gérer la hauteur et le drag
  const { height, bottom, getLevelHeight } = useBottomSheetHeight({
    level,
    menuVisible,
    devBlockHeight,
    isDesktop,
  })
  
  const { sheetRef, handlePointerDown } = useBottomSheetDrag({
    level,
    setLevel,
    menuVisible,
    devBlockHeight,
    selectedPoi,
    getLevelHeight,
    onHeightChange,
  })

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

  // Helper pour convertir les niveaux contextuels en niveaux de base pour les composants
  const getBaseLevel = (lvl: Level): 'peek' | 'mid' | 'full' => {
    if (lvl === 'searchResults' || lvl === 'poiFromSearch' || lvl === 'poiFromMap') {
      return 'full'
    }
    return lvl as 'peek' | 'mid' | 'full'
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

            {/* Carousel horizontal des chapitres (images + textes) */}
            <PoiCarousel
              id="poi-carousel"
              poi={selectedPoi}
              currentChapterIndex={currentChapterIndex}
              onChapterChange={(index) => setCurrentChapterIndex(index)}
            />

            {/* Lecteur de chapitres audio - contrôles de navigation */}
            <ChapterPlayer
              id="poi-chapter-player"
              poi={selectedPoi}
              speak={speak}
              stopSpeech={stopSpeech}
              pauseSpeech={pauseSpeech}
              resumeSpeech={resumeSpeech}
              compact={true}
              currentChapterIndex={currentChapterIndex}
              onChapterChange={(index) => setCurrentChapterIndex(index)}
            />

            {/* Petit espacement en bas pour le confort de scroll */}
            <div id="poi-details-spacer" style={{ height: 16 }} />
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
              <PoiCard
                key={p.id}
                poi={p}
                onClick={() => handlePoiCardClick(p)}
                variant="chip"
              />
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
            }}
          >
            {sorted.map((p: any) => (
              <PoiCard
                key={p.id}
                poi={p}
                isPlaying={playingPoiId === p.id}
                onPlayPause={() => handlePoiPlayPause(p)}
                onClick={() => handlePoiCardClick(p)}
              />
            ))}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}
