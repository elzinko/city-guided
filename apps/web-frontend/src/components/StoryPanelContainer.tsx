import React from 'react'
import { StoryPanel } from './StoryPanel'
import type { PoiWithStory } from '../types/story'

type StoryPanelContainerProps = {
  id?: string
  visible: boolean
  devBlockHeight: number
  activeStory: { poiId: string; segmentIdx: number } | null
  pois: PoiWithStory[]
  getStorySegments: (poi: PoiWithStory) => string[]
  speak: (text: string) => void
  stopSpeech: () => void
  pauseSpeech?: () => void
  resumeSpeech?: () => void
  onStopNavigation: () => void
  onSegmentChange: (poiId: string, segmentIdx: number) => void
}

/**
 * Conteneur pour le StoryPanel en mode navigation
 * Positionné au-dessus du DevControlBlock
 */
export function StoryPanelContainer({
  id = 'story-panel-container',
  visible,
  devBlockHeight,
  activeStory,
  pois,
  getStorySegments,
  speak,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  onStopNavigation,
  onSegmentChange,
}: StoryPanelContainerProps) {
  if (!visible || !activeStory) {
    return null
  }

  return (
    <div
      id={id}
      style={{
        position: 'fixed',
        bottom: devBlockHeight + 8, // Juste au-dessus du dev-control-bar avec petit espace
        left: 12,
        right: 12,
        zIndex: 11000,
        pointerEvents: 'none',
      }}
    >
      <div id={`${id}-wrapper`} style={{ pointerEvents: 'auto' }}>
        <StoryPanel
          id="story-panel"
          activeStory={activeStory}
          pois={pois}
          getStorySegments={getStorySegments}
          speak={speak}
          stopSpeech={stopSpeech}
          pauseSpeech={pauseSpeech}
          resumeSpeech={resumeSpeech}
          onStopNavigation={onStopNavigation}
          onSegmentChange={onSegmentChange}
        />
      </div>
    </div>
  )
}
