import React, { useEffect, useState } from 'react'
import { CloseButton } from './CloseButton'

type Level = 'hidden' | 'peek' | 'mid' | 'full'

type Props = {
  level: Level
  setLevel: (v: Level) => void
  children: React.ReactNode
}

export function AdminSheet({ level, setLevel, children }: Props) {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  if (level === 'hidden') return null

  // Desktop: panneau à gauche
  if (isDesktop) {
    return (
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 120, // Sous la barre de recherche
          bottom: 80, // Au-dessus du menu
          width: 320,
          background: '#f8fafc',
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
          border: '1px solid #e2e8f0',
          borderLeft: 'none',
          boxShadow: '4px 0 20px rgba(15,23,42,0.08)',
          zIndex: 100000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header avec bouton fermer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
            🛠️ Panneau développeur
          </span>
          <CloseButton onClick={() => setLevel('hidden')} size="medium" ariaLabel="Fermer le panneau développeur" />
        </div>

        {/* Contenu scrollable */}
        <div style={{ padding: 12, overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    )
  }

  // Mobile: panneau en bas (comportement actuel)
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: 'auto',
        maxHeight: '50vh',
        background: '#f8fafc',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 -12px 30px rgba(15,23,42,0.08)',
        zIndex: 100000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 12px',
          borderBottom: '1px solid #e2e8f0',
          minHeight: 48,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            paddingRight: 44,
          }}
        >
          <div style={{ width: 40, height: 3, borderRadius: 999, background: '#64748b' }} />
        </div>
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
          <CloseButton onClick={() => setLevel('hidden')} size="medium" ariaLabel="Fermer le panneau développeur" />
        </div>
      </div>

      <div style={{ padding: 8, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}
