import React from 'react'

type Props = {
  current: number
  total: number
  label?: string // Par défaut "Segment" ou "Étape"
}

export function StepIndicator({ current, total, label = 'Segment' }: Props) {
  if (total === 0) return null

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 999,
        background: 'rgba(255, 255, 255, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        fontSize: 12,
        color: '#ffffff',
        fontWeight: 500,
        backdropFilter: 'blur(10px)',
      }}
    >
      <span>{label}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
        {current}/{total}
      </span>
    </div>
  )
}

