import React from 'react'
import { Card, ghostButtonStyle } from './ui'

type ResultsPanelProps = {
  id?: string
  visiblePois: any[]
  speak: (text: string) => void
}

export function ResultsPanel({ id, visiblePois, speak }: ResultsPanelProps) {
  return (
    <Card id={id}>
      <div id="results-panel-header" style={{ fontWeight: 700, marginBottom: 10 }}>Résultats sur la zone visible</div>
      {visiblePois.length === 0 && <div id="results-panel-empty" style={{ color: '#9ca3af' }}>Aucun POI dans la zone affichée.</div>}
      <div id="results-panel-list" style={{ display: 'grid', gap: 10 }}>
        {visiblePois.map((p: any) => (
          <div
            key={p.id}
            id={`results-panel-item-${p.id}`}
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
