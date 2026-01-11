import React from 'react'

type GpsIconProps = {
  id?: string
  hasGps: boolean
  size?: number
}

/**
 * Icône GPS personnalisée
 * - Version grisée quand pas de GPS
 * - Version avec point bleu et cercle concentrique quand GPS actif
 */
export function GpsIcon({ id, hasGps, size = 28 }: GpsIconProps) {
  if (!hasGps) {
    // Version grisée quand pas de GPS
    return (
      <svg
        id={id}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="2"
        aria-label="GPS non disponible"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    )
  }
  
  // Version avec point bleu et un seul cercle concentrique
  return (
    <svg
      id={id}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="GPS actif"
    >
      {/* Cercle extérieur bleu clair */}
      <circle cx="12" cy="12" r="12" fill="#3b82f6" opacity="0.2" />
      {/* Point central bleu */}
      <circle cx="12" cy="12" r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
    </svg>
  )
}
