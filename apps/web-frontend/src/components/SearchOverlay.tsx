import React from 'react'
import { Chip, ghostButtonStyle } from './ui'

type Props = {
  query: string
  setQuery: (v: string) => void
  searchActive: boolean
  setSearchActive: (v: boolean) => void
  setSearchReady?: (v: boolean) => void
  onQuickSelect?: (value: string) => void
  onClear?: () => void
}

export function SearchOverlay({ query, setQuery, searchActive, setSearchActive, setSearchReady, onQuickSelect, onClear }: Props) {
  const suggestions = ['Château', 'Musée', 'Forêt', 'Street Art', 'Patrimoine', 'Balade']
  const markReady = () => {
    if (setSearchReady) setSearchReady(true)
  }
  const startVoice = () => {
    try {
      if (typeof window === 'undefined') return
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        alert('La dictée vocale n’est pas disponible dans ce navigateur.')
        return
      }
      const rec = new SpeechRecognition()
      rec.lang = 'fr-FR'
      rec.interimResults = false
      rec.maxAlternatives = 1
      rec.onresult = (event: any) => {
        const text = event?.results?.[0]?.[0]?.transcript || ''
        if (!text) return
        setQuery(text)
        markReady()
        if (onQuickSelect) onQuickSelect(text)
      }
      rec.onerror = () => {
        alert('Dictée vocale indisponible pour le moment.')
      }
      rec.start()
      setSearchActive(true)
    } catch (e) {
      console.warn('Voice input error', e)
    }
  }
  const clearAll = () => {
    setQuery('')
    if (setSearchReady) setSearchReady(false)
    if (onClear) onClear()
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
        data-testid="search-bar"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#fdfefe',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '8px 10px',
            boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)',
            gap: 6,
          }}
        >
          {searchActive && (
            <button style={ghostButtonStyle} onClick={() => setSearchActive(false)} aria-label="Retour">
              ←
            </button>
          )}
          <input
            placeholder="Rechercher"
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
              color: '#0f172a',
              outline: 'none',
              fontSize: 14,
            }}
            data-testid="search-input-main"
          />
          {query ? (
            <button style={ghostButtonStyle} onClick={clearAll} aria-label="Effacer la recherche">
              ✕
            </button>
          ) : (
            <button style={ghostButtonStyle} onClick={startVoice} aria-label="Dictée vocale">
              🎤
            </button>
          )}
          </div>
        {!searchActive && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
            }}
          >
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(248, 250, 252, 0.94)',
            backdropFilter: 'blur(4px)',
            zIndex: 12006,
            display: 'flex',
            flexDirection: 'column',
            padding: 16,
            gap: 12,
          }}
          data-testid="search-overlay"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#fdfefe',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: '10px 12px',
              gap: 6,
            }}
          >
            <button style={ghostButtonStyle} onClick={() => setSearchActive(false)} aria-label="Retour">
              ←
            </button>
            <input
              autoFocus
              placeholder="Rechercher"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                markReady()
              }}
              style={{
                flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#0f172a',
              outline: 'none',
              fontSize: 15,
            }}
            data-testid="search-input-overlay"
          />
            {query ? (
              <button style={ghostButtonStyle} onClick={clearAll} aria-label="Effacer">
                ✕
              </button>
            ) : (
              <button style={ghostButtonStyle} onClick={startVoice} aria-label="Dictée vocale">
                🎤
              </button>
            )}
          </div>

          <div style={{ color: '#6b7280', fontSize: 13, paddingTop: 6 }} onClick={(e) => e.stopPropagation()}>
            Adresses enregistrées
          </div>
          <div
            style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}
            onClick={(e) => e.stopPropagation()}
          >
            {['Maison', 'Bureau', 'Gare', 'Taxi stand', 'Spot photo'].map((r) => (
              <div
                key={r}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: '#fdfefe',
                  border: '1px solid #e2e8f0',
                  whiteSpace: 'nowrap',
                  color: '#0f172a',
                }}
              >
                {r}
              </div>
            ))}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 999,
                background: '#f5f7fb',
                border: '1px dashed #d4d9e1',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              ••• plus
            </div>
          </div>

          <div style={{ color: '#6b7280', fontSize: 13, paddingTop: 6 }} onClick={(e) => e.stopPropagation()}>
            Recherches récentes
          </div>
          <div style={{ display: 'grid', gap: 10, overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            {['Fontainebleau château', 'Rochers d’Apremont', 'Gare Thomery', 'Village des impressionnistes', 'Rue des peintres'].map((r) => (
              <div
                key={r}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: '#fdfefe',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                }}
              >
                {r}
              </div>
            ))}
            <div
              style={{
                padding: 10,
                borderRadius: 10,
                background: 'transparent',
                border: '1px dashed #d4d9e1',
                color: '#6b7280',
              }}
            >
              Autres adresses récentes →
            </div>
          </div>
        </div>
      )}
    </>
  )
}
