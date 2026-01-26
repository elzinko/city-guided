import React from 'react'

export type NewRouteButtonProps = {
  onClick: () => void
}

/**
 * Bouton pour créer un nouveau trajet
 * Style distinctif avec bordure en pointillés
 */
export function NewRouteButton({ onClick }: NewRouteButtonProps) {
  return (
    <button
      id="new-route-btn"
      onClick={onClick}
      style={{
        width: '100%',
        padding: 14,
        borderRadius: 10,
        border: '2px dashed #22c55e',
        background: '#f0fdf4',
        color: '#166534',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#dcfce7'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#f0fdf4'
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Nouveau trajet
    </button>
  )
}

export default NewRouteButton
