import React from 'react'

type Props = {
  playing: boolean
  onPlayPause: () => void
  onPrevious?: () => void
  onNext?: () => void
  disabled?: boolean
  variant?: 'round' | 'square'
  size?: 'small' | 'medium' | 'large'
  buttonStyle?: React.CSSProperties
}

// Triangle blanc SVG pour le bouton play
function PlayTriangle({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 5v14l11-7L8 5z" fill="#ffffff" />
    </svg>
  )
}

// Icône next (utilisée aussi pour previous avec rotation)
function NextIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M8.715 6.36694L14.405 10.6669C14.7769 10.9319 14.9977 11.3603 14.9977 11.8169C14.9977 12.2736 14.7769 12.702 14.405 12.9669L8.715 17.6669C8.23425 18.0513 7.58151 18.1412 7.01475 17.9011C6.44799 17.6611 6.05842 17.1297 6 16.5169V7.51694C6.05842 6.90422 6.44799 6.37281 7.01475 6.13275C7.58151 5.89269 8.23425 5.9826 8.715 6.36694Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 6.01697V18.017" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// Icône previous (même SVG que next mais avec rotation de 180°)
function PreviousIcon({ size = 20 }: { size?: number }) {
  return (
    <div style={{ transform: 'rotate(180deg)', display: 'inline-block' }}>
      <NextIcon size={size} />
    </div>
  )
}

export function PlayerControls({
  playing,
  onPlayPause,
  onPrevious,
  onNext,
  disabled = false,
  variant = 'square',
  size = 'medium',
  buttonStyle,
}: Props) {
  const sizeStyles = {
    small: { button: { width: 36, height: 36 }, icon: 14 },
    medium: { button: { width: 48, height: 48 }, icon: 20 },
    large: { button: { width: 56, height: 56 }, icon: 24 },
  }

  const sizes = sizeStyles[size]
  const borderRadius = variant === 'round' ? '50%' : 8

  const buttonBaseStyle: React.CSSProperties = {
    ...sizes.button,
    borderRadius,
    border: variant === 'square' ? '1px solid #e2e8f0' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    boxShadow: variant === 'square' ? '0 2px 8px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'all 0.2s',
    ...buttonStyle,
  }

  const playButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: playing ? '#ef4444' : '#22c55e',
    color: '#ffffff',
  }

  const navButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: '#ffffff',
    color: '#64748b',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {/* Bouton précédent */}
      <button
        onClick={onPrevious}
        disabled={disabled || !onPrevious}
        aria-label="POI précédent"
        style={navButtonStyle}
        onMouseDown={(e) => {
          if (!disabled && onPrevious) {
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
        <PreviousIcon size={sizes.icon} />
      </button>

      {/* Bouton play/pause */}
      <button
        onClick={onPlayPause}
        disabled={disabled}
        aria-label={playing ? 'Pause' : 'Play'}
        style={playButtonStyle}
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
          <span style={{ fontSize: sizes.icon, lineHeight: 1 }}>⏸</span>
        ) : (
          <PlayTriangle size={sizes.icon} />
        )}
      </button>

      {/* Bouton suivant */}
      <button
        onClick={onNext}
        disabled={disabled || !onNext}
        aria-label="POI suivant"
        style={navButtonStyle}
        onMouseDown={(e) => {
          if (!disabled && onNext) {
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
        <NextIcon size={sizes.icon} />
      </button>
    </div>
  )
}

