import { useEffect, useRef } from 'react'
import { useSimulationStore, useMapStore } from '../stores'
import { distanceMeters } from '../utils/distance'

export function useSimulation() {
  const simulationStore = useSimulationStore()
  const mapStore = useMapStore()

  const interpolationTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Interpolation progressive entre deux points du trajet
  useEffect(() => {
    if (!simulationStore.isSimulating || simulationStore.simPaused || simulationStore.simStep >= simulationStore.simPath.length - 1) {
      if (interpolationTimerRef.current) clearInterval(interpolationTimerRef.current)
      return
    }

    const cur = simulationStore.simPath[simulationStore.simStep] as any
    const next = simulationStore.simPath[simulationStore.simStep + 1] as any
    if (!cur || !next) return

    // Calculer la distance et la durée de base pour cette étape
    const speedKmh = next?.speedKmh ?? cur?.speedKmh ?? 50
    const speedMs = Math.max(5, speedKmh / 3.6)
    const dist = distanceMeters(cur.lat, cur.lng, next.lat, next.lng)
    const baseDelay = (dist / speedMs) * 1000
    const delayRaw = next?.durationMs ?? baseDelay

    // Utiliser une interpolation basée sur le temps écoulé
    const startTime = Date.now()
    let accumulatedProgress = 0 // Progression accumulée (0 à 1)
    let lastUpdate = startTime

    const updateInterval = 16 // ~60 FPS
    interpolationTimerRef.current = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastUpdate
      lastUpdate = now

      // Calculer la progression basée sur le temps et le speedFactor actuel
      const currentSpeedFactor = Math.max(0.25, simulationStore.speedFactor)
      const totalDuration = Math.max(300, Math.min(8000, delayRaw / currentSpeedFactor))
      const progressIncrement = elapsed / totalDuration
      accumulatedProgress = Math.min(1, accumulatedProgress + progressIncrement)

      // Interpolation linéaire entre les deux points
      const interpolatedLat = cur.lat + (next.lat - cur.lat) * accumulatedProgress
      const interpolatedLng = cur.lng + (next.lng - cur.lng) * accumulatedProgress
      mapStore.setPosition({ lat: interpolatedLat, lng: interpolatedLng })

      // Quand on arrive au point suivant, passer à l'étape suivante
      if (accumulatedProgress >= 1) {
        if (interpolationTimerRef.current) clearInterval(interpolationTimerRef.current)
        simulationStore.setSimStep(simulationStore.simStep + 1)
      }
    }, updateInterval) as any

    return () => {
      if (interpolationTimerRef.current) clearInterval(interpolationTimerRef.current)
    }
  }, [simulationStore.isSimulating, simulationStore.simPaused, simulationStore.simStep, simulationStore.simPath, simulationStore.speedFactor, mapStore])

  // Stop the simulation automatically when reaching the end of the path
  useEffect(() => {
    if (!simulationStore.isSimulating || simulationStore.simPaused) return
    if (!simulationStore.simPath.length) return
    if (simulationStore.simStep < simulationStore.simPath.length - 1) return

    console.log('[SIMULATION] End of path reached, stopping...')
    simulationStore.stopSimulation()
  }, [simulationStore.isSimulating, simulationStore.simPaused, simulationStore.simStep, simulationStore.simPath.length, simulationStore])

  return {
    // Exposer les méthodes du store
    startSimulation: simulationStore.startSimulation,
    stopSimulation: simulationStore.stopSimulation,
    pauseSimulation: simulationStore.pauseSimulation,
    resumeSimulation: simulationStore.resumeSimulation,
    nextStep: simulationStore.nextStep,
    prevStep: simulationStore.prevStep,
  }
}