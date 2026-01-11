import React, { useEffect, useRef, useState } from 'react'
import { SearchOverlay } from '../components/SearchOverlay'
import { StoryPanel } from '../components/StoryPanel'
import { ResultsPanel } from '../components/ResultsPanel'
import { GuideControls } from '../components/GuideControls'
import { BottomSheetNew } from '../components/BottomSheetNew'
import { BottomMenu, type MenuTab } from '../components/BottomMenu'
import { AdminSheet } from '../components/AdminSheet'
import { NavigationOverlay } from '../components/NavigationOverlay'
import { NavigationPanel } from '../components/NavigationPanel'
import { PlayButton } from '../components/PlayButton'
import { PlayerControls } from '../components/PlayerControls'
import { distanceMeters } from '../utils/distance'
import {
  DEFAULT_CENTER_RADIUS_METERS,
  GPS_HIDE_THRESHOLD_PERCENT,
  MAX_POIS_DISPLAYED,
  SHEET_HEIGHTS,
} from '../config/constants'

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
}

const ROUTE_OPTIONS: RouteOption[] = [
  {
    id: 'default',
    name: 'Boucle Fontainebleau',
    description: 'Route par défaut autour du château',
    loadFn: () => Promise.resolve(DEFAULT_DRIVE_PATH),
  },
  {
    id: 'osrm',
    name: 'Route OSRM',
    description: 'Château → Melun (calculée via OSRM)',
    loadFn: async () => {
      const start = { lat: 48.402, lng: 2.6998 }
      const end = { lat: 48.4865, lng: 2.5155 }
      // Utiliser overview=simplified pour réduire le nombre de points (au lieu de full qui retourne tous les points)
      const url = `${OSRM_BASE}/route?startLng=${start.lng}&startLat=${start.lat}&endLng=${end.lng}&endLat=${end.lat}&overview=simplified&geometries=geojson&steps=true&annotations=distance,duration,speed`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`OSRM ${res.status}`)
      const data = await res.json()
      const route = data?.routes?.[0]
      if (!route || !route.geometry?.coordinates?.length) throw new Error('Pas de géométrie retournée')
      const coords: [number, number][] = route.geometry.coordinates
      const ann = route.legs?.[0]?.annotation || {}
      const distances: number[] = ann.distance || []
      const durations: number[] = ann.duration || []
      const speeds: number[] = ann.speed || []
      return coords.map(([lng, lat], idx) => {
        if (idx === 0) return { lat, lng, speedKmh: 0, durationMs: 0 }
        const dist = distances[idx - 1] || 0
        const dur = durations[idx - 1] || 0
        let speedKmh = speeds[idx - 1] !== undefined ? speeds[idx - 1] * 3.6 : dist && dur ? (dist / dur) * 3.6 : 50
        speedKmh = Math.min(Math.max(speedKmh, 15), 110)
        const durationMs = Math.min(Math.max((dur || (dist / Math.max(speedKmh / 3.6, 1))) * 1000, 300), 8000)
        return { lat, lng, speedKmh, durationMs }
      })
    },
  },
]
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '')
const OSRM_BASE =
  (process.env.NEXT_PUBLIC_OSRM_URL && process.env.NEXT_PUBLIC_OSRM_URL.replace(/\/$/, '')) ||
  `${API_BASE}/api/osrm`

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

// Composant pour l'icône GPS personnalisée
function GpsIcon({ hasGps }: { hasGps: boolean }) {
  if (!hasGps) {
    // Version grisée quand pas de GPS - agrandie
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    )
  }
  // Version avec point bleu et un seul cercle concentrique - agrandie (même taille que bouton réglages)
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      {/* Cercle extérieur bleu clair - encore plus grand */}
      <circle cx="12" cy="12" r="12" fill="#3b82f6" opacity="0.2" />
      {/* Point central bleu - plus grand */}
      <circle cx="12" cy="12" r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
    </svg>
  )
}

