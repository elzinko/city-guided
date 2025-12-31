import React, { useEffect, useRef, useState } from 'react'

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const toRad = (d: number) => (d * Math.PI) / 180
  const f1 = toRad(lat1)
  const f2 = toRad(lat2)
  const df = toRad(lat2 - lat1)
  const dl = toRad(lon2 - lon1)
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

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
  const [simPath, setSimPath] = useState(DEFAULT_DRIVE_PATH)
  const [routeStatus, setRouteStatus] = useState<string>('Trajet par défaut prêt')
  const [osrmError, setOsrmError] = useState<string | null>(null)
  const [speedFactor, setSpeedFactor] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(14)
  const [audioPaused, setAudioPaused] = useState(false)
  const [searchActive, setSearchActive] = useState(false)
  const [sheetLevel, setSheetLevel] = useState<'hidden' | 'peek' | 'mid' | 'full'>('peek')
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

  const [category, setCategory] = useState<string | null>(null)
  const [query, setQuery] = useState<string>('')

  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
    const params = new URLSearchParams({ radius: 'all', lat: String(pos?.lat ?? fallbackPos.lat), lng: String(pos?.lng ?? fallbackPos.lng) })
    if (category) params.set('category', category)
    if (query) params.set('q', query)
    const url = base ? `${base}/api/pois?${params.toString()}` : `/api/pois?${params.toString()}`
    fetch(url)
      .then((r) => r.json())
      .then((data) => setPois(data))
      .catch(console.error)
  }, [category, query, pos?.lat, pos?.lng])

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
        const map = (window as any)._le_map || L.map('map')
        if (!map._hasInit) {
          map.setView([fallbackPos.lat, fallbackPos.lng], 12)
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
          }).addTo(map)
          map._hasInit = true
        }

        // suivre les déplacements de carte pour rafraîchir les POI visibles et la position de référence
        if (!(map as any)._move_handler_bound) {
          map.on('moveend', () => {
            setMapMoveVersion((v: number) => v + 1)
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
      if (simPath.length > 1) {
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
      setVisiblePois(inView)

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

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #111827 45%, #0f172a 100%)',
        color: '#e5e7eb',
        padding: 16,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 12,
        }}
      >
        <HeroHeader pos={pos} />

        <Card style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <div id="map" style={{ height: '70vh', minHeight: 360, width: '100%' }} />
          <SearchOverlay
            query={query}
            setQuery={setQuery}
            category={category}
            setCategory={setCategory}
            autoTts={autoTts}
            setAutoTts={setAutoTts}
            audioPaused={audioPaused}
            setAudioPaused={setAudioPaused}
            stopSpeech={stopSpeech}
            searchActive={searchActive}
            setSearchActive={setSearchActive}
          />
         {!searchActive && (
           <div
             style={{
               position: 'absolute',
               top: 70,
               left: 12,
               right: 12,
               display: 'flex',
               gap: 8,
               overflowX: 'auto',
               padding: '6px 0',
               zIndex: 9,
             }}
           >
              {['Monuments', 'Musees', 'Art', 'Insolite', 'Autre'].map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(category === c ? null : c)
                    setQuery(c)
                    setSheetLevel('mid')
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: category === c ? '1px solid #22c55e' : '1px solid #1f2937',
                    background: category === c ? 'rgba(34,197,94,0.15)' : '#0b1220',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  }}
                >
                  {c}
                </button>
              ))}
           </div>
         )}
       </Card>

        <StoryPanel activeStory={activeStory} pois={pois} getStorySegments={getStorySegments} speak={speak} />

        <ResultsPanel visiblePois={visiblePois} speak={speak} />

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
        />
        <BottomSheet
          level={sheetLevel}
          setLevel={setSheetLevel}
          query={query || category || 'Découvrir'}
          items={visiblePois}
          speak={speak}
          pos={pos}
        />
      </div>
    </main>
  )
}

