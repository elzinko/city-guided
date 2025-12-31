import React from 'react'
import { ghostButtonStyle } from './ui'

type Level = 'hidden' | 'peek' | 'mid' | 'full'

type Props = {
  level: Level
  setLevel: (v: Level) => void
  title?: string
  children: React.ReactNode
}

export function AdminSheet({ level, setLevel, title = 'Panneau développeur', children }: Props) {
  if (level === 'hidden') return null

  const heights: Record<Level, string> = {
    hidden: '0',
    peek: 'auto',
    mid: '60vh',
    full: '90vh',
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
        maxHeight: '90vh',
        background: '#0b1220',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        border: '1px solid #1f2937',
        boxShadow: '0 -12px 30px rgba(0,0,0,0.45)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #111827',
          gap: 10,
        }}
      >
        <div
          onClick={cycle}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <div style={{ width: 60, height: 4, borderRadius: 999, background: '#1f2937', margin: '0 auto' }} />
        </div>
        <div style={{ flex: 4, fontWeight: 700 }}>{title}</div>
        <button style={ghostButtonStyle} onClick={() => setLevel('hidden')}>
          ✕
        </button>
      </div>

      <div style={{ padding: 12, overflowY: 'auto', flex: 1 }}>{children}</div>
    </div>
  )
}
