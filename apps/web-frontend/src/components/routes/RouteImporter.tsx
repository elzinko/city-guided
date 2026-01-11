import React, { useRef, useState } from 'react'
import type { RoutePoint } from './RoutePointsList'

type RouteImporterProps = {
  onImport: (points: RoutePoint[]) => void
  disabled?: boolean
}

/**
 * Composant pour importer des trajets depuis différents formats
 * Formats supportés : GPX, GeoJSON, JSON simple
 * Composant modulaire pour future migration vers backoffice
 */
export function RouteImporter({ onImport, disabled = false }: RouteImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Générer un ID unique
  const generateId = () => `pt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Parser un fichier GPX
  const parseGPX = (content: string): RoutePoint[] => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'application/xml')
    
    // Vérifier les erreurs de parsing
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      throw new Error('Fichier GPX invalide')
    }

    const points: RoutePoint[] = []
    
    // Chercher les trackpoints (trkpt) ou waypoints (wpt) ou route points (rtept)
    const trackpoints = doc.querySelectorAll('trkpt, wpt, rtept')
    
    trackpoints.forEach((pt, index) => {
      const lat = parseFloat(pt.getAttribute('lat') || '')
      const lng = parseFloat(pt.getAttribute('lon') || '')
      const nameEl = pt.querySelector('name')
      
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push({
          id: generateId(),
          lat,
          lng,
          name: nameEl?.textContent || undefined,
          order: index,
        })
      }
    })

    if (points.length === 0) {
      throw new Error('Aucun point trouvé dans le fichier GPX')
    }

    return points
  }

  // Parser un fichier GeoJSON
  const parseGeoJSON = (content: string): RoutePoint[] => {
    const geojson = JSON.parse(content)
    const points: RoutePoint[] = []
    let order = 0

    const extractCoordinates = (feature: any) => {
      if (feature.type === 'Feature') {
        const { geometry, properties } = feature
        
        if (geometry.type === 'Point') {
          const [lng, lat] = geometry.coordinates
          points.push({
            id: generateId(),
            lat,
            lng,
            name: properties?.name,
            order: order++,
          })
        } else if (geometry.type === 'LineString') {
          geometry.coordinates.forEach((coord: [number, number]) => {
            const [lng, lat] = coord
            points.push({
              id: generateId(),
              lat,
              lng,
              order: order++,
            })
          })
        } else if (geometry.type === 'MultiPoint') {
          geometry.coordinates.forEach((coord: [number, number]) => {
            const [lng, lat] = coord
            points.push({
              id: generateId(),
              lat,
              lng,
              order: order++,
            })
          })
        }
      } else if (feature.type === 'FeatureCollection') {
        feature.features.forEach(extractCoordinates)
      }
    }

    extractCoordinates(geojson)

    if (points.length === 0) {
      throw new Error('Aucun point trouvé dans le fichier GeoJSON')
    }

    return points
  }

  // Parser un fichier JSON simple (tableau de coordonnées)
  const parseSimpleJSON = (content: string): RoutePoint[] => {
    const data = JSON.parse(content)
    const points: RoutePoint[] = []

    // Format attendu : [{ lat, lng, name? }] ou [[lat, lng], ...]
    const processItem = (item: any, index: number) => {
      if (Array.isArray(item) && item.length >= 2) {
        // Format [lat, lng]
        const [lat, lng] = item
        if (typeof lat === 'number' && typeof lng === 'number') {
          points.push({
            id: generateId(),
            lat,
            lng,
            order: index,
          })
        }
      } else if (typeof item === 'object' && item !== null) {
        // Format { lat, lng } ou { latitude, longitude }
        const lat = item.lat ?? item.latitude
        const lng = item.lng ?? item.lon ?? item.longitude
        if (typeof lat === 'number' && typeof lng === 'number') {
          points.push({
            id: generateId(),
            lat,
            lng,
            name: item.name,
            order: index,
          })
        }
      }
    }

    if (Array.isArray(data)) {
      data.forEach(processItem)
    } else if (data.points && Array.isArray(data.points)) {
      data.points.forEach(processItem)
    } else if (data.coordinates && Array.isArray(data.coordinates)) {
      data.coordinates.forEach(processItem)
    }

    if (points.length === 0) {
      throw new Error('Aucun point trouvé dans le fichier JSON')
    }

    return points
  }

  // Traiter le fichier importé
  const processFile = async (file: File) => {
    setImporting(true)
    setError(null)

    try {
      const content = await file.text()
      let points: RoutePoint[] = []

      const ext = file.name.toLowerCase().split('.').pop()
      
      if (ext === 'gpx') {
        points = parseGPX(content)
      } else if (ext === 'geojson') {
        points = parseGeoJSON(content)
      } else if (ext === 'json') {
        // Essayer d'abord GeoJSON, puis JSON simple
        try {
          const parsed = JSON.parse(content)
          if (parsed.type === 'FeatureCollection' || parsed.type === 'Feature') {
            points = parseGeoJSON(content)
          } else {
            points = parseSimpleJSON(content)
          }
        } catch {
          points = parseSimpleJSON(content)
        }
      } else {
        throw new Error(`Format non supporté: .${ext}`)
      }

      onImport(points)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'import')
    } finally {
      setImporting(false)
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Gestion du changement de fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // Gestion du drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)

    if (disabled) return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  return (
    <div id="route-importer">
      {/* Zone de drop */}
      <div
        id="route-importer-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        style={{
          padding: 24,
          textAlign: 'center',
          borderRadius: 12,
          border: dragOver ? '2px dashed #3b82f6' : '2px dashed #e2e8f0',
          background: dragOver ? '#eff6ff' : '#f8fafc',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        {importing ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div
              style={{
                width: 24,
                height: 24,
                border: '3px solid #e2e8f0',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span style={{ color: '#64748b', fontSize: 14 }}>Import en cours...</span>
          </div>
        ) : (
          <>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke={dragOver ? '#3b82f6' : '#94a3b8'}
              strokeWidth="1.5"
              style={{ margin: '0 auto 12px' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 500 }}>
              {dragOver ? 'Déposez le fichier ici' : 'Glissez un fichier ici ou cliquez pour sélectionner'}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>
              Formats supportés : GPX, GeoJSON, JSON
            </p>
          </>
        )}
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx,.geojson,.json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {/* Message d'erreur */}
      {error && (
        <div
          id="route-importer-error"
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}

      {/* Aide sur les formats */}
      <details
        style={{
          marginTop: 12,
          padding: 12,
          background: '#f8fafc',
          borderRadius: 8,
          fontSize: 12,
          color: '#64748b',
        }}
      >
        <summary style={{ cursor: 'pointer', fontWeight: 500, marginBottom: 8 }}>
          Aide sur les formats
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <strong>GPX</strong> : Format GPS standard, exportable depuis la plupart des applications GPS
          </div>
          <div>
            <strong>GeoJSON</strong> : Format géographique standard (FeatureCollection, LineString, etc.)
          </div>
          <div>
            <strong>JSON</strong> : Tableau simple de coordonnées, ex:{' '}
            <code style={{ background: '#e2e8f0', padding: '2px 4px', borderRadius: 4 }}>
              {'[{"lat": 48.85, "lng": 2.35}, ...]'}
            </code>
          </div>
        </div>
      </details>

      {/* Animation CSS pour le spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default RouteImporter
