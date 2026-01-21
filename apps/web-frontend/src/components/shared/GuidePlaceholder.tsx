import React from 'react'

type GuidePlaceholderProps = {
  title?: string
  size?: number
}

export function GuidePlaceholder({ title, size = 70 }: GuidePlaceholderProps) {
  // Génère une couleur unique basée sur le titre
  const hue = title ? title.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 200

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        background: `linear-gradient(135deg, hsl(${hue}, 70%, 60%) 0%, hsl(${hue + 30}, 60%, 50%) 100%)`,
      }}
    >
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
  )
}
