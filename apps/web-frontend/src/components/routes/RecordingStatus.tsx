import React from 'react'

export type RecordingStatusProps = {
  pointsCount: number
  duration: string
}

/**
 * Affichage du statut d'enregistrement en cours
 */
export function RecordingStatus({ pointsCount, duration }: RecordingStatusProps) {
  return (
    <div
      id="recording-status-container"
      style={{
        textAlign: 'center',
        padding: 12,
        background: '#fef2f2',
        borderRadius: 12,
        border: '1px solid #fecaca',
      }}
    >
      <div
        id="recording-status-indicator"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span
          id="recording-status-dot"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#dc2626',
            animation: 'pulse 1s infinite',
          }}
        />
        <span
          id="recording-status-label"
          style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}
        >
          Enregistrement
        </span>
      </div>
      <div
        id="recording-status-points"
        style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}
      >
        {pointsCount} pts
      </div>
      <div
        id="recording-status-duration"
        style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}
      >
        {duration}
      </div>
    </div>
  )
}

export default RecordingStatus
