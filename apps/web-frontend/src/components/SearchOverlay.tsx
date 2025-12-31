import React from 'react'
import { Chip, ghostButtonStyle } from './ui'

type Props = {
  query: string
  setQuery: (v: string) => void
  searchActive: boolean
  setSearchActive: (v: boolean) => void
  setSearchReady?: (v: boolean) => void
  onQuickSelect?: (value: string) => void
}

export function SearchOverlay({ query, setQuery, searchActive, setSearchActive, setSearchReady, onQuickSelect }: Props) {
  const suggestions = ['Château', 'Musée', 'Forêt', 'Street Art', 'Patrimoine', 'Balade']
  const markReady = () => {
    if (setSearchReady) setSearchReady(true)
  }
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          zIndex: 12005,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#0b1220',
            borderRadius: 12,
            border: '1px solid #1f2937',
            padding: '8px 10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          <input
            placeholder="Rechercher un lieu, une adresse…"
            value={query}
            onFocus={() => setSearchActive(true)}
            onChange={(e) => {
              setQuery(e.target.value)
              markReady()
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#e5e7eb',
              outline: 'none',
              fontSize: 14,
            }}
          />
          <button style={ghostButtonStyle}>🎤</button>
        </div>
        {!searchActive && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {suggestions.map((s) => (
              <Chip
                key={s}
                active={false}
                onClick={() => {
                  setQuery(s)
                  markReady()
                  if (onQuickSelect) onQuickSelect(s)
                }}
              >
                {s}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {searchActive && (
        <div
          onClick={() => setSearchActive(false)}
          style={{
            position: 'fixed',
            inset: 0,
          background: 'rgba(8, 13, 23, 0.96)',
          backdropFilter: 'blur(4px)',
          zIndex: 12006,
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          gap: 12,
        }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#0b1220',
              borderRadius: 12,
              border: '1px solid #1f2937',
              padding: '10px 12px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              placeholder="Rechercher un lieu, une adresse…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                markReady()
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#e5e7eb',
                outline: 'none',
                fontSize: 15,
              }}
            />
            <button style={ghostButtonStyle}>🎤</button>
            <button style={ghostButtonStyle} onClick={() => setSearchActive(false)}>
              ✕
            </button>
          </div>

          <div style={{ color: '#9ca3af', fontSize: 13, paddingTop: 6 }} onClick={(e) => e.stopPropagation()}>
            Adresses enregistrées
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }} onClick={(e) => e.stopPropagation()}>
            {['Maison', 'Bureau', 'Gare', 'Taxi stand', 'Spot photo'].map((r) => (
              <div
                key={r}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: '#0b1220',
                  border: '1px solid #1f2937',
                  whiteSpace: 'nowrap',
                }}
              >
                {r}
              </div>
            ))}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 999,
                background: '#111827',
                border: '1px dashed #1f2937',
                color: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              ••• plus
            </div>
          </div>

          <div style={{ color: '#9ca3af', fontSize: 13, paddingTop: 6 }} onClick={(e) => e.stopPropagation()}>
            Recherches récentes
          </div>
          <div style={{ display: 'grid', gap: 10, overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            {['Fontainebleau château', 'Rochers d’Apremont', 'Gare Thomery', 'Village des impressionnistes', 'Rue des peintres'].map((r) => (
              <div key={r} style={{ padding: 10, borderRadius: 10, background: '#0b1220', border: '1px solid #1f2937' }}>
                {r}
              </div>
            ))}
            <div style={{ padding: 10, borderRadius: 10, background: 'transparent', border: '1px dashed #1f2937', color: '#9ca3af' }}>
              Autres adresses récentes →
            </div>
          </div>
        </div>
      )}
    </>
  )
}
