import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Poi } from '@/lib/api'

// Fix Leaflet default icon issue in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const HighlightIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

interface PoiMapProps {
  pois: Poi[]
  center: [number, number]
  zoom?: number
  highlightedPoi?: Poi | null
  onPoiClick?: (poi: Poi) => void
}

export default function PoiMap({ 
  pois, 
  center, 
  zoom = 13, 
  highlightedPoi,
  onPoiClick 
}: PoiMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
  }, [])

  // Update center when it changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom)
    }
  }, [center, zoom])

  // Add/update markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove old markers
    markersRef.current.forEach((marker) => {
      marker.remove()
    })
    markersRef.current.clear()

    // Add new markers
    pois.forEach((poi) => {
      const marker = L.marker([poi.lat, poi.lng], {
        icon: DefaultIcon,
      })

      // Popup content
      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <h4 class="font-semibold text-gray-900">${poi.name}</h4>
          <p class="text-sm text-gray-600 mt-1">${poi.category}</p>
          ${poi.shortDescription ? `<p class="text-xs text-gray-500 mt-2 line-clamp-2">${poi.shortDescription}</p>` : ''}
        </div>
      `
      marker.bindPopup(popupContent)

      // Click handler
      if (onPoiClick) {
        marker.on('click', () => {
          onPoiClick(poi)
        })
      }

      marker.addTo(map)
      markersRef.current.set(poi.id, marker)
    })

    // Fit bounds if multiple POIs
    if (pois.length > 1) {
      const bounds = L.latLngBounds(pois.map((p) => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [pois, onPoiClick])

  // Highlight marker on hover
  useEffect(() => {
    if (!highlightedPoi) {
      // Reset all markers to default icon
      markersRef.current.forEach((marker) => {
        marker.setIcon(DefaultIcon)
      })
      return
    }

    // Reset all markers first
    markersRef.current.forEach((marker) => {
      marker.setIcon(DefaultIcon)
    })

    // Highlight the hovered marker
    const marker = markersRef.current.get(highlightedPoi.id)
    if (marker) {
      marker.setIcon(HighlightIcon)
      marker.openPopup()
    }
  }, [highlightedPoi])

  return (
    <div ref={containerRef} className="w-full h-full" />
  )
}
