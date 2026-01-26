import React, { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import {
  Notification,
  RecordButton,
  RecordingStatus,
  RecordingsList,
} from '../../../components/routes'
import type { NotificationType, RecordedRoute } from '../../../components/routes'

// Point GPS avec timestamp réel
type RecordedPoint = {
  lat: number
  lng: number
  timestamp: string
  accuracy?: number
}

// Charger la carte côté client uniquement (Leaflet)
const RecorderMap = dynamic(() => import('../../../components/routes/RecorderMap'), {
  ssr: false,
  loading: () => (
    <div
      id="recorder-map-loading"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9',
        borderRadius: 12,
        color: '#94a3b8',
        fontSize: 13,
      }}
    >
      Chargement...
    </div>
  ),
})

// Clé localStorage pour persister les enregistrements
const RECORDINGS_STORAGE_KEY = 'cityguided_recorded_routes'

export default function RecorderPage() {
  // États d'enregistrement
  const [isRecording, setIsRecording] = useState(false)
  const [currentRoute, setCurrentRoute] = useState<RecordedRoute | null>(null)
  const [savedRoutes, setSavedRoutes] = useState<RecordedRoute[]>([])
  const [selectedRoute, setSelectedRoute] = useState<RecordedRoute | null>(null)
  
  // États UI
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null)
  
  // Références
  const watchIdRef = useRef<number | null>(null)

  // Générer un ID unique
  const generateId = () => `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Afficher une notification
  const showNotificationMsg = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // Charger les enregistrements depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECORDINGS_STORAGE_KEY)
      if (saved) {
        setSavedRoutes(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Erreur chargement enregistrements:', e)
    }
  }, [])

  // Sauvegarder les enregistrements dans localStorage
  const saveRoutes = useCallback((routes: RecordedRoute[]) => {
    try {
      localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(routes))
      setSavedRoutes(routes)
    } catch (e) {
      console.error('Erreur sauvegarde enregistrements:', e)
    }
  }, [])

  // Démarrer l'enregistrement GPS
  const startRecording = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Géolocalisation non supportée')
      return
    }

    const newRoute: RecordedRoute = {
      id: generateId(),
      name: `${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      points: [],
      startTime: new Date().toISOString(),
      isRecording: true,
    }

    setCurrentRoute(newRoute)
    setIsRecording(true)
    setGpsError(null)
    setSelectedRoute(null)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const point: RecordedPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
          accuracy: position.coords.accuracy,
        }
        
        setGpsAccuracy(position.coords.accuracy)
        
        setCurrentRoute((prev) => {
          if (!prev) return null
          return {
            ...prev,
            points: [...prev.points, point],
          }
        })
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('Permission refusée')
            break
          case error.POSITION_UNAVAILABLE:
            setGpsError('Position indisponible')
            break
          case error.TIMEOUT:
            setGpsError('Délai dépassé')
            break
          default:
            setGpsError('Erreur GPS')
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    )

    showNotificationMsg('success', 'Enregistrement démarré')
  }, [])

  // Arrêter l'enregistrement GPS
  const stopRecording = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    setIsRecording(false)

    if (currentRoute && currentRoute.points.length > 0) {
      const finalRoute: RecordedRoute = {
        ...currentRoute,
        endTime: new Date().toISOString(),
        isRecording: false,
      }
      
      const newRoutes = [...savedRoutes, finalRoute]
      saveRoutes(newRoutes)
      setSelectedRoute(finalRoute)
      setCurrentRoute(null)
      showNotificationMsg('success', `${finalRoute.points.length} points enregistrés`)
    } else {
      setCurrentRoute(null)
      showNotificationMsg('error', 'Aucun point enregistré')
    }
  }, [currentRoute, savedRoutes, saveRoutes])

  // Supprimer un enregistrement
  const handleDelete = (routeId: string) => {
    if (!confirm('Supprimer cet enregistrement ?')) return
    const newRoutes = savedRoutes.filter((r) => r.id !== routeId)
    saveRoutes(newRoutes)
    if (selectedRoute?.id === routeId) {
      setSelectedRoute(null)
    }
    showNotificationMsg('success', 'Supprimé')
  }

  // Renommer un enregistrement
  const handleRename = (routeId: string, newName: string) => {
    const newRoutes = savedRoutes.map((r) =>
      r.id === routeId ? { ...r, name: newName } : r
    )
    saveRoutes(newRoutes)
    if (selectedRoute?.id === routeId) {
      setSelectedRoute({ ...selectedRoute, name: newName })
    }
    showNotificationMsg('success', 'Renommé')
  }

  // Exporter en GPX avec horodatage réel
  const exportToGPX = (route: RecordedRoute) => {
    const escapeXml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')

    const trackpoints = route.points
      .map(
        (p) => `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">
        <time>${p.timestamp}</time>
      </trkpt>`
      )
      .join('\n')

    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CityGuided Recorder"
     xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(route.name)}</name>
    <desc>Enregistré avec CityGuided</desc>
    <time>${route.startTime}</time>
  </metadata>
  <trk>
    <name>${escapeXml(route.name)}</name>
    <trkseg>
