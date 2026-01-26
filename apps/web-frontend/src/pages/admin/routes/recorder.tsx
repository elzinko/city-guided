import React, { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { Notification } from '../../../components/routes'
import type { NotificationType } from '../../../components/routes'

// Point GPS avec timestamp réel
type RecordedPoint = {
  lat: number
  lng: number
  timestamp: string // ISO timestamp
  accuracy?: number // Précision GPS en mètres
}

// Trajet enregistré
type RecordedRoute = {
  id: string
  name: string
  points: RecordedPoint[]
  startTime: string
  endTime?: string
  isRecording: boolean
}

// Charger la carte côté client uniquement (Leaflet)
const RecorderMap = dynamic(() => import('../../../components/routes/RecorderMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9',
      }}
    >
      Chargement de la carte...
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
      setGpsError('La géolocalisation n\'est pas supportée par ce navigateur')
      return
    }

    const newRoute: RecordedRoute = {
      id: generateId(),
      name: `Enregistrement ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      points: [],
      startTime: new Date().toISOString(),
      isRecording: true,
    }

    setCurrentRoute(newRoute)
    setIsRecording(true)
    setGpsError(null)

    // Surveiller la position
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
        console.error('Erreur GPS:', error)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('Permission GPS refusée')
            break
          case error.POSITION_UNAVAILABLE:
            setGpsError('Position GPS indisponible')
            break
          case error.TIMEOUT:
            setGpsError('Délai GPS dépassé')
            break
          default:
            setGpsError('Erreur GPS inconnue')
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
  const deleteRoute = (routeId: string) => {
    if (!confirm('Supprimer cet enregistrement ?')) return
    const newRoutes = savedRoutes.filter((r) => r.id !== routeId)
    saveRoutes(newRoutes)
    if (selectedRoute?.id === routeId) {
      setSelectedRoute(null)
    }
    showNotificationMsg('success', 'Enregistrement supprimé')
  }

  // Exporter en GPX avec horodatage réel
  const exportToGPX = (route: RecordedRoute) => {
    const escapeXml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    }

    const trackpoints = route.points
      .map(
        (p) => `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">
        <time>${p.timestamp}</time>
      </trkpt>`
      )
      .join('\n')

    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CityGuided Recorder"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
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
    showNotificationMsg('success', 'GPX exporté avec horodatage')
  }

  // Formater la durée
  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000)
    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const seconds = diff % 60
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  // Points à afficher sur la carte
  const displayPoints = selectedRoute?.points || currentRoute?.points || []

  return (
    <>
      <Head>
        <title>Recorder GPS - CityGuided</title>
      </Head>

      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        {/* Header */}
        <header
          style={{
            padding: '12px 16px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* Bouton retour */}
          <button
            onClick={() => (window.location.href = '/admin/routes')}
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
              cursor: 'pointer',
            }}
            title="Retour aux trajets"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
              Recorder GPS
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              Enregistrez vos parcours en temps réel
            </p>
          </div>

          {/* Indicateur précision GPS */}
          {isRecording && gpsAccuracy !== null && (
            <div
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: gpsAccuracy < 10 ? '#dcfce7' : gpsAccuracy < 30 ? '#fef3c7' : '#fee2e2',
                color: gpsAccuracy < 10 ? '#166534' : gpsAccuracy < 30 ? '#92400e' : '#991b1b',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              GPS: ±{Math.round(gpsAccuracy)}m
            </div>
          )}
        </header>

        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Panneau latéral */}
          <div
            style={{
              width: 320,
              background: '#ffffff',
              borderRight: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Contrôles d'enregistrement */}
            <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0' }}>
              {gpsError && (
                <div
                  style={{
                    marginBottom: 12,
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
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {gpsError}
                </div>
              )}

              {isRecording ? (
                <div>
                  <div
                    style={{
                      marginBottom: 12,
                      padding: 12,
                      borderRadius: 8,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        color: '#dc2626',
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#dc2626',
                          animation: 'pulse 1s infinite',
                        }}
                      />
                      Enregistrement en cours
                    </div>
                    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
                      {currentRoute?.points.length || 0} pts
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Durée: {formatDuration(currentRoute?.startTime || new Date().toISOString())}
                    </div>
                  </div>
                  <button
                    onClick={stopRecording}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#dc2626',
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    Arrêter l'enregistrement
                  </button>
                </div>
              ) : (
                <button
                  onClick={startRecording}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#22c55e',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  Démarrer l'enregistrement
                </button>
              )}
            </div>

            {/* Liste des enregistrements */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                Enregistrements ({savedRoutes.length})
              </h3>

              {savedRoutes.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: 13,
                  }}
                >
                  Aucun enregistrement
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {savedRoutes.map((route) => (
                    <div
                      key={route.id}
                      onClick={() => setSelectedRoute(route)}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: selectedRoute?.id === route.id ? '#f0fdf4' : '#f8fafc',
                        border: selectedRoute?.id === route.id ? '2px solid #22c55e' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                        {route.name}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                        {route.points.length} points • {formatDuration(route.startTime, route.endTime)}
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            exportToGPX(route)
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#3b82f6',
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          GPX
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteRoute(route.id)
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Carte */}
          <div style={{ flex: 1 }}>
            <RecorderMap points={displayPoints} isRecording={isRecording} />
          </div>
        </main>

        {/* Notification */}
        {notification && <Notification type={notification.type} message={notification.message} />}

        {/* CSS animations */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </>
  )
}
