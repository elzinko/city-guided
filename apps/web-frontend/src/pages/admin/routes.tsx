import React, { useState, useCallback, useEffect } from 'react'
import Head from 'next/head'
import {
  RoutePointsList,
  RouteImporter,
  RouteMap,
  RouteCard,
  NewRouteButton,
  MobileViewToggle,
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

// Clé localStorage pour persister les trajets
const ROUTES_STORAGE_KEY = 'cityguided_custom_routes'

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
 * Design aligné avec le système existant
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
  const [showMap, setShowMap] = useState(false) // Pour mobile: toggle carte/formulaire

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

  // Importer des points (crée un trajet en lecture seule)
  const handleImport = (importedPoints: RoutePoint[]) => {
    // Demander un nom pour le trajet importé
    const defaultName = `Import ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    const name = prompt('Nom du trajet importé :', defaultName)
    
    if (!name) {
      showNotificationMsg('error', 'Import annulé')
      return
    }
    
    // Créer et sauvegarder le trajet importé (lecture seule)
    const now = new Date().toISOString()
    const newRoute: SavedRoute = {
      id: generateId(),
      name: name.trim(),
      description: `Trajet importé le ${new Date().toLocaleDateString('fr-FR')}`,
      points: importedPoints,
      createdAt: now,
      updatedAt: now,
      isImported: true, // Marquer comme importé (lecture seule)
    }
    
    const newRoutes = [...customRoutes, newRoute]
    saveRoutes(newRoutes)
    
    // Ouvrir le trajet en mode visualisation
    setCurrentRoute(newRoute)
    setPoints(importedPoints)
    setRouteName(newRoute.name)
    setRouteDescription(newRoute.description || '')
    setShowRouteList(false)
    
    showNotificationMsg('success', `${importedPoints.length} points importés (lecture seule)`)
  }

  // Exporter le trajet actuel en GPX (compatible GPX.studio, Geo Tracker, etc.)
  const handleExport = () => {
    if (points.length === 0) {
      showNotificationMsg('error', 'Aucun point à exporter')
      return
    }

    const name = routeName || 'trajet_sans_nom'
    const desc = routeDescription || ''
    const now = new Date().toISOString()
    
    // Générer les trackpoints sans horodatage (compatible GPX 1.1)
    // Les trajets créés manuellement n'ont pas de timestamps réalistes
    const trackpoints = points.map((p) => {
      return `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}" />`
    }).join('\n')

    // Format GPX 1.1 standard (sans timestamps dans les trackpoints)
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CityGuided"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(name)}</name>
    <desc>${escapeXml(desc)}</desc>
    <time>${now}</time>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <desc>${escapeXml(desc)}</desc>
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
    showNotificationMsg('success', 'Trajet exporté en GPX')
  }

  // Échapper les caractères spéciaux XML
  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  // Retour à l'accueil avec état préservé
  const handleBackToHome = () => {
    // Utiliser window.location.href pour forcer un rechargement complet
    // Cela garantit que getInitialProps de _app.tsx soit appelé
    // et que showDevOptions soit correctement évalué
    window.location.href = '/?devPanel=open'
  }

  // Retour à la liste
  const handleBackToList = () => {
    setShowRouteList(true)
    setShowMap(false)
  }

  return (
    <>
      <Head>
        <title>Trajets virtuels - CityGuided</title>
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
        {/* Header - Style aligné avec DevControlBlock */}
        <header
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid #e2e8f0',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
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
            title={showRouteList ? "Retour à l'accueil" : "Retour à la liste"}
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

          {/* Bouton Recorder GPS (affiché uniquement en mode liste) */}
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
              title="Enregistrer un parcours GPS"
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
            /* Vue liste des trajets */
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {/* Bouton nouveau trajet */}
              <NewRouteButton onClick={handleNewRoute} />

              {/* Liste des trajets */}
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
            /* Vue édition - Mobile: Toggle entre formulaire et carte */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Toggle mobile carte/formulaire */}
              <MobileViewToggle
                showMap={showMap}
                onShowFormulaire={() => setShowMap(false)}
                onShowMap={() => setShowMap(true)}
                pointsCount={points.length}
              />

              {/* Contenu édition */}
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Panneau formulaire */}
                <div
                  style={{
                    width: showMap ? 0 : '100%',
                    opacity: showMap ? 0 : 1,
                    overflow: showMap ? 'hidden' : 'auto',
                    transition: 'all 0.2s ease',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Formulaire */}
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

                  {/* Import (masqué en mode lecture seule) */}
                  {!isReadOnly && (
                    <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                        Importer
                      </h3>
                      <RouteImporter onImport={handleImport} />
                    </div>
                  )}

                  {/* Liste des points (en lecture seule pour les trajets importés) */}
                  <div style={{ padding: 12, flex: 1, overflow: 'auto' }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
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

                {/* Carte */}
                <div
                  style={{
                    flex: showMap ? 1 : 0,
                    width: showMap ? '100%' : 0,
                    opacity: showMap ? 1 : 0,
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                  }}
                >
                  <RouteMap
                    points={points}
                    onPointAdd={isReadOnly ? undefined : handleAddPoint}
                    onPointMove={isReadOnly ? undefined : handleMovePoint}
                    selectedPointId={selectedPointId}
                    onPointSelect={(id) => setSelectedPointId(id)}
                    visible={showMap}
                  />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Notification - Bandeau fixe en bas */}
        {notification && (
          <Notification type={notification.type} message={notification.message} />
        )}
      </div>
    </>
  )
}
