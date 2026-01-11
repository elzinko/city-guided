import React from 'react'

type Props = {
  poiName: string
  poiImage?: string
  currentText: string
  onMuteToggle?: () => void
  isMuted?: boolean
}

export function NavigationPanel({
  poiName,
  poiImage,
  currentText,
  onMuteToggle,
  isMuted,
}: Props) {
  return (
    <div
      id="navigation-panel"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '33vh',
        zIndex: 99997,
        background: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid #334155',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* En-tête avec nom du POI */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, margin: 0 }}>
          {poiName}
        </h3>
      </div>

      {/* Contenu principal */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 12, gap: 12 }}>
        {/* Image à gauche */}
        {poiImage && (
          <div
            style={{
              width: 120,
              height: '100%',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#1e293b',
              flexShrink: 0,
            }}
          >
            <img
              src={poiImage}
              alt={poiName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Description à droite */}
        <div
          style={{
            flex: 1,
            color: '#cbd5e1',
            fontSize: 14,
            lineHeight: 1.5,
            overflowY: 'auto',
          }}
        >
          {currentText || 'En attente du prochain point d\'intérêt...'}
        </div>
      </div>

      {/* Barre du bas avec bouton mute */}
      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
        }}
      >
        {onMuteToggle && (
          <button
            onClick={onMuteToggle}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              background: isMuted ? '#ef4444' : '#22c55e',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            {isMuted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
            {isMuted ? 'Muet' : 'Audio'}
          </button>
        )}
      </div>
    </div>
  )
}
