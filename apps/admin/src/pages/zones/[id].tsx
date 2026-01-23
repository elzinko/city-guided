import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getZonePois, type Zone, type Poi } from '@/lib/api'
import { PoiList } from '@/components/PoiList'

// Dynamic import pour Leaflet (pas de SSR)
const PoiMap = dynamic(() => import('@/components/PoiMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  ),
})

export default function ZoneDetailPage() {
  const router = useRouter()
  const { id } = router.query as { id: string }
  
  const [zone, setZone] = useState<Zone | null>(null)
  const [pois, setPois] = useState<Poi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredPoi, setHoveredPoi] = useState<Poi | null>(null)
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const data = await getZonePois(id)
      setZone(data.zone)
      setPois(data.pois)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePoiHover = (poi: Poi | null) => {
    setHoveredPoi(poi)
  }

  const handleMapPoiClick = (poi: Poi) => {
    setSelectedPoi(poi)
    router.push(`/pois/${poi.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !zone) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Erreur</h2>
        <p className="text-red-600">{error || 'Zone not found'}</p>
        <Link 
          href="/"
          className="inline-block mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
        >
          Retour aux zones
        </Link>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/" className="hover:text-blue-600">Zones</Link>
            <span>/</span>
            <span>{zone.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{zone.name}</h1>
          <p className="text-gray-600">
            {pois.length} POI{pois.length > 1 ? 's' : ''} - Rayon: {zone.radiusKm}km
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          Retour
        </Link>
      </div>

      {/* Content */}
      {pois.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun POI importé</h3>
          <p className="text-gray-600 mb-4">
            Lancez un import depuis la page des zones pour récupérer les POIs.
          </p>
          <Link 
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour aux zones
          </Link>
        </div>
      ) : (
        <div className="flex gap-4 h-full">
          {/* Map */}
          <div className="flex-1 rounded-lg overflow-hidden border">
            <PoiMap 
              pois={pois}
              center={[zone.lat, zone.lng]}
              zoom={13}
              highlightedPoi={hoveredPoi}
              onPoiClick={handleMapPoiClick}
            />
          </div>

          {/* List */}
          <div className="w-96 bg-white rounded-lg border overflow-hidden">
            <PoiList 
              pois={pois}
              onPoiHover={handlePoiHover}
              selectedPoiId={selectedPoi?.id}
            />
          </div>
        </div>
      )}
    </div>
  )
}
