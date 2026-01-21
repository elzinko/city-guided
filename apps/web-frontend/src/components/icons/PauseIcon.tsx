import React from 'react'

type PauseIconProps = {
  size?: number
  color?: string
  className?: string
}

export function PauseIcon({ size = 20, color = 'currentColor', className }: PauseIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="6" y="5" width="4" height="14" rx="1" fill={color} />
      <rect x="14" y="5" width="4" height="14" rx="1" fill={color} />
    </svg>
  )
}
