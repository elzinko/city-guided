import React from 'react'
import { NextIcon } from './NextIcon'

type PrevIconProps = {
  size?: number
  color?: string
  className?: string
}

/**
 * Icône précédent - réutilise NextIcon avec une rotation de 180°
 * pour garantir que les deux icônes sont identiques visuellement
 */
export function PrevIcon({ size = 20, color = 'currentColor', className }: PrevIconProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        transform: 'rotate(180deg)',
        transformOrigin: 'center',
      }}
      className={className}
    >
      <NextIcon size={size} color={color} />
    </div>
  )
}
