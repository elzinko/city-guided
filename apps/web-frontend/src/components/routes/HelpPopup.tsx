import React from 'react'

export type HelpPopupProps = {
  isOpen: boolean
  onClose: () => void
}

/**
 * Popup d'aide pour les trajets virtuels
 */
export function HelpPopup({ isOpen, onClose }: HelpPopupProps) {
  if (!isOpen) return null

  return (
    <div
      id="help-popup-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        id="help-popup-content"
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 20,
          width: '100%',
          maxWidth: 320,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div id="help-popup-header" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            id="help-popup-icon"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            ?
          </div>
          <h2 id="help-popup-title" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            Aide
          </h2>
        </div>
        
        {/* Contenu */}
        <div id="help-popup-body" style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
          <p id="help-gpx-info" style={{ margin: '0 0 12px' }}>
            <strong style={{ color: '#0f172a' }}>GPX</strong><br />
            Format GPS standard, exportable depuis la plupart des applications GPS 
            (Geo Tracker, GPX.studio, Strava...).
          </p>
          <p id="help-recorder-info" style={{ margin: '0 0 12px' }}>
            <strong style={{ color: '#0f172a' }}>Recorder</strong><br />
            Enregistrez vos parcours en temps réel avec le GPS de votre téléphone.
          </p>
          <p id="help-map-info" style={{ margin: 0 }}>
            <strong style={{ color: '#0f172a' }}>Carte</strong><br />
            Cliquez sur la carte pour ajouter des points. Glissez les marqueurs pour les déplacer.
          </p>
        </div>

        {/* Bouton fermer */}
        <button
          id="help-popup-close-btn"
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            padding: 12,
            borderRadius: 10,
            border: 'none',
            background: '#0f172a',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Compris
        </button>
      </div>
    </div>
  )
}

export default HelpPopup
