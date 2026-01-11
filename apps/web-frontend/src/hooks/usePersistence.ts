import { useEffect, useRef } from 'react'
import { useSimulationStore, useAudioStore, useUiStore } from '../stores'

const DEV_OPTIONS_KEY = 'cityguided_dev_options'

export function usePersistence() {
  const simulationStore = useSimulationStore()
  const audioStore = useAudioStore()
  const uiStore = useUiStore()

  const devOptionsLoadedRef = useRef(false)

  // Charger les options dev depuis localStorage au montage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem(DEV_OPTIONS_KEY)
      if (saved) {
        const options = JSON.parse(saved)
        if (typeof options.virtualRouteActive === 'boolean') simulationStore.setVirtualRouteActive(options.virtualRouteActive)
        if (typeof options.selectedRouteId === 'string') simulationStore.setSelectedRouteId(options.selectedRouteId)
        if (typeof options.speedFactor === 'number') simulationStore.setSpeedFactor(options.speedFactor)
        if (typeof options.audioPaused === 'boolean') audioStore.setAudioPaused(options.audioPaused)
        if (typeof options.godMode === 'boolean') simulationStore.setGodMode(options.godMode)
        if (typeof options.autoTts === 'boolean') audioStore.setAutoTts(options.autoTts)
        if (typeof options.devPanelOpen === 'boolean') uiStore.setDevPanelOpen(options.devPanelOpen)
      }
      // Vérifier si on revient de la page d'édition des routes (devPanel=open dans l'URL)
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('devPanel') === 'open') {
        uiStore.setDevPanelOpen(true)
        // Nettoyer l'URL sans recharger la page
        window.history.replaceState({}, '', window.location.pathname)
      }
    } catch (e) {
      console.warn('Failed to load dev options from localStorage:', e)
    }
    // Marquer le chargement comme terminé après un court délai pour laisser les setState s'appliquer
    setTimeout(() => { devOptionsLoadedRef.current = true }, 100)
  }, []) // Retirer les dépendances des stores pour éviter les boucles infinies

  // Sauvegarder les options dev dans localStorage quand elles changent
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Ne pas sauvegarder avant que le chargement initial soit terminé
    if (!devOptionsLoadedRef.current) return

    try {
      const options = {
        virtualRouteActive: simulationStore.virtualRouteActive,
        selectedRouteId: simulationStore.selectedRouteId,
        speedFactor: simulationStore.speedFactor,
        audioPaused: audioStore.audioPaused,
        godMode: simulationStore.godMode,
        autoTts: audioStore.autoTts,
        devPanelOpen: uiStore.devPanelOpen,
      }
      localStorage.setItem(DEV_OPTIONS_KEY, JSON.stringify(options))
    } catch (e) {
      console.warn('Failed to save dev options to localStorage:', e)
    }
  }, [
    simulationStore.virtualRouteActive,
    simulationStore.selectedRouteId,
    simulationStore.speedFactor,
    audioStore.audioPaused,
    simulationStore.godMode,
    audioStore.autoTts,
    uiStore.devPanelOpen,
  ])
}