function HeroHeader({ pos }: { pos: { lat: number; lng: number } | null }) {
  return (
    <Card
      style={{
        background: 'linear-gradient(120deg, #22c55e 0%, #16a34a 35%, #065f46 100%)',
        color: '#ecfdf3',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.2 }}>CityGuided — Taxi Edition</div>
        </div>
      </div>
    </Card>
  )
}

function SearchOverlay({
  query,
  setQuery,
  category,
  setCategory,
  autoTts,
  setAutoTts,
  audioPaused,
  setAudioPaused,
  stopSpeech,
  searchActive,
  setSearchActive,
}: any) {
  const cats = ['Monuments', 'Musees', 'Art', 'Insolite', 'Autre']
  const suggestions = ['Château', 'Musée', 'Forêt', 'Street Art', 'Patrimoine', 'Balade']
  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#0b1220',
            borderRadius: 12,
            border: '1px solid #1f2937',
            padding: '8px 10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          <input
            placeholder="Rechercher un lieu, une adresse…"
            value={query}
            onFocus={() => setSearchActive(true)}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#e5e7eb',
              outline: 'none',
              fontSize: 14,
            }}
          />
          <button style={ghostButtonStyle}>🎤</button>
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {suggestions.map((s) => (
            <Chip key={s} active={false} onClick={() => setQuery(s)}>
              {s}
            </Chip>
          ))}
        </div>
      </div>

      {searchActive && (
        <div
          onClick={() => setSearchActive(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 13, 23, 0.96)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: 16,
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#0b1220',
              borderRadius: 12,
              border: '1px solid #1f2937',
              padding: '10px 12px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              placeholder="Rechercher un lieu, une adresse…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#e5e7eb',
                outline: 'none',
                fontSize: 15,
              }}
            />
            <button style={ghostButtonStyle}>🎤</button>
            <button style={ghostButtonStyle} onClick={() => setSearchActive(false)}>
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }} onClick={(e) => e.stopPropagation()}>
            {cats.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
                {category === c ? `✓ ${c}` : c}
              </Chip>
            ))}
            <Chip active={false} onClick={() => setSearchActive(false)}>
              Voir plus…
            </Chip>
          </div>

          <div style={{ color: '#9ca3af', fontSize: 13, paddingTop: 6 }} onClick={(e) => e.stopPropagation()}>
            Adresses enregistrées
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }} onClick={(e) => e.stopPropagation()}>
            {['Maison', 'Bureau', 'Gare', 'Taxi stand', 'Spot photo'].map((r, idx) => (
              <div
                key={r}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: '#0b1220',
                  border: '1px solid #1f2937',
                  whiteSpace: 'nowrap',
                }}
              >
                {r}
              </div>
            ))}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 999,
                background: '#111827',
                border: '1px dashed #1f2937',
                color: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              ••• plus
            </div>
          </div>

          <div style={{ color: '#9ca3af', fontSize: 13, paddingTop: 6 }} onClick={(e) => e.stopPropagation()}>
            Recherches récentes
          </div>
          <div style={{ display: 'grid', gap: 10, overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            {['Fontainebleau château', 'Rochers d’Apremont', 'Gare Thomery', 'Village des impressionnistes', 'Rue des peintres'].map((r) => (
              <div key={r} style={{ padding: 10, borderRadius: 10, background: '#0b1220', border: '1px solid #1f2937' }}>
                {r}
              </div>
            ))}
            <div style={{ padding: 10, borderRadius: 10, background: 'transparent', border: '1px dashed #1f2937', color: '#9ca3af' }}>
              Autres adresses récentes →
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
            <Toggle checked={autoTts} onChange={(v: boolean) => setAutoTts(v)} label="Lecture auto" />
            <Toggle
              checked={!audioPaused}
              onChange={(v: boolean) => {
                setAudioPaused(!v)
                if (!v) stopSpeech()
              }}
              label="Audio en cours"
            />
            <button
              onClick={() => {
                setAudioPaused(true)
                stopSpeech()
              }}
              style={ghostButtonStyle}
            >
              Stop audio
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function StoryPanel({ activeStory, pois, getStorySegments, speak }: any) {
  if (!activeStory) {
    return (
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Story en cours</div>
        <div style={{ color: '#9ca3af' }}>Aucun POI actif pour l'instant (déplace la carte ou lance la simulation).</div>
      </Card>
    )
  }
  const poi = pois.find((p: any) => p.id === activeStory.poiId)
  const segs = poi ? getStorySegments(poi) : []
  const seg = segs[activeStory.segmentIdx] || '...'
  const remaining = segs.length ? `${activeStory.segmentIdx + 1}/${segs.length}` : ''

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontWeight: 700 }}>Story en cours</div>
        <Badge>{remaining ? `Segment ${remaining}` : ''}</Badge>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{poi ? poi.name : '...'}</div>
      <div style={{ fontStyle: 'italic', marginTop: 6, color: '#d1d5db' }}>{seg}</div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={primaryButtonStyle} onClick={() => speak(seg)}>
          Réécouter ce passage
        </button>
      </div>
    </Card>
  )
}