export default function Home() {
  const fallbackPos = { lat: 48.402, lng: 2.699 } // proche des mocks Fontainebleau/Perthes
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(fallbackPos)
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
  const [selectedRouteId, setSelectedRouteId] = useState<string>('default')
  const [routeStatus, setRouteStatus] = useState<string>('Trajet par défaut prêt')
  const [osrmError, setOsrmError] = useState<string | null>(null)
  const [speedFactor, setSpeedFactor] = useState(10) // x10 par défaut pour les tests
  const [zoomLevel, setZoomLevel] = useState(14)
  const [audioPaused, setAudioPaused] = useState(true) // En pause par défaut
  const [searchActive, setSearchActive] = useState(false)
  const [searchReady, setSearchReady] = useState(false)
  const [sheetLevel, setSheetLevel] = useState<'hidden' | 'peek' | 'mid' | 'full'>('hidden')
  const [centerRadiusMeters, setCenterRadiusMeters] = useState(DEFAULT_CENTER_RADIUS_METERS)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(fallbackPos)
  const [discoverMode, setDiscoverMode] = useState(false)
  const [guideMode, setGuideMode] = useState(false)
  const [activeTab, setActiveTab] = useState<MenuTab>('discover')
  const [adminLevel, setAdminLevel] = useState<'hidden' | 'peek' | 'mid' | 'full'>('hidden')
  const [navigationStartTime, setNavigationStartTime] = useState<number | null>(null)
  const [navigationElapsed, setNavigationElapsed] = useState(0)
  const [loadingPois, setLoadingPois] = useState(false)
  const [query, setQuery] = useState<string>('')
  const [lastQuery, setLastQuery] = useState<string>('') // Sauvegarder la dernière query pour la réafficher

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

  useEffect(() => {
    console.log('[SHEET LEVEL] searchActive:', searchActive, 'searchReady:', searchReady, 'loadingPois:', loadingPois, 'discoverMode:', discoverMode, 'query:', query)
    
    // Pendant la recherche active (overlay ouvert), cacher le sheet
    if (searchActive) {
      console.log('[SHEET LEVEL] Setting to hidden (search overlay active)')
      setSheetLevel('hidden')
      return
    }
    
    // Attendre que les POI soient chargés avant d'afficher les résultats
    if ((searchReady || discoverMode) && loadingPois) {
      console.log('[SHEET LEVEL] Waiting for POIs to load...')
      return
    }
    
    // Si on a une recherche avec résultats (mais overlay fermé), afficher le panneau
    if (searchReady && query && !loadingPois) {
      console.log('[SHEET LEVEL] Setting to mid (search results)')
      setSheetLevel('mid')
      return
    }
    
    // Si on a cliqué sur un bouton du menu (discoverMode ou autre tab), ouvrir le panneau
    // Le panneau reste ouvert tant qu'un tab est actif
    // MAIS seulement si on n'est pas en train de fermer une recherche (pas de searchActive et pas de résultats de recherche)
    if ((discoverMode || guideMode || activeTab !== 'discover') && !searchActive && !(searchReady && query)) {
      console.log('[SHEET LEVEL] Setting to mid (menu tab active)')
      setSheetLevel('mid')
      return
    }
    
    // Par défaut : cacher le panneau (seul le menu est visible)
    console.log('[SHEET LEVEL] Setting to hidden (default - menu only)')
    setSheetLevel('hidden')
  }, [searchReady, searchActive, discoverMode, guideMode, loadingPois, query])
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
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
      },
      (err) => {
        console.error(err)
        // si l'utilisateur refuse la géoloc, on place une position de démo pour activer l'UI
        setPos(fallbackPos)
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  // si la géoloc n'est pas dispo (desktop, blocage, etc.), injecter rapidement la position de démo
  useEffect(() => {
    if (pos) return
    const t = setTimeout(() => setPos(fallbackPos), 500)
    return () => clearTimeout(t)
  }, [pos])

  useEffect(() => {
    setLoadingPois(true)
    console.log('[POI FETCH] Starting fetch with query:', query)
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
    const basePos = mapCenter || pos || fallbackPos
    const params = new URLSearchParams({ radius: 'all', lat: String(basePos.lat), lng: String(basePos.lng) })
    if (query) params.set('q', query)
    const url = base ? `${base}/api/pois?${params.toString()}` : `/api/pois?${params.toString()}`
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const sorted = (data || []).map((p: any) => ({
          ...p,
          dist: basePos ? distanceMeters(basePos.lat, basePos.lng, p.lat, p.lng) : 0,
        }))
        sorted.sort((a: any, b: any) => a.dist - b.dist)
        console.log('[POI FETCH] Received', sorted.length, 'POIs for query:', query)
        setPois(sorted)
        setLoadingPois(false)
      })
      .catch((err) => {
        console.error('[POI FETCH] Error:', err)
        setLoadingPois(false)
      })
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
      // Réinitialiser la position au début du nouveau trajet
      if (path.length > 0 && path[0]) {
        const startPoint = path[0] as any
        if (startPoint.lat && startPoint.lng) {
          setPos({ lat: startPoint.lat, lng: startPoint.lng })
          setSimStep(0)
        }
      }
      if (routeId === 'osrm') {
        // Pour OSRM, on calcule la distance totale
        let totalDist = 0
        for (let i = 1; i < path.length; i++) {
          const prev = path[i - 1] as any
          const curr = path[i] as any
          totalDist += distanceMeters(prev.lat, prev.lng, curr.lat, curr.lng)
        }
        setRouteStatus(`Route OSRM chargée (${Math.round(totalDist / 1000)} km)`)
      } else {
        setRouteStatus(`${routeOption.name} chargée (${path.length} points)`)
      }
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
  function stopSimulation() {
    setIsSimulating(false)
    if (simTimerRef.current) clearTimeout(simTimerRef.current)
    if (interpolationTimerRef.current) clearInterval(interpolationTimerRef.current)
    stopSpeech()
  }

  // Handle play/pause pour le simulateur GPS sur la carte principale
  const handleSimulationPlayPause = () => {
    if (!isSimulating) {
      startSimulation()
    } else {
      setSimPaused((v) => !v)
    }
  }

  function prevSegment() {
    setActiveStory((cur) => {
      if (!cur) return cur
      const poi = pois.find((p) => p.id === cur.poiId)
      if (!poi) return cur
      const next = Math.max(0, cur.segmentIdx - 1)
      return { ...cur, segmentIdx: next }
    })
  }

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
    if (typeof window === 'undefined' || !pos) return
    const map = (window as any)._le_map
    if (!map) return
    const r = centerRadiusMeters || DEFAULT_CENTER_RADIUS_METERS
    const latDelta = r / 111000
    const lngDelta = r / (111000 * Math.max(Math.cos((pos.lat * Math.PI) / 180), 0.2))
    const southWest = [pos.lat - latDelta, pos.lng - lngDelta]
    const northEast = [pos.lat + latDelta, pos.lng + lngDelta]
    if (map.fitBounds) {
      map.fitBounds([southWest, northEast], { padding: [24, 24] })
    } else if (map.setView) {
      map.setView([pos.lat, pos.lng], zoomLevel)
    }
    setMapAlreadyCentered(true)
  }

  // Interpolation progressive entre deux points du trajet
  useEffect(() => {
    if (!isSimulating || simPaused || simStep >= simPath.length - 1) {
      if (interpolationTimerRef.current) clearInterval(interpolationTimerRef.current)
      return
    }

    const cur = simPath[simStep] as any
    const next = simPath[simStep + 1] as any
    if (!cur || !next) return

    // Calculer la durée totale pour cette étape
    const speedKmh = next?.speedKmh ?? cur?.speedKmh ?? 50
    const speedMs = Math.max(5, speedKmh / 3.6)
    const dist = distanceMeters(cur.lat, cur.lng, next.lat, next.lng)
    const baseDelay = (dist / speedMs) * 1000
    const delayRaw = next?.durationMs ?? baseDelay
    const totalDuration = Math.max(300, Math.min(8000, delayRaw / Math.max(speedFactor, 0.25)))

    // Mettre à jour la position de manière progressive (60 FPS)
    const updateInterval = 16 // ~60 FPS
    const steps = Math.max(1, Math.floor(totalDuration / updateInterval))
    let currentStep = 0

    interpolationTimerRef.current = setInterval(() => {
      currentStep++
      const progress = Math.min(1, currentStep / steps)

      // Interpolation linéaire entre les deux points
      const interpolatedLat = cur.lat + (next.lat - cur.lat) * progress
      const interpolatedLng = cur.lng + (next.lng - cur.lng) * progress
      setPos({ lat: interpolatedLat, lng: interpolatedLng })

      // Quand on arrive au point suivant, passer à l'étape suivante
      if (progress >= 1) {
        if (interpolationTimerRef.current) clearInterval(interpolationTimerRef.current)
        setSimStep((s) => s + 1)
      }
    }, updateInterval) as any

    return () => {
      if (interpolationTimerRef.current) clearInterval(interpolationTimerRef.current)
    }
  }, [isSimulating, simPaused, simStep, simPath, speedFactor])

  // Suivre la position interpolée sur la carte pendant la simulation
  useEffect(() => {
    if (!isSimulating || simPaused || !pos) return

    const map = (window as any)._le_map
    if (map && map.panTo) {
      // Suivre le point en mouvement sans animation (déjà animé par l'interpolation)
      map.panTo([pos.lat, pos.lng], { animate: false })
      // Garder le zoom constant pendant le mouvement
      if (map.setZoom) map.setZoom(zoomLevel)
    }
  }, [pos, isSimulating, simPaused, adminLevel, zoomLevel])

  useEffect(() => {
    // Mettre à jour la position quand la simulation est en pause ou arrêtée (pour les boutons prev/next)
    if (isSimulating && !simPaused) return // L'interpolation gère déjà la position

    const pt = simPath[simStep] as any
    if (!pt || !pt.lat || !pt.lng || simStep < 0 || simStep >= simPath.length) return
    
    setPos(pt)
    const map = (window as any)._le_map
    if (map && map.panTo) {
      map.panTo([pt.lat, pt.lng], { animate: true, duration: 0.3 })
    }
    
    if (adminLevel !== 'hidden' && simPath.length > 0) {
      // En mode développeur, mettre à jour la position même si la simulation est arrêtée
      setPos(pt)
      const map = (window as any)._le_map
      if (map) {
        // Calculer le padding pour s'assurer que le point est visible
        const viewportHeight = window.innerHeight
        const adminHeights: Record<string, number> = {
          peek: 0.15,
          mid: 0.6,
          full: 0.75,
        }
        const adminHeightPercent = adminHeights[adminLevel] || 0
        const bottomPadding = viewportHeight * adminHeightPercent + 60
        
        // Utiliser fitBounds pour garantir la visibilité
        const latDelta = 0.001
        const lngDelta = 0.001
        const bounds = [[pt.lat - latDelta, pt.lng - lngDelta], [pt.lat + latDelta, pt.lng + lngDelta]]
        if (map.fitBounds) {
          map.fitBounds(bounds, { padding: [24, 24, bottomPadding, 24], maxZoom: zoomLevel })
        } else if (map.panTo) {
          map.panTo([pt.lat, pt.lng], { animate: true, duration: 0.3 })
        }
      }
    }
  }, [simStep, isSimulating, simPath, zoomLevel, adminLevel])

  // use the shared tts package if available
  function speak(text?: string) {
    if (!text) return alert('Pas de texte')
    let ok = false
    try {
      // dynamic import to avoid SSR and allow packaging
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const tts = require('@city-guided/tts')
      if (tts && typeof tts.speakBrowser === 'function') {
        ok = tts.speakBrowser(text)
      }
    } catch (e) {
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
    } catch (e) {
      // ignore
    }
  }

  function pauseSpeech() {
    try {
      if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
        (window as any).speechSynthesis.pause()
      }
    } catch (e) {
      // ignore
    }
  }

  function resumeSpeech() {
    try {
      if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
        (window as any).speechSynthesis.resume()
      }
    } catch (e) {
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
        if (!map._hasInit) {
          map.setView([fallbackPos.lat, fallbackPos.lng], 12)
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
          }).addTo(map)
          map._hasInit = true
          if (map.zoomControl && map.removeControl) {
            map.removeControl(map.zoomControl)
          }
        }

        // suivre les déplacements de carte pour rafraîchir les POI visibles et la position de référence
        if (!(map as any)._move_handler_bound) {
          map.on('moveend', () => {
            setMapMoveVersion((v: number) => v + 1)
            const center = map.getCenter && map.getCenter()
            if (center) setMapCenter({ lat: center.lat, lng: center.lng })
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
        } catch (e) {
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
      if (pos) {
        const last = lastPanRef.current
        const hasChanged = !last || Math.abs(last.lat - pos.lat) > 1e-6 || Math.abs(last.lng - pos.lng) > 1e-6
        if (hasChanged) {
          // Si la simulation est active, utiliser une animation plus fluide
          if (isSimulating && !simPaused) {
            const animationDuration = Math.max(0.2, Math.min(1.0, 1 / Math.max(speedFactor, 0.25)))
            map.panTo([pos.lat, pos.lng], { animate: true, duration: animationDuration })
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

      // route affichée si une simulation est chargée
      let routeGroup = (mapEl as any).__route_group as any
      if (routeGroup) {
        routeGroup.clearLayers()
      } else {
        routeGroup = L.layerGroup().addTo(map)
        ;(mapEl as any).__route_group = routeGroup
      }
      if (simPath.length > 1 && isSimulating) {
        const latlngs = simPath.map((p: any) => [p.lat, p.lng])
        const poly = L.polyline(latlngs, { color: '#ef4444', weight: 5, opacity: 0.85 })
        routeGroup.addLayer(poly)
        // ajuster la vue sur l'itinéraire lors du chargement d'une nouvelle route
        if (!mapAlreadyCentered) {
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
        
        // Créer une icône personnalisée pour le POI actif avec animation
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
            ">📍</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
          marker = L.marker([p.lat, p.lng], { icon: customIcon }).bindPopup(`<b>${p.name}</b><br/>${p.shortDescription}`)
        } else {
          // Icône standard
          marker = L.marker([p.lat, p.lng]).bindPopup(`<b>${p.name}</b><br/>${p.shortDescription}`)
        }
        
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
          const r = p.radiusMeters || DEFAULT_RADIUS_METERS
          godGroup.addLayer(L.circle([p.lat, p.lng], { radius: r, color: '#10b981', fillOpacity: 0.07, weight: 1 }))
        })
      } else if (godGroup) {
        godGroup.clearLayers()
      }
    })
  }, [pois, pos, mapAlreadyCentered, mapMoveVersion, godMode, simPath, isSimulating, simPaused, speedFactor])

  const sheetHeightPercent = SHEET_HEIGHTS[sheetLevel] || 0
  const gpsHidden = sheetHeightPercent >= GPS_HIDE_THRESHOLD_PERCENT || searchActive
  // Position GPS button above bottom menu (64px = menu height)
  const gpsBottom = sheetLevel === 'hidden' ? '80px' : `calc(${sheetHeightPercent}vh + 80px)`

  // Recadrer la carte sur la position utilisateur quand un panneau s'ouvre
  useEffect(() => {
    if (!pos) return
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
      if (adminLevel !== 'hidden' && simPath.length > 0) {
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
  }, [sheetLevel, adminLevel, pos, centerRadiusMeters, zoomLevel, activeStory, pois, simPath, selectedRouteId])

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
  // - ET panneau développeur fermé
  const shouldShowBottomMenu = !guideMode && !searchActive && adminLevel === 'hidden' && (sheetLevel === 'hidden' || !(searchReady && query))

  // Quand on ferme le panneau (sheetLevel = 'hidden'), réinitialiser searchReady si on avait des résultats
  // Cela permet de réafficher le menu proprement
  // IMPORTANT: Ne pas réinitialiser si on vient juste de lancer une recherche (query existe)
  // car le useEffect principal va ouvrir le panneau automatiquement
  useEffect(() => {
    if (sheetLevel === 'hidden' && searchReady && !searchActive && !query) {
      // Si on ferme le panneau de résultats ET qu'il n'y a plus de query, réinitialiser searchReady
      // Cela permet de réafficher le menu proprement après avoir fermé une recherche terminée
      setSearchReady(false)
    }
  }, [sheetLevel, searchReady, searchActive, query])

  return (
    <main
      data-testid="homepage"
      style={{
        minHeight: 'calc(100vh + 100px)', // Permet de scroller et voir la zone blanche en dessous
        background: '#ffffff', // Blanc pour la zone en dessous
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
        <div 
          id="map" 
          data-testid="map-container" 
          style={{ 
            position: 'absolute', 
            top: 0,
            left: 0,
            right: 0,
            bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))', // La carte s'arrête au niveau du bottom-menu
          }} 
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

        {guideMode && activeStory && (() => {
          const activePoi = pois.find((p) => p.id === activeStory.poiId)
          const segments = activePoi ? getStorySegments(activePoi) : []
          return (
            <NavigationOverlay
              poiName={activePoi?.name || 'Lieu en cours'}
              totalDuration={180} // 3 minutes par segment par défaut
              currentTime={navigationElapsed}
              currentSegment={activeStory.segmentIdx}
              totalSegments={segments.length}
            />
          )
        })()}

        {(!searchActive && !guideMode && (activeStory || searchReady)) && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(70vh + 12px)',
              left: 12,
              right: 12,
              display: 'grid',
              gap: 12,
              paddingBottom: 220,
            }}
          >
            {activeStory && <StoryPanel activeStory={activeStory} pois={pois} getStorySegments={getStorySegments} speak={speak} />}
            {searchReady && <ResultsPanel visiblePois={visiblePois} speak={speak} />}
          </div>
        )}

        {!guideMode && (() => {
          const items = searchReady || discoverMode ? pois : visiblePois
          // Si recherche avec résultats : panneau visible même si searchActive est false (overlay fermé)
          const level = searchActive ? 'hidden' : sheetLevel
          const mode = searchReady || discoverMode ? 'results' : 'ambience'
          // Si recherche avec résultats, utiliser la query, sinon le titre du tab
          const title = searchReady && query ? query : undefined
          // Menu caché si on affiche des résultats de recherche (panneau ouvert)
          const menuVisible = shouldShowBottomMenu
          console.log('[BOTTOM SHEET] Rendering with:', { level, mode, itemsCount: items.length, query, searchReady, discoverMode, title, menuVisible, shouldShowBottomMenu })
          return (
            <BottomSheetNew
              level={level}
              setLevel={setSheetLevel}
              query={title || 'Découvrir'}
              items={items}
              speak={speak}
              pos={pos}
              mode={mode}
              activeTab={activeTab}
              menuVisible={menuVisible}
            />
          )
        })()}

        {guideMode && (
          <NavigationPanel
            poiName={activeStory ? pois.find((p) => p.id === activeStory.poiId)?.name || 'Lieu en cours' : 'En attente d\'un point d\'intérêt'}
            poiImage={activeStory ? `https://via.placeholder.com/640x320?text=${encodeURIComponent(
              (pois.find((p) => p.id === activeStory.poiId)?.name || 'Lieu') + ' ' + ((activeStory.segmentIdx % 3) + 1)
            )}` : undefined}
            currentText={activeStory ? getStorySegments(pois.find((p) => p.id === activeStory.poiId) as any)[activeStory.segmentIdx] || '' : 'Déplacez-vous pour découvrir des points d\'intérêt...'}
            onPrev={activeStory ? prevSegment : undefined}
            onNext={activeStory ? nextSegment : undefined}
            onPlayPause={() => {
              setAudioPaused((p) => {
                const next = !p
                if (next) stopSpeech()
                return next
              })
            }}
            playing={!audioPaused}
          />
        )}

        {/* Lecteur GPS sur la carte principale - visible quand un trajet est chargé */}
        {simPath.length > 0 && !guideMode && (
          <div
            style={{
              position: 'fixed',
              bottom: shouldShowBottomMenu ? 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' : 'calc(16px + env(safe-area-inset-bottom, 0px))',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 12020,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              borderRadius: 16,
              padding: '10px 12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '1px solid rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'center',
            }}
          >
            {/* Numéro d'étape */}
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textAlign: 'center', marginBottom: -4 }}>
              Étape {simStep + 1}/{simPath.length}
            </div>
            <PlayerControls
              playing={isSimulating && !simPaused}
              onPlayPause={handleSimulationPlayPause}
              onPrevious={simPath.length > 0 && simStep > 0 ? prevPoi : undefined}
              onNext={simPath.length > 0 && simStep < simPath.length - 1 ? nextPoi : undefined}
              variant="square"
              size="medium"
            />
            {/* Accélérateur miniaturisé */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                maxWidth: 200,
              }}
            >
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500, minWidth: 35 }}>
                ⚡ {speedFactor.toFixed(1)}×
              </span>
              <input
                type="range"
                min={0.25}
                max={10}
                step={0.25}
                value={speedFactor}
                onChange={(e) => setSpeedFactor(Math.max(0.25, Number(e.target.value)))}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: '#e2e8f0',
                  outline: 'none',
                  accentColor: '#22c55e',
                  cursor: 'pointer',
                }}
                title={`Vitesse: ${speedFactor.toFixed(1)}×`}
              />
            </div>
          </div>
        )}

        {/* Menu du bas : affiché selon la logique centralisée shouldShowBottomMenu */}
        {shouldShowBottomMenu && (
          <BottomMenu activeTab={activeTab} onTabChange={handleTabChange} />
        )}

        <div
          style={{
            position: 'fixed',
            right: 16,
            bottom: gpsBottom,
            zIndex: 12030,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {!gpsHidden && (
            <button
              id="gps-button"
              onClick={recenterOnUser}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                cursor: 'pointer',
              }}
              aria-label="Recentrer sur ma position"
            >
              <GpsIcon hasGps={!!pos} />
            </button>
          )}
          <PlayButton
            playing={guideMode}
            onPlayPause={() => {
              setGuideMode((v) => !v)
              if (!guideMode) {
                setSheetLevel('mid')
              } else {
                // Arrêter l'audio si on désactive le mode guide
                stopSpeech()
                setAudioPaused(true)
                setAudioGuideActive(false) // Désactiver l'audio guide explicitement
              }
            }}
            variant="square"
            size="medium"
            ariaLabel={guideMode ? 'Arrêter la visite guidée' : 'Démarrer la visite guidée'}
          />
          {!guideMode && (
            <button
              id="developer-button"
              onClick={() => setAdminLevel((prev) => (prev === 'hidden' ? 'mid' : 'hidden'))}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                cursor: 'pointer',
              }}
              aria-label="Développeur"
            >
              {/* Icône engrenage - image PNG */}
              <img
                src="/images/gear-icon.png"
                alt="Développeur"
                width="28"
                height="28"
                style={{
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            </button>
          )}
        </div>

        <AdminSheet level={adminLevel} setLevel={setAdminLevel}>
          <GuideControls
            routeOptions={ROUTE_OPTIONS}
            selectedRouteId={selectedRouteId}
            onRouteSelect={setSelectedRouteId}
            loadRoute={loadRoute}
            routeStatus={routeStatus}
            osrmError={osrmError}
            startSimulation={startSimulation}
            stopSimulation={stopSimulation}
            isSimulating={isSimulating}
            simStep={simStep}
            simPath={simPath}
            speedFactor={speedFactor}
            setSpeedFactor={setSpeedFactor}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            simPaused={simPaused}
            setSimPaused={setSimPaused}
            setMapAlreadyCentered={setMapAlreadyCentered}
            setPos={setPos}
            pos={pos}
            godMode={godMode}
            setGodMode={setGodMode}
            autoTts={autoTts}
            setAutoTts={setAutoTts}
            audioPaused={audioPaused}
            setAudioPaused={setAudioPaused}
            audioGuideActive={audioGuideActive}
            setAudioGuideActive={setAudioGuideActive}
            stopSpeech={stopSpeech}
            pauseSpeech={pauseSpeech}
            resumeSpeech={resumeSpeech}
            centerRadiusMeters={centerRadiusMeters}
            setCenterRadiusMeters={setCenterRadiusMeters}
            recenterOnUser={recenterOnUser}
            onPrevPoi={prevPoi}
            onNextPoi={nextPoi}
          />
        </AdminSheet>
      </div>
    </main>
  )
}
