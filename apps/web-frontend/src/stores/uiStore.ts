import { create } from 'zustand'

export type MenuTab = 'discover' | 'saved' | 'contribute'
export type SheetLevel = 'hidden' | 'peek' | 'mid' | 'full' | 'searchResults' | 'poiFromSearch' | 'poiFromMap'

interface UiState {
  // État UI
  activeTab: MenuTab
  discoverMode: boolean
  guideMode: boolean
  sheetLevel: SheetLevel
  previousDiscoverLevel: SheetLevel | null
  sheetHeightPx: number | null
  adminLevel: 'hidden' | 'peek' | 'mid' | 'full'
  devPanelOpen: boolean
  devBlockHeight: number
  searchActive: boolean
  searchReady: boolean
  query: string
  lastQuery: string
  selectedPoi: any

  // Actions
  setActiveTab: (activeTab: MenuTab) => void
  setDiscoverMode: (discoverMode: boolean) => void
  setGuideMode: (guideMode: boolean) => void
  setSheetLevel: (sheetLevel: SheetLevel) => void
  setPreviousDiscoverLevel: (previousDiscoverLevel: SheetLevel | null) => void
  setSheetHeightPx: (sheetHeightPx: number | null) => void
  setAdminLevel: (adminLevel: 'hidden' | 'peek' | 'mid' | 'full') => void
  setDevPanelOpen: (devPanelOpen: boolean) => void
  setDevBlockHeight: (devBlockHeight: number) => void
  setSearchActive: (searchActive: boolean) => void
  setSearchReady: (searchReady: boolean) => void
  setQuery: (query: string) => void
  setLastQuery: (lastQuery: string) => void
  setSelectedPoi: (selectedPoi: any) => void
}

export const useUiStore = create<UiState>((set) => ({
  // État initial
  activeTab: 'discover',
  discoverMode: false,
  guideMode: false,
  sheetLevel: 'hidden',
  previousDiscoverLevel: null,
  sheetHeightPx: null,
  adminLevel: 'hidden',
  devPanelOpen: false,
  devBlockHeight: 0,
  searchActive: false,
  searchReady: false,
  query: '',
  lastQuery: '',
  selectedPoi: null,

  // Actions
  setActiveTab: (activeTab: MenuTab) => set({ activeTab }),
  setDiscoverMode: (discoverMode: boolean) => set({ discoverMode }),
  setGuideMode: (guideMode: boolean) => set({ guideMode }),
  setSheetLevel: (sheetLevel: SheetLevel) => set({ sheetLevel }),
  setPreviousDiscoverLevel: (previousDiscoverLevel: SheetLevel | null) => set({ previousDiscoverLevel }),
  setSheetHeightPx: (sheetHeightPx: number | null) => set({ sheetHeightPx }),
  setAdminLevel: (adminLevel: 'hidden' | 'peek' | 'mid' | 'full') => set({ adminLevel }),
  setDevPanelOpen: (devPanelOpen: boolean) => set({ devPanelOpen }),
  setDevBlockHeight: (devBlockHeight: number) => set({ devBlockHeight }),
  setSearchActive: (searchActive: boolean) => set({ searchActive }),
  setSearchReady: (searchReady: boolean) => set({ searchReady }),
  setQuery: (query: string) => set({ query }),
  setLastQuery: (lastQuery: string) => set({ lastQuery }),
  setSelectedPoi: (selectedPoi: any) => set({ selectedPoi }),
}))