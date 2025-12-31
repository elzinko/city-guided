import React from 'react'
import { Card, ghostButtonStyle } from './ui'

export function ResultsPanel({ visiblePois, speak }: any) {
  return (
    <Card>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Résultats sur la zone visible</div>
      {visiblePois.length === 0 && <div style={{ color: '#9ca3af' }}>Aucun POI dans la zone affichée.</div>}
      <div style={{ display: 'grid', gap: 10 }}>
        {visiblePois.map((p: any) => (
          <div
            key={p.id}
            style={{
              padding: 10,
              borderRadius: 10,
              border: '1px solid #1f2937',
              background: '#0b1220',
            }}
          >
            <div style={{ fontWeight: 600 }}>{p.name}</div>
            <div style={{ color: '#9ca3af', marginTop: 4 }}>{p.shortDescription}</div>
            <button style={ghostButtonStyle} onClick={() => speak(p.ttsText)} aria-label={`Lire ${p.name}`}>
              Lire (TTS)
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}
