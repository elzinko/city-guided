import React from 'react'

/**
 * Bibliothèque d'icônes SVG réutilisables
 * Toutes les icônes ont une taille par défaut et acceptent un prop size
 */

type IconProps = {
  size?: number
  className?: string
  style?: React.CSSProperties
}

// === ICÔNES DE LECTURE ===

export function PlayIcon({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

export function PauseIcon({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  )
}

export function StopIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className} style={style}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function ReplayIcon({ size = 12, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

// === ICÔNES DE NAVIGATION (CHAPITRES) ===

/**
 * Icône "Chapitre précédent" - utilisée aussi pour "Chapitre suivant" avec rotation 180°
 * Design: barre verticale à gauche + triangle pointant vers la gauche
 */
export function SkipBackIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <rect x="4" y="5" width="3" height="14" rx="1" />
      <path d="M20 5v14l-10-7z" />
    </svg>
  )
}

/**
 * Icône "Chapitre suivant" - SkipBackIcon pivoté de 180°
 */
export function SkipForwardIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className} 
      style={{ ...style, transform: `${style?.transform || ''} rotate(180deg)`.trim() }}
    >
      <rect x="4" y="5" width="3" height="14" rx="1" />
      <path d="M20 5v14l-10-7z" />
    </svg>
  )
}

// === ICÔNES DE CONTRÔLE ===

export function GpsIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  )
}

export function CheckIcon({ size = 14, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function PositionIcon({ size = 14, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#ef4444" stroke="#dc2626" strokeWidth="2.5" />
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
  )
}

export function ZoomIcon({ size = 12, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} style={style}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

export function RadiusIcon({ size = 12, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} style={style}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  )
}

export function EditIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

// === ICÔNES AUDIO ===

export function AudioOnIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#22c55e" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" />
    </svg>
  )
}

export function AudioOffIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="3" x2="3" y2="23" strokeWidth="2.5" />
    </svg>
  )
}

// === ICÔNES POI ===

export function ZonePoiIcon({ size = 18, active = false, className, style }: IconProps & { active?: boolean }) {
  const color = active ? '#ef4444' : '#94a3b8'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" strokeDasharray={active ? '0' : '3 3'} opacity={active ? 1 : 0.6} />
      <path d="M12 7c-1.93 0-3.5 1.57-3.5 3.5 0 2.63 3.5 6.5 3.5 6.5s3.5-3.87 3.5-6.5C15.5 8.57 13.93 7 12 7z" fill={color} />
      <circle cx="12" cy="10.5" r="1.5" fill="white" />
    </svg>
  )
}

// === ICÔNES IMAGE ===

export function ImagePlaceholderIcon({ size = 48, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6" className={className} style={style}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}
