import React from 'react'

type Props = {
  id?: string
  playing: boolean
  onPlayPause: () => void
  disabled?: boolean
  variant?: 'round' | 'square'
  size?: 'small' | 'medium' | 'large'
  ariaLabel?: string
}

// Triangle blanc SVG pour le bouton play
function PlayTriangle({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 5v14l11-7L8 5z" fill="#ffffff" />
    </svg>
  )
}

export function PlayButton({
  id,
  playing,
  onPlayPause,
  disabled = false,
  variant = 'square',
  size = 'medium',
  ariaLabel,
}: Props) {
  const sizeStyles = {
    small: { button: { width: 40, height: 40 }, icon: 16 },
    medium: { button: { width: 48, height: 48 }, icon: 20 },
    large: { button: { width: 56, height: 56 }, icon: 24 },
  }

  const sizes = sizeStyles[size]
  const borderRadius = variant === 'round' ? '50%' : 12

  const buttonStyle: React.CSSProperties = {
    ...sizes.button,
    borderRadius,
    border: variant === 'square' ? '1px solid #e2e8f0' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    background: playing ? '#ef4444' : '#22c55e',
    color: '#ffffff',
    boxShadow: variant === 'square' ? '0 4px 12px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'all 0.2s',
  }

  return (
    <button
      id={id}
      onClick={onPlayPause}
      disabled={disabled}
      aria-label={ariaLabel || (playing ? 'Pause' : 'Play')}
      style={buttonStyle}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(0.95)'
        }
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {playing ? (
        // Icône Stop (carré) quand en mode navigation
        <svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" fill="none">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="#ffffff" />
        </svg>
      ) : (
        <PlayTriangle size={sizes.icon} />
      )}
    </button>
  )
}

