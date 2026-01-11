import React from 'react'

type PoiHeaderProps = {
  id?: string
  name: string
  category?: string
  level?: 'peek' | 'mid' | 'full'
}

// Map des icônes par catégorie
const CATEGORY_ICONS: Record<string, string> = {
  'Château': '🏰',
  'Musée': '🏛️',
  'Musees': '🏛️',
  'Forêt': '🌲',
  'Street Art': '🎨',
  'Art': '🎨',
  'Patrimoine': '🏛️',
  'Balade': '🚶',
  'Monuments': '🏛️',
  'Insolite': '✨',
}

export function PoiHeader({ id, name, category, level }: PoiHeaderProps) {
  const icon = category ? CATEGORY_ICONS[category] || '📍' : '📍'

  return (
    <div id={id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Icône de catégorie */}
      <div
        id={id ? `${id}-icon` : undefined}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: '#e0f2fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <h2
          id={id ? `${id}-name` : undefined}
          style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}
        >
          {name}
        </h2>
        {category && (
          <span
            id={id ? `${id}-category` : undefined}
            style={{
              color: '#64748b',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {category}
          </span>
        )}
      </div>
      {/* Indication pour glisser vers le haut - seulement en peek */}
      {level === 'peek' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: '#94a3b8',
            fontSize: 11,
          }}
        >
          <span>Détails</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </div>
      )}
    </div>
  )
}
