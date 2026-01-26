import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type RecordedPoint = {
  lat: number
  lng: number
  timestamp: string
  accuracy?: number
}

type RecorderMapProps = {
  points: RecordedPoint[]
  isRecording: boolean
}

/**
 * Carte pour afficher les parcours enregistrés (lecture seule)
 * Affiche une polyline et suit le dernier point en mode enregistrement
 */
export function RecorderMap({ points, isRecording }: RecorderMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const polylineRef = useRef<L.Polyline | null>(null)
  const currentMarkerRef = useRef<L.CircleMarker | null>(null)
  const [mapReady, setMapReady] = useState(false)

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([48.8566, 2.3522], 13) // Paris par défaut

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    // Créer la polyline
    polylineRef.current = L.polyline([], {
      color: '#dc2626',
      weight: 4,
      opacity: 0.8,
    }).addTo(map)

    // Créer le marqueur de position actuelle
    currentMarkerRef.current = L.circleMarker([0, 0], {
      radius: 8,
      fillColor: '#dc2626',
      color: '#ffffff',
      weight: 3,
      fillOpacity: 1,
    })

    mapRef.current = map
    setMapReady(true)

    return () => {
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [])

  // Mettre à jour la polyline quand les points changent
  useEffect(() => {
    if (!mapReady || !polylineRef.current || !mapRef.current) return

    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number])
    polylineRef.current.setLatLngs(latlngs)

    if (points.length > 0) {
      const lastPoint = points[points.length - 1]

      // Mettre à jour le marqueur de position actuelle
      if (currentMarkerRef.current) {
        currentMarkerRef.current.setLatLng([lastPoint.lat, lastPoint.lng])
        
        if (isRecording) {
          if (!mapRef.current.hasLayer(currentMarkerRef.current)) {
            currentMarkerRef.current.addTo(mapRef.current)
          }
          // Centrer sur le dernier point en mode enregistrement
          mapRef.current.panTo([lastPoint.lat, lastPoint.lng], { animate: true })
        }
      }

      // Ajuster la vue pour voir tout le parcours
      if (!isRecording && latlngs.length > 1) {
        const bounds = L.latLngBounds(latlngs)
        mapRef.current.fitBounds(bounds, { padding: [50, 50] })
      } else if (latlngs.length === 1) {
        mapRef.current.setView([lastPoint.lat, lastPoint.lng], 16)
      }
    } else {
      // Retirer le marqueur si pas de points
      if (currentMarkerRef.current && mapRef.current.hasLayer(currentMarkerRef.current)) {
        mapRef.current.removeLayer(currentMarkerRef.current)
      }
    }
  }, [points, mapReady, isRecording])

  // Mettre à jour le style du marqueur selon l'état
  useEffect(() => {
    if (!currentMarkerRef.current) return
    
    currentMarkerRef.current.setStyle({
      fillColor: isRecording ? '#dc2626' : '#22c55e',
    })
  }, [isRecording])

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#f1f5f9',
      }}
    />
  )
}

export default RecorderMap
