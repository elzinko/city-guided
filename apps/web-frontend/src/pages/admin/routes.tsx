import React, { useState, useCallback, useEffect } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import {
  RoutePointsList,
  RouteCard,
  NewRouteButton,
  RouteForm,
  Notification,
} from '../../components/routes'
import type { RoutePoint, NotificationType } from '../../components/routes'

// Types pour les trajets sauvegardés
type SavedRoute = {
  id: string
  name: string
  description?: string
  points: RoutePoint[]
  createdAt: string
  updatedAt: string
  isDefault?: boolean // Route système non modifiable
  isImported?: boolean // Trajet importé (lecture seule)
}

// Type pour les enregistrements du Recorder
type RecordedRoute = {
  id: string
  name: string
  points: { lat: number; lng: number; timestamp: string; accuracy?: number }[]
  startTime: string
  endTime?: string
  isRecording: boolean
}

// Charger la carte côté client uniquement (Leaflet)
const RouteMap = dynamic(() => import('../../components/routes/RouteMap'), {
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

// Routes par défaut (synchronisées avec ROUTE_OPTIONS dans index.tsx)
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
 * Design mobile-first avec vue unifiée
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
  
  // États pour l'import
  const [showImportModal, setShowImportModal] = useState(false)
  const [recordings, setRecordings] = useState<RecordedRoute[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [showHelpPopup, setShowHelpPopup] = useState(false)

  // Combiner routes par défaut et personnalisées
  const allRoutes = [...DEFAULT_ROUTES, ...customRoutes]
  
  // Mode lecture seule (trajet importé ou système)
  const isReadOnly = currentRoute?.isImported || currentRoute?.isDefault || false

  // Charger les trajets depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ROUTES_STORAGE_KEY)
      if (saved) {
        setCustomRoutes(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Erreur chargement trajets:', e)
    }
  }, [])

  // Charger les enregistrements du recorder
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECORDINGS_STORAGE_KEY)
      if (saved) {
        setRecordings(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Erreur chargement enregistrements:', e)
    }
  }, [showImportModal])

  // Sauvegarder les trajets dans localStorage
  const saveRoutes = useCallback((newRoutes: SavedRoute[]) => {
    try {
      localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(newRoutes))
      setCustomRoutes(newRoutes)
    } catch (e) {
      console.error('Erreur sauvegarde trajets:', e)
    }
  }, [])

  // Afficher une notification (fixée en bas)
  const showNotificationMsg = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // Générer un ID unique
  const generateId = () => `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Créer un nouveau trajet
  const handleNewRoute = () => {
    setCurrentRoute(null)
    setPoints([])
    setRouteName('')
    setRouteDescription('')
    setSelectedPointId(null)
    setShowRouteList(false)
  }

  // Éditer un trajet existant
  const handleEditRoute = (route: SavedRoute) => {
    if (route.isDefault) {
      // Dupliquer la route par défaut pour édition
      setCurrentRoute(null)
      setPoints([...route.points])
      setRouteName(`${route.name} (copie)`)
      setRouteDescription(route.description || '')
    } else if (route.isImported) {
      // Trajet importé : mode visualisation seule
      setCurrentRoute(route)
      setPoints(route.points)
      setRouteName(route.name)
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

  // Supprimer un trajet
  const handleDeleteRoute = (routeId: string) => {
    if (!confirm('Supprimer ce trajet ?')) return
    const newRoutes = customRoutes.filter((r) => r.id !== routeId)
    saveRoutes(newRoutes)
    showNotificationMsg('success', 'Trajet supprimé')
    if (currentRoute?.id === routeId) {
      handleNewRoute()
    }
  }

  // Sauvegarder le trajet actuel
  const handleSaveRoute = async () => {
    if (!routeName.trim()) {
      showNotificationMsg('error', 'Nom du trajet requis')
      return
    }
    if (points.length < 2) {
      showNotificationMsg('error', 'Minimum 2 points requis')
      return
    }

    setIsSaving(true)

    try {
      const now = new Date().toISOString()
      
      if (currentRoute && !currentRoute.isDefault) {
        // Mise à jour
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
        // Création
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

  // Ajouter un point depuis la carte
  const handleAddPoint = useCallback((lat: number, lng: number) => {
    const pointId = `pt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setPoints((prev) => [
      ...prev,
      { id: pointId, lat, lng, order: prev.length },
    ])
    setSelectedPointId(pointId)
  }, [])

  // Déplacer un point sur la carte
  const handleMovePoint = (pointId: string, lat: number, lng: number) => {
    setPoints(points.map((p) => (p.id === pointId ? { ...p, lat, lng } : p)))
  }

  // Parser GPX
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
        points.push({
          id: `pt_${Date.now()}_${index}`,
          lat,
          lng,
          order: index,
        })
      }
    })

    if (points.length === 0) throw new Error('Aucun point trouvé')
    return points
  }

  // Importer depuis fichier GPX
  const handleFileImport = async (file: File) => {
    setImportError(null)
    try {
      const content = await file.text()
      const importedPoints = parseGPX(content)
      createImportedRoute(importedPoints, file.name.replace('.gpx', ''))
    } catch (err: any) {
      setImportError(err.message || 'Erreur lors de l\'import')
    }
  }

  // Importer depuis un enregistrement du recorder
  const handleRecorderImport = (recording: RecordedRoute) => {
    const importedPoints: RoutePoint[] = recording.points.map((p, index) => ({
      id: `pt_${Date.now()}_${index}`,
      lat: p.lat,
      lng: p.lng,
      order: index,
    }))
    createImportedRoute(importedPoints, recording.name)
  }

  // Créer un trajet importé
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
    
    const newRoutes = [...customRoutes, newRoute]
    saveRoutes(newRoutes)
    
    setCurrentRoute(newRoute)
    setPoints(importedPoints)
    setRouteName(newRoute.name)
    setRouteDescription(newRoute.description || '')
    setShowRouteList(false)
    setShowImportModal(false)
    
    showNotificationMsg('success', `${importedPoints.length} points importés`)
  }

  // Exporter le trajet actuel en GPX
  const handleExport = () => {
    if (points.length === 0) {
      showNotificationMsg('error', 'Aucun point à exporter')
      return
    }

    const name = routeName || 'trajet_sans_nom'
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
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {showRouteList ? 'Trajets virtuels' : currentRoute ? (isReadOnly ? 'Visualiser' : 'Modifier') : 'Nouveau trajet'}
            </h1>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
              {showRouteList 
                ? `${allRoutes.length} trajet${allRoutes.length > 1 ? 's' : ''}`
                : `${points.length} point${points.length > 1 ? 's' : ''}`
              }
            </p>
          </div>

          {showRouteList && (
            <button
              onClick={() => (window.location.href = '/admin/routes/recorder')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '2px solid #dc2626',
                background: '#fef2f2',
                cursor: 'pointer',
              }}
              title="Recorder GPS"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#dc2626">
                <circle cx="12" cy="12" r="8" />
              </svg>
            </button>
          )}
        </header>

        {/* Contenu principal */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {showRouteList ? (
            /* Vue liste */
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              <NewRouteButton onClick={handleNewRoute} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
            /* Vue édition unifiée (mobile-first) */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              {/* Mini carte */}
              <div style={{ height: 200, flexShrink: 0, padding: 12, paddingBottom: 0 }}>
                <div style={{ height: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
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
              <div style={{ padding: 12, background: '#ffffff' }}>
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

              {/* Zone d'import compacte (masquée en lecture seule) */}
              {!isReadOnly && (
                <div style={{ padding: '0 12px 12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <button
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
                    
                    {/* Bouton aide */}
                    <button
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
                    >
                      ?
                    </button>
                  </div>
                </div>
              )}

              {/* Liste des points */}
              <div style={{ padding: '0 12px 12px', flex: 1 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
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

        {/* Modal d'import */}
        {showImportModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
              padding: 16,
            }}
            onClick={() => setShowImportModal(false)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: 16,
                width: '100%',
                maxWidth: 400,
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header modal */}
              <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, flex: 1 }}>Importer un trajet</h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: 'none',
                    background: '#f1f5f9',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Contenu modal */}
              <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
                {/* Option 1: Fichier GPX */}
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                    Depuis un fichier GPX
                  </h3>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: 16,
                      borderRadius: 10,
                      border: '2px dashed #e2e8f0',
                      background: '#f8fafc',
                      color: '#64748b',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    Choisir un fichier .gpx
                    <input
                      type="file"
                      accept=".gpx"
                      onChange={(e) => e.target.files?.[0] && handleFileImport(e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {/* Erreur */}
                {importError && (
                  <div
                    style={{
                      marginBottom: 16,
                      padding: 12,
                      borderRadius: 8,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      fontSize: 13,
                    }}
                  >
                    {importError}
                  </div>
                )}

                {/* Option 2: Depuis le Recorder */}
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                    Depuis le Recorder ({recordings.length})
                  </h3>
                  
                  {recordings.length === 0 ? (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 10,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: 13,
                      }}
                    >
                      Aucun enregistrement disponible
                      <div style={{ marginTop: 8 }}>
                        <button
                          onClick={() => (window.location.href = '/admin/routes/recorder')}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: '1px solid #dc2626',
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#dc2626">
                            <circle cx="12" cy="12" r="8" />
                          </svg>
                          Ouvrir le Recorder
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {recordings.map((rec) => (
                        <button
                          key={rec.id}
                          onClick={() => handleRecorderImport(rec)}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: '#dcfce7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                              {rec.name}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              {rec.points.length} points
                            </div>
                          </div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Popup d'aide */}
        {showHelpPopup && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
              padding: 16,
            }}
            onClick={() => setShowHelpPopup(false)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: 20,
                width: '100%',
                maxWidth: 320,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3b82f6',
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  ?
                </div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Aide</h2>
              </div>
              
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 12px' }}>
                  <strong style={{ color: '#0f172a' }}>GPX</strong><br />
                  Format GPS standard, exportable depuis la plupart des applications GPS 
                  (Geo Tracker, GPX.studio, Strava...).
                </p>
                <p style={{ margin: '0 0 12px' }}>
                  <strong style={{ color: '#0f172a' }}>Recorder</strong><br />
                  Enregistrez vos parcours en temps réel avec le GPS de votre téléphone.
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: '#0f172a' }}>Carte</strong><br />
                  Cliquez sur la carte pour ajouter des points. Glissez les marqueurs pour les déplacer.
                </p>
              </div>

              <button
                onClick={() => setShowHelpPopup(false)}
                style={{
                  marginTop: 16,
                  width: '100%',
                  padding: 12,
                  borderRadius: 10,
                  border: 'none',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Compris
              </button>
            </div>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <Notification type={notification.type} message={notification.message} />
        )}
      </div>
    </>
  )
}
