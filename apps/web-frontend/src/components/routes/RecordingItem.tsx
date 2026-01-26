import React, { useState } from 'react'

export type RecordingItemProps = {
  id: string
  name: string
  pointsCount: number
  duration: string
  isSelected: boolean
  onSelect: () => void
  onExport: () => void
  onDelete: () => void
  onRename: (newName: string) => void
}

/**
 * Élément d'enregistrement dans la liste
 */
export function RecordingItem({
  id,
  name,
  pointsCount,
  duration,
  isSelected,
  onSelect,
  onExport,
  onDelete,
  onRename,
}: RecordingItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(name)

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditName(name)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    const trimmedName = editName.trim()
    if (trimmedName && trimmedName !== name) {
      onRename(trimmedName)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditName(name)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  return (
    <div
      id={`recording-item-${id}`}
      onClick={onSelect}
      style={{
        padding: 12,
        borderRadius: 12,
        background: isSelected ? '#f0fdf4' : '#ffffff',
        border: isSelected ? '2px solid #22c55e' : '1px solid #e2e8f0',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Icône GPX */}
      <div
        id={`recording-item-icon-${id}`}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: isSelected ? '#dcfce7' : '#f1f5f9',
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
          stroke={isSelected ? '#22c55e' : '#64748b'}
          strokeWidth="2"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <input
            id={`recording-item-name-input-${id}`}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            style={{
              width: '100%',
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid #3b82f6',
              fontSize: 14,
              fontWeight: 600,
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <div
            id={`recording-item-name-${id}`}
            onClick={handleStartEdit}
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: '#0f172a',
              cursor: 'text',
            }}
            title="Cliquer pour renommer"
          >
            {name}
          </div>
        )}
        <div
          id={`recording-item-info-${id}`}
          style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}
        >
          {pointsCount} pts • {duration}
        </div>
      </div>

      {/* Boutons */}
      <div
        id={`recording-item-actions-${id}`}
        style={{ display: 'flex', gap: 6 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id={`recording-item-export-btn-${id}`}
          onClick={onExport}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: '#3b82f6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Exporter GPX"
          aria-label="Exporter en GPX"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        <button
          id={`recording-item-delete-btn-${id}`}
          onClick={onDelete}
          style={{
            width: 36,
            height: 36,
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
          aria-label="Supprimer l'enregistrement"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default RecordingItem
