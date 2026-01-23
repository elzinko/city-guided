import Link from 'next/link'
import { useState } from 'react'
import type { Zone, ImportStatus } from '@/lib/api'
import { startImport, getImportStatus } from '@/lib/api'

interface ZoneCardProps {
  zone: Zone
  onImportComplete?: () => void
}

export function ZoneCard({ zone, onImportComplete }: ZoneCardProps) {
  const [importing, setImporting] = useState(false)
  const [status, setStatus] = useState<ImportStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImport = async () => {
    setImporting(true)
    setError(null)
    setStatus(null)

    try {
      await startImport(zone.id)
      
      // Poll pour le statut
      const pollStatus = async () => {
        try {
          const s = await getImportStatus(zone.id)
          setStatus(s)
          
          if (s.status === 'completed') {
            setImporting(false)
            onImportComplete?.()
          } else if (s.status === 'error') {
            setImporting(false)
            setError(s.error || 'Import failed')
          } else {
            // Continuer à poller
            setTimeout(pollStatus, 1000)
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to get status')
          setImporting(false)
        }
      }
      
      pollStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start import')
      setImporting(false)
    }
  }

  const lastImport = zone.lastImportAt 
    ? new Date(zone.lastImportAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Jamais'

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
          <p className="text-sm text-gray-500">
            {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)} - Rayon: {zone.radiusKm}km
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {zone.poiCount} POIs
        </span>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        <span className="font-medium">Dernier import:</span> {lastImport}
      </div>

      {/* Import status */}
      {status && importing && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm mb-2">
            <span className={`px-2 py-0.5 rounded status-${status.status}`}>
              {status.status}
            </span>
            <span className="text-gray-600">
              {status.progress}% ({status.total} POIs)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status completed */}
      {status && status.status === 'completed' && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-800">
          Import terminé: {status.created} créés, {status.updated} mis à jour
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href={`/zones/${zone.id}`}
          className="flex-1 text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Voir les POIs
        </Link>
        <button
          onClick={handleImport}
          disabled={importing}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {importing ? 'Import en cours...' : 'Importer'}
        </button>
      </div>
    </div>
  )
}
