import React, { useEffect, useRef, useState } from 'react'
import { SearchOverlay } from '../components/SearchOverlay'
import { StoryPanel } from '../components/StoryPanel'
import { ResultsPanel } from '../components/ResultsPanel'
import { GuideControls } from '../components/GuideControls'
import { BottomSheet } from '../components/BottomSheet'
import { AdminSheet } from '../components/AdminSheet'
import { distanceMeters } from '../utils/distance'
import {
  DEFAULT_CENTER_RADIUS_METERS,
  GPS_BUTTON_MARGIN_PX,
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

export default function Home() {
  const fallbackPos = { lat: 48.402, lng: 2.699 } // proche des mocks Fontainebleau/Perthes
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(fallbackPos)
  const [pois, setPois] = useState<Poi[]>([])
  const [visiblePois, setVisiblePois] = useState<Poi[]>([])
  const [mapAlreadyCentered, setMapAlreadyCentered] = useState(false)
  const [mapMoveVersion, setMapMoveVersion] = useState(0)
  const [godMode, setGodMode] = useState(false)
  const [autoTts, setAutoTts] = useState(true)
  const [activeStory, setActiveStory] = useState<{ poiId: string; segmentIdx: number } | null>(null)
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({})
  const [isSimulating, setIsSimulating] = useState(false)
  const [simPaused, setSimPaused] = useState(false)
  const [simStep, setSimStep] = useState(0)
  const simTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastPanRef = useRef<{ lat: number; lng: number } | null>(null)
  const [simPath, setSimPath] = useState<any[]>([])
  const [routeStatus, setRouteStatus] = useState<string>('Trajet par défaut prêt')
  const [osrmError, setOsrmError] = useState<string | null>(null)
  const [speedFactor, setSpeedFactor] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(14)
  const [audioPaused, setAudioPaused] = useState(false)
  const [searchActive, setSearchActive] = useState(false)
  const [searchReady, setSearchReady] = useState(false)
  const [sheetLevel, setSheetLevel] = useState<'hidden' | 'peek' | 'mid' | 'full'>('peek')
  const [adminLevel, setAdminLevel] = useState<'hidden' | 'peek' | 'mid' | 'full'>('hidden')
  const [centerRadiusMeters, setCenterRadiusMeters] = useState(DEFAULT_CENTER_RADIUS_METERS)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(fallbackPos)
  const [discoverMode, setDiscoverMode] = useState(false)
  const [guideMode, setGuideMode] = useState(false)
  useEffect(() => {
    if (searchActive) return
    if (searchReady || discoverMode || guideMode) {
      setSheetLevel('mid')
    } else {
      setSheetLevel('peek')
    }
  }, [searchReady, searchActive, discoverMode, guideMode])
  useEffect(() => {
    setSimStep(0)
  }, [simPath])

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

  const [query, setQuery] = useState<string>('')

  useEffect(() => {
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
        setPois(sorted)
      })
      .catch(console.error)
  }, [query, mapCenter?.lat, mapCenter?.lng])

  function getStorySegments(p: Poi): string[] {
    if (p.storySegments && p.storySegments.length) return p.storySegments
    if (p.ttsText) return [p.ttsText]
    return [p.shortDescription]
  }

  async function loadOsrmRoute() {
    const start = { lat: 48.402, lng: 2.6998 }
    const end = { lat: 48.4865, lng: 2.5155 }
    setRouteStatus('Calcul OSRM local en cours…')
    setOsrmError(null)
    try {
      const url = `${OSRM_BASE}/route?startLng=${start.lng}&startLat=${start.lat}&endLng=${end.lng}&endLat=${end.lat}&overview=full&geometries=geojson&steps=true&annotations=distance,duration,speed`
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
      const path = coords.map(([lng, lat], idx) => {
        if (idx === 0) return { lat, lng, speedKmh: 0, durationMs: 0 }
        const dist = distances[idx - 1] || 0
        const dur = durations[idx - 1] || 0
        let speedKmh = speeds[idx - 1] !== undefined ? speeds[idx - 1] * 3.6 : dist && dur ? (dist / dur) * 3.6 : 50
        speedKmh = Math.min(Math.max(speedKmh, 15), 110)
        const durationMs = Math.min(Math.max((dur || (dist / Math.max(speedKmh / 3.6, 1))) * 1000, 300), 8000)
        return { lat, lng, speedKmh, durationMs }
      })
      if (path.length < 2) throw new Error('Route trop courte')
      setSimPath(path)
      setRouteStatus(`Route OSRM chargée (${Math.round(route.distance / 1000)} km, ${Math.round(route.duration / 60)} min)`)
    } catch (e: any) {
      setOsrmError(e?.message || 'Erreur OSRM')
      setRouteStatus('Route OSRM indisponible, utilisation du trajet par défaut')
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

  // Auto TTS sur le segment actuel
  useEffect(() => {
    if (!autoTts || audioPaused || !activeStory) return
    const poi = pois.find((p) => p.id === activeStory.poiId)
    if (!poi) return
    const segs = getStorySegments(poi)
    const seg = segs[activeStory.segmentIdx]
    if (seg) speak(seg)
  }, [autoTts, audioPaused, activeStory?.poiId, activeStory?.segmentIdx, pois])

  // Simulation de trajet en voiture
  function startSimulation() {
    if (!simPath.length) setSimPath(DEFAULT_DRIVE_PATH)
    setMapAlreadyCentered(false)
    lastPanRef.current = null
    setSimStep(0)
    setIsSimulating(true)
    setSimPaused(false)
    setPos((simPath[0] as any) || DEFAULT_DRIVE_PATH[0])
  }
  function stopSimulation() {
    setIsSimulating(false)
    if (simTimerRef.current) clearTimeout(simTimerRef.current)
    stopSpeech()
  }

  function prevSegment() {
    setActiveStory((cur) => {
      if (!cur) return cur
      const poi = pois.find((p) => p.id === cur.poiId)
      if (!poi) return cur
      const segs = getStorySegments(poi)
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

  useEffect(() => {
    if (!isSimulating || simPaused) {
      if (simTimerRef.current) clearTimeout(simTimerRef.current)
      return
    }
    if (simStep >= simPath.length - 1) {
      setIsSimulating(false)
      return
    }
    const cur = simPath[simStep] as any
    const next = simPath[simStep + 1] as any
    const speedKmh = next?.speedKmh ?? cur?.speedKmh ?? 50
    const speedMs = Math.max(5, speedKmh / 3.6)
    const dist = distanceMeters(cur.lat, cur.lng, next.lat, next.lng)
    const baseDelay = (dist / speedMs) * 1000
    const delayRaw = next?.durationMs ?? baseDelay
    const delay = Math.max(300, Math.min(8000, delayRaw / Math.max(speedFactor, 0.25)))
    simTimerRef.current = setTimeout(() => setSimStep((s) => s + 1), delay)
    return () => {
      if (simTimerRef.current) clearTimeout(simTimerRef.current)
    }
  }, [isSimulating, simStep])

  useEffect(() => {
    if (!isSimulating) return
    const pt = simPath[simStep] as any
    if (!pt) return
    setPos(pt)
    const map = (window as any)._le_map
    if (map && map.panTo) {
      map.panTo([pt.lat, pt.lng], { animate: true, duration: 0.7 })
      if (map.setZoom) map.setZoom(zoomLevel)
    }
  }, [simStep, isSimulating, simPath, zoomLevel])

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

  // Initialize a simple Leaflet map client-side
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      // dynamic imports to avoid SSR issues
      import('leaflet').then((mod) => {
        const L = (mod as any).default || mod
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
          map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.5 })
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
        posGroup.addLayer(
          L.circleMarker([pos.lat, pos.lng], { radius: 7, color: '#2563eb', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.9 })
        )
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
        const marker = L.marker([p.lat, p.lng]).bindPopup(`<b>${p.name}</b><br/>${p.shortDescription}`)
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
  }, [pois, pos, mapAlreadyCentered, mapMoveVersion, godMode, simPath])

  const sheetHeightPercent = SHEET_HEIGHTS[sheetLevel] || 0
  const gpsHidden = adminLevel !== 'hidden' || sheetHeightPercent >= GPS_HIDE_THRESHOLD_PERCENT || searchActive
  const gpsBottom = sheetLevel === 'hidden' ? 16 : `calc(${sheetHeightPercent}vh + ${GPS_BUTTON_MARGIN_PX}px)`

  return (
    <main
      style={{
        height: '100vh',
        background: '#eef2f7',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ position: 'relative', height: '100%', width: '100%' }}>
        <div id="map" style={{ position: 'absolute', inset: 0 }} />

        <SearchOverlay
          query={query}
          setQuery={setQuery}
          searchActive={searchActive}
          setSearchActive={setSearchActive}
          setSearchReady={setSearchReady}
          onQuickSelect={() => {
            setDiscoverMode(false)
            setSearchReady(true)
            setSheetLevel('mid')
          }}
          onClear={() => {
            setSearchReady(false)
            setQuery('')
            setSheetLevel('peek')
            setDiscoverMode(false)
          }}
        />

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
          {!searchActive && <StoryPanel activeStory={activeStory} pois={pois} getStorySegments={getStorySegments} speak={speak} />}
          {searchReady && !searchActive && <ResultsPanel visiblePois={visiblePois} speak={speak} />}
        </div>

        <BottomSheet
          level={searchActive ? 'hidden' : sheetLevel}
          setLevel={setSheetLevel}
          query={query || 'Découvrir'}
          items={visiblePois}
          speak={speak}
          pos={pos}
          mode={searchReady || discoverMode ? 'results' : 'ambience'}
          guideMode={guideMode}
          guideTitle={
            guideMode && activeStory ? pois.find((p) => p.id === activeStory.poiId)?.name || 'Lieu en cours' : undefined
          }
          guideSubtitle={guideMode && activeStory ? 'Visite audio en cours' : undefined}
          guideImage={
            guideMode && activeStory ? `https://via.placeholder.com/640x320?text=${encodeURIComponent(
              (pois.find((p) => p.id === activeStory.poiId)?.name || 'Lieu') + ' ' + ((activeStory.segmentIdx % 3) + 1)
            )}` : undefined
          }
          guideText={
            guideMode && activeStory ? getStorySegments(pois.find((p) => p.id === activeStory.poiId) as any)[activeStory.segmentIdx] : undefined
          }
          onPrev={guideMode ? prevSegment : undefined}
          onNext={guideMode ? nextSegment : undefined}
          onPlayPause={
            guideMode
              ? () => {
                  setAudioPaused((p) => {
                    const next = !p
                    if (next) stopSpeech()
                    return next
                  })
                }
              : undefined
          }
          playing={!audioPaused && guideMode}
          actions={[
            {
              label: 'Découvrir',
              icon: '🌍',
              onClick: () => {
                setDiscoverMode(true)
                setSearchReady(false)
                setQuery('')
                setSheetLevel('mid')
              },
            },
            { label: 'Enregistrés', icon: '⭐', onClick: () => setSheetLevel('mid') },
            { label: 'Contribuer', icon: '✍️', onClick: () => setSheetLevel('mid') },
          ]}
        />

        <div
          style={{
            position: 'fixed',
            right: 16,
            bottom: gpsBottom,
            zIndex: 12020,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {!gpsHidden && (
            <button
              onClick={recenterOnUser}
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                border: '1px solid #1f2937',
                background: '#0f172a',
                color: '#e5e7eb',
                boxShadow: '0 14px 30px rgba(0,0,0,0.45)',
                fontSize: 18,
              }}
              aria-label="Recentrer sur ma position"
            >
              📍
            </button>
          )}
          <button
            onClick={() => {
              setGuideMode((v) => !v)
              if (!guideMode) setSheetLevel('mid')
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              border: '1px solid #1f2937',
              background: guideMode ? '#16a34a' : '#0b1220',
              color: '#e5e7eb',
              boxShadow: '0 14px 30px rgba(0,0,0,0.45)',
              fontSize: 16,
            }}
            aria-label="Visite guidée"
          >
            {guideMode ? '⏹' : '▶️'}
          </button>
          <button
            onClick={() => setAdminLevel(adminLevel === 'hidden' ? 'peek' : 'hidden')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              border: '1px solid #1f2937',
              background: '#0b1220',
              color: '#e5e7eb',
              boxShadow: '0 14px 30px rgba(0,0,0,0.45)',
              fontSize: 18,
            }}
            aria-label="Panneau développeur"
          >
            {adminLevel === 'hidden' ? '⚙️' : '✕'}
          </button>
        </div>

        <AdminSheet level={adminLevel} setLevel={setAdminLevel}>
          <GuideControls
            loadOsrmRoute={loadOsrmRoute}
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
            godMode={godMode}
            setGodMode={setGodMode}
            pos={pos}
            autoTts={autoTts}
            setAutoTts={setAutoTts}
            audioPaused={audioPaused}
            setAudioPaused={setAudioPaused}
            stopSpeech={stopSpeech}
            centerRadiusMeters={centerRadiusMeters}
            setCenterRadiusMeters={setCenterRadiusMeters}
            recenterOnUser={recenterOnUser}
          />
        </AdminSheet>
      </div>
    </main>
  )
}
