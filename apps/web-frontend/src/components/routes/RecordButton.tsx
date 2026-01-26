import React from 'react'

export type RecordButtonProps = {
  isRecording: boolean
  onStart: () => void
  onStop: () => void
}

/**
 * Gros bouton d'enregistrement GPS
 */
export function RecordButton({ isRecording, onStart, onStop }: RecordButtonProps) {
  return (
    <div id="record-button-container" style={{ display: 'flex', justifyContent: 'center' }}>
      {isRecording ? (
        <button
          id="record-stop-btn"
          onClick={onStop}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: '4px solid #dc2626',
            background: '#fef2f2',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(220, 38, 38, 0.3)',
          }}
          title="Arrêter l'enregistrement"
          aria-label="Arrêter l'enregistrement"
        >
          {/* Carré stop */}
          <div
            id="record-stop-icon"
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              background: '#dc2626',
            }}
          />
        </button>
      ) : (
        <button
          id="record-start-btn"
          onClick={onStart}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: '4px solid #dc2626',
            background: '#dc2626',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(220, 38, 38, 0.3)',
          }}
          title="Démarrer l'enregistrement"
          aria-label="Démarrer l'enregistrement"
        >
          {/* Cercle intérieur */}
          <div
            id="record-start-icon"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#fef2f2',
            }}
          />
        </button>
      )}
    </div>
  )
}

export default RecordButton
