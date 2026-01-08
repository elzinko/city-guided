import React from 'react'

export type MenuTab = 'discover' | 'saved' | 'contribute'

type Props = {
  activeTab: MenuTab
  onTabChange: (tab: MenuTab) => void
}

// Composant pour l'icône Découvrir (pin avec point)
function DiscoverIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="1.5" fill="currentColor" />
    </svg>
  )
}

// Composant pour l'icône Enregistrés (signet/bookmark) - basé sur l'image fournie
function SavedIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Rectangle avec bas en V inversé (comme un signet) */}
      <path d="M4 2h16v18l-8-6-8 6V2z" />
    </svg>
  )
}

// Composant pour l'icône Contribuer (+ dans un cercle)
function ContributeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}

export function BottomMenu({ activeTab, onTabChange }: Props) {
  const tabs: { id: MenuTab; label: string; icon: React.ReactNode }[] = [
    { id: 'discover', label: 'Découvrir', icon: <DiscoverIcon /> },
    { id: 'saved', label: 'Enregistrés', icon: <SavedIcon /> },
    { id: 'contribute', label: 'Contribuer', icon: <ContributeIcon /> },
  ]

  return (
    <div
      id="bottom-menu"
      style={{
        position: 'fixed',
        bottom: 8, // Décalé du bas pour voir que c'est un bloc
        left: 8,
        right: 8,
        zIndex: 99999,
        background: '#f0f4f8', // Gris/bleuté très léger
        borderTop: '1px solid #cbd5e1',
        borderRadius: 16, // Bords arrondis pour le bloc
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.05)', // Ombre légère pour le décollement
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: 64,
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              id={`menu-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                background: 'transparent',
                color: isActive ? '#0f172a' : '#64748b',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                touchAction: 'manipulation',
              }}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Bulle ovale avec icône - largeur fixe pour les 3 onglets */}
              <div
                style={{
                  width: 72, // Largeur fixe pour les 3 bulles (presque la largeur du texte "Enregistrés")
                  minHeight: 28, // Un peu plus haut pour plus de padding
                  borderRadius: 12,
                  background: isActive ? '#a8e6cf' : '#e2e8f0', // Bleu/vert pâle si actif (#a8e6cf), gris très clair si inactif
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 0', // Padding intérieur haut/bas
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    color: isActive ? '#ffffff' : '#94a3b8', // Blanc si actif, gris moyen si inactif
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {tab.icon}
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
