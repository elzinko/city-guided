import React, { useEffect, useRef, useState, useCallback } from 'react'
import { SearchOverlay } from '../components/SearchOverlay'
// ResultsPanel remplacé par BottomSheet pour l'affichage des résultats
// GuideControls remplacé par DevControlBlock
import { BottomSheet } from '../components/BottomSheet'
import { BottomMenu, type MenuTab } from '../components/BottomMenu'
// AdminSheet remplacé par DevControlBlock
import { DevControlBlock } from '../components/DevControlBlock'
import { NavigationPoiList } from '../components/NavigationPoiList'
// GpsPlayer remplacé par DevControlBlock qui intègre le lecteur + panneau dev
import { MapControlButtons } from '../components/MapControlButtons'
import { StoryPanelContainer } from '../components/StoryPanelContainer'
import { MapContainer } from '../components/MapContainer'
import { AppContainer } from '../components/AppContainer'
import { distanceMeters, calculateBearing, filterPoisForNavigation } from '../utils/distance'
import {
  DEFAULT_CENTER_RADIUS_METERS,
  GPS_HIDE_THRESHOLD_PERCENT,
  MAX_POIS_DISPLAYED,
  SHEET_HEIGHTS,
  SHOW_DEV_OPTIONS,
} from '../config/constants'
import { getBottomSheetHeight } from '../config/ui-rules'

const DEFAULT_RADIUS_METERS = 400
const DEFAULT_DRIVE_PATH = [
  { lat: 48.402, lng: 2.6998, label: 'Départ Château', speedKmh: 30 },
  { lat: 48.4045, lng: 2.7015, speedKmh: 30 },
  { lat: 48.407, lng: 2.699, speedKmh: 30 },
  { lat: 48.4105, lng: 2.6905, speedKmh: 30 },
  { lat: 48.415, lng: 2.676, speedKmh: 50 },
  { lat: 48.4175, lng: 2.6605, speedKmh: 70 },
  { lat: 48.4185, lng: 2.648, speedKmh: 70 },
  { lat: 48.417, lng: 2.634, speedKmh: 90 },
  { lat: 48.413, lng: 2.626, speedKmh: 90 },
  { lat: 48.409, lng: 2.629, speedKmh: 70 },
  { lat: 48.405, lng: 2.640, speedKmh: 50 },
  { lat: 48.402, lng: 2.653, speedKmh: 50 },
  { lat: 48.399, lng: 2.669, speedKmh: 50 },
  { lat: 48.401, lng: 2.690, speedKmh: 30 },
  { lat: 48.402, lng: 2.6998, label: 'Boucle', speedKmh: 30 }
]

// Routes prédéfinies pour les tests
type RouteOption = {
  id: string
  name: string
  description?: string
  loadFn: () => Promise<any[]> | any[]
  pointsCount?: number
}

const DEFAULT_ROUTE_OPTIONS: RouteOption[] = [
  {
    id: 'default',
    name: 'Boucle Fontainebleau',
    description: 'Route par défaut autour du château',
    loadFn: () => Promise.resolve(DEFAULT_DRIVE_PATH),
    pointsCount: DEFAULT_DRIVE_PATH.length,
  },
]

// Note: Leaflet import only on client
type Poi = {
  id: string
  name: string
  lat: number
  lng: number
  radiusMeters: number
  category: string
  shortDescription: string
  ttsText?: string
  storySegments?: string[]
}

// GpsIcon est maintenant un composant séparé dans ../components/GpsIcon.tsx

