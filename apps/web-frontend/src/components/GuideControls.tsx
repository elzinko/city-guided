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
        color: '#f8fafc',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Status section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ color: osrmError ? '#fca5a5' : '#9ca3af', fontSize: 13 }}>
            {osrmError || routeStatus}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge>{pos ? `📍 ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` : '📍 Position en attente'}</Badge>
            <Badge>{`🚗 Étape ${Math.min(simStep + 1, simPath.length)}/${simPath.length || 1}`}</Badge>
          </div>
        </div>

        {/* Simulation controls - grid layout for mobile */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 8,
          }}
        >
          <button style={{ ...primaryButtonStyle, width: '100%' }} onClick={loadOsrmRoute}>
            🗺️ Route OSRM
          </button>
          <button style={{ ...secondaryButtonStyle, width: '100%' }} onClick={startSimulation} disabled={isSimulating}>
            ▶️ Simuler
          </button>
          <button
            style={{ ...ghostButtonStyle, width: '100%' }}
            onClick={() => setSimPaused((v: boolean) => !v)}
            disabled={!isSimulating}
          >
            {simPaused ? '▶️ Reprendre' : '⏸️ Pause'}
          </button>
          <button style={{ ...ghostButtonStyle, width: '100%' }} onClick={stopSimulation} disabled={!isSimulating}>
            ⏹️ Stop
          </button>
        </div>

        {/* Toggles section - vertical on mobile */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 10,
            padding: '10px 0',
            borderTop: '1px solid #334155',
            borderBottom: '1px solid #334155',
          }}
        >
          <Toggle checked={godMode} onChange={(v: boolean) => setGodMode(v)} label="🔵 Zones POI" />
          <Toggle checked={autoTts} onChange={(v: boolean) => setAutoTts(v)} label="🔊 Lecture auto" />
          <Toggle
            checked={!audioPaused}
            onChange={(v: boolean) => {
              setAudioPaused(!v)
              if (!v) stopSpeech()
            }}
            label="🎵 Audio actif"
          />
          <button
            onClick={() => {
              setAudioPaused(true)
              stopSpeech()
            }}
            style={{ ...ghostButtonStyle, fontSize: 12, padding: '6px 10px' }}
          >
            🔇 Couper audio
          </button>
        </div>

        {/* Sliders section - stack vertically */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SliderControl
            label="⚡ Vitesse"
            value={speedFactor}
            min={0.25}
            max={10}
            step={0.25}
            displayValue={`${speedFactor.toFixed(1)}×`}
            onChange={(v) => setSpeedFactor(Math.max(0.25, v))}
          />
          <SliderControl
            label="🔍 Zoom"
            value={zoomLevel}
            min={11}
            max={18}
            step={0.5}
            displayValue={String(zoomLevel)}
            onChange={(v) => {
              setZoomLevel(v)
              try {
                const map = (window as any)._le_map
                if (map && map.setZoom) map.setZoom(v)
              } catch {
                // ignore
              }
            }}
          />
          <SliderControl
            label="📏 Rayon"
            value={centerRadiusMeters / 1000}
            min={1}
            max={15}
            step={0.5}
            displayValue={`${(centerRadiusMeters / 1000).toFixed(1)} km`}
            onChange={(v) => setCenterRadiusMeters(v * 1000)}
          />
        </div>

        {/* Quick actions */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 8,
          }}
        >
          <button
            style={{ ...ghostButtonStyle, width: '100%', fontSize: 12 }}
            onClick={() => {
              setMapAlreadyCentered(false)
              setPos({ lat: 48.402, lng: 2.6998 })
            }}
          >
            🏰 Fontainebleau
          </button>
          <button style={{ ...ghostButtonStyle, width: '100%', fontSize: 12 }} onClick={recenterOnUser}>
            📍 Ma position
          </button>
          <a
            href="/admin"
            style={{
              ...ghostButtonStyle,
              width: '100%',
              fontSize: 12,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✏️ Éditer POIs
          </a>
        </div>
      </div>
    </div>
  )
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  displayValue: string
  onChange: (v: number) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13,
        color: '#e2e8f0',
      }}
    >
      <span style={{ minWidth: 70, flexShrink: 0 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || min)}
        style={{
          flex: 1,
          minWidth: 80,
          accentColor: '#22c55e',
        }}
      />
      <span
        style={{
          minWidth: 50,
          textAlign: 'right',
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#94a3b8',
        }}
      >
        {displayValue}
      </span>
    </div>
  )
}
