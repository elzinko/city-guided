import React, { useState, useCallback, useEffect } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import {
  RoutePointsList,
  RouteCard,
  NewRouteButton,
  RouteForm,
  Notification,
  ImportModal,
  HelpPopup,
} from '../../components/routes'
import type { RoutePoint, NotificationType, RecordedRoute } from '../../components/routes'

// Types pour les trajets sauvegardés
type SavedRoute = {
  id: string
  name: string
  description?: string
  points: RoutePoint[]
  createdAt: string
  updatedAt: string
  isDefault?: boolean
  isImported?: boolean
}

// Charger la carte côté client uniquement (Leaflet)
const RouteMap = dynamic(() => import('../../components/routes/RouteMap'), {
  ssr: false,
  loading: () => (
    <div
      id="route-map-loading"
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

// Clés localStorage
const ROUTES_STORAGE_KEY = 'cityguided_custom_routes'
const RECORDINGS_STORAGE_KEY = 'cityguided_recorded_routes'

// Routes par défaut
const DEFAULT_ROUTES: SavedRoute[] = [
  {
    id: 'fontainebleau_loop',
    name: 'Boucle Fontainebleau',
    description: 'Parcours touristique autour du château',
    points: [
      { id: 'p1', lat: 48.402, lng: 2.6998, order: 0 },
      { id: 'p2', lat: 48.4045, lng: 2.7015, order: 1 },
      { id: 'p3', lat: 48.4082, lng: 2.6965, order: 2 },
      { id: 'p4', lat: 48.4121, lng: 2.6927, order: 3 },
      { id: 'p5', lat: 48.4105, lng: 2.7045, order: 4 },
      { id: 'p6', lat: 48.4078, lng: 2.7124, order: 5 },
      { id: 'p7', lat: 48.4051, lng: 2.7186, order: 6 },
      { id: 'p8', lat: 48.4018, lng: 2.7221, order: 7 },
      { id: 'p9', lat: 48.3986, lng: 2.7189, order: 8 },
      { id: 'p10', lat: 48.3962, lng: 2.7132, order: 9 },
      { id: 'p11', lat: 48.3948, lng: 2.7068, order: 10 },
      { id: 'p12', lat: 48.3965, lng: 2.6998, order: 11 },
      { id: 'p13', lat: 48.3991, lng: 2.6942, order: 12 },
      { id: 'p14', lat: 48.4012, lng: 2.6968, order: 13 },
      { id: 'p15', lat: 48.402, lng: 2.6998, order: 14 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    isDefault: true,
  },
]

/**
 * Page d'édition des trajets virtuels
 */
export default function RoutesAdmin() {
  // État principal
  const [customRoutes, setCustomRoutes] = useState<SavedRoute[]>([])
  const [currentRoute, setCurrentRoute] = useState<SavedRoute | null>(null)
  const [points, setPoints] = useState<RoutePoint[]>([])
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
  
  // États UI
  const [routeName, setRouteName] = useState('')
  const [routeDescription, setRouteDescription] = useState('')
  const [showRouteList, setShowRouteList] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null)
  
  // États modals
  const [showImportModal, setShowImportModal] = useState(false)
  const [showHelpPopup, setShowHelpPopup] = useState(false)
  const [recordings, setRecordings] = useState<RecordedRoute[]>([])
  const [importError, setImportError] = useState<string | null>(null)

  // Combiner routes
  const allRoutes = [...DEFAULT_ROUTES, ...customRoutes]
  const isReadOnly = currentRoute?.isImported || currentRoute?.isDefault || false

  // Charger les trajets
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ROUTES_STORAGE_KEY)
      if (saved) setCustomRoutes(JSON.parse(saved))
    } catch (e) {
      console.error('Erreur chargement trajets:', e)
    }
  }, [])

  // Charger les enregistrements
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECORDINGS_STORAGE_KEY)
      if (saved) setRecordings(JSON.parse(saved))
    } catch (e) {
      console.error('Erreur chargement enregistrements:', e)
    }
  }, [showImportModal])

  // Sauvegarder
  const saveRoutes = useCallback((newRoutes: SavedRoute[]) => {
    try {
      localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(newRoutes))
      setCustomRoutes(newRoutes)
    } catch (e) {
      console.error('Erreur sauvegarde:', e)
    }
  }, [])

  // Notification
  const showNotificationMsg = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // Générer ID
  const generateId = () => `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Actions routes
  const handleNewRoute = () => {
    setCurrentRoute(null)
    setPoints([])
    setRouteName('')
    setRouteDescription('')
    setSelectedPointId(null)
    setShowRouteList(false)
  }

  const handleEditRoute = (route: SavedRoute) => {
    if (route.isDefault) {
      setCurrentRoute(null)
      setPoints([...route.points])
      setRouteName(`${route.name} (copie)`)
      setRouteDescription(route.description || '')
    } else {
      setCurrentRoute(route)
      setPoints(route.points)
      setRouteName(route.name)
      setRouteDescription(route.description || '')
    }
    setSelectedPointId(null)
    setShowRouteList(false)
  }

  const handleDeleteRoute = (routeId: string) => {
    if (!confirm('Supprimer ce trajet ?')) return
    const newRoutes = customRoutes.filter((r) => r.id !== routeId)
    saveRoutes(newRoutes)
    showNotificationMsg('success', 'Trajet supprimé')
    if (currentRoute?.id === routeId) handleNewRoute()
  }

  const handleSaveRoute = async () => {
    if (!routeName.trim()) {
      showNotificationMsg('error', 'Nom requis')
      return
    }
    if (points.length < 2) {
      showNotificationMsg('error', 'Minimum 2 points')
      return
    }

    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      
      if (currentRoute && !currentRoute.isDefault) {
        const updatedRoute: SavedRoute = {
          ...currentRoute,
          name: routeName,
          description: routeDescription,
          points,
          updatedAt: now,
        }
        const newRoutes = customRoutes.map((r) => (r.id === currentRoute.id ? updatedRoute : r))
        saveRoutes(newRoutes)
        setCurrentRoute(updatedRoute)
        showNotificationMsg('success', 'Trajet mis à jour')
      } else {
        const newRoute: SavedRoute = {
          id: generateId(),
          name: routeName,
          description: routeDescription,
          points,
          createdAt: now,
          updatedAt: now,
        }
        saveRoutes([...customRoutes, newRoute])
        setCurrentRoute(newRoute)
        showNotificationMsg('success', 'Trajet créé')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Points
  const handleAddPoint = useCallback((lat: number, lng: number) => {
    const pointId = `pt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setPoints((prev) => [...prev, { id: pointId, lat, lng, order: prev.length }])
    setSelectedPointId(pointId)
  }, [])

  const handleMovePoint = (pointId: string, lat: number, lng: number) => {
    setPoints(points.map((p) => (p.id === pointId ? { ...p, lat, lng } : p)))
  }

  // Import GPX
  const parseGPX = (content: string): RoutePoint[] => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'application/xml')
    const parseError = doc.querySelector('parsererror')
    if (parseError) throw new Error('Fichier GPX invalide')

    const points: RoutePoint[] = []
    const trackpoints = doc.querySelectorAll('trkpt, wpt, rtept')
    
    trackpoints.forEach((pt, index) => {
      const lat = parseFloat(pt.getAttribute('lat') || '')
      const lng = parseFloat(pt.getAttribute('lon') || '')
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push({ id: `pt_${Date.now()}_${index}`, lat, lng, order: index })
      }
    })

    if (points.length === 0) throw new Error('Aucun point trouvé')
    return points
  }

  const handleFileImport = async (file: File) => {
    setImportError(null)
    try {
      const content = await file.text()
      const importedPoints = parseGPX(content)
      createImportedRoute(importedPoints, file.name.replace('.gpx', ''))
    } catch (err: any) {
      setImportError(err.message || 'Erreur import')
    }
  }

  const handleRecorderImport = (recording: RecordedRoute) => {
    const importedPoints: RoutePoint[] = recording.points.map((p, index) => ({
      id: `pt_${Date.now()}_${index}`,
      lat: p.lat,
      lng: p.lng,
      order: index,
    }))
    createImportedRoute(importedPoints, recording.name)
  }

  const createImportedRoute = (importedPoints: RoutePoint[], defaultName: string) => {
    const name = prompt('Nom du trajet :', defaultName)
    if (!name) {
      showNotificationMsg('error', 'Import annulé')
      return
    }

    const now = new Date().toISOString()
    const newRoute: SavedRoute = {
      id: generateId(),
      name: name.trim(),
      description: `Importé le ${new Date().toLocaleDateString('fr-FR')}`,
      points: importedPoints,
      createdAt: now,
      updatedAt: now,
      isImported: true,
    }
    
    saveRoutes([...customRoutes, newRoute])
    setCurrentRoute(newRoute)
    setPoints(importedPoints)
    setRouteName(newRoute.name)
    setRouteDescription(newRoute.description || '')
    setShowRouteList(false)
    setShowImportModal(false)
    showNotificationMsg('success', `${importedPoints.length} points importés`)
  }

  // Export GPX
  const handleExport = () => {
    if (points.length === 0) {
      showNotificationMsg('error', 'Aucun point')
      return
    }

    const name = routeName || 'trajet'
    const desc = routeDescription || ''
    const now = new Date().toISOString()
    
    const escapeXml = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')

    const trackpoints = points.map((p) => 
      `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}" />`
    ).join('\n')

    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CityGuided"
     xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>
    <desc>${escapeXml(desc)}</desc>
    <time>${now}</time>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${trackpoints}
    </trkseg>
  </trk>
</gpx>`

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/[^a-zA-Z0-9-_]/g, '_')}.gpx`
    a.click()
    URL.revokeObjectURL(url)
    showNotificationMsg('success', 'GPX exporté')
  }

  // Navigation
  const handleBackToHome = () => {
    window.location.href = '/?devPanel=open'
  }

  const handleBackToList = () => {
    setShowRouteList(true)
  }

  return (
    <>
      <Head>
        <title>Trajets virtuels - CityGuided</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div
        id="routes-admin-page"
        style={{
          position: 'fixed',
          inset: 0,
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <header
          id="routes-admin-header"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 100,
          }}
        >
          <button
            id="routes-admin-back-btn"
            onClick={showRouteList ? handleBackToHome : handleBackToList}
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
            title={showRouteList ? "Retour à l'accueil" : "Retour à la liste"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div id="routes-admin-header-info" style={{ flex: 1 }}>
            <h1 id="routes-admin-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {showRouteList ? 'Trajets virtuels' : currentRoute ? (isReadOnly ? 'Visualiser' : 'Modifier') : 'Nouveau trajet'}
            </h1>
            <p id="routes-admin-subtitle" style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
              {showRouteList 
                ? `${allRoutes.length} trajet${allRoutes.length > 1 ? 's' : ''}`
                : `${points.length} point${points.length > 1 ? 's' : ''}`
              }
            </p>
          </div>

          {showRouteList && (
            <a
              id="routes-admin-recorder-link"
              href="/admin/routes/recorder"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '2px solid #dc2626',
                background: '#fef2f2',
                textDecoration: 'none',
              }}
              title="Recorder GPS"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#dc2626">
                <circle cx="12" cy="12" r="8" />
              </svg>
            </a>
          )}
        </header>

        {/* Contenu */}
        <main id="routes-admin-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {showRouteList ? (
            /* Vue liste */
            <div id="routes-admin-list-view" style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              <NewRouteButton onClick={handleNewRoute} />
              <div id="routes-admin-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allRoutes.map((route) => (
                  <RouteCard
                    key={route.id}
                    id={route.id}
                    name={route.name}
                    description={route.description}
                    pointsCount={route.points.length}
                    isDefault={route.isDefault}
                    isImported={route.isImported}
                    onEdit={() => handleEditRoute(route)}
                    onDelete={!route.isDefault ? () => handleDeleteRoute(route.id) : undefined}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Vue édition */
            <div id="routes-admin-edit-view" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              {/* Mini carte */}
              <div id="routes-admin-map-section" style={{ height: 200, flexShrink: 0, padding: 12, paddingBottom: 0 }}>
                <div
                  id="routes-admin-map-container"
                  style={{ height: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}
                >
                  <RouteMap
                    points={points}
                    onPointAdd={isReadOnly ? undefined : handleAddPoint}
                    onPointMove={isReadOnly ? undefined : handleMovePoint}
                    selectedPointId={selectedPointId}
                    onPointSelect={(id) => setSelectedPointId(id)}
                    visible={true}
                  />
                </div>
              </div>

              {/* Formulaire */}
              <div id="routes-admin-form-section" style={{ padding: 12, background: '#ffffff' }}>
                <RouteForm
                  name={routeName}
                  onNameChange={setRouteName}
                  description={routeDescription}
                  onDescriptionChange={setRouteDescription}
                  onSave={handleSaveRoute}
                  onExport={handleExport}
                  isSaving={isSaving}
                  canExport={points.length > 0}
                  isReadOnly={isReadOnly}
                />
              </div>

              {/* Import */}
              {!isReadOnly && (
                <div id="routes-admin-import-section" style={{ padding: '0 12px 12px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      id="routes-admin-import-btn"
                      onClick={() => setShowImportModal(true)}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: '2px dashed #e2e8f0',
                        background: '#f8fafc',
                        color: '#64748b',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Importer GPX ou depuis Recorder
                    </button>
                    
                    <button
                      id="routes-admin-help-btn"
                      onClick={() => setShowHelpPopup(true)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        color: '#94a3b8',
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Aide"
                      aria-label="Aide"
                    >
                      ?
                    </button>
                  </div>
                </div>
              )}

              {/* Liste des points */}
              <div id="routes-admin-points-section" style={{ padding: '0 12px 12px', flex: 1 }}>
                <h3 id="routes-admin-points-title" style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                  Points ({points.length}) {isReadOnly && '- Lecture seule'}
                </h3>
                <RoutePointsList
                  points={points}
                  onPointsChange={isReadOnly ? undefined : setPoints}
                  onPointSelect={(p) => setSelectedPointId(p.id)}
                  selectedPointId={selectedPointId}
                />
              </div>
            </div>
          )}
        </main>

        {/* Modal Import */}
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          recordings={recordings}
          onFileImport={handleFileImport}
          onRecorderImport={handleRecorderImport}
          importError={importError}
        />

        {/* Popup Aide */}
        <HelpPopup
          isOpen={showHelpPopup}
          onClose={() => setShowHelpPopup(false)}
        />

        {/* Notification */}
        {notification && (
          <Notification type={notification.type} message={notification.message} />
        )}
      </div>
    </>
  )
}
