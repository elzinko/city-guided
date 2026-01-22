import React from 'react'
import { NextIcon } from '../icons'

type NavigationButtonProps = {
  // Identifiants
  id: string
  testId: string
  
  // Direction
  direction: 'previous' | 'next'
  
  // Handlers
  onClick?: () => void
  disabled?: boolean
  
  // Accessibilité
  ariaLabel: string
  title: string
  
  // Style
  className?: string
  style?: React.CSSProperties
}

/**
 * Bouton de navigation réutilisable pour précédent/suivant
 * Utilise la même icône NextIcon avec rotation pour previous
 */
export function NavigationButton({
  id,
  testId,
  direction,
  onClick,
  disabled = false,
  ariaLabel,
  title,
  className,
  style,
}: NavigationButtonProps) {
  const isPrevious = direction === 'previous'
  
  return (
    <button
      id={id}
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={className}
      style={{
        ...style,
        cursor: disabled ? 'not-allowed' : (style?.cursor || 'pointer'),
        opacity: disabled ? 0.5 : (style?.opacity !== undefined ? style.opacity : 1),
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          transform: isPrevious ? 'rotate(180deg)' : 'none',
          transformOrigin: 'center',
        }}
      >
        <NextIcon size={16} />
      </div>
    </button>
  )
}
