import React from 'react'

type Props = {
  playing: boolean
  onPlayPause: () => void
  onStop?: () => void
  size?: 'small' | 'medium' | 'large'
  showStop?: boolean
  disabled?: boolean
  ariaLabel?: string
  variant?: 'round' | 'square' // Variant pour bouton rond ou carré arrondi
}

export function PlayPauseButton({
  playing,
  onPlayPause,
  onStop,
  size = 'medium',
  showStop = false,
  disabled = false,
  ariaLabel,
  variant = 'round',
}: Props) {
  const sizeStyles = {
    small: { button: { width: 40, height: 40, fontSize: 18 }, stop: { width: 32, height: 32, fontSize: 14 } },
    medium: { button: { width: 48, height: 48, fontSize: 20 }, stop: { width: 40, height: 40, fontSize: 16 } },
    large: { button: { width: 56, height: 56, fontSize: 24 }, stop: { width: 48, height: 48, fontSize: 18 } },
  }

  const sizes = sizeStyles[size]
  const borderRadius = variant === 'round' ? '50%' : 12

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={onPlayPause}
        disabled={disabled}
        aria-label={ariaLabel || (playing ? 'Pause' : 'Play')}
        style={{
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
        }}
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
        {playing ? '⏸' : '▶️'}
      </button>
      {showStop && onStop && (
        <button
          onClick={onStop}
          disabled={disabled}
          aria-label="Stop"
          style={{
            ...sizes.stop,
            borderRadius: '50%',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            background: '#475569',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.2s',
          }}
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
          ⏹️
        </button>
      )}
    </div>
  )
}

