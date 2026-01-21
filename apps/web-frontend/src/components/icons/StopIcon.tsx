import React from 'react'

type StopIconProps = {
  size?: number
  color?: string
  className?: string
}

export function StopIcon({ size = 20, color = 'currentColor', className }: StopIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" fill={color} />
    </svg>
  )
}
