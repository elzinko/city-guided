import React from 'react'
import { PlayIcon, PauseIcon, StopIcon, PrevIcon, NextIcon } from '../icons'

type PlayPauseButtonProps = {
  // Identifiant
  id?: string
  
  // État
  playing: boolean
  disabled?: boolean

  // Handlers
  onPlayPause: () => void
  onPrevious?: () => void
  onNext?: () => void
  onStop?: () => void

  // Apparence
  variant?: 'round' | 'square'
  size?: 'small' | 'medium' | 'large'
  mode?: 'play-pause' | 'play-stop'
  
  // Navigation
  showNavigation?: boolean

  // Accessibilité
  ariaLabel?: string

  // Style personnalisé
  className?: string
  style?: React.CSSProperties
}

const sizeMap = {
  small: { button: 40, icon: 16 },
  medium: { button: 48, icon: 20 },
  large: { button: 56, icon: 24 },
}

export function PlayPauseButton({
  id,
  playing,
  disabled = false,
  onPlayPause,
  onPrevious,
  onNext,
  onStop,
  variant = 'round',
  size = 'medium',
  mode = 'play-pause',
  showNavigation = false,
  ariaLabel,
  className,
  style,
}: PlayPauseButtonProps) {
  const sizes = sizeMap[size]
  const borderRadius = variant === 'round' ? '50%' : 12

  const baseButtonStyle: React.CSSProperties = {
    width: sizes.button,
    height: sizes.button,
    borderRadius,
    border: variant === 'square' ? '1px solid #e2e8f0' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    boxShadow: variant === 'square' ? '0 4px 12px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  }

  const playButtonStyle: React.CSSProperties = {
    ...baseButtonStyle,
    background: playing ? '#ef4444' : '#22c55e',
    color: '#ffffff',
    ...style,
  }

  const navButtonStyle: React.CSSProperties = {
    ...baseButtonStyle,
    background: '#ffffff',
    color: '#64748b',
    border: '1px solid #e2e8f0',
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      e.currentTarget.style.transform = 'scale(0.95)'
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)'
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)'
  }

  // Mode simple : seulement le bouton play/pause
  if (!showNavigation) {
    return (
      <button
        id={id}
        onClick={onPlayPause}
        disabled={disabled}
        aria-label={ariaLabel || (playing ? 'Pause' : 'Play')}
        className={className}
        style={playButtonStyle}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {playing ? (
          mode === 'play-stop' ? (
            <StopIcon size={sizes.icon} color="#ffffff" />
          ) : (
            <PauseIcon size={sizes.icon} color="#ffffff" />
          )
        ) : (
          <PlayIcon size={sizes.icon} color="#ffffff" />
        )}
      </button>
    )
  }

  // Mode avec navigation : prev + play/pause + next
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Bouton précédent */}
      {onPrevious && (
        <button
          onClick={onPrevious}
          disabled={disabled}
          aria-label="Précédent"
          style={navButtonStyle}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <PrevIcon size={sizes.icon} />
        </button>
      )}

      {/* Bouton play/pause principal */}
      <button
        onClick={onPlayPause}
        disabled={disabled}
        aria-label={ariaLabel || (playing ? 'Pause' : 'Play')}
        className={className}
        style={playButtonStyle}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {playing ? (
          mode === 'play-stop' ? (
            <StopIcon size={sizes.icon} color="#ffffff" />
          ) : (
            <PauseIcon size={sizes.icon} color="#ffffff" />
          )
        ) : (
          <PlayIcon size={sizes.icon} color="#ffffff" />
        )}
      </button>

      {/* Bouton suivant */}
      {onNext && (
        <button
          onClick={onNext}
          disabled={disabled}
          aria-label="Suivant"
          style={navButtonStyle}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <NextIcon size={sizes.icon} />
        </button>
      )}

      {/* Bouton stop optionnel */}
      {onStop && (
        <button
          onClick={onStop}
          disabled={disabled}
          aria-label="Stop"
          style={{ ...navButtonStyle, background: '#475569', color: '#ffffff' }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <StopIcon size={sizes.icon * 0.8} color="#ffffff" />
        </button>
      )}
    </div>
  )
}
