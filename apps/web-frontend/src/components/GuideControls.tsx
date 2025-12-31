import React from 'react'
import { Badge, ghostButtonStyle, primaryButtonStyle, secondaryButtonStyle, Toggle } from './ui'

export function GuideControls({
  loadOsrmRoute,
  routeStatus,
  osrmError,
  startSimulation,
  stopSimulation,
  isSimulating,
  simStep,
  simPath,
  speedFactor,
  setSpeedFactor,
  zoomLevel,
  setZoomLevel,
  simPaused,
  setSimPaused,
  setMapAlreadyCentered,
  setPos,
  pos,
  godMode,
  setGodMode,
  autoTts,
  setAutoTts,
  audioPaused,
  setAudioPaused,
  stopSpeech,
  centerRadiusMeters,
  setCenterRadiusMeters,
  recenterOnUser,
}: any) {
  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #1f2937',
        borderRadius: 16,
        padding: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Panneau développeur / simulation</div>
        <div style={{ color: osrmError ? '#fca5a5' : '#9ca3af', fontSize: 13 }}>{osrmError || routeStatus}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: '#9ca3af' }}>
          <Badge>{pos ? `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` : 'Position en attente'}</Badge>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={primaryButtonStyle} onClick={loadOsrmRoute}>
            Calculer une route OSRM
          </button>
          <button style={secondaryButtonStyle} onClick={startSimulation} disabled={isSimulating}>
            Lancer la simulation
          </button>
          <button style={ghostButtonStyle} onClick={() => setSimPaused((v: boolean) => !v)} disabled={!isSimulating}>
            {simPaused ? 'Reprendre' : 'Pause'} simulation
          </button>
          <button style={ghostButtonStyle} onClick={stopSimulation} disabled={!isSimulating}>
            Stop
          </button>
          <Badge>{`Étape ${Math.min(simStep + 1, simPath.length)}/${simPath.length || 1}`}</Badge>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Toggle checked={godMode} onChange={(v: boolean) => setGodMode(v)} label="Mode god (cercles)" />
          <Toggle checked={autoTts} onChange={(v: boolean) => setAutoTts(v)} label="Lecture auto" />
          <Toggle
            checked={!audioPaused}
            onChange={(v: boolean) => {
              setAudioPaused(!v)
              if (!v) stopSpeech()
            }}
            label="Audio en cours"
          />
          <button
            onClick={() => {
              setAudioPaused(true)
              stopSpeech()
            }}
            style={ghostButtonStyle}
          >
            Stop audio
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: '#9ca3af' }}>
            Vitesse
            <input
              type="range"
              min={0.25}
              max={10}
              step={0.25}
              value={speedFactor}
              onChange={(e) => setSpeedFactor(Math.max(0.25, Number(e.target.value) || 1))}
              style={{ marginLeft: 6, width: 140, verticalAlign: 'middle' }}
            />
            <span style={{ marginLeft: 6 }}>{speedFactor.toFixed(2)}×</span>
          </label>
          <label style={{ fontSize: 12, color: '#9ca3af' }}>
            Zoom suivi
            <input
              type="range"
              min={11}
              max={18}
              step={0.5}
              value={zoomLevel}
              onChange={(e) => {
                const z = Number(e.target.value) || 14
                setZoomLevel(z)
                try {
                  const map = (window as any)._le_map
                  if (map && map.setZoom) map.setZoom(z)
                } catch {
                  // ignore
                }
              }}
              style={{ marginLeft: 6, width: 140, verticalAlign: 'middle' }}
            />
            <span style={{ marginLeft: 6 }}>{zoomLevel}</span>
          </label>
          <label style={{ fontSize: 12, color: '#9ca3af' }}>
            Rayon recentrage (km)
            <input
              type="range"
              min={1}
              max={15}
              step={0.5}
              value={centerRadiusMeters / 1000}
              onChange={(e) => {
                const km = Number(e.target.value) || 5
                setCenterRadiusMeters(km * 1000)
              }}
              style={{ marginLeft: 6, width: 140, verticalAlign: 'middle' }}
            />
            <span style={{ marginLeft: 6 }}>{(centerRadiusMeters / 1000).toFixed(1)} km</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            style={ghostButtonStyle}
            onClick={() => {
              setMapAlreadyCentered(false)
              setPos({ lat: 48.402, lng: 2.6998 })
            }}
          >
            Recentrer sur Fontainebleau
          </button>
          <button style={ghostButtonStyle} onClick={recenterOnUser}>
            Centrer sur ma position
          </button>
        </div>
      </div>
    </div>
  )
}
