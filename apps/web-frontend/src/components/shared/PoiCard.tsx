import React from 'react'
import { PlayPauseButton } from '../shared'

type Poi = {
  id: string
  name: string
  shortDescription: string
  category: string
  dist?: number | null
}

type PoiCardProps = {
  poi: Poi
  isPlaying?: boolean
  onPlayPause?: () => void
  onClick?: () => void
  variant?: 'chip' | 'card'
}

// Map des icônes par catégorie
const CATEGORY_ICONS: Record<string, string> = {
  'Château': '🏰',
  'Musée': '🏛️',
  'Forêt': '🌲',
  'Street Art': '🎨',
  'Patrimoine': '🏛️',
  'Balade': '🚶',
}

export function PoiCard({ poi, isPlaying, onPlayPause, onClick, variant = 'card' }: PoiCardProps) {
  const icon = CATEGORY_ICONS[poi.category] || '📍'

  // Variante chip (compacte, horizontale)
  if (variant === 'chip') {
    return (
      <button
        key={poi.id}
        onClick={onClick}
        style={{
          padding: '8px 12px',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          background: '#f5f7fb',
          color: '#0f172a',
          whiteSpace: 'nowrap',
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: 14 }}>{icon}</span>
        {poi.name}
      </button>
    )
  }

  // Générer une couleur basée sur le nom du POI pour le placeholder
  const hue = (poi.name || '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360

  // Variante card (complète, avec image et description)
  return (
    <div
      onClick={onClick}
      style={{
        padding: 12,
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        background: '#f5f7fb',
        display: 'flex',
        gap: 12,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#eef2f7'
        e.currentTarget.style.borderColor = '#cbd5e1'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#f5f7fb'
        e.currentTarget.style.borderColor = '#e2e8f0'
      }}
    >
      {/* Image miniature du POI */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 10,
          background: `linear-gradient(135deg, 
            hsl(${hue}, 60%, 70%) 0%, 
            hsl(${(hue + 40) % 360}, 50%, 60%) 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 28 }}>{icon}</span>
      </div>

      {/* Contenu texte */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{poi.name}</div>
        <div style={{ 
          color: '#64748b', 
          fontSize: 13, 
          lineHeight: 1.4, 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          display: '-webkit-box', 
          WebkitLineClamp: 2, 
          WebkitBoxOrient: 'vertical' 
        } as React.CSSProperties}>
          {poi.shortDescription}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 'auto' }}>
          {poi.dist !== null && poi.dist !== undefined && (
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
              📍 {poi.dist} m
            </span>
          )}
          {poi.category && (
            <span style={{ 
              fontSize: 11, 
              color: '#64748b', 
              background: '#e2e8f0', 
              padding: '2px 6px', 
              borderRadius: 4 
            }}>
              {poi.category}
            </span>
          )}
        </div>
      </div>

      {/* Bouton Play/Pause */}
      {onPlayPause && (
        <div onClick={(e) => e.stopPropagation()}>
          <PlayPauseButton
            playing={isPlaying || false}
            onPlayPause={onPlayPause}
            size="small"
            style={{
              border: '2px dashed #94a3b8', // Bordure pointillée comme rappel
            }}
          />
        </div>
      )}
    </div>
  )
}
