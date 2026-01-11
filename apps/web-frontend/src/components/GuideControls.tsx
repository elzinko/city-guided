import React, { useState } from 'react'
import { Badge, Toggle } from './ui'
// PlayerControls retiré - les contrôles de lecture sont maintenant dans GpsPlayer en bas de la carte

type RouteOption = {
  id: string
  name: string
  description?: string
}

export function GuideControls({
  routeOptions,
  selectedRouteId,
  onRouteSelect,
  loadRoute,
  routeStatus,
  osrmError,
  startSimulation: _startSimulation, // eslint-disable-line @typescript-eslint/no-unused-vars
  isSimulating,
  simStep,
  simPath,
  speedFactor: _speedFactor, // eslint-disable-line @typescript-eslint/no-unused-vars
  setSpeedFactor: _setSpeedFactor, // eslint-disable-line @typescript-eslint/no-unused-vars
  zoomLevel,
  setZoomLevel,
  simPaused: _simPaused, // eslint-disable-line @typescript-eslint/no-unused-vars
  setSimPaused: _setSimPaused, // eslint-disable-line @typescript-eslint/no-unused-vars
  setMapAlreadyCentered: _setMapAlreadyCentered, // eslint-disable-line @typescript-eslint/no-unused-vars
  setPos: _setPos, // eslint-disable-line @typescript-eslint/no-unused-vars
  pos,
  godMode,
  setGodMode,
  autoTts: _autoTts, // eslint-disable-line @typescript-eslint/no-unused-vars
  setAutoTts: _setAutoTts, // eslint-disable-line @typescript-eslint/no-unused-vars
  audioPaused,
  setAudioPaused,
  audioGuideActive: _audioGuideActive, // eslint-disable-line @typescript-eslint/no-unused-vars
  setAudioGuideActive: _setAudioGuideActive, // eslint-disable-line @typescript-eslint/no-unused-vars
  stopSpeech: _stopSpeech, // eslint-disable-line @typescript-eslint/no-unused-vars
  pauseSpeech,
  resumeSpeech,
  centerRadiusMeters,
  setCenterRadiusMeters,
  recenterOnUser: _recenterOnUser, // eslint-disable-line @typescript-eslint/no-unused-vars
  onPrevPoi: _onPrevPoi, // eslint-disable-line @typescript-eslint/no-unused-vars
  onNextPoi: _onNextPoi, // eslint-disable-line @typescript-eslint/no-unused-vars
  virtualRouteActive,
  setVirtualRouteActive,
  stopSimulation,
}: any) {
  const [copyFeedback, setCopyFeedback] = useState(false)

  // Copier les coordonnées dans le presse-papier
  const copyCoordinates = () => {
    if (!pos) return
    const coords = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`
    navigator.clipboard.writeText(coords).then(() => {
      // Feedback visuel temporaire
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    }).catch(() => {
      // Fallback : sélectionner le texte du bouton
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Barre d'outils : coordonnées GPS + lien admin */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Coordonnées GPS cliquables pour copier */}
        <button
          onClick={copyCoordinates}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            fontSize: 11,
            color: '#64748b',
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
          title="Cliquer pour copier les coordonnées"
        >
          📍 {pos ? `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` : 'Position en attente'}
        </button>
        
        {/* Message de confirmation de copie */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            background: '#22c55e',
            color: 'white',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 500,
            opacity: copyFeedback ? 1 : 0,
            transform: copyFeedback ? 'translateX(0)' : 'translateX(-10px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            pointerEvents: 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Copié !
        </div>
        {/* Bouton Éditer POIs */}
        <a
          href="/admin"
          style={{
            padding: '4px',
            borderRadius: 6,
            border: '1px solid #d4d9e1',
            background: '#ffffff',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            marginLeft: 'auto',
          }}
          title="Éditer les POIs"
        >
          <img
            src="/images/gear-icon.png"
            alt="Éditer POIs"
            width="16"
            height="16"
            style={{ display: 'block', objectFit: 'contain' }}
          />
        </a>
      </div>

      {/* Bloc Trajet Virtuel avec bordure */}
      <div
        style={{
          border: '2px solid ' + (virtualRouteActive ? '#22c55e' : '#e2e8f0'),
          borderRadius: 10,
          padding: 12,
          background: virtualRouteActive ? '#f0fdf4' : '#ffffff',
          transition: 'all 0.2s ease',
        }}
      >
        {/* En-tête avec toggle à droite */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            cursor: 'pointer',
          }}
          onClick={() => {
            const newValue = !virtualRouteActive
            setVirtualRouteActive(newValue)
            if (!newValue && isSimulating) {
              stopSimulation()
            }
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>🚗 Trajet virtuel</span>
          {/* Toggle switch */}
          <div
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              background: virtualRouteActive ? '#22c55e' : '#94a3b8',
              position: 'relative',
              transition: 'background 0.2s ease',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 2,
                left: virtualRouteActive ? 20 : 2,
                width: 18,
                height: 18,
                borderRadius: 9,
                background: '#fff',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </div>
        </div>

        {/* Sélecteur de route et contrôles - visible uniquement si trajet virtuel actif */}
        {virtualRouteActive && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12, paddingTop: 10, borderTop: '1px solid #d4d9e1' }}>
            {/* Status de la route + étape en cours */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div
                style={{
                  color: osrmError ? '#dc2626' : '#166534',
                  fontSize: 12,
                  fontWeight: 500,
                  flex: 1,
                }}
              >
                {osrmError || routeStatus}
              </div>
              <Badge>{`🚗 ${Math.min(simStep + 1, simPath.length)}/${simPath.length || 1}`}</Badge>
            </div>

            {/* Select avec style personnalisé */}
            <div style={{ position: 'relative', width: '100%' }}>
              <select
                id="route-selector"
                data-testid="route-selector"
                value={selectedRouteId}
                onChange={(e) => {
                  onRouteSelect(e.target.value)
                  loadRoute(e.target.value)
                }}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 14px',
                  borderRadius: 10,
                  border: '2px solid #22c55e',
                  background: '#f0fdf4',
                  color: '#0f172a',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  outline: 'none',
                }}
              >
                {routeOptions.map((route: RouteOption) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
              {/* Flèche dropdown personnalisée */}
              <div
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#22c55e',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {/* Note: Les contrôles de lecture (play/pause/vitesse) sont dans le GpsPlayer en bas de la carte */}
          </div>
        )}
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Toggle checked={godMode} onChange={(v: boolean) => setGodMode(v)} label="Zones POI" />
          {/* Bouton mute audio avec icône SVG */}
          <button
            onClick={() => {
              const newPaused = !audioPaused
              setAudioPaused(newPaused)
              if (newPaused) {
                if (pauseSpeech) pauseSpeech()
              } else {
                if (resumeSpeech) resumeSpeech()
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 8,
              border: 'none',
              background: audioPaused ? '#ef4444' : '#22c55e',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: '#ffffff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            {audioPaused ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
            {audioPaused ? 'Muet' : 'Audio'}
          </button>
        </div>

        {/* Sliders compacts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
          <span style={{ color: '#64748b', minWidth: 50 }}>🔍 Zoom</span>
          <input
            type="range"
            min={11}
            max={18}
            step={0.5}
            value={zoomLevel}
            onChange={(e) => {
              const v = Number(e.target.value)
              setZoomLevel(v)
              try {
                const map = (window as any)._le_map
                if (map && map.setZoom) map.setZoom(v)
              } catch {
                // ignore
              }
            }}
            style={{ flex: 1, height: 3, accentColor: '#3b82f6' }}
          />
          <span style={{ color: '#64748b', minWidth: 20 }}>{zoomLevel}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
          <span style={{ color: '#64748b', minWidth: 50 }}>📏 Rayon</span>
          <input
            type="range"
            min={1}
            max={15}
            step={0.5}
            value={centerRadiusMeters / 1000}
            onChange={(e) => setCenterRadiusMeters(Number(e.target.value) * 1000)}
            style={{ flex: 1, height: 3, accentColor: '#3b82f6' }}
          />
          <span style={{ color: '#64748b', minWidth: 35 }}>{(centerRadiusMeters / 1000).toFixed(1)}km</span>
        </div>
      </div>
    </div>
  )
}
