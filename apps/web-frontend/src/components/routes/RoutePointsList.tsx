import React, { useState, useRef } from 'react'

export type RoutePoint = {
  id: string
  lat: number
  lng: number
  name?: string
  order: number
}

type RoutePointsListProps = {
  points: RoutePoint[]
  onPointsChange: (points: RoutePoint[]) => void
  onPointSelect?: (point: RoutePoint) => void
  selectedPointId?: string | null
}

/**
 * Liste des points d'un trajet avec drag & drop pour réorganiser
 * Composant modulaire pour future migration vers backoffice
 */
export function RoutePointsList({
  points,
  onPointsChange,
  onPointSelect,
  selectedPointId,
}: RoutePointsListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const draggedItemRef = useRef<RoutePoint | null>(null)

  // Gestion du drag start
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    draggedItemRef.current = points[index]
    e.dataTransfer.effectAllowed = 'move'
    // Ajouter une image de drag personnalisée
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
    dragImage.style.opacity = '0.8'
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  // Gestion du drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  // Gestion du drag leave
  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  // Gestion du drop
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newPoints = [...points]
    const [draggedItem] = newPoints.splice(draggedIndex, 1)
    newPoints.splice(dropIndex, 0, draggedItem)

    // Réassigner les ordres
    const reorderedPoints = newPoints.map((p, idx) => ({
      ...p,
      order: idx,
    }))

    onPointsChange(reorderedPoints)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Gestion du drag end
  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Supprimer un point
  const handleDelete = (pointId: string) => {
    const newPoints = points
      .filter((p) => p.id !== pointId)
      .map((p, idx) => ({ ...p, order: idx }))
    onPointsChange(newPoints)
  }

  // Déplacer vers le haut
  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newPoints = [...points]
    ;[newPoints[index - 1], newPoints[index]] = [newPoints[index], newPoints[index - 1]]
    const reorderedPoints = newPoints.map((p, idx) => ({ ...p, order: idx }))
    onPointsChange(reorderedPoints)
  }

  // Déplacer vers le bas
  const handleMoveDown = (index: number) => {
    if (index === points.length - 1) return
    const newPoints = [...points]
    ;[newPoints[index], newPoints[index + 1]] = [newPoints[index + 1], newPoints[index]]
    const reorderedPoints = newPoints.map((p, idx) => ({ ...p, order: idx }))
    onPointsChange(reorderedPoints)
  }

  if (points.length === 0) {
    return (
      <div
        id="route-points-empty"
        style={{
          padding: 24,
          textAlign: 'center',
          color: '#64748b',
          background: '#f8fafc',
          borderRadius: 8,
          border: '2px dashed #e2e8f0',
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
          style={{ margin: '0 auto 12px' }}
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <p style={{ margin: 0, fontSize: 14 }}>Aucun point dans ce trajet</p>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8' }}>
          Cliquez sur la carte ou importez un fichier pour ajouter des points
        </p>
      </div>
    )
  }

  return (
    <div id="route-points-list" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* En-tête */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: '#64748b',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <span style={{ width: 32 }}>#</span>
        <span style={{ flex: 1 }}>Coordonnées</span>
        <span style={{ width: 100, textAlign: 'center' }}>Actions</span>
      </div>

      {/* Liste des points */}
      {points.map((point, index) => (
        <div
          key={point.id}
          id={`route-point-${point.id}`}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          onClick={() => onPointSelect?.(point)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderRadius: 8,
            cursor: 'grab',
            background:
              dragOverIndex === index
                ? '#dbeafe'
                : selectedPointId === point.id
                  ? '#f0fdf4'
                  : draggedIndex === index
                    ? '#f1f5f9'
                    : '#ffffff',
            border:
              selectedPointId === point.id
                ? '2px solid #22c55e'
                : dragOverIndex === index
                  ? '2px dashed #3b82f6'
                  : '1px solid #e2e8f0',
            opacity: draggedIndex === index ? 0.5 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          {/* Numéro d'ordre */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: index === 0 ? '#22c55e' : index === points.length - 1 ? '#ef4444' : '#3b82f6',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              marginRight: 8,
              flexShrink: 0,
            }}
          >
            {index + 1}
          </div>

          {/* Coordonnées */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontFamily: 'monospace',
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
            </div>
            {point.name && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{point.name}</div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {/* Bouton monter */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleMoveUp(index)
              }}
              disabled={index === 0}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: 'none',
                background: index === 0 ? '#f1f5f9' : '#ffffff',
                color: index === 0 ? '#cbd5e1' : '#64748b',
                cursor: index === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Monter"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>

            {/* Bouton descendre */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleMoveDown(index)
              }}
              disabled={index === points.length - 1}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: 'none',
                background: index === points.length - 1 ? '#f1f5f9' : '#ffffff',
                color: index === points.length - 1 ? '#cbd5e1' : '#64748b',
                cursor: index === points.length - 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Descendre"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Bouton supprimer */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(point.id)
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: 'none',
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
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      {/* Résumé */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px',
          marginTop: 8,
          background: '#f8fafc',
          borderRadius: 8,
          fontSize: 12,
          color: '#64748b',
        }}
      >
        <span>
          <strong>{points.length}</strong> point{points.length > 1 ? 's' : ''} au total
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
          Glissez pour réorganiser
        </span>
      </div>
    </div>
  )
}

export default RoutePointsList
