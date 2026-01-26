import React from 'react'

export type RouteCardProps = {
  id: string
  name: string
  description?: string
  pointsCount: number
  isDefault?: boolean
  isImported?: boolean
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
  isImported = false,
  onEdit,
  onDelete,
}: RouteCardProps) {
  // Couleurs selon le type
  const borderColor = isDefault ? '#22c55e' : isImported ? '#f59e0b' : '#e2e8f0'
  const iconBg = isDefault ? '#dcfce7' : isImported ? '#fef3c7' : '#f8fafc'
  const iconColor = isDefault ? '#22c55e' : isImported ? '#f59e0b' : '#64748b'

  return (
    <div
      onClick={onEdit}
      style={{
        padding: 12,
        borderRadius: 10,
        background: '#ffffff',
        border: `1px solid ${borderColor}`,
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
          background: iconBg,
          border: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isImported ? (
          // Icône import (fichier)
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        )}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
          {isImported && (
            <span
              style={{
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 4,
                background: '#fef3c7',
                color: '#92400e',
                fontWeight: 700,
              }}
            >
              IMPORTÉ
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
            color: isImported ? '#f59e0b' : '#3b82f6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isDefault ? 'Dupliquer pour éditer' : isImported ? 'Visualiser' : 'Modifier'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {isDefault ? (
              // Icône copie
              <path d="M8 17H5a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v3M11 21h10a2 2 0 002-2V9a2 2 0 00-2-2H11a2 2 0 00-2 2v10a2 2 0 002 2z" />
            ) : isImported ? (
              // Icône œil (visualiser)
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
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
