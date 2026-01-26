import React from 'react'

export type MobileViewToggleProps = {
  showMap: boolean
  onShowFormulaire: () => void
  onShowMap: () => void
  pointsCount: number
}

/**
 * Toggle pour basculer entre la vue formulaire et la vue carte sur mobile
 */
export function MobileViewToggle({
  showMap,
  onShowFormulaire,
  onShowMap,
  pointsCount,
}: MobileViewToggleProps) {
  return (
    <div
      style={{
        display: 'flex',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '6px 12px',
      }}
    >
      <button
        onClick={onShowFormulaire}
        style={{
          flex: 1,
          padding: '8px 12px',
          borderRadius: 8,
          border: 'none',
          background: !showMap ? '#0f172a' : 'transparent',
          color: !showMap ? '#ffffff' : '#64748b',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        Formulaire
      </button>
      <button
        onClick={onShowMap}
        style={{
          flex: 1,
          padding: '8px 12px',
          borderRadius: 8,
          border: 'none',
          background: showMap ? '#0f172a' : 'transparent',
          color: showMap ? '#ffffff' : '#64748b',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        Carte ({pointsCount})
      </button>
    </div>
  )
}

export default MobileViewToggle
