import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { getPoi, getPoiSegments, generateAudioGuide, getOllamaStatus, type Poi, type AudioSegment } from '@/lib/api'

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
  
  // Audio guide state
  const [segments, setSegments] = useState<AudioSegment[]>([])
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [hasWikipediaContent, setHasWikipediaContent] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const [poiData, segmentsData, ollamaStatus] = await Promise.all([
        getPoi(id),
        getPoiSegments(id).catch(() => null),
        getOllamaStatus().catch(() => ({ available: false })),
      ])
      
      setPoi(poiData)
      setSegments(segmentsData?.segments || [])
      setHasWikipediaContent(segmentsData?.hasWikipediaContent || false)
      setOllamaAvailable(ollamaStatus.available)
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

  const handleGenerateAudioGuide = async () => {
    if (!poi) return
    
    try {
      setGenerating(true)
      setGenerateError(null)
      
      const result = await generateAudioGuide(poi.id)
      setSegments(result.segments)
      
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate audio guide')
    } finally {
      setGenerating(false)
    }
  }

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

      {/* Audio Guide Section - Full width */}
      <div className="mt-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Audio Guide</h2>
              <p className="text-sm text-gray-500 mt-1">
                Génération automatique via LLM (Ollama)
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Ollama status indicator */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                ollamaAvailable 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  ollamaAvailable ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {ollamaAvailable ? 'Ollama connecté' : 'Ollama non disponible'}
              </div>
              
              {/* Generate button */}
              <button
                onClick={handleGenerateAudioGuide}
                disabled={!ollamaAvailable || !hasWikipediaContent || generating}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !ollamaAvailable || !hasWikipediaContent || generating
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Génération...
                  </span>
                ) : segments.length > 0 ? 'Régénérer' : 'Générer audio-guide'}
              </button>
            </div>
          </div>

          {/* Warning if no Wikipedia content */}
          {!hasWikipediaContent && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              Ce POI n'a pas de contenu Wikipedia. Relancez l'import pour récupérer les données.
            </div>
          )}

          {/* Generation error */}
          {generateError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {generateError}
            </div>
          )}

          {/* Segments display */}
          {segments.length > 0 ? (
            <div className="space-y-4">
              {/* Duration summary */}
              <div className="flex gap-4 text-sm text-gray-600 pb-4 border-b">
                <span>
                  <strong>Express:</strong> {formatDuration(getModeDuration(segments, ['hook', 'essential', 'transition']))}
                </span>
                <span>
                  <strong>Standard:</strong> {formatDuration(getModeDuration(segments, ['hook', 'essential', 'context', 'transition']))}
                </span>
                <span>
                  <strong>Complet:</strong> {formatDuration(segments.reduce((sum, s) => sum + s.durationEstimate, 0))}
                </span>
              </div>

              {/* Segments list */}
              {segments.map((segment) => (
                <div 
                  key={segment.id}
                  className={`p-4 rounded-lg border-l-4 ${getSegmentStyle(segment.type)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSegmentBadge(segment.type)}`}>
                        {segment.type.toUpperCase()}
                      </span>
                      <h4 className="font-medium text-gray-900">{segment.title}</h4>
                    </div>
                    <span className="text-sm text-gray-500">
                      ~{formatDuration(segment.durationEstimate)}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {segment.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p>Aucun audio-guide généré</p>
              <p className="text-sm mt-1">Cliquez sur "Générer audio-guide" pour créer les segments</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper functions for segments
function getModeDuration(segments: AudioSegment[], types: string[]): number {
  return segments
    .filter(s => types.includes(s.type))
    .reduce((sum, s) => sum + s.durationEstimate, 0)
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}s`
  if (secs === 0) return `${mins}min`
  return `${mins}min ${secs}s`
}

function getSegmentStyle(type: string): string {
  switch (type) {
    case 'hook': return 'bg-amber-50 border-amber-400'
    case 'essential': return 'bg-blue-50 border-blue-400'
    case 'context': return 'bg-purple-50 border-purple-400'
    case 'anecdotes': return 'bg-pink-50 border-pink-400'
    case 'details': return 'bg-cyan-50 border-cyan-400'
    case 'transition': return 'bg-green-50 border-green-400'
    default: return 'bg-gray-50 border-gray-400'
  }
}

function getSegmentBadge(type: string): string {
  switch (type) {
    case 'hook': return 'bg-amber-200 text-amber-800'
    case 'essential': return 'bg-blue-200 text-blue-800'
    case 'context': return 'bg-purple-200 text-purple-800'
    case 'anecdotes': return 'bg-pink-200 text-pink-800'
    case 'details': return 'bg-cyan-200 text-cyan-800'
    case 'transition': return 'bg-green-200 text-green-800'
    default: return 'bg-gray-200 text-gray-800'
  }
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
