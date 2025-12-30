import React, { useEffect, useState } from 'react'

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
}

export default function Home() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [pois, setPois] = useState<Poi[]>([])
  const fallbackPos = { lat: 48.402, lng: 2.699 } // proche des mocks Fontainebleau/Perthes
  const RADIUS_METERS = 20000
  const [mapAlreadyCentered, setMapAlreadyCentered] = useState(false)

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
    if (!pos) return
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
    const params = new URLSearchParams({ lat: String(pos.lat), lng: String(pos.lng), radius: String(RADIUS_METERS) })
    if (category) params.set('category', category)
    if (query) params.set('q', query)
    const url = base ? `${base}/api/pois?${params.toString()}` : `/api/pois?${params.toString()}`
    fetch(url)
      .then((r) => r.json())
      .then((data) => setPois(data))
      .catch(console.error)
  }, [pos, category, query])

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

      // optional: display current position + radius
      if (pos) {
        // center map on la position une seule fois (évite de bouger lors des filtres)
        if (!mapAlreadyCentered) {
          map.setView([pos.lat, pos.lng], 11)
          setMapAlreadyCentered(true)
        }
        const circleGroup = (mapEl as any).__circle_group || L.layerGroup().addTo(map)
        circleGroup.clearLayers()
        circleGroup.addLayer(L.circle([pos.lat, pos.lng], { radius: RADIUS_METERS, color: '#1d4ed8', fillOpacity: 0.08 }))
        ;(mapEl as any).__circle_group = circleGroup
      }

      pois.forEach((p) => {
        const marker = L.marker([p.lat, p.lng]).bindPopup(`<b>${p.name}</b><br/>${p.shortDescription}`)
        group.addLayer(marker)
      })
    })
  }, [pois, pos, mapAlreadyCentered])

  return (
    <main style={{ padding: 20 }}>
      <h1>CityGuided — MVP</h1>
      <p>Position actuelle: {pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : '… récupération en cours (ou usage de la position de démo)'}</p>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <section style={{ flex: '1 1 320px' }}>
          <h2>Points d'intérêt proches</h2>
          <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="Je veux visiter..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ padding: 6, maxWidth: 260 }} />
            <div>
              {['Monuments', 'Musees', 'Art', 'Insolite', 'Autre'].map((c) => (
                <button key={c} onClick={() => setCategory(category === c ? null : c)} style={{ marginRight: 6, marginBottom: 6 }}>
                  {category === c ? `✓ ${c}` : c}
                </button>
              ))}
            </div>
          </div>

          {pois.length === 0 && <p>Aucun POI dans le rayon (vérifie que l’API tourne et que la position est définie)</p>}
          <ul>
            {pois.map((p) => (
              <li key={p.id} style={{ marginBottom: 12 }}>
                <strong>{p.name}</strong> — {p.shortDescription} <br />
                <button onClick={() => speak(p.ttsText)}>Lire (TTS navigateur)</button>
              </li>
            ))}
          </ul>

          <section style={{ marginTop: 20 }}>
            <h3>Simuler position</h3>
            <p>Entrer une position proche des POIs (ex: Fontainebleau) pour tester la détection quand la géoloc réelle n'est pas pratique.</p>
            <button onClick={() => setPos({ lat: 48.4020, lng: 2.6998 })}>Se positionner sur Fontainebleau</button>
            <button onClick={() => setPos({ lat: 48.4865, lng: 2.5155 })} style={{ marginLeft: 8 }}>
              Se positionner sur Perthes
            </button>
          </section>
        </section>

        <div style={{ flex: '0 0 420px', maxWidth: '100%', height: 620, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <div id="map" style={{ height: '100%', width: '100%' }} />
        </div>
      </div>
    </main>
  )
}
