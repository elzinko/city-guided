import { useEffect, useRef } from 'react'
import { useMapStore, useUiStore } from '../stores'
import { distanceMeters } from '../utils/distance'

interface FetchKey {
  query: string
  lat: number
  lng: number
}

export function usePOIs() {
  const {
    pos,
    fallbackPos,
    pois,
    setPois,
    setLoadingPois,
  } = useMapStore()

  const {
    query,
  } = useUiStore()

  const lastFetchRef = useRef<FetchKey | null>(null)

  // Fetch POIs avec debounce pour éviter trop d'appels API
  useEffect(() => {
    // Utiliser la position GPS si disponible, sinon la position de fallback
    const basePos = pos || fallbackPos
    if (!basePos) return

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
    const params = new URLSearchParams({
      radius: 'all',
      lat: String(basePos.lat),
      lng: String(basePos.lng)
    })
    if (query) params.set('q', query)
    const url = base ? `${base}/api/pois?${params.toString()}` : `/api/pois?${params.toString()}`

    // Debounce avec timeout
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()

        const sorted = (data || []).map((p: any) => ({
          ...p,
          dist: basePos ? distanceMeters(basePos.lat, basePos.lng, p.lat, p.lng) : 0,
        }))
        sorted.sort((a: any, b: any) => a.dist - b.dist)

        setPois(sorted)
        setLoadingPois(false)
        lastFetchRef.current = { query, lat: basePos.lat, lng: basePos.lng }
      } catch (err) {
        console.error('[POI FETCH] Error:', err)
        setLoadingPois(false)
      }
    }, 300) // Debounce 300ms

    return () => clearTimeout(timer)
  }, [query, pos?.lat, pos?.lng, fallbackPos.lat, fallbackPos.lng, setPois, setLoadingPois])

  return {
    pois,
    loading: useMapStore((state) => state.loadingPois),
  }
}