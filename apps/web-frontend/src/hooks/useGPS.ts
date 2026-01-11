import { useEffect } from 'react'
import { useMapStore, useSimulationStore } from '../stores'

export function useGPS() {
  const {
    pos,
    realGpsPos,
    fallbackPos,
    setPosition,
    setRealGpsPosition,
  } = useMapStore()

  const { virtualRouteActive } = useSimulationStore()

  // Géolocalisation GPS
  useEffect(() => {
    if (!('geolocation' in navigator)) return

    const id = navigator.geolocation.watchPosition(
      (p) => {
        const gpsPosition = { lat: p.coords.latitude, lng: p.coords.longitude }
        setRealGpsPosition(gpsPosition)
        // Ne mettre à jour pos que si on n'est pas en simulation virtuelle
        if (!virtualRouteActive) {
          setPosition(gpsPosition)
        }
      },
      (err) => {
        console.error('GPS Error:', err)
        // si l'utilisateur refuse la géoloc, on place une position de démo pour activer l'UI
        setRealGpsPosition(fallbackPos)
        if (!virtualRouteActive) {
          setPosition(fallbackPos)
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    )

    return () => navigator.geolocation.clearWatch(id)
  }, [virtualRouteActive, fallbackPos, setPosition, setRealGpsPosition])

  // si la géoloc n'est pas dispo (desktop, blocage, etc.), injecter rapidement la position de démo
  useEffect(() => {
    if (pos) return
    if (virtualRouteActive) return // En mode virtuel, la position sera définie par le trajet

    const t = setTimeout(() => {
      setPosition(fallbackPos)
      setRealGpsPosition(fallbackPos)
    }, 500)

    return () => clearTimeout(t)
  }, [pos, virtualRouteActive, fallbackPos, setPosition, setRealGpsPosition])

  return {
    pos,
    realGpsPos,
    fallbackPos,
  }
}