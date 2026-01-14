import React from 'react'
import { Z_INDEX } from '../config/constants'

export type MenuTab = 'discover' | 'saved' | 'contribute'

type Props = {
  activeTab: MenuTab
  onTabChange: (tab: MenuTab) => void
}

// Composant pour l'icône Découvrir (pin avec point)
function DiscoverIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="1.5" fill="currentColor" />
    </svg>
  )
}

// Composant pour l'icône Enregistrés (signet/bookmark) - basé sur l'image fournie
function SavedIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Rectangle avec bas en V inversé (comme un signet) */}
      <path d="M4 2h16v18l-8-6-8 6V2z" />
    </svg>
  )
}

// Composant pour l'icône Contribuer (+ dans un cercle)
function ContributeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}

type BottomMenuProps = Props & {
  devBlockHeight?: number // Hauteur du bloc dev pour ajuster la position
}

export function BottomMenu({ activeTab, onTabChange, devBlockHeight = 0 }: BottomMenuProps) {
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
        bottom: devBlockHeight, // S'élève quand le panneau dev est ouvert
        left: 0,
        right: 0,
        zIndex: Z_INDEX.bottomMenu,
        background: '#f0f4f8', // Gris/bleuté très léger
        borderTop: '1px solid #cbd5e1',
        borderRadius: 0, // Pas de bords arrondis pour faire toute la largeur
        paddingBottom: devBlockHeight === 0 ? 'env(safe-area-inset-bottom, 0)' : '0', // Safe area seulement si pas de bloc dev
        boxShadow: '0 -2px 8px rgba(0,0,0,0.05)', // Ombre légère pour le décollement
        transition: 'bottom 0.3s ease', // Transition fluide
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
              {/* Icône avec bulle seulement si actif */}
              {isActive ? (
                <div
                  style={{
                    width: 72, // Largeur fixe pour les 3 bulles (presque la largeur du texte "Enregistrés")
                    minHeight: 28, // Un peu plus haut pour plus de padding
                    borderRadius: 12,
                    background: '#a8e6cf', // Bleu/vert pâle si actif
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 0', // Padding intérieur haut/bas
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      color: '#ffffff', // Blanc si actif
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {tab.icon}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    color: '#64748b', // Gris moyen si inactif
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {tab.icon}
                </div>
              )}
              <span style={{ fontSize: 12, fontWeight: 500 }}>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
