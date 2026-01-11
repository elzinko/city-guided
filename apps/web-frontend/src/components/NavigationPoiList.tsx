import React from 'react'

type Poi = {
  id: string
  name: string
  lat: number
  lng: number
  category?: string
  distance?: number
}

type Props = {
  id?: string
  previousPoi: Poi | null
  currentPoi: Poi | null
  nextPois: Poi[] // Max 3
  onPoiClick: (poi: Poi) => void
}

// Icône selon la catégorie
function getCategoryIcon(category?: string): string {
  switch (category) {
    case 'Château': return '🏰'
    case 'Musée': return '🏛️'
    case 'Forêt': return '🌲'
    case 'Street Art': return '🎨'
    case 'Patrimoine': return '🏛️'
    case 'Balade': return '🚶'
    default: return '📍'
  }
}

// Tronquer le nom si trop long
function truncateName(name: string, maxLength: number = 18): string {
  if (name.length <= maxLength) return name
  return name.substring(0, maxLength - 1) + '…'
}

export function NavigationPoiList({ id, previousPoi, currentPoi, nextPois, onPoiClick }: Props) {
  // Si pas de POIs, ne rien afficher
  if (!previousPoi && !currentPoi && nextPois.length === 0) {
    return null
  }

  return (
    <div
      id={id}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)', // En haut de l'écran, sous la safe area
        left: 12,
        zIndex: 12000,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        maxWidth: 200,
      }}
    >
      {/* POI précédent (grisé, compact) */}
      {previousPoi && (
        <button
          onClick={() => onPoiClick(previousPoi)}
          style={{
            background: '#f1f5f9',
            color: '#64748b',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '6px 10px',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            transition: 'all 0.2s',
            opacity: 0.7,
          }}
          title={previousPoi.name}
        >
          <span style={{ fontSize: 12 }}>{getCategoryIcon(previousPoi.category)}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {truncateName(previousPoi.name, 14)}
          </span>
          {previousPoi.distance && (
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              {Math.round(previousPoi.distance)}m
            </span>
          )}
        </button>
      )}

      {/* POI courant (vert, en évidence) */}
      {currentPoi && (
        <button
          onClick={() => onPoiClick(currentPoi)}
          style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.35)',
            transition: 'all 0.2s',
          }}
          title={currentPoi.name}
        >
          <span style={{ 
            fontSize: 16, 
            background: 'rgba(255,255,255,0.2)', 
            borderRadius: 6, 
            padding: '2px 4px',
          }}>
            {getCategoryIcon(currentPoi.category)}
          </span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}>
              {truncateName(currentPoi.name)}
            </div>
            {currentPoi.distance !== undefined && (
              <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                📍 {Math.round(currentPoi.distance)}m
              </div>
            )}
          </div>
        </button>
      )}

      {/* POIs prochains (max 3) */}
      {nextPois.slice(0, 3).map((poi, idx) => (
        <button
          key={poi.id}
          onClick={() => onPoiClick(poi)}
          style={{
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '8px 10px',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            transition: 'all 0.2s',
            opacity: 1 - idx * 0.15, // Les POIs plus éloignés sont plus transparents
          }}
          title={poi.name}
        >
          <span style={{ fontSize: 12 }}>{getCategoryIcon(poi.category)}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {truncateName(poi.name, 14)}
          </span>
          {poi.distance !== undefined && (
            <span style={{ fontSize: 10, color: '#64748b' }}>
              {Math.round(poi.distance)}m
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
