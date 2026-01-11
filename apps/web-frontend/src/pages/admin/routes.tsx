import React, { useState, useCallback, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { RoutePointsList, RouteImporter, RouteMap } from '../../components/routes'
import type { RoutePoint } from '../../components/routes'

// Types pour les trajets sauvegardés
type SavedRoute = {
  id: string
  name: string
  description?: string
  points: RoutePoint[]
  createdAt: string
  updatedAt: string
  isDefault?: boolean // Route système non modifiable
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
  const router = useRouter()
  
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
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showMap, setShowMap] = useState(false) // Pour mobile: toggle carte/formulaire

  // Combiner routes par défaut et personnalisées
  const allRoutes = [...DEFAULT_ROUTES, ...customRoutes]

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

  // Importer des points
  const handleImport = (importedPoints: RoutePoint[]) => {
    setPoints(importedPoints)
    showNotificationMsg('success', `${importedPoints.length} points importés`)
  }

  // Exporter le trajet actuel en JSON
  const handleExport = () => {
    if (points.length === 0) {
      showNotificationMsg('error', 'Aucun point à exporter')
      return
    }

    const exportData = {
      name: routeName || 'trajet_sans_nom',
      description: routeDescription,
      points: points.map((p) => ({ lat: p.lat, lng: p.lng, name: p.name })),
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${routeName || 'trajet'}.json`
    a.click()
    URL.revokeObjectURL(url)
    showNotificationMsg('success', 'Trajet exporté')
  }

  // Retour à l'accueil avec état préservé
  const handleBackToHome = () => {
    // Préserver l'état du panneau dev en ajoutant un paramètre
    router.push('/?devPanel=open')
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
            onClick={handleBackToHome}
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
            title="Retour à l'accueil"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {showRouteList ? 'Trajets virtuels' : currentRoute ? 'Modifier' : 'Nouveau trajet'}
            </h1>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
              {showRouteList 
                ? `${allRoutes.length} trajet${allRoutes.length > 1 ? 's' : ''}`
                : `${points.length} point${points.length > 1 ? 's' : ''}`
              }
            </p>
          </div>

          {!showRouteList && (
            <button
              onClick={handleBackToList}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Liste
            </button>
          )}
        </header>

        {/* Contenu principal */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {showRouteList ? (
            /* Vue liste des trajets */
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {/* Bouton nouveau trajet */}
              <button
                onClick={handleNewRoute}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 10,
                  border: '2px dashed #22c55e',
                  background: '#f0fdf4',
                  color: '#166534',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Nouveau trajet
              </button>

              {/* Liste des trajets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allRoutes.map((route) => (
                  <div
                    key={route.id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: '#ffffff',
                      border: route.isDefault ? '1px solid #22c55e' : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    {/* Icône */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: route.isDefault ? '#dcfce7' : '#f8fafc',
                        border: route.isDefault ? '1px solid #22c55e' : '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={route.isDefault ? '#22c55e' : '#64748b'} strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                      </svg>
                    </div>

                    {/* Infos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{route.name}</span>
                        {route.isDefault && (
                          <span style={{
                            fontSize: 9,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: '#dcfce7',
                            color: '#166534',
                            fontWeight: 700,
                          }}>
                            SYSTÈME
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {route.points.length} pts
                        {route.description && ` • ${route.description}`}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => handleEditRoute(route)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={route.isDefault ? 'Dupliquer pour éditer' : 'Modifier'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          {route.isDefault ? (
                            // Icône copie
                            <path d="M8 17H5a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v3M11 21h10a2 2 0 002-2V9a2 2 0 00-2-2H11a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          ) : (
                            // Icône édition
                            <>
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </>
                          )}
                        </svg>
                      </button>
                      {!route.isDefault && (
                        <button
                          onClick={() => handleDeleteRoute(route.id)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Supprimer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Vue édition - Mobile: Toggle entre formulaire et carte */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Toggle mobile carte/formulaire */}
              <div
                style={{
                  display: 'flex',
                  background: '#ffffff',
                  borderBottom: '1px solid #e2e8f0',
                  padding: '6px 12px',
                }}
              >
                <button
                  onClick={() => setShowMap(false)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: !showMap ? '#0f172a' : 'transparent',
                    color: !showMap ? '#ffffff' : '#64748b',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Formulaire
                </button>
                <button
                  onClick={() => setShowMap(true)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: showMap ? '#0f172a' : 'transparent',
                    color: showMap ? '#ffffff' : '#64748b',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Carte ({points.length})
                </button>
              </div>

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
                  <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                        Nom *
                      </label>
                      <input
                        type="text"
                        value={routeName}
                        onChange={(e) => setRouteName(e.target.value)}
                        placeholder="Ex: Boucle centre-ville"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          fontSize: 14,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                        Description
                      </label>
                      <textarea
                        value={routeDescription}
                        onChange={(e) => setRouteDescription(e.target.value)}
                        placeholder="Description..."
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          fontSize: 14,
                          resize: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Boutons d'action */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleSaveRoute}
                        disabled={isSaving}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#22c55e',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          opacity: isSaving ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button
                        onClick={handleExport}
                        disabled={points.length === 0}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: points.length === 0 ? '#cbd5e1' : '#64748b',
                          cursor: points.length === 0 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Exporter JSON"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Import */}
                  <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                      Importer
                    </h3>
                    <RouteImporter onImport={handleImport} />
                  </div>

                  {/* Liste des points */}
                  <div style={{ padding: 12, flex: 1, overflow: 'auto' }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                      Points ({points.length})
                    </h3>
                    <RoutePointsList
                      points={points}
                      onPointsChange={setPoints}
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
                    onPointAdd={handleAddPoint}
                    onPointMove={handleMovePoint}
                    selectedPointId={selectedPointId}
                    onPointSelect={(id) => setSelectedPointId(id)}
                  />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Notification - Bandeau fixe en bas */}
        {notification && (
          <div
            style={{
              position: 'fixed',
              bottom: 20,
              left: 12,
              right: 12,
              padding: '12px 16px',
              borderRadius: 10,
              background: notification.type === 'success' ? '#166534' : '#dc2626',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 500,
              zIndex: 9999,
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {notification.type === 'success' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            {notification.message}
          </div>
        )}
      </div>
    </>
  )
}