export default function Home() {
  const fallbackPos = { lat: 48.3976, lng: 2.7855 } // By/Thomery - distinct de Fontainebleau pour ne pas confondre avec trajet virtuel
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null) // Null par défaut, attend la vraie géoloc
  const [realGpsPos, setRealGpsPos] = useState<{ lat: number; lng: number } | null>(null) // Position GPS réelle
  const [pois, setPois] = useState<Poi[]>([])
  const [visiblePois, setVisiblePois] = useState<Poi[]>([])
  const [mapAlreadyCentered, setMapAlreadyCentered] = useState(false)
  const [mapMoveVersion, setMapMoveVersion] = useState(0)
  const [godMode, setGodMode] = useState(false)
  const [autoTts, setAutoTts] = useState(false) // Désactivé par défaut pour éviter le lancement automatique
  const [audioGuideActive, setAudioGuideActive] = useState(false) // État pour savoir si l'utilisateur a activé l'audio guide explicitement
  const [activeStory, setActiveStory] = useState<{ poiId: string; segmentIdx: number } | null>(null)
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({})
  const [isSimulating, setIsSimulating] = useState(false)
  const [simPaused, setSimPaused] = useState(false)
  const [simStep, setSimStep] = useState(0)
  const simTimerRef = useRef<NodeJS.Timeout | null>(null)
  const interpolationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastPanRef = useRef<{ lat: number; lng: number } | null>(null)
  const [simPath, setSimPath] = useState<any[]>([])
  const [devBlockHeight, setDevBlockHeight] = useState(0) // Hauteur du bloc dev pour ajuster le menu
  const [selectedRouteId, setSelectedRouteId] = useState<string>('default')
  const [customRouteOptions, setCustomRouteOptions] = useState<RouteOption[]>([])
  
  // Combiner les routes par défaut avec les routes personnalisées
  const ROUTE_OPTIONS = [...DEFAULT_ROUTE_OPTIONS, ...customRouteOptions]
  const [virtualRouteActive, setVirtualRouteActive] = useState(false) // Toggle trajet virtuel
  const [userHasPanned, setUserHasPanned] = useState(false) // Pour éviter les recadrages automatiques après pan manuel
  const userHasPannedRef = useRef(false) // Ref synchrone pour vérifications immédiates dans les effets
  const [routeStatus, setRouteStatus] = useState<string>('Trajet par défaut prêt')
  const [osrmError, setOsrmError] = useState<string | null>(null)
  const [speedFactor, setSpeedFactor] = useState(10) // x10 par défaut pour les tests
  const INITIAL_ZOOM = 14 // Zoom initial par défaut
  const [zoomLevel, setZoomLevel] = useState(INITIAL_ZOOM)
  const [audioPaused, setAudioPaused] = useState(true) // En pause par défaut
  const [searchActive, setSearchActive] = useState(false)
  const [searchReady, setSearchReady] = useState(false)
  const [sheetLevel, setSheetLevel] = useState<'hidden' | 'peek' | 'mid' | 'full' | 'searchResults' | 'poiFromSearch' | 'poiFromMap'>('hidden')
  // Mémoriser la position du panneau "Découvertes" avant d'ouvrir un POI
  const [previousDiscoverLevel, setPreviousDiscoverLevel] = useState<'peek' | 'mid' | 'full' | null>(null)
  const [sheetHeightPx, setSheetHeightPx] = useState<number | null>(null) // Hauteur actuelle du panneau en pixels (pendant le drag)
  const [centerRadiusMeters, setCenterRadiusMeters] = useState(DEFAULT_CENTER_RADIUS_METERS)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(fallbackPos)
  const [discoverMode, setDiscoverMode] = useState(false)
  const [guideMode, setGuideMode] = useState(false)
  const [activeTab, setActiveTab] = useState<MenuTab>('discover')
  const [adminLevel] = useState<'hidden' | 'peek' | 'mid' | 'full'>('hidden')
  const [devPanelOpen, setDevPanelOpen] = useState(false) // État du panneau dev (persisté)
  const [navigationStartTime, setNavigationStartTime] = useState<number | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [navigationElapsed, setNavigationElapsed] = useState(0) // Track navigation time (not yet displayed in UI)
  const [loadingPois, setLoadingPois] = useState(false)
  const [query, setQuery] = useState<string>('')
  const [lastQuery, setLastQuery] = useState<string>('') // Sauvegarder la dernière query pour la réafficher
  const [navigationPois, setNavigationPois] = useState<Poi[]>([]) // POIs pour la navigation
  const [visitedPoiIds, setVisitedPoiIds] = useState<Set<string>>(new Set()) // POIs visités
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentNavigationPoiIndex, setCurrentNavigationPoiIndex] = useState<number>(-1)
  const [isDesktop, setIsDesktop] = useState(false) // Détection desktop vs mobile
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null) // POI sélectionné pour afficher les détails
  const [heading, setHeading] = useState<number | null>(null) // Direction du mouvement en degrés
  const previousPosRef = useRef<{ lat: number; lng: number } | null>(null) // Position précédente pour calculer le heading
  const speedFactorRef = useRef(speedFactor) // Ref pour le speedFactor - utilisé dans l'effet de simulation

  // Synchroniser la ref avec l'état
  useEffect(() => {
    speedFactorRef.current = speedFactor
  }, [speedFactor])

  // Clé localStorage pour les options dev
  const DEV_OPTIONS_KEY = 'cityguided_dev_options'
  const devOptionsLoadedRef = useRef(false) // Pour éviter d'écraser les options avant le chargement initial

  // Charger les routes personnalisées depuis localStorage
  useEffect(() => {
    try {
      const ROUTES_STORAGE_KEY = 'cityguided_custom_routes'
      const saved = localStorage.getItem(ROUTES_STORAGE_KEY)
      if (saved) {
        const customRoutes = JSON.parse(saved)
        const routeOptions = customRoutes.map((route: any) => ({
          id: route.id,
          name: route.name,
          description: route.description,
          pointsCount: route.points?.length || 0,
          loadFn: () => Promise.resolve(route.points || []),
        }))
        setCustomRouteOptions(routeOptions)
      }
    } catch (e) {
      console.error('Erreur chargement routes personnalisées:', e)
    }
  }, [])

  // Charger les options dev depuis localStorage au montage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(DEV_OPTIONS_KEY)
      if (saved) {
        const options = JSON.parse(saved)
        if (typeof options.virtualRouteActive === 'boolean') setVirtualRouteActive(options.virtualRouteActive)
        if (typeof options.selectedRouteId === 'string') setSelectedRouteId(options.selectedRouteId)
        if (typeof options.speedFactor === 'number') setSpeedFactor(options.speedFactor)
        if (typeof options.audioPaused === 'boolean') setAudioPaused(options.audioPaused)
        if (typeof options.godMode === 'boolean') setGodMode(options.godMode)
        if (typeof options.autoTts === 'boolean') setAutoTts(options.autoTts)
        if (typeof options.devPanelOpen === 'boolean') setDevPanelOpen(options.devPanelOpen)
      }
      // Vérifier si on revient de la page d'édition des routes (devPanel=open dans l'URL)
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('devPanel') === 'open') {
        setDevPanelOpen(true)
        // Nettoyer l'URL sans recharger la page
        window.history.replaceState({}, '', window.location.pathname)
      }
    } catch (e) {
      console.warn('Failed to load dev options from localStorage:', e)
    }
    // Marquer le chargement comme terminé après un court délai pour laisser les setState s'appliquer
    setTimeout(() => { devOptionsLoadedRef.current = true }, 100)
  }, [])

  // Sauvegarder les options dev dans localStorage quand elles changent
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Ne pas sauvegarder avant que le chargement initial soit terminé
    if (!devOptionsLoadedRef.current) return
    try {
      const options = {
        virtualRouteActive,
        selectedRouteId,
        speedFactor,
        audioPaused,
        godMode,
        autoTts,
        devPanelOpen,
      }
      localStorage.setItem(DEV_OPTIONS_KEY, JSON.stringify(options))
    } catch (e) {
      console.warn('Failed to save dev options to localStorage:', e)
    }
  }, [virtualRouteActive, selectedRouteId, speedFactor, audioPaused, godMode, autoTts, devPanelOpen])

  // Gérer les changements de virtualRouteActive
  // Utiliser des refs pour stocker les valeurs actuelles et éviter les closures stales
  const simPathRef = useRef(simPath)
  const realGpsPosRef = useRef(realGpsPos)
  
  // Synchroniser les refs avec les valeurs actuelles
  useEffect(() => { simPathRef.current = simPath }, [simPath])
  useEffect(() => { realGpsPosRef.current = realGpsPos }, [realGpsPos])
  
  const virtualRouteActiveRef = useRef(virtualRouteActive)
  useEffect(() => {
    // Détecter si c'est un vrai changement de virtualRouteActive (pas juste un re-render)
    const wasActive = virtualRouteActiveRef.current
    virtualRouteActiveRef.current = virtualRouteActive
    
    // Pas de changement réel, ne rien faire
    if (virtualRouteActive === wasActive) return
    
    const currentSimPath = simPathRef.current
    const currentRealGpsPos = realGpsPosRef.current
    
    if (virtualRouteActive) {
      // ACTIVATION du trajet virtuel
      console.log('[VirtualRoute] Activating, simPath length:', currentSimPath.length)
      if (currentSimPath.length > 0) {
        const startPoint = currentSimPath[0] as any
        if (startPoint && startPoint.lat && startPoint.lng) {
          const newPos = { lat: startPoint.lat, lng: startPoint.lng }
          console.log('[VirtualRoute] Setting pos to start:', newPos)
          lastPanRef.current = newPos
          setPos(newPos)
          setSimStep(0)
          userHasPannedRef.current = false
          setUserHasPanned(false)
          
          // Centrer la carte sur le point de départ avec le même zoom que le GPS réel
          setTimeout(() => {
            const map = (window as any)?._le_map
            if (map && map.setView) {
              console.log('[VirtualRoute] Centering map on start point with INITIAL_ZOOM:', newPos)
              map.setView([newPos.lat, newPos.lng], INITIAL_ZOOM, { animate: true, duration: 0.5 })
            }
          }, 50)
        }
      }
    } else {
      // DÉSACTIVATION du trajet virtuel
      const targetPos = currentRealGpsPos || fallbackPos
      console.log('[VirtualRoute] Deactivating, setting pos to:', targetPos, 'realGpsPos:', currentRealGpsPos)
      lastPanRef.current = targetPos
      setPos(targetPos)
      userHasPannedRef.current = false
      setUserHasPanned(false)
      // Recentrer la carte sur la vraie position avec un délai pour éviter les conflits
      // avec d'autres effets qui pourraient réagir au changement de pos
      setTimeout(() => {
        const map = (window as any)?._le_map
        if (map && map.setView) {
          console.log('[VirtualRoute] Centering map on:', targetPos)
          map.setView([targetPos.lat, targetPos.lng], INITIAL_ZOOM, { animate: true, duration: 0.5 })
        }
      }, 50)
    }
  }, [virtualRouteActive]) // Dépendance unique : virtualRouteActive

  // Détecter si on est en desktop (style Google Maps)
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Écouter l'événement de sélection de POI depuis les popups Leaflet (clic sur la carte)
  useEffect(() => {
    const handleSelectPoi = (e: CustomEvent) => {
      const poi = e.detail as Poi
      setSelectedPoi(poi)
      // Règle UI : quand on clique sur un POI depuis la carte, ouvrir à la moitié de la page
      setSheetLevel('poiFromMap')
    }
    window.addEventListener('selectPoi', handleSelectPoi as EventListener)
    return () => window.removeEventListener('selectPoi', handleSelectPoi as EventListener)
  }, [])

  // Handle tab change
  const handleTabChange = (tab: MenuTab) => {
    setActiveTab(tab)
    // Toujours ouvrir le panneau quand on change de tab
    setSheetLevel('mid')
    if (tab === 'discover') {
      setDiscoverMode(true)
      setSearchReady(false)
    } else {
      // Pour les autres tabs (saved, contribute), on garde le panneau ouvert
      // mais on ne met pas discoverMode à true
      setDiscoverMode(false)
      setSearchReady(false)
    }
  }

  // Calculer le heading (direction du mouvement) quand la position change
  useEffect(() => {
    if (!pos) return
    
    const prev = previousPosRef.current
    if (prev) {
      // Calculer la distance parcourue
      const dist = distanceMeters(prev.lat, prev.lng, pos.lat, pos.lng)
      
      // Seulement mettre à jour le heading si on a bougé d'au moins 5m (évite le bruit GPS)
      if (dist > 5) {
        const newHeading = calculateBearing(prev.lat, prev.lng, pos.lat, pos.lng)
        setHeading(newHeading)
      }
    }
    
    // Sauvegarder la position actuelle pour le prochain calcul
    previousPosRef.current = { lat: pos.lat, lng: pos.lng }
  }, [pos])

  // Recalculer les POIs de navigation toutes les 5s en mode navigation
  useEffect(() => {
    if (!guideMode || !pos) return

    const updateNavigationPois = () => {
      // Filtrer les POIs déjà visités
      const unvisitedPois = pois.filter((p) => !visitedPoiIds.has(p.id))
      
      // Utiliser le filtrage par cône de direction si on a un heading
      const filteredPois = filterPoisForNavigation(
        unvisitedPois,
        pos!.lat,
        pos!.lng,
        heading, // null si pas de mouvement = cercle complet
        2000, // rayon max 2km
        75 // cône de ±75° (150° total)
      )
      
      // Garder max 4 POIs (1 courant + 3 suivants)
      // Remove distance property to match Poi type
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      setNavigationPois(filteredPois.slice(0, 4).map(({ distance, ...poi }) => poi) as Poi[])
    }

    // Mettre à jour immédiatement
    updateNavigationPois()

    // Puis toutes les 5s (plus réactif)
    const interval = setInterval(updateNavigationPois, 5000)

    return () => clearInterval(interval)
  }, [guideMode, pos, pois, visitedPoiIds, heading])

  useEffect(() => {
    // Ne pas gérer automatiquement le panneau - laisser les actions utilisateur le contrôler
    // Sauf pour le mode navigation qui force le panneau à 1/3
    if (guideMode) {
      setSheetLevel('mid')
      return
    }
    
    // Pendant la recherche active (overlay ouvert), cacher le sheet
    if (searchActive) {
      setSheetLevel('hidden')
      return
    }
    
    // Si on a une recherche avec résultats (mais overlay fermé), afficher le panneau
    if (searchReady && query && !loadingPois) {
      // Règle UI : la liste de recherche prend 2/3 de l'écran
      setSheetLevel('searchResults')
      return
    }
    
    // Par défaut : ne pas changer le niveau du panneau automatiquement
    // Le panneau ne s'ouvre que sur action explicite (clic sur menu, recherche, etc.)
  }, [searchReady, searchActive, guideMode, loadingPois, query])
  useEffect(() => {
    setSimStep(0)
  }, [simPath])

  // Charger la route par défaut au démarrage
  useEffect(() => {
    if (selectedRouteId && !simPath.length) {
      loadRoute(selectedRouteId)
    }
  }, [selectedRouteId])

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const gpsPosition = { lat: p.coords.latitude, lng: p.coords.longitude }
        setRealGpsPos(gpsPosition)
        // Ne mettre à jour pos que si on n'est pas en simulation virtuelle
        if (!virtualRouteActive) {
          setPos(gpsPosition)
        }
      },
      (err) => {
        console.error(err)
        // si l'utilisateur refuse la géoloc, on place une position de démo pour activer l'UI
        setRealGpsPos(fallbackPos)
        if (!virtualRouteActive) {
          setPos(fallbackPos)
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [virtualRouteActive])

  // si la géoloc n'est pas dispo (desktop, blocage, etc.), injecter rapidement la position de démo
  useEffect(() => {
    if (pos) return
    if (virtualRouteActive) return // En mode virtuel, la position sera définie par le trajet
    const t = setTimeout(() => {
      setPos(fallbackPos)
      setRealGpsPos(fallbackPos)
    }, 500)
    return () => clearTimeout(t)
  }, [pos, virtualRouteActive])

  // Fetch POIs avec debounce pour éviter trop d'appels API
  const lastFetchRef = useRef<{ query: string; lat: number; lng: number } | null>(null)
  useEffect(() => {
    const basePos = mapCenter || pos || fallbackPos
    
    // Éviter les refetch inutiles si position très proche (< 100m) et même query
    const last = lastFetchRef.current
    if (last && last.query === query) {
      const dist = distanceMeters(last.lat, last.lng, basePos.lat, basePos.lng)
      if (dist < 100) {
        // Position trop proche, pas besoin de refetch
        return
      }
    }
    
    setLoadingPois(true)
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
    const params = new URLSearchParams({ radius: 'all', lat: String(basePos.lat), lng: String(basePos.lng) })
    if (query) params.set('q', query)
    const url = base ? `${base}/api/pois?${params.toString()}` : `/api/pois?${params.toString()}`
    
    // Debounce avec timeout
    const timer = setTimeout(() => {
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          const sorted = (data || []).map((p: any) => ({
            ...p,
            dist: basePos ? distanceMeters(basePos.lat, basePos.lng, p.lat, p.lng) : 0,
          }))
          sorted.sort((a: any, b: any) => a.dist - b.dist)
          setPois(sorted)
          setLoadingPois(false)
          lastFetchRef.current = { query, lat: basePos.lat, lng: basePos.lng }
        })
        .catch((err) => {
          console.error('[POI FETCH] Error:', err)
          setLoadingPois(false)
        })
    }, 300) // Debounce 300ms
    
    return () => clearTimeout(timer)
  }, [query, mapCenter?.lat, mapCenter?.lng])

  function getStorySegments(p: Poi): string[] {
    if (p.storySegments && p.storySegments.length) return p.storySegments
    if (p.ttsText) return [p.ttsText]
    return [p.shortDescription]
  }

  async function loadRoute(routeId: string) {
    const routeOption = ROUTE_OPTIONS.find((r) => r.id === routeId)
    if (!routeOption) {
      setRouteStatus('Route inconnue')
      return
    }

    setRouteStatus(`Chargement de ${routeOption.name}...`)
    setOsrmError(null)
    try {
      const path = await routeOption.loadFn()
      if (!path || path.length < 2) throw new Error('Route trop courte')
      setSimPath(path)
      // Réinitialiser la position au début du nouveau trajet SEULEMENT si le trajet virtuel est activé
      if (path.length > 0 && path[0] && virtualRouteActive) {
        const startPoint = path[0] as any
        if (startPoint.lat && startPoint.lng) {
          setPos({ lat: startPoint.lat, lng: startPoint.lng })
          setSimStep(0)
          // Ne pas recadrer automatiquement - laisser l'utilisateur pan/zoom librement
          userHasPannedRef.current = false
          setUserHasPanned(false)
        }
      }
      setRouteStatus(`${routeOption.name} chargée (${path.length} points)`)
    } catch (e: any) {
      setOsrmError(e?.message || 'Erreur de chargement')
      setRouteStatus(`Erreur: ${e?.message || 'Impossible de charger la route'}`)
      setSimPath(DEFAULT_DRIVE_PATH)
    }
  }

  // Story selection: tant qu'on reste dans le rayon d'un POI, on conserve l'histoire en cours; sinon on passe au plus proche
  useEffect(() => {
    if (!pos || pois.length === 0) return

    const withDistance = pois.map((p) => {
      const distance = distanceMeters(pos.lat, pos.lng, p.lat, p.lng)
      const radius = p.radiusMeters || DEFAULT_RADIUS_METERS
      return { p, distance, radius }
    })

    const active = activeStory ? withDistance.find((x) => x.p.id === activeStory.poiId) : null
    const isActiveInRadius = active && active.distance <= active.radius

    if (activeStory && !isActiveInRadius) {
      setVisitCounts((prev) => ({ ...prev, [activeStory.poiId]: (prev[activeStory.poiId] || 0) + 1 }))
      setActiveStory(null)
    }

    const inRadius = withDistance.filter((x) => x.distance <= x.radius)
    if (inRadius.length === 0) return

    const candidate = isActiveInRadius
      ? active
      : inRadius.sort((a, b) => a.distance - b.distance)[0]

    if (!candidate) return
    if (!activeStory || activeStory.poiId !== candidate.p.id) {
      const segs = getStorySegments(candidate.p)
      const visitIdx = visitCounts[candidate.p.id] || 0
      const startIdx = segs.length ? visitIdx % segs.length : 0
      setActiveStory({ poiId: candidate.p.id, segmentIdx: startIdx })
    }
  }, [pos?.lat, pos?.lng, pois, activeStory?.poiId, visitCounts])

  // Story progression: avancer dans les segments tant qu'on reste sur le même POI
  useEffect(() => {
    if (!activeStory) return
    const poi = pois.find((p) => p.id === activeStory.poiId)
    if (!poi) return
    const segs = getStorySegments(poi)
    if (!segs.length) return
    if (activeStory.segmentIdx >= segs.length - 1) return

    const timer = setTimeout(() => {
      setActiveStory((cur) => {
        if (!cur || cur.poiId !== poi.id) return cur
        const next = Math.min(segs.length - 1, cur.segmentIdx + 1)
        if (next === cur.segmentIdx) return cur
        return { ...cur, segmentIdx: next }
      })
    }, 9000)
    return () => clearTimeout(timer)
  }, [activeStory?.poiId, activeStory?.segmentIdx, pois])

  // Auto TTS sur le segment actuel - uniquement lorsque l'audio guide est activé explicitement par l'utilisateur
  useEffect(() => {
    // Ne lancer l'audio que si l'utilisateur a activé l'audio guide explicitement (via le bouton play)
    if (!audioGuideActive || !autoTts || audioPaused || !activeStory) return
    const poi = pois.find((p) => p.id === activeStory.poiId)
    if (!poi) return
    const seg = getStorySegments(poi)[activeStory.segmentIdx]
    if (seg) speak(seg)
  }, [audioGuideActive, autoTts, audioPaused, activeStory?.poiId, activeStory?.segmentIdx, pois])

  // Navigation time tracker
  useEffect(() => {
    if (!guideMode) {
      setNavigationStartTime(null)
      setNavigationElapsed(0)
      return
    }

    if (!navigationStartTime) {
      setNavigationStartTime(Date.now())
    }

    const interval = setInterval(() => {
      if (navigationStartTime && !audioPaused) {
        setNavigationElapsed(Math.floor((Date.now() - navigationStartTime) / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [guideMode, navigationStartTime, audioPaused])

  // Simulation de trajet en voiture
  function startSimulation() {
    // Déterminer le trajet à utiliser (celui en mémoire ou le défaut)
    const pathToUse = simPath.length > 0 ? simPath : DEFAULT_DRIVE_PATH
    
    // Si le trajet n'est pas chargé, le charger d'abord
    if (!simPath.length) {
      setSimPath(DEFAULT_DRIVE_PATH)
    }
    
    setMapAlreadyCentered(false)
    lastPanRef.current = null
    setSimStep(0)
    setIsSimulating(true)
    setSimPaused(false)
    
    // Utiliser directement le trajet déterminé, pas l'état qui n'est pas encore mis à jour
    const startPoint = pathToUse[0] as any
    if (startPoint && startPoint.lat && startPoint.lng) {
      setPos({ lat: startPoint.lat, lng: startPoint.lng })
    }
  }
  const stopSimulation = useCallback(() => {
    console.log('[SIMULATION] Stopping simulation')
    setIsSimulating(false)
    setSimPaused(false)
    if (simTimerRef.current) {
      clearTimeout(simTimerRef.current)
      simTimerRef.current = null
    }
    if (interpolationTimerRef.current) {
      clearInterval(interpolationTimerRef.current)
      interpolationTimerRef.current = null
    }
    stopSpeech()
  }, [stopSpeech])

  // Handle play/pause pour le simulateur GPS sur la carte principale
  const handleSimulationPlayPause = () => {
    if (!isSimulating) {
      startSimulation()
    } else {
      setSimPaused((v) => !v)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function prevSegment() {
    setActiveStory((cur) => {
      if (!cur) return cur
      const poi = pois.find((p) => p.id === cur.poiId)
      if (!poi) return cur
      const next = Math.max(0, cur.segmentIdx - 1)
      return { ...cur, segmentIdx: next }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function nextSegment() {
    setActiveStory((cur) => {
      if (!cur) return cur
      const poi = pois.find((p) => p.id === cur.poiId)
      if (!poi) return cur
      const segs = getStorySegments(poi)
      const next = Math.min((segs.length || 1) - 1, cur.segmentIdx + 1)
      return { ...cur, segmentIdx: next }
    })
  }

  function prevPoi() {
    if (simStep > 0) {
      if (interpolationTimerRef.current) clearInterval(interpolationTimerRef.current)
      if (simTimerRef.current) clearTimeout(simTimerRef.current)
      setSimStep((s) => s - 1)
    }
  }

  function nextPoi() {
    if (simStep < simPath.length - 1) {
      if (interpolationTimerRef.current) clearInterval(interpolationTimerRef.current)
      if (simTimerRef.current) clearTimeout(simTimerRef.current)
      setSimStep((s) => s + 1)
    }
  }

  function recenterOnUser() {
    if (typeof window === 'undefined') return
    const map = (window as any)._le_map
    if (!map) return
    
    // Déterminer la position cible selon le mode
    // - Si trajet virtuel activé : utiliser pos (position simulée)
    // - Sinon : utiliser realGpsPos (position GPS réelle) ou fallback
    const targetPos = virtualRouteActive 
      ? pos 
      : (realGpsPos || fallbackPos)
    
    if (!targetPos) return
    
    // Si on n'est pas en mode trajet virtuel, synchroniser pos avec realGpsPos
    // Important: mettre à jour lastPanRef AVANT setPos pour empêcher l'effet de suivi
    // de recentrer automatiquement quand le state change
    if (!virtualRouteActive) {
      const newPos = realGpsPos || fallbackPos
      lastPanRef.current = newPos // Mettre à jour AVANT setPos
      setPos(newPos)
    }
    
    // Recentrer la carte sur la position cible AVEC le zoom initial
    if (map.setView) {
      map.setView([targetPos.lat, targetPos.lng], INITIAL_ZOOM, { animate: true, duration: 0.3 })
    }
    
    setMapAlreadyCentered(true)
    userHasPannedRef.current = false
    setUserHasPanned(false) // Réinitialiser le flag après recentrage manuel
  }

  // Interpolation progressive entre deux points du trajet
  // Utilise speedFactorRef pour permettre le changement de vitesse sans redémarrer
  useEffect(() => {
    if (!isSimulating || simPaused || simStep >= simPath.length - 1) {
      if (interpolationTimerRef.current) clearInterval(interpolationTimerRef.current)
      return
    }

    const cur = simPath[simStep] as any
    const next = simPath[simStep + 1] as any
    if (!cur || !next) return

    // Calculer la distance et la durée de base pour cette étape
    const speedKmh = next?.speedKmh ?? cur?.speedKmh ?? 50
    const speedMs = Math.max(5, speedKmh / 3.6)
    const dist = distanceMeters(cur.lat, cur.lng, next.lat, next.lng)
    const baseDelay = (dist / speedMs) * 1000
    const delayRaw = next?.durationMs ?? baseDelay

    // Utiliser une interpolation basée sur le temps écoulé
    // Cela permet de changer speedFactor en temps réel
    const startTime = Date.now()
    let accumulatedProgress = 0 // Progression accumulée (0 à 1)
    let lastUpdate = startTime

    const updateInterval = 16 // ~60 FPS
    interpolationTimerRef.current = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastUpdate
      lastUpdate = now

      // Calculer la progression basée sur le temps et le speedFactor actuel
      const currentSpeedFactor = Math.max(0.25, speedFactorRef.current)
      const totalDuration = Math.max(300, Math.min(8000, delayRaw / currentSpeedFactor))
      const progressIncrement = elapsed / totalDuration
      accumulatedProgress = Math.min(1, accumulatedProgress + progressIncrement)

      // Interpolation linéaire entre les deux points
      const interpolatedLat = cur.lat + (next.lat - cur.lat) * accumulatedProgress
      const interpolatedLng = cur.lng + (next.lng - cur.lng) * accumulatedProgress
      setPos({ lat: interpolatedLat, lng: interpolatedLng })

      // Quand on arrive au point suivant, passer à l'étape suivante
      if (accumulatedProgress >= 1) {
        if (interpolationTimerRef.current) clearInterval(interpolationTimerRef.current)
        setSimStep((s) => s + 1)
      }
    }, updateInterval) as any

    return () => {
      if (interpolationTimerRef.current) clearInterval(interpolationTimerRef.current)
    }
  }, [isSimulating, simPaused, simStep, simPath]) // speedFactor retiré des dépendances

  // Stop the simulation automatically when reaching the end of the path
  useEffect(() => {
    if (!isSimulating || simPaused) return
    if (!simPath.length) return
    if (simStep < simPath.length - 1) return
    console.log('[SIMULATION] End of path reached, stopping...')
    stopSimulation()
  }, [isSimulating, simPaused, simStep, simPath.length, stopSimulation])

  // Suivre la position interpolée sur la carte pendant la simulation
  // Seulement si l'utilisateur n'a pas déplacé la carte manuellement
  useEffect(() => {
    // Utiliser la ref pour une vérification synchrone
    if (!isSimulating || simPaused || !pos || userHasPannedRef.current) return
    // Ne suivre que si le trajet virtuel est activé
    if (!virtualRouteActive) return

    const map = (window as any)._le_map
    if (map && map.panTo) {
      // Suivre le point en mouvement sans animation (déjà animé par l'interpolation)
      map.panTo([pos.lat, pos.lng], { animate: false })
      // Garder le zoom constant pendant le mouvement (même zoom que GPS réel)
      if (map.setZoom) map.setZoom(INITIAL_ZOOM)
    }
  }, [pos, isSimulating, simPaused, adminLevel, userHasPanned, virtualRouteActive])

  useEffect(() => {
    // Mettre à jour la position quand la simulation est en pause ou arrêtée (pour les boutons prev/next)
    // Ne s'applique QUE si le trajet virtuel est activé ou la simulation en cours
    if (!virtualRouteActive && !isSimulating) return // Ne pas modifier pos si pas de trajet virtuel
    if (isSimulating && !simPaused) return // L'interpolation gère déjà la position

    const pt = simPath[simStep] as any
    if (!pt || !pt.lat || !pt.lng || simStep < 0 || simStep >= simPath.length) return
    
    setPos(pt)
    // Ne pas recadrer automatiquement si l'utilisateur a déplacé la carte
    // Utiliser la ref pour une vérification synchrone
    if (!userHasPannedRef.current) {
      const map = (window as any)._le_map
      if (map && map.setView) {
        // Centrer sur le point avec le même zoom que le GPS réel
        map.setView([pt.lat, pt.lng], INITIAL_ZOOM, { animate: true, duration: 0.3 })
      }
    }
  }, [simStep, isSimulating, simPath, userHasPanned, virtualRouteActive])

  // use the shared tts package if available
  function speak(text?: string) {
    if (!text) return alert('Pas de texte')
    let ok = false
    try {
      // dynamic import to avoid SSR and allow packaging
      // Use require for dynamic import in non-async context
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tts = require('@city-guided/tts')
      if (tts && typeof tts.speakBrowser === 'function') {
        ok = tts.speakBrowser(text)
      }
    } catch {
      // fallback to direct API
      if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
        const utter = new SpeechSynthesisUtterance(text)
        const voices = speechSynthesis.getVoices()
        if (voices.length) utter.voice = voices[0]
        window.speechSynthesis.speak(utter)
        ok = true
      }
    }
    if (!ok) alert('TTS non disponible')
  }

  function stopSpeech() {
    try {
      if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
        (window as any).speechSynthesis.cancel()
      }
    } catch {
      // ignore
    }
  }

  function pauseSpeech() {
    try {
      if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
        (window as any).speechSynthesis.pause()
      }
    } catch {
      // ignore
    }
  }

  function resumeSpeech() {
    try {
      if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
        (window as any).speechSynthesis.resume()
      }
    } catch {
      // ignore
    }
  }

  // Initialize a simple Leaflet map client-side
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      // dynamic imports to avoid SSR issues
      import('leaflet').then((mod) => {
        const L = (mod as any).default || mod
        // Force explicit icon paths because Leaflet's auto-detection builds a bad URL (distmarker-icon-2x.png)
        // Use absolute URLs to avoid duplication issues
        const iconBase = 'https://unpkg.com/leaflet@1.9.4/dist/images/'
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: `${iconBase}marker-icon-2x.png`,
          iconUrl: `${iconBase}marker-icon.png`,
          shadowUrl: `${iconBase}marker-shadow.png`,
        })
        // ensure Leaflet CSS is loaded for markers/tiles
        const existingCss = document.getElementById('leaflet-css') as HTMLLinkElement | null
        if (!existingCss) {
          const link = document.createElement('link')
          link.id = 'leaflet-css'
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          document.head.appendChild(link)
        }
        const mapEl = document.getElementById('map')
        if (!mapEl) return
        // only init once per element
        if ((mapEl as any)._leaflet_initialized && (window as any)._le_map) return

        // initialize map and store reference globally (HMR safe)
        const map = (window as any)._le_map || L.map('map', { zoomControl: false })
        const isNewMap = !map._hasInit
        if (isNewMap) {
          map.setView([fallbackPos.lat, fallbackPos.lng], 12)
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
          }).addTo(map)
          map._hasInit = true
          if (map.zoomControl && map.removeControl) {
            map.removeControl(map.zoomControl)
          }
        } else {
          // Pour les HMR, recentrer sur la position de départ si pas de virtualRoute
          if (!virtualRouteActive && !pos) {
            map.setView([fallbackPos.lat, fallbackPos.lng], 12, { animate: false })
          }
        }

        // suivre les déplacements de carte pour rafraîchir les POI visibles et la position de référence
        if (!(map as any)._move_handler_bound) {
          map.on('moveend', () => {
            setMapMoveVersion((v: number) => v + 1)
            const center = map.getCenter && map.getCenter()
            if (center) setMapCenter({ lat: center.lat, lng: center.lng })
            // Marquer que l'utilisateur a déplacé la carte manuellement
            userHasPannedRef.current = true
            setUserHasPanned(true)
          })
          map.on('dragstart', () => {
            // Marquer dès le début du drag que l'utilisateur contrôle la carte
            userHasPannedRef.current = true
            setUserHasPanned(true)
          })
          ;(map as any)._move_handler_bound = true
        }

        (window as any)._le_map = map
        ;(mapEl as any)._leaflet_initialized = true
      })
    } catch (e) {
      console.warn('Leaflet not available', e)
    }
    // cleanup: remove markers and map on unmount to prevent multiple init in long running dev sessions
    return () => {
      const mapEl = document.getElementById('map')
      const map = (window as any)._le_map
      if (map && map.remove) {
        // do not remove map during HMR to keep state, but clear markers group
        try {
          if ((mapEl as any).__markers_group) {
            (mapEl as any).__markers_group.clearLayers()
            delete (mapEl as any).__markers_group
          }
        } catch {
          // ignore
        }
      }
    }
  }, [])

  // update markers when pois change
  useEffect(() => {
    if (typeof window === 'undefined') return
    import('leaflet').then((mod) => {
      const L = (mod as any).default || mod
      const mapEl = document.getElementById('map')
      if (!mapEl || !(mapEl as any)._leaflet_initialized) return

      const map = (window as any)._le_map
      if (!map) return

      // markers group on the map element for cleanup
      let group = (mapEl as any).__markers_group as any
      if (group) {
        group.clearLayers()
      } else {
        group = L.layerGroup().addTo(map)
        ;(mapEl as any).__markers_group = group
      }

      // centrer sur la position (follow) et afficher un marqueur courant
      // Mais seulement si l'utilisateur n'a pas déplacé la carte manuellement
      // Utiliser la ref pour une vérification synchrone (évite les problèmes de timing avec setState)
      if (pos && !userHasPannedRef.current) {
        const last = lastPanRef.current
        const hasChanged = !last || Math.abs(last.lat - pos.lat) > 1e-6 || Math.abs(last.lng - pos.lng) > 1e-6
        if (hasChanged) {
          // Si la simulation est active, utiliser une animation plus fluide
          if (isSimulating && !simPaused) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _animationDuration = Math.max(0.2, Math.min(1.0, 1 / Math.max(speedFactor, 0.25)))
            map.panTo([pos.lat, pos.lng], { animate: false }) // Pas d'animation pour éviter les conflits
          } else {
            map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.5 })
          }
          lastPanRef.current = pos
        }
        if (!mapAlreadyCentered) {
          map.setView([pos.lat, pos.lng], zoomLevel)
          setMapAlreadyCentered(true)
        }
      }

      let posGroup = (mapEl as any).__position_group as any
      if (posGroup) {
        posGroup.clearLayers()
      } else {
        posGroup = L.layerGroup().addTo(map)
        ;(mapEl as any).__position_group = posGroup
      }
      if (pos) {
        // Utiliser un marker avec icône personnalisée pour un meilleur contrôle du z-index
        const customIcon = L.divIcon({
          className: 'position-marker',
          html: `<div style="
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #3b82f6;
            border: 3px solid #2563eb;
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3), 0 2px 8px rgba(0,0,0,0.3);
            z-index: 1000;
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })
        const marker = L.marker([pos.lat, pos.lng], { 
          icon: customIcon,
          zIndexOffset: 1000, // Z-index élevé pour être visible au-dessus de tout
          interactive: false, // Non interactif pour éviter les conflits
        })
        // S'assurer que le marqueur est au-dessus de tout
        marker.setZIndexOffset(1000)
        posGroup.addLayer(marker)
        
        // Forcer la mise à jour de la vue pour s'assurer que le point est visible
        // Même si le panneau est ouvert, on veut voir le point
        if (adminLevel !== 'hidden' || sheetLevel !== 'hidden') {
          // Ajuster la vue pour que le point soit visible dans la zone visible de la carte
          const bounds = map.getBounds()
          if (bounds && !bounds.contains([pos.lat, pos.lng])) {
            // Le point est hors de la vue, on le centre
            map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.3 })
          }
        }
      }

      // Route affichée si trajet virtuel activé (dev only) - pas besoin de simuler
      let routeGroup = (mapEl as any).__route_group as any
      if (routeGroup) {
        routeGroup.clearLayers()
      } else {
        routeGroup = L.layerGroup().addTo(map)
        ;(mapEl as any).__route_group = routeGroup
      }
      // Afficher le trajet dès que virtualRouteActive est activé (fonctionnalité dev)
      if (simPath.length > 1 && virtualRouteActive) {
        const latlngs = simPath.map((p: any) => [p.lat, p.lng])
        // Style différent si en simulation active vs juste prévisualisation
        const routeColor = isSimulating ? '#ef4444' : '#3b82f6' // Rouge si actif, bleu si prévisualisation
        const routeWeight = isSimulating ? 5 : 4
        const routeOpacity = isSimulating ? 0.85 : 0.6
        const poly = L.polyline(latlngs, { 
          color: routeColor, 
          weight: routeWeight, 
          opacity: routeOpacity,
          dashArray: isSimulating ? undefined : '10, 10' // Pointillés si pas en simulation
        })
        routeGroup.addLayer(poly)
        
        // Ajouter des marqueurs pour les points de départ et d'arrivée
        if (!isSimulating) {
          const startIcon = L.divIcon({
            className: 'route-start-marker',
            html: `<div style="
              width: 24px; height: 24px; border-radius: 50%;
              background: #22c55e; border: 3px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex; align-items: center; justify-content: center;
              color: white; font-size: 12px; font-weight: bold;
            ">▶</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })
          const endIcon = L.divIcon({
            className: 'route-end-marker',
            html: `<div style="
              width: 24px; height: 24px; border-radius: 50%;
              background: #ef4444; border: 3px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex; align-items: center; justify-content: center;
              color: white; font-size: 12px; font-weight: bold;
            ">⬛</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })
          L.marker([simPath[0].lat, simPath[0].lng], { icon: startIcon }).addTo(routeGroup)
          L.marker([simPath[simPath.length - 1].lat, simPath[simPath.length - 1].lng], { icon: endIcon }).addTo(routeGroup)
        }
        
        // ajuster la vue sur l'itinéraire lors du chargement d'une nouvelle route
        // Utiliser la ref pour une vérification synchrone
        if (!mapAlreadyCentered && !userHasPannedRef.current) {
          map.fitBounds(poly.getBounds(), { padding: [24, 24] })
          setMapAlreadyCentered(true)
        }
      }

      // compute POI visibles dans la bbox courante
      let inView = pois
      if (map.getBounds) {
        const bounds = map.getBounds()
        inView = pois.filter((p) => bounds.contains([p.lat, p.lng]))
      }
      setVisiblePois(inView.slice(0, MAX_POIS_DISPLAYED))

      inView.forEach((p) => {
        // Vérifier si ce POI est actif (en cours de lecture)
        const isActive = activeStory && activeStory.poiId === p.id
        
        // Icône selon la catégorie
        const categoryIcon = p.category === 'Château' ? '🏰' :
          p.category === 'Musée' ? '🏛️' :
          p.category === 'Forêt' ? '🌲' :
          p.category === 'Street Art' ? '🎨' :
          p.category === 'Patrimoine' ? '🏛️' :
          p.category === 'Balade' ? '🚶' : '📍'
        
        // Créer une icône personnalisée pour le POI
        let marker
        if (isActive && L.divIcon) {
          // Icône brillante et plus grande pour le POI actif
          const customIcon = L.divIcon({
            className: 'active-poi-marker',
            html: `<div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: #22c55e;
              border: 3px solid #ffffff;
              box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.3), 0 0 20px rgba(34, 197, 94, 0.6);
              animation: pulse 2s ease-in-out infinite;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 14px;
            ">${categoryIcon}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
          marker = L.marker([p.lat, p.lng], { icon: customIcon })
        } else {
          // Icône standard avec emoji de catégorie
          const defaultIcon = L.divIcon({
            className: 'poi-marker',
            html: `<div style="
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: #3b82f6;
              border: 2px solid #ffffff;
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              cursor: pointer;
            ">${categoryIcon}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })
          marker = L.marker([p.lat, p.lng], { icon: defaultIcon })
        }
        
        // Au clic sur le marker, ouvrir directement le panneau de détails
        marker.on('click', () => {
          window.dispatchEvent(new CustomEvent('selectPoi', { detail: p }))
        })
        
        group.addLayer(marker)
      })

      // god mode : affiche les cercles de rayon autour de tous les POI
      let godGroup = (mapEl as any).__god_group as any
      if (godMode) {
        if (godGroup) {
          godGroup.clearLayers()
        } else {
          godGroup = L.layerGroup().addTo(map)
          ;(mapEl as any).__god_group = godGroup
        }
        pois.forEach((p) => {
          const r = centerRadiusMeters || DEFAULT_CENTER_RADIUS_METERS
          godGroup.addLayer(L.circle([p.lat, p.lng], { radius: r, color: '#10b981', fillOpacity: 0.07, weight: 1 }))
        })
      } else if (godGroup) {
        godGroup.clearLayers()
      }
    })
  }, [pois, pos, mapAlreadyCentered, mapMoveVersion, godMode, simPath, isSimulating, simPaused, speedFactor, userHasPanned, virtualRouteActive, centerRadiusMeters])

  // Utiliser getBottomSheetHeight pour gérer tous les niveaux (y compris contextuels)
  const sheetHeightPercent = getBottomSheetHeight(sheetLevel)
  const gpsHidden = sheetHeightPercent >= GPS_HIDE_THRESHOLD_PERCENT || searchActive
  
  // Position des boutons : fixes quand le panneau dépasse le milieu
  // Le panneau passe par-dessus les boutons (z-index plus élevé)
  // Les boutons restent à une position fixe au milieu de l'écran quand le panneau est grand
  const BOTTOM_MENU_HEIGHT = 64
  const getButtonsBottom = () => {
    if (guideMode) {
      return 'calc(33vh + 16px)'
    }
    if (sheetLevel !== 'hidden') {
      // Si le panneau dépasse le milieu (50%), les boutons restent fixes au milieu
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800
      const midHeight = vh * 0.5
      if (sheetHeightPx !== null && sheetHeightPx > midHeight) {
        // Panneau dépasse le milieu : boutons fixes au milieu de l'écran
        return 'calc(50vh + 16px)'
      }
      // Sinon, les boutons suivent le panneau normalement
      if (sheetHeightPx !== null) {
        return `${devBlockHeight + BOTTOM_MENU_HEIGHT + sheetHeightPx + 16}px`
      }
      // Vérifier avec le pourcentage
      const sheetHeightPxFromPercent = vh * (sheetHeightPercent / 100)
      if (sheetHeightPxFromPercent > midHeight) {
        return 'calc(50vh + 16px)'
      }
      return `calc(${devBlockHeight + BOTTOM_MENU_HEIGHT}px + ${sheetHeightPercent}vh + 16px)`
    }
    // Panneau fermé : au-dessus du menu (64px) + devBlock (dynamique) + marge (16px)
    return `${BOTTOM_MENU_HEIGHT + devBlockHeight + 16}px`
  }
  const gpsBottom = getButtonsBottom()
  
  // Réinitialiser la hauteur en pixels quand le niveau change (après le drag)
  useEffect(() => {
    if (sheetLevel === 'hidden') {
      setSheetHeightPx(null)
    } else {
      // Calculer la hauteur attendue basée sur le niveau
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800
      const heightPercent = getBottomSheetHeight(sheetLevel)
      const calculatedHeight = vh * (heightPercent / 100)
      setSheetHeightPx(calculatedHeight)
    }
  }, [sheetLevel])

  // Recadrer la carte sur la position utilisateur quand un panneau s'ouvre
  // Mais seulement si l'utilisateur n'a pas déplacé la carte manuellement
  useEffect(() => {
    // Utiliser la ref pour une vérification synchrone
    if (!pos || userHasPannedRef.current) return
    const map = (window as any)._le_map
    if (!map || !map.setView) return

    // Si un panneau est ouvert (sheetLevel ou adminLevel), recadrer sur la position utilisateur
    const hasOpenPanel = sheetLevel !== 'hidden' || adminLevel !== 'hidden'
    if (hasOpenPanel) {
      // Calculer la hauteur du panneau en pixels pour ajuster le padding
      const viewportHeight = window.innerHeight
      let bottomPadding = 24 // Padding par défaut
      
      // Calculer la hauteur du panneau développeur
      if (adminLevel !== 'hidden') {
        const adminHeights: Record<string, number> = {
          peek: 0.15, // 15% pour peek (approximation, car 'auto' dans AdminSheet)
          mid: 0.6,   // 60vh (réduit)
          full: 0.75, // 75vh (réduit)
        }
        const adminHeightPercent = adminHeights[adminLevel] || 0
        bottomPadding = Math.max(bottomPadding, viewportHeight * adminHeightPercent + 40) // +40 pour s'assurer que le point bleu est visible
      }
      
      // Calculer la hauteur du panneau sheet (si visible)
      if (sheetLevel !== 'hidden') {
        const sheetHeightPercent = SHEET_HEIGHTS[sheetLevel] || 0
        const sheetHeightPx = (viewportHeight * sheetHeightPercent) / 100
        bottomPadding = Math.max(bottomPadding, sheetHeightPx + 24)
      }
      
      // En mode développeur avec une route chargée, afficher le trajet complet
      // Mais seulement au premier chargement, pas à chaque fois que le panneau s'ouvre
      // Utiliser la ref pour une vérification synchrone
      if (adminLevel !== 'hidden' && simPath.length > 0 && !userHasPannedRef.current) {
        // Calculer les bounds de toute la route
        const routeLats = simPath.map((p: any) => p.lat).filter((lat: any) => typeof lat === 'number')
        const routeLngs = simPath.map((p: any) => p.lng).filter((lng: any) => typeof lng === 'number')
        
        if (routeLats.length > 0 && routeLngs.length > 0) {
          const minLat = Math.min(...routeLats)
          const maxLat = Math.max(...routeLats)
          const minLng = Math.min(...routeLngs)
          const maxLng = Math.max(...routeLngs)
          
          const bounds = [
            [minLat, minLng],
            [maxLat, maxLng],
          ]
          
          if (map.fitBounds) {
            // Utiliser le padding calculé pour exclure la zone du panneau et afficher toute la route
            map.fitBounds(bounds, { padding: [24, 24, bottomPadding, 24] })
            return
          } else if (map.setView) {
            const centerLat = (minLat + maxLat) / 2
            const centerLng = (minLng + maxLng) / 2
            map.setView([centerLat, centerLng], zoomLevel)
            return
          }
        }
      }
      
      // En mode développeur, inclure aussi le POI actif dans la vue (si pas de route)
      if (adminLevel !== 'hidden' && activeStory && simPath.length === 0) {
        const activePoi = pois.find((p) => p.id === activeStory.poiId)
        if (activePoi) {
          // Calculer les bounds pour inclure utilisateur ET POI actif
          const bounds = [
            [Math.min(pos.lat, activePoi.lat), Math.min(pos.lng, activePoi.lng)],
            [Math.max(pos.lat, activePoi.lat), Math.max(pos.lng, activePoi.lng)],
          ]
          if (map.fitBounds) {
            // Utiliser le padding calculé pour exclure la zone du panneau
            map.fitBounds(bounds, { padding: [24, 24, bottomPadding, 24] })
          } else if (map.setView) {
            const centerLat = (pos.lat + activePoi.lat) / 2
            const centerLng = (pos.lng + activePoi.lng) / 2
            map.setView([centerLat, centerLng], zoomLevel)
          }
          return
        }
      }
      
      // Sinon, recadrer uniquement sur la position utilisateur
      const r = centerRadiusMeters || DEFAULT_CENTER_RADIUS_METERS
      const latDelta = r / 111000
      const lngDelta = r / (111000 * Math.max(Math.cos((pos.lat * Math.PI) / 180), 0.2))
      const southWest = [pos.lat - latDelta, pos.lng - lngDelta]
      const northEast = [pos.lat + latDelta, pos.lng + lngDelta]
      if (map.fitBounds) {
        // Utiliser le padding calculé pour exclure la zone du panneau et s'assurer que le point bleu est visible
        map.fitBounds([southWest, northEast], { padding: [24, 24, bottomPadding, 24] })
      } else if (map.setView) {
        // Avec setView, on ne peut pas utiliser de padding, mais on peut ajuster le zoom pour que le point soit visible
        // Calculer un zoom qui garantit que le point est visible même avec le panneau
        const adjustedZoom = Math.max(zoomLevel - 1, 11) // Réduire légèrement le zoom pour que le point soit visible
        map.setView([pos.lat, pos.lng], adjustedZoom)
      }
    }
  }, [sheetLevel, adminLevel, pos, centerRadiusMeters, zoomLevel, activeStory, pois, simPath, selectedRouteId, userHasPanned])

  // Adaptive zoom in navigation mode
  useEffect(() => {
    if (!guideMode || !pos) return
    const map = (window as any)._le_map
    if (!map || !map.setView) return

    // If we have an active story, calculate distance and adjust zoom
    if (activeStory) {
      const activePoi = pois.find((p) => p.id === activeStory.poiId)
      if (activePoi) {
        const distance = distanceMeters(pos.lat, pos.lng, activePoi.lat, activePoi.lng)

        // Adaptive zoom: closer = more zoom, farther = less zoom
        let targetZoom = 15
        if (distance < 100) {
          targetZoom = 18 // Very close - zoom in to see details
        } else if (distance < 300) {
          targetZoom = 17 // Close - good detail
        } else if (distance < 500) {
          targetZoom = 16 // Medium - balanced view
        } else if (distance < 1000) {
          targetZoom = 15 // Far - wider view
        } else {
          targetZoom = 14 // Very far - must see both user and POI
        }

        // Calculate center point between user and POI for very far distances
        if (distance > 1000) {
          const centerLat = (pos.lat + activePoi.lat) / 2
          const centerLng = (pos.lng + activePoi.lng) / 2
          map.setView([centerLat, centerLng], targetZoom, { animate: true, duration: 0.5 })
        } else {
          // For closer distances, center on user position
          map.setView([pos.lat, pos.lng], targetZoom, { animate: true, duration: 0.5 })
        }
        return
      }
    }

    // Fallback: no active story, just center on user
    map.setView([pos.lat, pos.lng], Math.max(15, zoomLevel))
  }, [guideMode, pos, zoomLevel, activeStory, pois])

  // Logique centralisée pour déterminer si le menu du bas doit être visible
  // Le menu est visible si :
  // - Pas en mode guide
  // - Pas en mode recherche active (overlay ouvert)
  // - ET (panneau fermé OU pas de résultats de recherche à afficher)
  // - ET pas en desktop (Google Maps style: pas de menu en bas sur desktop)
  // - ET pas de POI sélectionné (pour gagner de la place dans poi-details)
  // - Le panneau développeur peut être ouvert, le menu reste visible au-dessus
  // Si searchActive est false ET query est vide, le menu doit être visible même si searchReady est true
  const shouldShowBottomMenu = !isDesktop && !guideMode && !searchActive && !selectedPoi && (sheetLevel === 'hidden' || !(searchReady && query && query.trim() !== ''))

  // Quand on ferme le panneau (sheetLevel = 'hidden'), réinitialiser searchReady si on avait des résultats
  // Cela permet de réafficher le menu proprement
  // IMPORTANT: Ne pas réinitialiser si on vient juste de lancer une recherche (query existe)
  // car le useEffect principal va ouvrir le panneau automatiquement
  // Réinitialiser searchReady et query quand la recherche est fermée
  // Cela permet au menu de réapparaître immédiatement
  useEffect(() => {
    if (!searchActive && (!query || query.trim() === '')) {
      // Si la recherche n'est plus active ET que query est vide, réinitialiser searchReady
      setSearchReady(false)
    }
  }, [searchActive, query])
  
  // Réinitialiser searchReady quand le panneau est fermé et qu'il n'y a pas de query
  useEffect(() => {
    if (sheetLevel === 'hidden' && !searchActive && (!query || query.trim() === '')) {
      // Si on ferme le panneau ET que la recherche n'est plus active ET que query est vide
      // Réinitialiser searchReady pour permettre au menu de réapparaître
      setSearchReady(false)
    }
  }, [sheetLevel, searchActive, query])

  return (
    <main
      id="homepage"
      data-testid="homepage"
      style={{
        minHeight: 'calc(100vh + 100px)', // Permet de scroller et voir la zone blanche en dessous
        background: '#ffffff', // Blanc pour la zone en dessous
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <AppContainer id="app-container">
        <MapContainer
          id="map"
          isDesktop={isDesktop}
          adminLevel={adminLevel}
          guideMode={guideMode}
        />

        {!guideMode && (
          <SearchOverlay
            query={query}
            setQuery={setQuery}
            searchActive={searchActive}
            setSearchActive={setSearchActive}
            setSearchReady={setSearchReady}
            setLastQuery={setLastQuery}
            setDiscoverMode={setDiscoverMode}
            setSheetLevel={setSheetLevel}
            lastQuery={lastQuery}
            isDesktop={isDesktop}
            onQuickSelect={(value) => {
              console.log('[QUICK SELECT] Selected:', value)
              // Fermer la recherche et afficher les résultats
              setSearchActive(false)
              // searchReady est déjà true (défini par markReady() dans SearchOverlay)
              // Le useEffect va automatiquement mettre sheetLevel à 'mid' une fois les POIs chargés
            }}
            onClear={() => {
              setSearchReady(false)
              setSearchActive(false)
              setQuery('')
              setSheetLevel('peek')
              setDiscoverMode(false)
            }}
            onNavigateToSaved={() => {
              // Fermer la recherche et naviguer vers le menu "Enregistrés"
              setSearchActive(false)
              setSearchReady(false)
              setQuery('')
              setActiveTab('saved')
              setSheetLevel('mid')
            }}
          />
        )}

        {/* NavigationOverlay supprimé - les infos sont maintenant dans StoryPanel */}

        {/* Conteneur pour StoryPanel - visible uniquement en mode navigation (guideMode) */}
        <StoryPanelContainer
          id="story-panel-container"
          visible={!searchActive && guideMode}
          devBlockHeight={devBlockHeight}
          activeStory={activeStory}
          pois={pois}
          getStorySegments={getStorySegments}
          speak={speak}
          stopSpeech={stopSpeech}
          pauseSpeech={pauseSpeech}
          resumeSpeech={resumeSpeech}
          onStopNavigation={() => {
            setGuideMode(false)
            stopSpeech()
            setAudioPaused(true)
            setAudioGuideActive(false)
            setNavigationPois([])
            setSheetLevel('hidden')
          }}
          onSegmentChange={(poiId, segmentIdx) => {
            setActiveStory({ poiId, segmentIdx })
          }}
        />

        {!guideMode && (() => {
          const items = searchReady || discoverMode ? pois : visiblePois
          // Si recherche avec résultats : panneau visible même si searchActive est false (overlay fermé)
          const level = searchActive ? 'hidden' : sheetLevel
          const mode = searchReady || discoverMode ? 'results' : 'ambience'
          // Si recherche avec résultats, utiliser la query, sinon le titre du tab
          const title = searchReady && query ? query : undefined
          // Menu caché si on affiche des résultats de recherche (panneau ouvert)
          const menuVisible = shouldShowBottomMenu
          return (
            <BottomSheet
              level={level}
              setLevel={setSheetLevel}
              query={title || 'Découvrir'}
              items={items}
              speak={speak}
              stopSpeech={stopSpeech}
              pauseSpeech={pauseSpeech}
              resumeSpeech={resumeSpeech}
              pos={pos}
              mode={mode}
              activeTab={activeTab}
              menuVisible={menuVisible}
              devBlockHeight={devBlockHeight}
              isDesktop={isDesktop}
              selectedPoi={selectedPoi}
              onSelectPoi={(poi) => {
                // Mémoriser la position actuelle du panneau "Découvertes" avant d'ouvrir le POI
                // On mémorise seulement si on vient du panneau "Découvertes" (pas de recherche)
                if (!searchReady && !query && (sheetLevel === 'peek' || sheetLevel === 'mid' || sheetLevel === 'full')) {
                  setPreviousDiscoverLevel(sheetLevel as 'peek' | 'mid' | 'full')
                  // Ouvrir le panneau POI à 50% (mid) quand on clique depuis "Découvertes"
                  setSheetLevel('poiFromMap') // poiFromMap = 50%
                } else if (searchReady && query) {
                  // Si on vient d'une recherche, ouvrir à 90% (poiFromSearch)
                  setSheetLevel('poiFromSearch')
                }
                setSelectedPoi(poi)
              }}
              onClosePoi={() => {
                setSelectedPoi(null)
                // Restaurer la position précédente du panneau "Découvertes"
                if (previousDiscoverLevel) {
                  setSheetLevel(previousDiscoverLevel)
                  setPreviousDiscoverLevel(null)
                } else if (searchReady && query) {
                  // Si on était en mode recherche, revenir à la liste de recherche
                  setSheetLevel('searchResults')
                } else {
                  // Sinon, fermer le panneau
                  setSheetLevel('hidden')
                }
              }}
              onClose={() => {
                // Quand on ferme le panneau avec le bouton X, réinitialiser searchReady et query
                // pour permettre au menu de réapparaître immédiatement
                setSheetLevel('hidden')
                setSearchReady(false)
                setQuery('')
              }}
              onCenterOnPoi={(poi) => {
                // Centrer la carte sur le POI
                const map = (window as any)?._le_map
                if (map && map.setView) {
                  map.setView([poi.lat, poi.lng], 16, { animate: true, duration: 0.5 })
                }
              }}
              onHeightChange={(heightPx) => {
                // Mettre à jour la hauteur en temps réel pendant le drag
                setSheetHeightPx(heightPx)
              }}
              previousDiscoverLevel={previousDiscoverLevel}
            />
          )
        })()}

        {/* Liste POIs navigation - en bas à gauche */}
        {guideMode && navigationPois.length > 0 && (
          <NavigationPoiList
            id="navigation-poi-list"
            previousPoi={null} // Pas de POI précédent pour l'instant
            currentPoi={navigationPois[0] || null} // Le plus proche dans le cône
            nextPois={navigationPois.slice(1, 4)} // Les 3 suivants
            onPoiClick={(poi) => {
              // Marquer le POI comme visité
              setVisitedPoiIds((prev) => {
                const newSet = new Set(prev)
                newSet.add(poi.id)
                return newSet
              })
              // Ouvrir le panneau de détails du POI
              // Trouver le POI complet dans la liste des POIs
              const fullPoi = pois.find((p) => p.id === poi.id)
              if (fullPoi) {
                setSelectedPoi(fullPoi)
                setSheetLevel('peek')
              }
            }}
          />
        )}


        {/* NavigationPanel remplacé par StoryPanel plus haut - ce composant n'est plus utilisé */}

        {/* Menu du bas : affiché selon la logique centralisée shouldShowBottomMenu */}
        {shouldShowBottomMenu && (
          <BottomMenu activeTab={activeTab} onTabChange={handleTabChange} devBlockHeight={devBlockHeight} />
        )}

        {/* Boutons de contrôle flottants à droite (GPS + Play) */}
        <MapControlButtons
          id="map-control-buttons"
          gpsBottom={gpsBottom}
          gpsHidden={gpsHidden}
          hasGps={!!pos}
          guideMode={guideMode}
          activeStory={activeStory}
          onRecenterUser={recenterOnUser}
          onPlayPause={() => {
            if (!guideMode) {
              setGuideMode(true)
              setSheetLevel('mid')
              setVisitedPoiIds(new Set())
              setCurrentNavigationPoiIndex(-1)
              // Initialiser activeStory avec le POI le plus proche
              if (pos && pois.length > 0) {
                const withDistance = pois.map((p) => ({
                  p,
                  distance: distanceMeters(pos.lat, pos.lng, p.lat, p.lng),
                  radius: p.radiusMeters || DEFAULT_RADIUS_METERS
                }))
                const closest = withDistance.sort((a, b) => a.distance - b.distance)[0]
                if (closest) {
                  const segs = getStorySegments(closest.p)
                  const startIdx = segs.length ? 0 : 0
                  setActiveStory({ poiId: closest.p.id, segmentIdx: startIdx })
                }
              }
            } else {
              setGuideMode(false)
              stopSpeech()
              setAudioPaused(true)
              setAudioGuideActive(false)
              setNavigationPois([])
              setActiveStory(null) // Réinitialiser activeStory quand on quitte le mode navigation
              setSheetLevel('hidden')
            }
          }}
        />

        {/* Bloc unifié : lecteur GPS + panneau développeur - Visible uniquement si SHOW_DEV_OPTIONS */}
        {SHOW_DEV_OPTIONS && (
        <DevControlBlock
            virtualRouteActive={virtualRouteActive}
            setVirtualRouteActive={setVirtualRouteActive}
            simStep={simStep}
            simPath={simPath}
            isSimulating={isSimulating}
            simPaused={simPaused}
            speedFactor={speedFactor}
            setSpeedFactor={setSpeedFactor}
            onPlayPause={handleSimulationPlayPause}
            onPrevious={simPath.length > 0 && simStep > 0 ? prevPoi : undefined}
            onNext={simPath.length > 0 && simStep < simPath.length - 1 ? nextPoi : undefined}
            stopSimulation={stopSimulation}
            routeOptions={ROUTE_OPTIONS}
            selectedRouteId={selectedRouteId}
            onRouteSelect={setSelectedRouteId}
            loadRoute={loadRoute}
            routeStatus={routeStatus}
            osrmError={osrmError}
            pos={pos}
            godMode={godMode}
            setGodMode={setGodMode}
            audioPaused={audioPaused}
            setAudioPaused={setAudioPaused}
            pauseSpeech={pauseSpeech}
            resumeSpeech={resumeSpeech}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            centerRadiusMeters={centerRadiusMeters}
            setCenterRadiusMeters={setCenterRadiusMeters}
            onHeightChange={setDevBlockHeight}
            panelOpen={devPanelOpen}
            setPanelOpen={setDevPanelOpen}
          />
        )}
      </AppContainer>
    </main>
  )
}
