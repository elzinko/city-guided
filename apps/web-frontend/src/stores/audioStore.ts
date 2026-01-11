import { create } from 'zustand'

export interface Story {
  poiId: string
  segmentIdx: number
}

interface AudioState {
  // État audio
  audioGuideActive: boolean
  audioPaused: boolean
  autoTts: boolean
  activeStory: Story | null
  visitCounts: Record<string, number>
  navigationStartTime: number | null
  navigationElapsed: number
  navigationPois: any[]
  visitedPoiIds: Set<string>
  currentNavigationPoiIndex: number

  // Fonctions SpeechSynthesis (optionnelles)
  speak?: (text: string) => void
  stopSpeech?: () => void
  pauseSpeech?: () => void
  resumeSpeech?: () => void

  // Actions
  setAudioGuideActive: (audioGuideActive: boolean) => void
  setAudioPaused: (audioPaused: boolean) => void
  setAutoTts: (autoTts: boolean) => void
  setActiveStory: (activeStory: Story | null) => void
  incrementVisitCount: (poiId: string) => void
  setNavigationStartTime: (navigationStartTime: number | null) => void
  setNavigationElapsed: (navigationElapsed: number) => void
  setNavigationPois: (navigationPois: any[]) => void
  setVisitedPoiIds: (visitedPoiIds: Set<string>) => void
  addVisitedPoi: (poiId: string) => void
  setCurrentNavigationPoiIndex: (currentNavigationPoiIndex: number) => void
}

export const useAudioStore = create<AudioState>((set, get) => ({
  // État initial
  audioGuideActive: false,
  audioPaused: true,
  autoTts: false,
  activeStory: null,
  visitCounts: {},
  navigationStartTime: null,
  navigationElapsed: 0,
  navigationPois: [],
  visitedPoiIds: new Set<string>(),
  currentNavigationPoiIndex: -1,

  // Fonctions SpeechSynthesis (seront définies plus tard)
  speak: undefined,
  stopSpeech: undefined,
  pauseSpeech: undefined,
  resumeSpeech: undefined,

  // Actions
  setAudioGuideActive: (audioGuideActive: boolean) => set({ audioGuideActive }),
  setAudioPaused: (audioPaused: boolean) => set({ audioPaused }),
  setAutoTts: (autoTts: boolean) => set({ autoTts }),
  setActiveStory: (activeStory: Story | null) => set({ activeStory }),

  incrementVisitCount: (poiId: string) => {
    const { visitCounts } = get()
    const newVisitCounts = { ...visitCounts }
    newVisitCounts[poiId] = (newVisitCounts[poiId] || 0) + 1
    set({ visitCounts: newVisitCounts })
  },

  setNavigationStartTime: (navigationStartTime: number | null) => set({ navigationStartTime }),
  setNavigationElapsed: (navigationElapsed: number) => set({ navigationElapsed }),
  setNavigationPois: (navigationPois: any[]) => set({ navigationPois }),

  setVisitedPoiIds: (visitedPoiIds: Set<string>) => set({ visitedPoiIds }),

  addVisitedPoi: (poiId: string) => {
    const { visitedPoiIds } = get()
    const newVisitedPoiIds = new Set(visitedPoiIds)
    newVisitedPoiIds.add(poiId)
    set({ visitedPoiIds: newVisitedPoiIds })
  },

  setCurrentNavigationPoiIndex: (currentNavigationPoiIndex: number) => set({ currentNavigationPoiIndex }),
}))