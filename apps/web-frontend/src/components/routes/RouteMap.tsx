import React, { useEffect, useRef, useState } from 'react'
import type { RoutePoint } from './RoutePointsList'

type RouteMapProps = {
  points: RoutePoint[]
  onPointAdd: (lat: number, lng: number) => void
  onPointMove?: (pointId: string, lat: number, lng: number) => void
  selectedPointId?: string | null
  onPointSelect?: (pointId: string | null) => void
  center?: { lat: number; lng: number }
  zoom?: number
  visible?: boolean // Permet de détecter quand la carte devient visible
}

/**
 * Carte interactive pour visualiser et éditer un trajet
 * Utilise Leaflet pour la cartographie
 * Composant modulaire pour future migration vers backoffice
 */
export function RouteMap({
  points,
  onPointAdd,
  onPointMove,
  selectedPointId,
  onPointSelect,
  center = { lat: 48.402, lng: 2.699 }, // Default: Fontainebleau
  zoom = 14,
  visible = true,
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const polylineRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)

  // Initialiser la carte
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    const initMap = async () => {
      const L = await import('leaflet')
      // CSS is loaded via link tag in index.tsx, no need to import here

      // Ne pas recréer la carte si elle existe déjà
      if (mapRef.current) return

      // Créer la carte
      const map = L.map(mapContainerRef.current!, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: true,
      })

      // Ajouter le layer OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // Gérer le clic pour ajouter un point
      map.on('click', (e: any) => {
        onPointAdd(e.latlng.lat, e.latlng.lng)
      })

      mapRef.current = map
      setMapReady(true)
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markersRef.current.clear()
      }
    }
  }, [])

  // Recalculer les dimensions de la carte quand elle devient visible
  // Fix pour le bug de carte coupée lors du toggle formulaire/carte
  useEffect(() => {
    if (visible && mapReady && mapRef.current) {
      // Délai pour attendre la fin de la transition CSS (200ms + buffer)
      const timeoutId = setTimeout(() => {
        mapRef.current?.invalidateSize()
      }, 250)
      
      return () => clearTimeout(timeoutId)
    }
  }, [visible, mapReady])

  // Mettre à jour les marqueurs et la polyline quand les points changent
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const updateMapElements = async () => {
      const L = await import('leaflet')

      // Supprimer les marqueurs qui n'existent plus
      markersRef.current.forEach((marker, id) => {
        if (!points.find((p) => p.id === id)) {
          marker.remove()
          markersRef.current.delete(id)
        }
      })

      // Ajouter ou mettre à jour les marqueurs
      points.forEach((point, index) => {
        const isSelected = selectedPointId === point.id
        const isFirst = index === 0
        const isLast = index === points.length - 1

        // Couleur du marqueur
        const color = isFirst ? '#22c55e' : isLast ? '#ef4444' : '#3b82f6'
        const bgColor = isSelected ? '#fef3c7' : '#ffffff'

        // Créer l'icône personnalisée
        const icon = L.divIcon({
          className: 'route-marker',
          html: `
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: ${bgColor};
              border: 3px solid ${color};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 700;
              color: ${color};
              box-shadow: ${isSelected ? '0 0 0 4px rgba(251, 191, 36, 0.4),' : ''} 0 2px 8px rgba(0,0,0,0.2);
              cursor: ${onPointMove ? 'grab' : 'pointer'};
              transform: translate(-50%, -50%);
            ">
              ${index + 1}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        let marker = markersRef.current.get(point.id)

        if (marker) {
          // Mettre à jour la position et l'icône
          marker.setLatLng([point.lat, point.lng])
          marker.setIcon(icon)
        } else {
          // Créer un nouveau marqueur
          marker = L.marker([point.lat, point.lng], {
            icon,
            draggable: !!onPointMove,
          }).addTo(mapRef.current!)

          // Gérer le clic sur le marqueur
          marker.on('click', (e: any) => {
            e.originalEvent.stopPropagation()
            onPointSelect?.(point.id)
          })

          // Gérer le drag du marqueur
          if (onPointMove) {
            marker.on('dragend', () => {
              const latlng = marker.getLatLng()
              onPointMove(point.id, latlng.lat, latlng.lng)
            })
          }

          markersRef.current.set(point.id, marker)
        }
      })

      // Mettre à jour la polyline
      if (polylineRef.current) {
        polylineRef.current.remove()
      }

      if (points.length > 1) {
        const latlngs = points.map((p) => [p.lat, p.lng] as [number, number])
        polylineRef.current = L.polyline(latlngs, {
          color: '#3b82f6',
          weight: 3,
          opacity: 0.7,
          dashArray: '10, 5',
        }).addTo(mapRef.current!)
      }

      // Ajuster la vue pour voir tous les points
      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
        mapRef.current!.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
      }
    }

    updateMapElements()
  }, [points, selectedPointId, mapReady, onPointMove, onPointSelect])

  return (
    <div id="route-map-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Conteneur de la carte */}
      <div
        ref={mapContainerRef}
        id="route-map"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#f1f5f9',
        }}
      />

      {/* Overlay d'instructions */}
      {mapReady && points.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: 13,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 1000,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          Cliquez sur la carte pour ajouter des points
        </div>
      )}

      {/* Légende */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          padding: 10,
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: 11,
          color: '#64748b',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#22c55e',
            }}
          />
          <span>Départ</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#3b82f6',
            }}
          />
          <span>Étape</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#ef4444',
            }}
          />
          <span>Arrivée</span>
        </div>
      </div>

      {/* Statistiques */}
      {points.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            padding: 10,
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: 12,
            color: '#0f172a',
            zIndex: 1000,
          }}
        >
          <strong>{points.length}</strong> point{points.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

export default RouteMap
