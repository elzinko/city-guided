import { create } from 'zustand'

export interface RoutePoint {
  lat: number
  lng: number
  label?: string
  speedKmh?: number
  durationMs?: number
}

export interface RouteOption {
  id: string
  name: string
  description?: string
  loadFn: () => Promise<any[]> | any[]
}

const DEFAULT_DRIVE_PATH: RoutePoint[] = [
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

const ROUTE_OPTIONS: RouteOption[] = [
  {
    id: 'default',
    name: 'Boucle Fontainebleau',
    description: 'Route par défaut autour du château',
    loadFn: () => Promise.resolve(DEFAULT_DRIVE_PATH),
  },
]

interface SimulationState {
  // État de simulation
  isSimulating: boolean
  simPaused: boolean
  simStep: number
  simPath: RoutePoint[]
  virtualRouteActive: boolean
  speedFactor: number
  selectedRouteId: string
  routeOptions: RouteOption[]
  routeStatus: string
  osrmError: string | null
  godMode: boolean
  centerRadiusMeters: number

  // Actions
  setIsSimulating: (isSimulating: boolean) => void
  setSimPaused: (simPaused: boolean) => void
  setSimStep: (simStep: number) => void
  setSimPath: (simPath: RoutePoint[]) => void
  setVirtualRouteActive: (virtualRouteActive: boolean) => void
  setSpeedFactor: (speedFactor: number) => void
  setSelectedRouteId: (selectedRouteId: string) => void
  setRouteStatus: (routeStatus: string) => void
  setOsrmError: (osrmError: string | null) => void
  setGodMode: (godMode: boolean) => void
  setCenterRadiusMeters: (centerRadiusMeters: number) => void

  // Méthodes de contrôle
  startSimulation: () => void
  stopSimulation: () => void
  pauseSimulation: () => void
  resumeSimulation: () => void
  nextStep: () => void
  prevStep: () => void
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  // État initial
  isSimulating: false,
  simPaused: false,
  simStep: 0,
  simPath: DEFAULT_DRIVE_PATH,
  virtualRouteActive: false,
  speedFactor: 10,
  selectedRouteId: 'default',
  routeOptions: ROUTE_OPTIONS,
  routeStatus: 'Trajet par défaut prêt',
  osrmError: null,
  godMode: false,
  centerRadiusMeters: 500,

  // Setters
  setIsSimulating: (isSimulating: boolean) => set({ isSimulating }),
  setSimPaused: (simPaused: boolean) => set({ simPaused }),
  setSimStep: (simStep: number) => set({ simStep }),
  setSimPath: (simPath: RoutePoint[]) => set({ simPath }),
  setVirtualRouteActive: (virtualRouteActive: boolean) => set({ virtualRouteActive }),
  setSpeedFactor: (speedFactor: number) => set({ speedFactor }),
  setSelectedRouteId: (selectedRouteId: string) => set({ selectedRouteId }),
  setRouteStatus: (routeStatus: string) => set({ routeStatus }),
  setOsrmError: (osrmError: string | null) => set({ osrmError }),
  setGodMode: (godMode: boolean) => set({ godMode }),
  setCenterRadiusMeters: (centerRadiusMeters: number) => set({ centerRadiusMeters }),

  // Méthodes de contrôle
  startSimulation: () => {
    set({
      isSimulating: true,
      simPaused: false,
      simStep: 0,
      routeStatus: 'Simulation démarrée'
    })
    console.log('✅ Simulation started')
  },

  stopSimulation: () => {
    set({
      isSimulating: false,
      simPaused: false,
      routeStatus: 'Simulation arrêtée'
    })
    console.log('✅ Simulation stopped')
  },

  pauseSimulation: () => {
    set({
      simPaused: true,
      routeStatus: 'Simulation en pause'
    })
    console.log('✅ Simulation paused')
  },

  resumeSimulation: () => {
    set({
      simPaused: false,
      routeStatus: 'Simulation reprise'
    })
    console.log('✅ Simulation resumed')
  },

  nextStep: () => {
    const { simStep, simPath } = get()
    if (simStep < simPath.length - 1) {
      set({ simStep: simStep + 1 })
      console.log('✅ Next step:', simStep + 1)
    }
  },

  prevStep: () => {
    const { simStep } = get()
    if (simStep > 0) {
      set({ simStep: simStep - 1 })
      console.log('✅ Previous step:', simStep - 1)
    }
  },
}))