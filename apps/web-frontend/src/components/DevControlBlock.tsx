import React, { useState, useRef, useEffect } from 'react'
import { PlayerControls } from './PlayerControls'
import { Z_INDEX, SHOW_DEV_OPTIONS } from '../config/constants'

type RouteOption = {
  id: string
  name: string
  description?: string
  pointsCount?: number
}

type DevControlBlockProps = {
  // Virtual route state
  virtualRouteActive: boolean
  setVirtualRouteActive: (v: boolean) => void
  // Simulation state
  simStep: number
  simPath: any[]
  isSimulating: boolean
  simPaused: boolean
  speedFactor: number
  setSpeedFactor: (v: number) => void
  onPlayPause: () => void
  onPrevious?: () => void
  onNext?: () => void
  stopSimulation: () => void
  // Route selection
  routeOptions: RouteOption[]
  selectedRouteId: string
  onRouteSelect: (id: string) => void
  loadRoute: (id: string) => void
  routeStatus: string
  osrmError: string | null
  // Dev options
  pos: { lat: number; lng: number } | null
  godMode: boolean
  setGodMode: (v: boolean) => void
  audioPaused: boolean
  setAudioPaused: (v: boolean) => void
  pauseSpeech?: () => void
  resumeSpeech?: () => void
  zoomLevel: number
  setZoomLevel: (v: number) => void
  centerRadiusMeters: number
  setCenterRadiusMeters: (v: number) => void
  // UI callbacks
  onHeightChange?: (height: number) => void
  onBarHeightChange?: (height: number) => void // Hauteur de la barre uniquement (pour le bottom-menu)
  // Panel state (lifted from parent for persistence)
  panelOpen: boolean
  setPanelOpen: (v: boolean) => void
}

// Hauteur standard pour tous les boutons (comme dev-gear-button)
const BUTTON_HEIGHT = 36

// Style commun pour les boutons compacts - bordure visible #cbd5e1 (gris moyen)
const compactButtonStyle: React.CSSProperties = {
  height: BUTTON_HEIGHT,
  borderRadius: 8,
  border: '1px solid #cbd5e1', // Bordure plus visible (gris moyen au lieu de gris clair)
  background: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
  padding: '0 10px',
  fontSize: 11,
  fontWeight: 600,
}

// Style commun pour les selects compacts
// Note: Sur mobile, les dropdowns fixed peuvent mal se positionner
// transform: translateZ(0) crée un nouveau contexte de stacking pour corriger ce problème
const compactSelectStyle: React.CSSProperties = {
  height: BUTTON_HEIGHT,
  padding: '0 8px',
  borderRadius: 8,
  border: '1px solid #cbd5e1', // Bordure plus visible
  background: '#ffffff',
  fontSize: 11,
  fontWeight: 600,
  color: '#0f172a',
  cursor: 'pointer',
  WebkitAppearance: 'menulist', // Préserver l'apparence native sur Safari/Chrome
  MozAppearance: 'menulist', // Préserver l'apparence native sur Firefox
  appearance: 'menulist',
  // Forcer un nouveau contexte de stacking pour corriger les dropdowns sur mobile
  transform: 'translateZ(0)',
  WebkitTransform: 'translateZ(0)',
}

// Icône GPS/Navigation pour le simulateur
function GpsSimIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  )
}

// Icône Zone POI (cercle autour d'un marqueur)
function ZonePoiIcon({ size = 18, active = false }: { size?: number; active?: boolean }) {
  const color = active ? '#ef4444' : '#94a3b8'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Cercle de zone */}
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" strokeDasharray={active ? '0' : '3 3'} opacity={active ? 1 : 0.6} />
      {/* Marqueur POI au centre */}
      <path d="M12 7c-1.93 0-3.5 1.57-3.5 3.5 0 2.63 3.5 6.5 3.5 6.5s3.5-3.87 3.5-6.5C15.5 8.57 13.93 7 12 7z" fill={color} />
      <circle cx="12" cy="10.5" r="1.5" fill="white" />
    </svg>
  )
}