${trackpoints}
    </trkseg>
  </trk>
</gpx>`

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${route.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.gpx`
    a.click()
    URL.revokeObjectURL(url)
    showNotificationMsg('success', 'GPX exporté')
  }

  // Formater la durée
  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000)
    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const seconds = diff % 60
    if (hours > 0) return `${hours}h${minutes}m`
    if (minutes > 0) return `${minutes}m${seconds}s`
    return `${seconds}s`
  }

  // Points à afficher sur la carte
  const displayPoints = selectedRoute?.points || currentRoute?.points || []

  return (
    <>
      <Head>
        <title>Recorder GPS - CityGuided</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div
        id="recorder-page"
        style={{
          minHeight: '100vh',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <header
          id="recorder-header"
          style={{
            padding: '12px 16px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <a
            id="recorder-back-btn"
            href="/admin/routes"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              textDecoration: 'none',
            }}
            title="Retour aux trajets"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </a>

          <div id="recorder-header-info" style={{ flex: 1 }}>
            <h1 id="recorder-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Recorder GPS
            </h1>
          </div>

          {/* Badge GPS */}
          {isRecording && gpsAccuracy !== null && (
            <div
              id="recorder-gps-badge"
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                background: gpsAccuracy < 10 ? '#dcfce7' : gpsAccuracy < 30 ? '#fef3c7' : '#fee2e2',
                color: gpsAccuracy < 10 ? '#166534' : gpsAccuracy < 30 ? '#92400e' : '#991b1b',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              ±{Math.round(gpsAccuracy)}m
            </div>
          )}
        </header>

        {/* Contenu */}
        <main id="recorder-main" style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Bouton d'enregistrement */}
          <RecordButton
            isRecording={isRecording}
            onStart={startRecording}
            onStop={stopRecording}
          />

          {/* Statut enregistrement */}
          {isRecording && currentRoute && (
            <RecordingStatus
              pointsCount={currentRoute.points.length}
              duration={formatDuration(currentRoute.startTime)}
            />
          )}

          {/* Erreur GPS */}
          {gpsError && (
            <div
              id="recorder-gps-error"
              style={{
                padding: 12,
                borderRadius: 12,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              {gpsError}
            </div>
          )}

          {/* Mini carte */}
          <div
            id="recorder-map-container"
            style={{
              height: 180,
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              background: '#f1f5f9',
            }}
          >
            <RecorderMap points={displayPoints} isRecording={isRecording} />
          </div>

          {/* Liste des enregistrements */}
          <RecordingsList
            recordings={savedRoutes}
            selectedId={selectedRoute?.id || null}
            onSelect={setSelectedRoute}
            onExport={exportToGPX}
            onDelete={handleDelete}
            onRename={handleRename}
            formatDuration={formatDuration}
          />
        </main>

        {/* Notification */}
        {notification && <Notification type={notification.type} message={notification.message} />}

        {/* CSS animations */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    </>
  )
}
