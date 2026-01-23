import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { getPoi, type Poi } from '@/lib/api'

// Dynamic import pour Leaflet (pas de SSR)
const PoiMap = dynamic(() => import('@/components/PoiMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  ),
})

export default function PoiDetailPage() {
  const router = useRouter()
  const { id } = router.query as { id: string }
  
  const [poi, setPoi] = useState<Poi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const data = await getPoi(id)
      setPoi(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load POI')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !poi) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Erreur</h2>
        <p className="text-red-600">{error || 'POI not found'}</p>
        <button 
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
        >
          Retour
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button 
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-blue-600 mb-2 flex items-center gap-1"
        >
          <span>←</span> Retour
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{poi.name}</h1>
            <span className={`inline-block mt-2 px-3 py-1 text-sm rounded-full ${getCategoryColor(poi.category)}`}>
              {poi.category}
            </span>
          </div>
          {poi.otmRate && (
            <div className="flex items-center gap-1">
              {[...Array(7)].map((_, i) => (
                <span 
                  key={i} 
                  className={`text-lg ${i < poi.otmRate! ? 'text-yellow-500' : 'text-gray-300'}`}
                >
                  ★
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Image */}
          {poi.imageUrl && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <img 
                src={poi.imageUrl} 
                alt={poi.name}
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          {/* Map */}
          <div className="bg-white rounded-lg border overflow-hidden h-64">
            <PoiMap 
              pois={[poi]}
              center={[poi.lat, poi.lng]}
              zoom={15}
            />
          </div>

          {/* Coordinates */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium text-gray-900 mb-3">Localisation</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Latitude</dt>
                <dd className="font-mono">{poi.lat.toFixed(6)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Longitude</dt>
                <dd className="font-mono">{poi.lng.toFixed(6)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Rayon</dt>
                <dd>{poi.radiusMeters}m</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Descriptions */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium text-gray-900 mb-3">Description</h3>
            <p className="text-gray-700 leading-relaxed">
              {poi.shortDescription || poi.wikidataDescription || 'Pas de description disponible.'}
            </p>
            {poi.fullDescription && (
              <p className="text-gray-600 mt-3 text-sm leading-relaxed">
                {poi.fullDescription}
              </p>
            )}
          </div>

          {/* OpenTripMap data */}
          {poi.otmId && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-medium text-gray-900 mb-3">Données OpenTripMap</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">ID</dt>
                  <dd className="font-mono text-xs">{poi.otmId}</dd>
                </div>
                {poi.otmKinds && poi.otmKinds.length > 0 && (
                  <div>
                    <dt className="text-gray-500 mb-1">Catégories</dt>
                    <dd className="flex flex-wrap gap-1">
                      {poi.otmKinds.map(kind => (
                        <span key={kind} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {kind}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Wikidata data */}
          {poi.wikidataId && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-medium text-gray-900 mb-3">Données Wikidata</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">ID</dt>
                  <dd>
                    <a 
                      href={`https://www.wikidata.org/wiki/${poi.wikidataId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {poi.wikidataId}
                    </a>
                  </dd>
                </div>
                {poi.wikipediaUrl && (
                  <div>
                    <dt className="text-gray-500">Wikipedia</dt>
                    <dd>
                      <a 
                        href={poi.wikipediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Voir l'article
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium text-gray-900 mb-3">Métadonnées</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">ID</dt>
                <dd className="font-mono text-xs">{poi.id}</dd>
              </div>
              {poi.importedAt && (
                <div>
                  <dt className="text-gray-500">Importé le</dt>
                  <dd>{new Date(poi.importedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}</dd>
                </div>
              )}
              {poi.updatedAt && (
                <div>
                  <dt className="text-gray-500">Mis à jour le</dt>
                  <dd>{new Date(poi.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'Monuments': return 'bg-amber-100 text-amber-800'
    case 'Musees': return 'bg-purple-100 text-purple-800'
    case 'Art': return 'bg-pink-100 text-pink-800'
    case 'Insolite': return 'bg-cyan-100 text-cyan-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}