// Icône Audio (haut-parleur avec ou sans barre)
function AudioIcon({ size = 18, muted = false }: { size?: number; muted?: boolean }) {
  const color = muted ? '#94a3b8' : '#22c55e'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={muted ? 'none' : color} />
      {muted ? (
        <>
          {/* Barre de mute */}
          <line x1="23" y1="3" x2="3" y2="23" stroke={color} strokeWidth="2.5" />
        </>
      ) : (
        <>
          {/* Ondes sonores */}
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      )}
    </svg>
  )
}

// Icône Position GPS
function PositionIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#ef4444" stroke="#dc2626" />
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
  )
}

// Icône Validation (checkmark)
function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function DevControlBlock({
  virtualRouteActive,
  setVirtualRouteActive,
  simStep,
  simPath,
  isSimulating,
  simPaused,
  speedFactor,
  setSpeedFactor,
  onPlayPause,
  onPrevious,
  onNext,
  stopSimulation,
  routeOptions,
  selectedRouteId,
  onRouteSelect,
  loadRoute,
  routeStatus: _routeStatus, // eslint-disable-line @typescript-eslint/no-unused-vars
  osrmError: _osrmError, // eslint-disable-line @typescript-eslint/no-unused-vars
  pos,
  godMode,
  setGodMode,
  audioPaused,
  setAudioPaused,
  pauseSpeech,
  resumeSpeech,
  zoomLevel,
  setZoomLevel,
  centerRadiusMeters,
  setCenterRadiusMeters,
  onHeightChange,
  onBarHeightChange,
  panelOpen,
  setPanelOpen,
}: DevControlBlockProps) {
  const [copyFeedback, setCopyFeedback] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  // Mesurer la hauteur totale du panneau (barre + panneau dépliable si ouvert)
  useEffect(() => {
    if (containerRef.current && onHeightChange) {
      const height = containerRef.current.offsetHeight
      onHeightChange(height)
    }
  }, [panelOpen, virtualRouteActive]) // Retirer onHeightChange des dépendances

  // Mesurer la hauteur de la barre uniquement (pour le bottom-menu)
  useEffect(() => {
    const measureBarHeight = () => {
      if (barRef.current && onBarHeightChange) {
        const height = barRef.current.offsetHeight
        onBarHeightChange(height)
      }
    }
    
    // Mesurer immédiatement
    measureBarHeight()
    
    // Mesurer après un court délai pour s'assurer que le DOM est rendu
    const timeoutId = setTimeout(measureBarHeight, 0)
    
    return () => clearTimeout(timeoutId)
  }, [onBarHeightChange, panelOpen, virtualRouteActive])

  // Mesurer la hauteur totale au montage et après tout changement
  useEffect(() => {
    if (containerRef.current && onHeightChange) {
      // Mesurer après le rendu initial
      const timeoutId = setTimeout(() => {
        if (containerRef.current) {
          onHeightChange(containerRef.current.offsetHeight)
        }
      }, 50)
      return () => clearTimeout(timeoutId)
    }
  }, []) // Exécuter une seule fois au montage

  // Copier les coordonnées dans le presse-papier
  const copyCoordinates = () => {
    if (!pos) return
    const coords = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`
    navigator.clipboard.writeText(coords).then(() => {
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    }).catch(() => {
      const el = document.createElement('textarea')
      el.value = coords
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    })
  }

  // Options de rayon (en km)
  const radiusOptions = [0.5, 1, 1.5, 2, 3, 5, 10, 15]

  return (
    <div
      ref={containerRef}
      id="dev-control-block"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: Z_INDEX.devControlBlock,
        display: SHOW_DEV_OPTIONS ? 'flex' : 'none', // Masqué si SHOW_DEV_OPTIONS est false
        flexDirection: 'column',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      {/* Panneau développeur (dépliable) */}
      {panelOpen && (
        <div
          id="dev-panel-content"
          style={{
            borderTop: '1px solid #e2e8f0',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxHeight: '50vh',
            overflowY: 'auto',
          }}
        >
          {/* Bloc 1 : Sélection de trajet virtuel (toujours visible, désactivé si non actif) */}
          <div
            id="dev-virtual-route-block"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: virtualRouteActive ? 1 : 0.5,
              transition: 'opacity 0.2s ease',
            }}
          >
            {/* Sélecteur de route avec nombre de points intégré */}
            <select
              id="dev-route-selector"
              value={selectedRouteId}
              disabled={!virtualRouteActive}
              onChange={(e) => {
                onRouteSelect(e.target.value)
                loadRoute(e.target.value)
              }}
              style={{
                ...compactSelectStyle,
                flex: 1,
                background: virtualRouteActive ? '#dcfce7' : '#f8fafc',
                border: virtualRouteActive ? '1px solid #22c55e' : '1px solid #cbd5e1',
                color: virtualRouteActive ? '#166534' : '#94a3b8',
                cursor: virtualRouteActive ? 'pointer' : 'not-allowed',
              }}
            >
              {routeOptions.map((route: RouteOption) => (
                <option key={route.id} value={route.id}>
                  ({route.pointsCount || simPath.length} pts) {route.name}
                </option>
              ))}
            </select>

            {/* Bouton édition des trajets */}
            <a
              id="dev-edit-routes-link"
              href="/admin/routes"
              style={{
                ...compactButtonStyle,
                textDecoration: 'none',
                width: BUTTON_HEIGHT,
                padding: 0,
                border: virtualRouteActive ? '1px solid #8b5cf6' : '1px solid #cbd5e1',
                background: virtualRouteActive ? '#f5f3ff' : '#f8fafc',
                color: virtualRouteActive ? '#7c3aed' : '#94a3b8',
              }}
              title="Éditer les trajets virtuels"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </a>
          </div>

          {/* Séparateur */}
          <div style={{ height: 1, background: '#e2e8f0' }} />

          {/* Bloc 2 : Options dev (Coordonnées, Zones, Audio, etc.) */}
          <div id="dev-toolbar" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Coordonnées GPS */}
            <button
              id="dev-copy-coords-button"
              onClick={copyCoordinates}
              style={{
                ...compactButtonStyle,
                fontFamily: 'monospace',
                color: '#64748b',
                gap: 6,
                minWidth: 130,
              }}
              title="Cliquer pour copier"
            >
              {copyFeedback ? <CheckIcon size={14} /> : <PositionIcon size={14} />}
              <span>{pos ? `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` : '...'}</span>
            </button>

            {/* Séparateur */}
            <div style={{ width: 1, height: BUTTON_HEIGHT - 8, background: '#e2e8f0' }} />

            {/* Toggle Zones POI */}
            <button
              id="dev-god-mode-toggle"
              onClick={() => setGodMode(!godMode)}
              style={{
                ...compactButtonStyle,
                width: BUTTON_HEIGHT,
                padding: 0,
                border: godMode ? '1px solid #ef4444' : '1px solid #cbd5e1',
                background: godMode ? '#fef2f2' : '#ffffff',
              }}
              title={godMode ? 'Masquer les zones POI' : 'Afficher les zones POI'}
            >
              <ZonePoiIcon size={20} active={godMode} />
            </button>

            {/* Audio toggle */}
            <button
              id="dev-audio-toggle"
              onClick={() => {
                const newPaused = !audioPaused
                setAudioPaused(newPaused)
                if (newPaused && pauseSpeech) pauseSpeech()
                else if (!newPaused && resumeSpeech) resumeSpeech()
              }}
              style={{
                ...compactButtonStyle,
                width: BUTTON_HEIGHT,
                padding: 0,
                border: audioPaused ? '1px solid #cbd5e1' : '1px solid #22c55e',
                background: audioPaused ? '#ffffff' : '#dcfce7',
              }}
              title={audioPaused ? 'Activer l\'audio' : 'Couper l\'audio'}
            >
              <AudioIcon size={18} muted={audioPaused} />
            </button>

            {/* Zoom control avec boutons +/- */}
            <div id="dev-zoom-control" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                onClick={() => {
                  const newZoom = Math.max(10, zoomLevel - 1)
                  setZoomLevel(newZoom)
                  try {
                    const map = (window as any)._le_map
                    if (map && map.setZoom) map.setZoom(newZoom)
                  } catch { /* ignore */ }
                }}
                style={{
                  ...compactButtonStyle,
                  width: 28,
                  padding: 0,
                  borderRadius: '8px 0 0 8px',
                  borderRight: 'none',
                }}
                title="Zoom arrière"
              >
                −
              </button>
              <div
                style={{
                  height: BUTTON_HEIGHT,
                  padding: '0 8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderLeft: 'none',
                  borderRight: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#64748b',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                {zoomLevel}
              </div>
              <button
                onClick={() => {
                  const newZoom = Math.min(19, zoomLevel + 1)
                  setZoomLevel(newZoom)
                  try {
                    const map = (window as any)._le_map
                    if (map && map.setZoom) map.setZoom(newZoom)
                  } catch { /* ignore */ }
                }}
                style={{
                  ...compactButtonStyle,
                  width: 28,
                  padding: 0,
                  borderRadius: '0 8px 8px 0',
                  borderLeft: 'none',
                }}
                title="Zoom avant"
              >
                +
              </button>
            </div>

            {/* Radius control avec boutons +/- */}
            <div id="dev-radius-control" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                onClick={() => {
                  const currentValue = centerRadiusMeters / 1000
                  const currentIndex = radiusOptions.indexOf(currentValue)
                  const actualIndex = currentIndex >= 0 ? currentIndex : radiusOptions.findIndex(opt => opt >= currentValue)
                  if (actualIndex > 0) {
                    setCenterRadiusMeters(radiusOptions[actualIndex - 1] * 1000)
                  }
                }}
                style={{
                  ...compactButtonStyle,
                  width: 28,
                  padding: 0,
                  borderRadius: '8px 0 0 8px',
                  borderRight: 'none',
                }}
                title="Réduire le rayon de recherche"
              >
                −
              </button>
              <div
                style={{
                  height: BUTTON_HEIGHT,
                  padding: '0 6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderLeft: 'none',
                  borderRight: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#64748b',
                  minWidth: 48,
                  justifyContent: 'center',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
                {isNaN(centerRadiusMeters) ? '0.5' : (centerRadiusMeters / 1000).toFixed(1).replace('.0', '')}km
              </div>
              <button
                onClick={() => {
                  const currentValue = centerRadiusMeters / 1000
                  const currentIndex = radiusOptions.indexOf(currentValue)
                  const actualIndex = currentIndex >= 0 ? currentIndex : radiusOptions.findIndex(opt => opt >= currentValue)
                  if (actualIndex < radiusOptions.length - 1) {
                    setCenterRadiusMeters(radiusOptions[actualIndex + 1] * 1000)
                  }
                }}
                style={{
                  ...compactButtonStyle,
                  width: 28,
                  padding: 0,
                  borderRadius: '0 8px 8px 0',
                  borderLeft: 'none',
                }}
                title="Augmenter le rayon de recherche"
              >
                +
              </button>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Lien édition POIs */}
            <a
              id="dev-edit-pois-link"
              href="/admin"
              style={{
                ...compactButtonStyle,
                textDecoration: 'none',
                border: '1px solid #3b82f6',
                background: '#eff6ff',
                color: '#3b82f6',
              }}
              title="Éditer les POIs"
            >
              ✏️ POIs
            </a>
          </div>
        </div>
      )}

      {/* Barre principale : toggle trajet virtuel + contrôles GPS + bouton dev */}
      <div
        ref={barRef}
        id="dev-control-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          minHeight: 52,
        }}
      >
        {/* Toggle trajet virtuel (toujours visible, remplace l'ancienne icône GPS) */}
        <div
          id="dev-virtual-route-toggle"
          onClick={() => {
            const newValue = !virtualRouteActive
            setVirtualRouteActive(newValue)
            setPanelOpen(newValue) // Ouvrir le panneau si trajets activés, fermer si désactivés
            if (!newValue && isSimulating) stopSimulation()
          }}
          style={{
            ...compactButtonStyle,
            gap: 6,
            padding: '0 10px',
            background: virtualRouteActive ? '#dcfce7' : '#ffffff',
            border: virtualRouteActive ? '1px solid #22c55e' : '1px solid #e2e8f0',
            cursor: 'pointer',
          }}
          title={virtualRouteActive ? 'Désactiver le trajet virtuel' : 'Activer le trajet virtuel'}
        >
          <GpsSimIcon size={16} />
          <div
            id="dev-virtual-route-switch"
            style={{
              width: 36,
              height: 20,
              borderRadius: 10,
              background: virtualRouteActive ? '#22c55e' : '#e2e8f0',
              border: virtualRouteActive ? '1px solid #16a34a' : '1px solid #cbd5e1',
              position: 'relative',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 2,
                left: virtualRouteActive ? 18 : 2,
                width: 16,
                height: 16,
                borderRadius: 8,
                background: '#fff',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            />
          </div>
        </div>

        {/* Contrôles du simulateur GPS - visible uniquement si virtualRouteActive */}
        {virtualRouteActive && (
          <>
            {/* Séparateur */}
            <div style={{ width: 1, height: BUTTON_HEIGHT - 8, background: '#e2e8f0' }} />

            {/* Indicateur de position sur le trajet (si trajet virtuel actif) */}
            {simPath.length > 0 && (
              <div
                id="dev-route-indicator"
                style={{
                  ...compactButtonStyle,
                  background: '#dcfce7',
                  border: '1px solid #22c55e',
                  color: '#166534',
                  minWidth: 50,
                }}
              >
                {simStep + 1}/{simPath.length}
              </div>
            )}

            {/* Contrôles de lecture */}
            <PlayerControls
              playing={isSimulating && !simPaused}
              onPlayPause={onPlayPause}
              onPrevious={onPrevious}
              onNext={onNext}
              variant="square"
              size="small"
              buttonStyle={{
                height: BUTTON_HEIGHT,
                width: BUTTON_HEIGHT,
                borderRadius: 8,
              }}
            />

            {/* Vitesse */}
            <select
              id="dev-speed-select"
              value={speedFactor}
              onChange={(e) => setSpeedFactor(Number(e.target.value))}
              style={{ ...compactSelectStyle, minWidth: 55 }}
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={5}>5×</option>
              <option value={10}>10×</option>
              <option value={20}>20×</option>
            </select>

            {/* Séparateur */}
            <div style={{ width: 1, height: BUTTON_HEIGHT - 8, background: '#e2e8f0' }} />
          </>
        )}

        {/* Spacer pour pousser le bouton à droite */}
        <div style={{ flex: 1 }} />

        {/* Bouton engrenage */}
        <button
          id="dev-gear-button"
          onClick={() => setPanelOpen(!panelOpen)}
          style={{
            ...compactButtonStyle,
            width: BUTTON_HEIGHT,
            padding: 0,
            border: panelOpen ? '2px solid #3b82f6' : '1px solid #cbd5e1',
            background: panelOpen ? '#eff6ff' : '#ffffff',
          }}
          aria-label="Développeur"
        >
          <img
            src="/images/gear-icon.png"
            alt="Développeur"
            width="20"
            height="20"
            style={{ display: 'block', objectFit: 'contain' }}
          />
        </button>
      </div>
    </div>
  )
}
