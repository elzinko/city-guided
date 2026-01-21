import React from 'react'

type PlayIconProps = {
  size?: number
  color?: string
  className?: string
}

export function PlayIcon({ size = 20, color = 'currentColor', className }: PlayIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7L8 5z" fill={color} />
    </svg>
  )
}
