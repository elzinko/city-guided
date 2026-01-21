import React from 'react'

type SearchBarProps = {
  query: string
  setQuery: (v: string) => void
  searchActive: boolean
  onBack?: () => void
  onClear: () => void
  onVoiceStart: () => void
  onFocus?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  showPoiIcon?: boolean // Afficher l'icône POI devant le placeholder (seulement si !query)
  autoFocus?: boolean
  testId?: string
  style?: React.CSSProperties
}

export function SearchBar({
  query,
  setQuery,
  searchActive,
  onBack,
  onClear,
  onVoiceStart,
  onFocus,
  onKeyDown,
  showPoiIcon = false,
  autoFocus = false,
  testId,
  style,
}: SearchBarProps) {
  // Largeur fixe pour les icônes de devant pour garantir l'alignement du texte
  const frontIconWidth = 20 // Largeur de l'icône POI ou flèche retour

  return (
    <div
      id="search-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        background: '#fdfefe',
        borderRadius: 28,
        border: '1px solid #e2e8f0',
        padding: '6px 12px',
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)',
        gap: 6,
        height: 44,
        ...style,
      }}
      data-testid={testId || 'search-bar'}
    >
      {/* Icône de devant : Flèche retour (si searchActive) OU Icône POI (si showPoiIcon && !query) */}
      <div
        style={{
          width: frontIconWidth,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {searchActive ? (
          <button
            onClick={onBack}
            aria-label="Retour"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0f172a',
              cursor: 'pointer',
              padding: '4px 4px',
              marginLeft: -4,
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 300,
            }}
          >
            {/* Flèche de retour améliorée avec traits plus longs */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        ) : showPoiIcon && !query ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        ) : (
          // Espaceur invisible pour maintenir l'alignement
          <div style={{ width: frontIconWidth }} />
        )}
      </div>

      {/* Champ de saisie */}
      <input
        id="search-query"
        name="search-query"
        autoFocus={autoFocus}
        placeholder="Rechercher"
        value={query}
        onFocus={onFocus}
        onChange={(e) => {
          setQuery(e.target.value)
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          color: '#0f172a', // Toujours noir pour le texte saisi
          outline: 'none',
          fontSize: 16,
          padding: '6px 0',
          lineHeight: 1.5,
        }}
        data-testid={testId ? `${testId}-input` : 'search-input'}
        className="search-input"
      />

      {/* Icône de derrière : Croix cerclée (si query) OU Micro (si !query) */}
      {query ? (
        <button
          onClick={onClear}
          aria-label="Effacer la recherche"
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: 'none',
            background: '#e2e8f0',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            fontSize: 12,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      ) : (
        <button
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onClick={onVoiceStart}
          aria-label="Dictée vocale"
        >
          {/* Icône microphone Google Maps style (colorée) */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
              fill="#4285F4"
            />
            <path
              d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
              fill="#34A853"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

