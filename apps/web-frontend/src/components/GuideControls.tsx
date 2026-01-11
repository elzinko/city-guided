import React from 'react'
import { Badge, ghostButtonStyle, Toggle } from './ui'
import { PlayerControls } from './PlayerControls'

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
	  startSimulation,
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
  audioGuideActive,
  setAudioGuideActive,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  centerRadiusMeters,
  setCenterRadiusMeters,
  recenterOnUser,
  onPrevPoi,
  onNextPoi,
}: any) {
  // Handle play/pause pour le simulateur GPS uniquement
  const handleSimulationPlayPause = () => {
    if (!isSimulating) {
      startSimulation()
    } else {
      setSimPaused((v) => !v)
    }
  }

  // Handle play/pause pour l'audio uniquement
  const handleAudioPlayPause = () => {
    // Si l'audio guide n'est pas activé, l'activer explicitement
    if (!audioGuideActive) {
      setAudioGuideActive(true)
      setAutoTts(true)
      setAudioPaused(false)
      return
    }

    // Sinon, toggle pause/resume
    const newPaused = !audioPaused
    setAudioPaused(newPaused)
    
    if (newPaused) {
      // Mettre en pause l'audio sans l'annuler
      if (pauseSpeech) {
        pauseSpeech()
      }
    } else {
      // Reprendre l'audio au même endroit
      try {
        if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
          const synth = (window as any).speechSynthesis
          // Si la synthèse est en pause, la reprendre
          if (synth.paused) {
            if (resumeSpeech) {
              resumeSpeech()
            } else {
              synth.resume()
            }
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Status section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              color: osrmError ? '#dc2626' : '#64748b',
              fontSize: 13,
              fontWeight: 500,
              padding: '8px 12px',
              background: osrmError ? '#fef2f2' : '#f1f5f9',
              borderRadius: 8,
            }}
          >
            {osrmError || routeStatus}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <Badge>{pos ? `📍 ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` : '📍 Position en attente'}</Badge>
            <Badge>{`🚗 Étape ${Math.min(simStep + 1, simPath.length)}/${simPath.length || 1}`}</Badge>
            {/* Bouton Éditer POIs en haut à droite */}
            <a
              href="/admin"
              style={{
                padding: '6px',
                borderRadius: 8,
                border: '1px solid #d4d9e1',
                background: '#ffffff',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                transition: 'all 0.2s',
                marginLeft: 'auto',
              }}
              title="Éditer les POIs"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9'
                e.currentTarget.style.borderColor = '#94a3b8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff'
                e.currentTarget.style.borderColor = '#d4d9e1'
              }}
            >
              <img
                src="/images/gear-icon.png"
                alt="Éditer POIs"
                width="18"
                height="18"
                style={{
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            </a>
          </div>
      </div>

      {/* Route selection */}
      <div style={{ marginBottom: 12, position: 'relative' }}>
          <select
            value={selectedRouteId}
            onChange={(e) => {
              onRouteSelect(e.target.value)
              loadRoute(e.target.value)
            }}
	            style={{
	              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #d4d9e1',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: 500,
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
	              backgroundPosition: 'right 12px center',
	              paddingRight: '36px',
	              position: 'relative',
	              zIndex: 1,
	            }}
          >
            {routeOptions.map((route: RouteOption) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </select>
      </div>

      {/* Simulation controls - Player controls avec précédent/suivant (simulateur GPS uniquement) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ 
          fontSize: 14, 
          color: '#0f172a', 
          fontWeight: 600, 
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
        }}>
          Simulateur GPS
        </div>
        <PlayerControls
          playing={isSimulating && !simPaused}
          onPlayPause={handleSimulationPlayPause}
          onPrevious={simPath.length > 0 && simStep > 0 ? onPrevPoi : undefined}
          onNext={simPath.length > 0 && simStep < simPath.length - 1 ? onNextPoi : undefined}
          variant="square"
          size="medium"
        />
      </div>

      {/* Contrôle audio séparé */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ 
          fontSize: 14, 
          color: '#0f172a', 
          fontWeight: 600, 
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
        }}>
          Navigation
        </div>
        <PlayerControls
          playing={audioGuideActive && !audioPaused && autoTts}
          onPlayPause={handleAudioPlayPause}
          variant="square"
          size="medium"
        />
      </div>

      {/* Toggles section - simplified audio controls */}
      <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 8,
            padding: '8px 0',
            borderTop: '1px solid #e2e8f0',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <Toggle checked={godMode} onChange={(v: boolean) => setGodMode(v)} label="Zones POI" />
          <Toggle
            checked={audioGuideActive && autoTts && !audioPaused}
            onChange={(v: boolean) => {
              if (v) {
                // Activer l'audio guide explicitement
                setAudioGuideActive(true)
                setAutoTts(true)
                setAudioPaused(false)
              } else {
                // Désactiver l'audio guide
                setAudioGuideActive(false)
                setAutoTts(false)
                setAudioPaused(true)
                if (stopSpeech) stopSpeech()
              }
            }}
            label="Lecture audio"
          />
      </div>

      {/* Sliders section */}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <SliderControl
            label="📏 Rayon"
            value={centerRadiusMeters / 1000}
            min={1}
            max={15}
            step={0.5}
            displayValue={`${(centerRadiusMeters / 1000).toFixed(1)} km`}
            onChange={(v) => setCenterRadiusMeters(v * 1000)}
          />
          <div style={{ fontSize: 11, color: '#94a3b8', paddingLeft: 80, fontStyle: 'italic' }}>
            Rayon de détection des POIs autour de la position
          </div>
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
            style={{
              ...ghostButtonStyle,
              width: '100%',
              fontSize: 12,
            }}
            onClick={() => {
              setMapAlreadyCentered(false)
              setPos({ lat: 48.402, lng: 2.6998 })
            }}
          >
            🏰 Fontainebleau
          </button>
          <button
            style={{
              ...ghostButtonStyle,
              width: '100%',
              fontSize: 12,
            }}
            onClick={recenterOnUser}
          >
            📍 Ma position
          </button>
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
      <span style={{ minWidth: 70, flexShrink: 0, color: '#0f172a', fontWeight: 500 }}>
        {label}
      </span>
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
          color: '#64748b',
          fontWeight: 600,
        }}
      >
        {displayValue}
      </span>
    </div>
  )
}
