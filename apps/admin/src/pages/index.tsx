import { useState, useEffect } from 'react'
import { getZones, type Zone } from '@/lib/api'
import { ZoneCard } from '@/components/ZoneCard'

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchZones = async () => {
    try {
      const data = await getZones()
      setZones(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load zones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchZones()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Erreur</h2>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchZones}
          className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
        >
          Réessayer
        </button>
      </div>
    )
  }

  const totalPois = zones.reduce((sum, z) => sum + z.poiCount, 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Zones d'import</h1>
        <p className="text-gray-600 mt-1">
          {zones.length} zone{zones.length > 1 ? 's' : ''} configurée{zones.length > 1 ? 's' : ''} - {totalPois} POIs au total
        </p>
      </div>

      {/* Zones grid */}
      {zones.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune zone configurée</h3>
          <p className="text-gray-600 mb-4">
            Exécutez le seed pour créer les zones initiales.
          </p>
          <code className="bg-gray-100 px-3 py-1 rounded text-sm">
            pnpm --filter @city-guided/database db:seed
          </code>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zones.map(zone => (
            <ZoneCard 
              key={zone.id} 
              zone={zone} 
              onImportComplete={fetchZones}
            />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Comment fonctionne l'import ?</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Cliquez sur "Importer" pour une zone</li>
          <li>L'API récupère les POIs depuis OpenTripMap (rayon de {zones[0]?.radiusKm || 5}km)</li>
          <li>Les descriptions sont enrichies via Wikidata</li>
          <li>Les POIs sont sauvegardés en base (upsert si déjà existants)</li>
        </ol>
      </div>
    </div>
  )
}
