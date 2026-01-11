import React from 'react'

type Props = {
  onClick: () => void
  size?: 'small' | 'medium' | 'large'
  ariaLabel?: string
}

export function CloseButton({ onClick, size = 'medium', ariaLabel = 'Fermer' }: Props) {
  const sizeStyles = {
    small: { button: 24, icon: 12 },
    medium: { button: 32, icon: 16 },
    large: { button: 40, icon: 20 },
  }

  const sizes = sizeStyles[size]

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: sizes.button,
        height: sizes.button,
        borderRadius: '50%',
        border: 'none',
        background: '#f1f5f9',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        padding: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#e2e8f0'
        e.currentTarget.style.color = '#475569'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#f1f5f9'
        e.currentTarget.style.color = '#64748b'
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.9)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  )
}

