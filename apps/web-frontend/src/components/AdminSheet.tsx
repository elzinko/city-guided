import React from 'react'
import { CloseButton } from './CloseButton'

type Level = 'hidden' | 'peek' | 'mid' | 'full'

type Props = {
  level: Level
  setLevel: (v: Level) => void
  children: React.ReactNode
}

export function AdminSheet({ level, setLevel, children }: Props) {
  if (level === 'hidden') return null

  const heights: Record<Level, string> = {
    hidden: '0',
    peek: 'auto',
    mid: '60vh', // Réduit pour réduire la hauteur
    full: '75vh', // Réduit pour réduire la hauteur
  }
  const height = heights[level] || 'auto'

  const cycle = () => {
    setLevel(level === 'peek' ? 'mid' : level === 'mid' ? 'full' : 'peek')
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height,
        maxHeight: '95vh',
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
          onClick={cycle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            width: '100%',
            paddingRight: 44, // Espace pour le bouton fermer
          }}
        >
          <div style={{ width: 40, height: 3, borderRadius: 999, background: '#64748b' }} />
        </div>
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
          <CloseButton onClick={() => setLevel('hidden')} size="medium" ariaLabel="Fermer le panneau développeur" />
        </div>
      </div>

      <div style={{ padding: 8, overflowY: 'visible', flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}