function ResultsPanel({ visiblePois, speak }: any) {
  return (
    <Card>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Résultats sur la zone visible</div>
      {visiblePois.length === 0 && <div style={{ color: '#9ca3af' }}>Aucun POI dans la zone affichée.</div>}
      <div style={{ display: 'grid', gap: 10 }}>
        {visiblePois.map((p: any) => (
          <div
            key={p.id}
            style={{
              padding: 10,
              borderRadius: 10,
              border: '1px solid #1f2937',
              background: '#0b1220',
            }}
          >
            <div style={{ fontWeight: 600 }}>{p.name}</div>
            <div style={{ color: '#9ca3af', marginTop: 4 }}>{p.shortDescription}</div>
            <button style={ghostButtonStyle} onClick={() => speak(p.ttsText)} aria-label={`Lire ${p.name}`}>
              Lire (TTS)
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function GuideControls({
  loadOsrmRoute,
  routeStatus,
  osrmError,
  startSimulation,
  stopSimulation,
  isSimulating,
  simStep,
  simPath,
  speedFactor,
  setSpeedFactor,
  zoomLevel,
  setZoomLevel,
  simPaused,
  setSimPaused,
  setMapAlreadyCentered,
  setPos,
  pos,
  godMode,
  setGodMode,
}: any) {
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Panneau développeur / simulation</div>
        <div style={{ color: osrmError ? '#fca5a5' : '#9ca3af', fontSize: 13 }}>{osrmError || routeStatus}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: '#9ca3af' }}>
          <Badge>{pos ? `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` : 'Position en attente'}</Badge>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={primaryButtonStyle} onClick={loadOsrmRoute}>
            Calculer une route OSRM
          </button>
          <button style={secondaryButtonStyle} onClick={startSimulation} disabled={isSimulating}>
            Lancer la simulation
          </button>
          <button style={ghostButtonStyle} onClick={() => setSimPaused((v: boolean) => !v)} disabled={!isSimulating}>
            {simPaused ? 'Reprendre' : 'Pause'} simulation
          </button>
          <button style={ghostButtonStyle} onClick={stopSimulation} disabled={!isSimulating}>
            Stop
          </button>
          <Badge>{`Étape ${Math.min(simStep + 1, simPath.length)}/${simPath.length || 1}`}</Badge>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Toggle checked={godMode} onChange={(v: boolean) => setGodMode(v)} label="Mode god (cercles)" />
          <label style={{ fontSize: 12, color: '#9ca3af' }}>
            Vitesse
            <input
              type="range"
              min={0.25}
              max={10}
              step={0.25}
              value={speedFactor}
              onChange={(e) => setSpeedFactor(Math.max(0.25, Number(e.target.value) || 1))}
              style={{ marginLeft: 6, width: 140, verticalAlign: 'middle' }}
            />
            <span style={{ marginLeft: 6 }}>{speedFactor.toFixed(2)}×</span>
          </label>
          <label style={{ fontSize: 12, color: '#9ca3af' }}>
            Zoom suivi
            <input
              type="range"
              min={11}
              max={18}
              step={0.5}
              value={zoomLevel}
              onChange={(e) => {
                const z = Number(e.target.value) || 14
                setZoomLevel(z)
                try {
                  const map = (window as any)._le_map
                  if (map && map.setZoom) map.setZoom(z)
                } catch (err) {
                  // ignore
                }
              }}
              style={{ marginLeft: 6, width: 140, verticalAlign: 'middle' }}
            />
            <span style={{ marginLeft: 6 }}>{zoomLevel}</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            style={ghostButtonStyle}
            onClick={() => {
              setMapAlreadyCentered(false)
              setPos({ lat: 48.402, lng: 2.6998 })
            }}
          >
            Recentrer sur Fontainebleau
          </button>
        </div>
      </div>
    </Card>
  )
}

function Card({ children, style }: any) {
  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #1f2937',
        borderRadius: 16,
        padding: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function BottomSheet({ level, setLevel, query, items, speak, pos }: any) {
  if (level === 'hidden') return null
  const heights: any = { peek: '12vh', mid: '65vh', full: '90vh' }
  const height = heights[level] || '12vh'
  const cycle = () => {
    setLevel(level === 'peek' ? 'mid' : level === 'mid' ? 'full' : 'peek')
  }
  const sorted = items
    .slice()
    .map((p: any) => ({
      ...p,
      dist: pos ? Math.round(distanceMeters(pos.lat, pos.lng, p.lat, p.lng)) : null,
    }))
    .sort((a: any, b: any) => (a.dist || 0) - (b.dist || 0))
  const featured = sorted.slice(0, 5)

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height,
        background: '#0b1220',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        border: '1px solid #1f2937',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.45)',
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #111827',
        }}
      >
        <div
          onClick={cycle}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <div style={{ width: 60, height: 4, borderRadius: 999, background: '#1f2937', margin: '0 auto' }} />
        </div>
        <button style={ghostButtonStyle} onClick={() => setLevel('hidden')}>
          ✕
        </button>
      </div>

      <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        <div style={{ fontWeight: 700 }}>{query}</div>
        {level === 'peek' && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {featured.map((p: any) => (
              <button
                key={p.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 12,
                  border: '1px solid #1f2937',
                  background: '#0f172a',
                  color: '#e5e7eb',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        {(level === 'mid' || level === 'full') && (
          <div style={{ overflowY: 'auto', maxHeight: '100%', display: 'grid', gap: 10, paddingBottom: 20 }}>
            {sorted.map((p: any) => (
              <div
                key={p.id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid #1f2937',
                  background: '#0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: '#9ca3af' }}>{p.shortDescription}</div>
                {p.dist !== null && <div style={{ fontSize: 12, color: '#6b7280' }}>{p.dist} m</div>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button style={ghostButtonStyle} onClick={() => speak(p.ttsText)}>
                    Lire (TTS)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
function Chip({ children, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 12px',
        borderRadius: 999,
        border: active ? '1px solid #22c55e' : '1px solid #1f2937',
        background: active ? 'rgba(34,197,94,0.12)' : '#0b1220',
        color: active ? '#bbf7d0' : '#e5e7eb',
      }}
    >
      {children}
    </button>
  )
}

function Toggle({ checked, onChange, label }: any) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  )
}

function Badge({ children }: any) {
  return (
    <span
      style={{
        padding: '6px 10px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        fontSize: 12,
      }}
    >
      {children}
    </span>
  )
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #22c55e',
  background: 'linear-gradient(120deg, #22c55e, #16a34a)',
  color: '#f8fafc',
  fontWeight: 700,
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
  fontWeight: 600,
}

const ghostButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #1f2937',
  background: 'transparent',
  color: '#e5e7eb',
}
