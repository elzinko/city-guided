import React from 'react'
import { Chip } from './ui'
import { SearchBar } from './SearchBar'

type Props = {
  query: string
  setQuery: (v: string) => void
  searchActive: boolean
  setSearchActive: (v: boolean) => void
  setSearchReady?: (v: boolean) => void
  onQuickSelect?: (value: string) => void
  onClear?: () => void
  onNavigateToSaved?: () => void
  setLastQuery?: (v: string) => void
  setDiscoverMode?: (v: boolean) => void
  setSheetLevel?: (v: 'hidden' | 'peek' | 'mid' | 'full') => void
  lastQuery?: string
  isDesktop?: boolean // Pour le layout Google Maps style
}

export function SearchOverlay({ query, setQuery, searchActive, setSearchActive, setSearchReady, onQuickSelect, onClear, onNavigateToSaved, setLastQuery, setDiscoverMode, setSheetLevel, lastQuery, isDesktop = false }: Props) {
  // Générer des icônes aléatoires pour les adresses enregistrées
  const getRandomIcon = (index: number) => {
    const icons = [
      // Maison
      <svg key={index} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>,
      // Bureau
      <svg key={index} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 10h18M10 4v6" />
      </svg>,
      // Gare
      <svg key={index} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
        <rect x="2" y="6" width="20" height="14" rx="2" />
        <path d="M6 6V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2M6 12h12M8 18h8" />
      </svg>,
      // Taxi
      <svg key={index} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
        <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
        <path d="M12 8v8M7 12h10" />
      </svg>,
      // Photo
      <svg key={index} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>,
    ]
    return icons[index % icons.length]
  }
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
    if (setSearchActive) setSearchActive(false)
    if (onClear) onClear()
  }
  return (
    <>
      <div
        id="search-overlay"
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: isDesktop ? 'auto' : 12,
          width: isDesktop ? 'auto' : 'auto',
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: isDesktop ? 'center' : 'stretch',
          gap: isDesktop ? 12 : 6,
          zIndex: 12005,
        }}
      >
        <div style={{ width: isDesktop ? 380 : '100%', flexShrink: 0 }}>
          <SearchBar
            query={query}
            setQuery={(v) => {
              setQuery(v)
              markReady()
            }}
            searchActive={searchActive}
            onBack={() => {
              // Quand on clique sur la flèche précédent, sauvegarder la query, effacer le texte et fermer la recherche
              if (query) {
                // Sauvegarder la query avant de l'effacer (sera réaffichée si on rouvre la recherche)
                if (setLastQuery) setLastQuery(query)
              }
              setQuery('')
              setSearchActive(false)
              setSearchReady(false)
              // S'assurer que le panneau découverte ne s'affiche pas
              if (setDiscoverMode) setDiscoverMode(false)
              if (setSheetLevel) setSheetLevel('hidden')
            }}
            onClear={clearAll}
            onVoiceStart={startVoice}
            onFocus={() => {
              setSearchActive(true)
              // Réafficher la dernière query si elle existe
              if (lastQuery && !query) {
                setQuery(lastQuery)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query) {
                // Fermer l'overlay et afficher les résultats
                setSearchActive(false)
                markReady()
              }
            }}
            showPoiIcon={!searchActive}
            testId="search-bar-main"
          />
        </div>
        {!searchActive && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none', // Cacher la scrollbar
              msOverflowStyle: 'none', // IE/Edge
            }}
            className="hide-scrollbar"
          >
            {suggestions.map((s) => {
              // Icônes SVG noir et blanc pour chaque suggestion
              const getIcon = (label: string) => {
                const iconSize = 14
                switch (label) {
                  case 'Château':
                    return (
                      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
                        <path d="M9 9v0M9 15v0M15 11v0M15 17v0" />
                      </svg>
                    )
                  case 'Musée':
                    return (
                      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18M9 3v18" />
                      </svg>
                    )
                  case 'Forêt':
                    return (
                      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <path d="M12 2C8 2 4 6 4 10c0 4 4 8 8 8s8-4 8-8c0-4-4-8-8-8z" />
                        <path d="M8 14c0 2 2 4 4 4s4-2 4-4" />
                      </svg>
                    )
                  case 'Street Art':
                    return (
                      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    )
                  case 'Patrimoine':
                    return (
                      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    )
                  case 'Balade':
                    return (
                      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    )
                  default:
                    return null
                }
              }
              return (
                <Chip
                  key={s}
                  active={false}
                  onClick={() => {
                    setQuery(s)
                    markReady()
                    if (onQuickSelect) onQuickSelect(s)
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>{getIcon(s)}</span>
                  <span>{s}</span>
                </Chip>
              )
            })}
            {/* Bulle "... Plus" à la fin */}
            <Chip
              active={false}
              onClick={() => {
                // Action pour "Plus"
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
              <span>Plus</span>
            </Chip>
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
            padding: 0,
            gap: 12,
          }}
          data-testid="search-overlay"
        >
          {/* Barre de recherche alignée avec celle de la page principale */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              right: 12,
            }}
          >
            <SearchBar
              query={query}
              setQuery={(v) => {
                setQuery(v)
                markReady()
              }}
              searchActive={true}
              testId="search-bar-overlay"
              onFocus={() => {
                setSearchActive(true)
                // Réafficher la dernière query si elle existe et que le champ est vide
                if (lastQuery && !query) {
                  setQuery(lastQuery)
                }
              }}
              onBack={() => {
                // Quand on clique sur la flèche précédent dans l'overlay, sauvegarder la query, effacer le texte et fermer
                if (query) {
                  if (setLastQuery) setLastQuery(query)
                }
                setQuery('')
                setSearchActive(false)
                if (setSearchReady) setSearchReady(false)
                // S'assurer que le panneau découverte ne s'affiche pas
                if (setDiscoverMode) setDiscoverMode(false)
                if (setSheetLevel) setSheetLevel('hidden')
              }}
              onClear={clearAll}
              onVoiceStart={startVoice}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query) {
                  // Fermer l'overlay et afficher les résultats
                  setSearchActive(false)
                  markReady()
                }
              }}
              showPoiIcon={false}
              autoFocus={true}
            />
          </div>

          {/* Contenu de l'overlay avec padding pour éviter le chevauchement avec la barre de recherche */}
          <div
            style={{
              marginTop: 60,
              padding: '0 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              flex: 1,
              overflowY: 'auto',
            }}
          >
          <div style={{ color: '#6b7280', fontSize: 13, paddingTop: 6 }} onClick={(e) => e.stopPropagation()}>
            Adresses enregistrées
          </div>
          <div
            style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 4, alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
            className="hide-scrollbar"
          >
            {['Maison', 'Bureau', 'Gare', 'Taxi stand', 'Spot photo'].map((r, index) => (
              <React.Fragment key={r}>
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: '#fdfefe',
                    border: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minHeight: 56,
                  }}
                >
                  {/* Icône ronde avec disque gris-bleu */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#e0e7ef',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getRandomIcon(index)}
                  </div>
                  <span style={{ fontWeight: 500 }}>{r}</span>
                </div>
                {/* Barre verticale séparatrice (sauf pour le dernier) */}
                {index < ['Maison', 'Bureau', 'Gare', 'Taxi stand', 'Spot photo'].length - 1 && (
                  <div
                    style={{
                      width: 1,
                      height: 32,
                      background: '#cbd5e1',
                      margin: '0 4px',
                      alignSelf: 'center',
                    }}
                  />
                )}
              </React.Fragment>
            ))}
            {/* Dernière adresse "Plus" */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: '#f5f7fb',
                border: '1px dashed #d4d9e1',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                whiteSpace: 'nowrap',
                minHeight: 56,
                cursor: 'pointer',
              }}
              onClick={() => {
                if (onNavigateToSaved) {
                  onNavigateToSaved()
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
              <span style={{ fontWeight: 500 }}>Plus</span>
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
        </div>
      )}
    </>
  )
}
