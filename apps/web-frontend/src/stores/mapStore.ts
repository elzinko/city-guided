import { create } from 'zustand'

export interface Position {
  lat: number
  lng: number
}

export interface Poi {
  id: string
  name: string
  lat: number
  lng: number
  radiusMeters: number
  category: string
  shortDescription: string
  ttsText?: string
  storySegments?: string[]
  distanceMeters?: number
}

export const fallbackPos = { lat: 48.3976, lng: 2.7855 } // By/Thomery

interface MapState {
  // État de la carte
  pos: Position | null
  realGpsPos: Position | null
  fallbackPos: Position
  mapCenter: Position
  mapAlreadyCentered: boolean
  userHasPanned: boolean
  zoomLevel: number
  INITIAL_ZOOM: number
  mapMoveVersion: number
  pois: Poi[]
  visiblePois: Poi[]
  loadingPois: boolean

  // Actions
  setPosition: (pos: Position | null) => void
  setRealGpsPosition: (realGpsPos: Position | null) => void
  setMapCenter: (mapCenter: Position | null) => void
  setMapAlreadyCentered: (mapAlreadyCentered: boolean) => void
  setUserHasPanned: (userHasPanned: boolean) => void
  setZoomLevel: (zoomLevel: number) => void
  setMapMoveVersion: (updater: (v: number) => number) => void
  incrementMapMoveVersion: () => void
  setPois: (pois: Poi[]) => void
  setVisiblePois: (visiblePois: Poi[]) => void
  setLoadingPois: (loadingPois: boolean) => void
}

export const useMapStore = create<MapState>((set, get) => ({
  // État initial
  pos: null,
  realGpsPos: null,
  fallbackPos,
  mapCenter: fallbackPos,
  mapAlreadyCentered: false,
  userHasPanned: false,
  zoomLevel: 14,
  INITIAL_ZOOM: 14,
  mapMoveVersion: 0,
  pois: [],
  visiblePois: [],
  loadingPois: false,

  // Actions
  setPosition: (pos: Position | null) => set({ pos }),
  setRealGpsPosition: (realGpsPos: Position | null) => set({ realGpsPos }),
  setMapCenter: (mapCenter: Position | null) => {
    if (mapCenter) set({ mapCenter })
  },
  setMapAlreadyCentered: (mapAlreadyCentered: boolean) => set({ mapAlreadyCentered }),
  setUserHasPanned: (userHasPanned: boolean) => set({ userHasPanned }),
  setZoomLevel: (zoomLevel: number) => set({ zoomLevel }),
  setMapMoveVersion: (updater: (v: number) => number) => {
    const { mapMoveVersion } = get()
    set({ mapMoveVersion: updater(mapMoveVersion) })
  },
  incrementMapMoveVersion: () => {
    const { mapMoveVersion } = get()
    set({ mapMoveVersion: mapMoveVersion + 1 })
  },
  setPois: (pois: Poi[]) => set({ pois }),
  setVisiblePois: (visiblePois: Poi[]) => set({ visiblePois }),
  setLoadingPois: (loadingPois: boolean) => set({ loadingPois }),
}))