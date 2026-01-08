import React from 'react'

type Props = {
  poiName: string
  poiImage?: string
  currentText: string
  onPrev?: () => void
  onNext?: () => void
  onPlayPause?: () => void
  playing?: boolean
}

const controlButtonClass =
  'w-12 h-12 rounded-full border-none bg-slate-800 text-white text-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-lg'

export function NavigationPanel({
  poiName,
  poiImage,
  currentText,
  onPrev,
  onNext,
  onPlayPause,
  playing,
}: Props) {
  return (
    <div
      id="navigation-panel"
      className="fixed bottom-0 left-0 right-0 z-[99997] bg-slate-900/98 backdrop-blur-sm border-t border-slate-700 shadow-2xl"
      style={{ maxHeight: '35vh' }}
    >
      <div className="p-4 flex flex-col gap-3 overflow-hidden">
        {/* Image */}
        {poiImage && (
          <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-800">
            <img
              src={poiImage}
              alt={poiName}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Current text being read */}
        <div className="max-h-20 overflow-y-auto text-slate-200 text-sm leading-relaxed">
          {currentText || 'En attente du prochain point d\'intérêt...'}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-700">
          <button
            id="nav-prev-button"
            className={`${controlButtonClass} opacity-80`}
            onClick={onPrev}
            disabled={!onPrev}
            aria-label="Précédent"
          >
            ⏮
          </button>
          <button
            id="nav-play-pause-button"
            className={`w-14 h-14 rounded-full border-none text-2xl flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xl ${
              playing ? 'bg-red-500' : 'bg-green-500'
            }`}
            onClick={onPlayPause}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? '⏸' : '▶️'}
          </button>
          <button
            id="nav-next-button"
            className={`${controlButtonClass} opacity-80`}
            onClick={onNext}
            disabled={!onNext}
            aria-label="Suivant"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  )
}
