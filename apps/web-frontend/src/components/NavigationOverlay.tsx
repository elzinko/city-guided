import React from 'react'
import { StepIndicator } from './StepIndicator'

type Props = {
  poiName: string
  totalDuration: number // en secondes
  currentTime: number // en secondes écoulées
  currentSegment?: number
  totalSegments?: number
}

export function NavigationOverlay({ poiName, totalDuration, currentTime, currentSegment, totalSegments }: Props) {
  const elapsed = Math.floor(currentTime)
  const remaining = Math.max(0, totalDuration - elapsed)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      id="navigation-overlay"
      className="fixed top-4 left-4 right-4 z-[99997] bg-slate-900/95 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-2xl px-4 py-3"
    >
      <div className="flex flex-col gap-2">
        {/* POI name and step indicator */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            <div className="font-bold text-white text-lg truncate">{poiName}</div>
          </div>
          {currentSegment !== undefined && totalSegments !== undefined && (
            <StepIndicator current={currentSegment + 1} total={totalSegments} label="Segment" />
          )}
        </div>

        {/* Time indicators */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <span>⏱️</span>
            <span>{formatTime(elapsed)}</span>
          </div>

          {/* Progress bar */}
          <div className="flex-1 mx-3 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(currentTime / totalDuration) * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span>{formatTime(remaining)}</span>
            <span>⏰</span>
          </div>
        </div>
      </div>
    </div>
  )
}
