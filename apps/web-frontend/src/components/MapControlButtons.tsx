import React from 'react'
import { PlayButton } from './PlayButton'
import { GpsIcon } from './GpsIcon'
import { Z_INDEX } from '../config/constants'

type MapControlButtonsProps = {
  id?: string
  gpsBottom: string | number
  gpsHidden: boolean
  hasGps: boolean
  guideMode: boolean
  activeStory: { poiId: string; segmentIdx: number } | null
  onRecenterUser: () => void
  onPlayPause: () => void
}

/**
 * Boutons de contrôle flottants à droite de la carte (GPS + Play)
 * Positionnés au-dessus du bottom-sheet et du menu
 */
export function MapControlButtons({
  id = 'map-control-buttons',
  gpsBottom,
  gpsHidden,
  hasGps,
  guideMode,
  activeStory,
  onRecenterUser,
  onPlayPause,
}: MapControlButtonsProps) {
  return (
    <div
      id={id}
      style={{
        position: 'fixed',
        right: 16,
        bottom: gpsBottom,
        zIndex: Z_INDEX.mapControlButtons,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none', // Conteneur ne bloque pas les interactions
      }}
    >
      {/* Bouton GPS - masqué si le panneau est trop haut */}
      {!gpsHidden && (
        <button
          id={`${id}-gps-button`}
          onClick={onRecenterUser}
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            pointerEvents: 'auto', // Bouton cliquable malgré conteneur pointer-events: none
          }}
          aria-label="Recentrer sur ma position"
        >
          <GpsIcon id={`${id}-gps-icon`} hasGps={hasGps} />
        </button>
      )}
      
      {/* Bouton Play/Stop - masqué quand le StoryPanel est visible (il a son propre bouton Stop) */}
      {!(guideMode && activeStory) && (
        <div id={`${id}-play-wrapper`} style={{ pointerEvents: 'auto' }}>
          <PlayButton
            id={`${id}-play-button`}
            playing={guideMode}
            onPlayPause={onPlayPause}
            variant="square"
            size="medium"
            ariaLabel={guideMode ? 'Arrêter la visite guidée' : 'Démarrer la visite guidée'}
          />
        </div>
      )}
    </div>
  )
}
