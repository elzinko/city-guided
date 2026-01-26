import React from 'react'

export type RouteCardProps = {
  id: string
  name: string
  description?: string
  pointsCount: number
  isDefault?: boolean
  onEdit: () => void
  onDelete?: () => void
}

/**
 * Carte représentant un trajet dans la liste
 * Cliquable sur toute la surface pour éditer
 */
export function RouteCard({
  name,
  description,
  pointsCount,
  isDefault = false,
  onEdit,
  onDelete,
}: RouteCardProps) {
  return (
    <div
      onClick={onEdit}
      style={{
        padding: 12,
        borderRadius: 10,
        background: '#ffffff',
        border: isDefault ? '1px solid #22c55e' : '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'none'
      }}
    >
      {/* Icône */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: isDefault ? '#dcfce7' : '#f8fafc',
          border: isDefault ? '1px solid #22c55e' : '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isDefault ? '#22c55e' : '#64748b'}
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{name}</span>
          {isDefault && (
            <span
              style={{
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 4,
                background: '#dcfce7',
                color: '#166534',
                fontWeight: 700,
              }}
            >
              SYSTÈME
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
          {pointsCount} pts
          {description && ` • ${description}`}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{ display: 'flex', gap: 6, flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()} // Empêcher le clic de propager au parent
      >
        <button
          onClick={onEdit}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: '#3b82f6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isDefault ? 'Dupliquer pour éditer' : 'Modifier'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {isDefault ? (
              // Icône copie
              <path d="M8 17H5a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v3M11 21h10a2 2 0 002-2V9a2 2 0 00-2-2H11a2 2 0 00-2 2v10a2 2 0 002 2z" />
            ) : (
              // Icône édition
              <>
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </>
            )}
          </svg>
        </button>
        {!isDefault && onDelete && (
          <button
            onClick={onDelete}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#dc2626',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Supprimer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default RouteCard
