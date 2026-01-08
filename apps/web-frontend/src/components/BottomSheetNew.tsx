import React, { useRef } from 'react'
import { distanceMeters } from '../utils/distance'
import { SHEET_HEIGHTS } from '../config/constants'
import type { MenuTab } from './BottomMenu'

function GuidePlaceholder({ title }: { title?: string }) {
  const hue = title ? title.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 200
  return (
    <div
      style={{
        width: 70,
        height: 70,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        background: `linear-gradient(135deg, hsl(${hue}, 70%, 60%) 0%, hsl(${hue + 30}, 60%, 50%) 100%)`,
      }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
  )
}

type Level = 'hidden' | 'peek' | 'mid' | 'full'

type Props = {
  level: Level
  setLevel: (v: Level) => void
  query: string
  items: any[]
  speak: (text?: string) => void
  pos: { lat: number; lng: number } | null
  mode: 'ambience' | 'results'
  activeTab: MenuTab
  menuVisible?: boolean // Si false, le panneau est en bas (bottom: 0), sinon au-dessus du menu (bottom: 64px)
  guideMode?: boolean
  guideTitle?: string
  guideSubtitle?: string
  guideImage?: string
  guideText?: string
  onPrev?: () => void
  onNext?: () => void
  onPlayPause?: () => void
  playing?: boolean
}

export function BottomSheetNew({
  level,
  setLevel,
  query,
  items,
  speak,
  pos,
  mode,
  activeTab,
  menuVisible = true, // Par défaut, le menu est visible
  guideMode,
  guideTitle,
  guideSubtitle,
  guideImage: _guideImage,
  guideText,
  onPrev,
  onNext,
  onPlayPause,
  playing,
}: Props) {
  if (level === 'hidden') return null

  const heights: Record<Level, string> = {
    hidden: '0vh',
    peek: `${SHEET_HEIGHTS.peek}vh`,
    mid: `${SHEET_HEIGHTS.mid}vh`,
    full: `${SHEET_HEIGHTS.full}vh`,
  }
  const height = heights[level]
  // Si le menu n'est pas visible (recherche), le panneau est en bas (bottom: 0)
  // Sinon, il est au-dessus du menu (bottom: 64px)
  const bottom = menuVisible ? 64 : 0

  const startYRef = useRef<number | null>(null)
  const startLevelRef = useRef<Level>(level)
  const sheetRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  const order: Level[] = ['peek', 'mid', 'full']

  const pickLevel = (delta: number, current: Level): Level => {
    const idx = order.indexOf(current)
    if (delta < -60 && idx < order.length - 1) return order[idx + 1]
    if (delta > 60 && idx > 0) return order[idx - 1]
    return current
  }

  const handlePointerEnd = (clientY: number | null) => {
    if (clientY === null || startYRef.current === null) return
    const delta = startYRef.current - clientY
    const target = pickLevel(delta, startLevelRef.current)
    setLevel(target)
    startYRef.current = null
    isDraggingRef.current = false
    if (sheetRef.current) {
      sheetRef.current.style.transform = ''
    }
  }

  const handlePointerDown = (e: React.PointerEvent | React.TouchEvent) => {
    const clientY =
      (e as any).clientY ??
      (e as React.TouchEvent).touches?.[0]?.clientY ??
      (e as React.TouchEvent).changedTouches?.[0]?.clientY ??
      null
    if (clientY === null) return
    startYRef.current = clientY
    startLevelRef.current = level
    isDraggingRef.current = true

    const move = (ev: any) => {
      if (!isDraggingRef.current) return
      const y = ev.clientY ?? ev.touches?.[0]?.clientY ?? ev.changedTouches?.[0]?.clientY ?? null
      if (y === null || startYRef.current === null) return

      const delta = startYRef.current - y
      if (sheetRef.current) {
        // Visual feedback during drag
        const resistance = Math.sign(delta) * Math.min(Math.abs(delta) * 0.3, 50)
        sheetRef.current.style.transform = `translateY(${-resistance}px)`
      }
    }

    const up = (ev: any) => {
      const y = ev.clientY ?? ev.touches?.[0]?.clientY ?? ev.changedTouches?.[0]?.clientY ?? null
      handlePointerEnd(y)

      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('touchmove', move)
    window.addEventListener('touchend', up)
  }

  const cycle = () => {
    setLevel(level === 'peek' ? 'mid' : level === 'mid' ? 'full' : 'peek')
  }

  const sorted = items
    .slice()
    .map((p: any) => ({
      ...p,
      dist: pos ? Math.round(distanceMeters(pos.lat, pos.lng, p.lat, p.lng)) : null,
    }))
    .sort((a: any, b: any) => (a.dist || 0) - (b.dist || 0))

  const featured = sorted.slice(0, 5)

  // Title based on active tab or search query
  const tabTitles: Record<MenuTab, string> = {
    discover: 'Découvrir',
    saved: 'Enregistrés',
    contribute: 'Contribuer',
  }
  // Si on a une query (recherche), l'utiliser, sinon le titre du tab
  const title = query && query !== 'Découvrir' ? query : tabTitles[activeTab]

  return (
    <div
      id="bottom-sheet"
      ref={sheetRef}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom,
        height,
        background: '#f8fafc',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 -12px 30px rgba(15,23,42,0.08)',
        zIndex: 99998,
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        color: '#0f172a',
      }}
    >
      {/* Drag handle */}
      <div
        id="sheet-drag-handle"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #e2e8f0',
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
        onPointerDown={handlePointerDown as any}
        onTouchStart={handlePointerDown as any}
      >
        <div
          onClick={cycle}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 48,
              height: 4,
              borderRadius: 999,
              background: '#9ca3af',
              margin: '0 auto',
            }}
          />
        </div>
        <button
          id="sheet-close-button"
          onClick={() => setLevel('hidden')}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            cursor: 'pointer',
          }}
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div
        id="sheet-content"
        style={{
          padding: '8px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflow: 'hidden',
          flex: 1,
        }}
      >
        <div
          id="sheet-title"
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: '#0f172a',
          }}
        >
          {title}
        </div>

        {guideMode && (
          <div
            id="guide-mode-panel"
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 12,
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <GuidePlaceholder title={guideTitle} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{guideTitle || 'Visite guidée'}</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>{guideSubtitle || 'Audio guide en cours'}</div>
              </div>
            </div>
            {guideText && (level === 'mid' || level === 'full') && (
              <div
                style={{
                  color: '#334155',
                  fontSize: 14,
                  lineHeight: 1.5,
                  paddingTop: 8,
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                {guideText}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                justifyContent: 'center',
                paddingTop: 4,
              }}
            >
              <button
                id="guide-prev-button"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  border: 'none',
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: 0.8,
                }}
                onClick={onPrev}
                aria-label="Précédent"
              >
                ⏮
              </button>
              <button
                id="guide-play-pause-button"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  border: 'none',
                  fontSize: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: playing ? '#ef4444' : '#22c55e',
                  color: '#fff',
                }}
                onClick={onPlayPause}
                aria-label="Play/Pause"
              >
                {playing ? '⏸' : '▶️'}
              </button>
              <button
                id="guide-next-button"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  border: 'none',
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: 0.8,
                }}
                onClick={onNext}
                aria-label="Suivant"
              >
                ⏭
              </button>
            </div>
          </div>
        )}

        {mode === 'ambience' && !guideMode && (
          <div
            id="ambience-actions"
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Suggestions à venir…</div>
          </div>
        )}

        {mode === 'results' && level === 'peek' && (
          <div
            id="results-peek"
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {featured.map((p: any) => (
              <button
                key={p.id}
                id={`poi-chip-${p.id}`}
                style={{
                  padding: '8px 10px',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  background: '#f5f7fb',
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {mode === 'results' && (level === 'mid' || level === 'full') && (
          <div
            id="results-list"
            style={{
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              paddingBottom: 20,
              maxHeight: '100%',
            }}
          >
            {sorted.map((p: any) => (
              <div
                key={p.id}
                id={`poi-card-${p.id}`}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  background: '#f5f7fb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    height: 90,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #e2e8f0, #f8fafc)',
                    border: '1px solid #e2e8f0',
                  }}
                />
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: '#9ca3af', fontSize: 14 }}>{p.shortDescription}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Durée estimée : ~15 min</div>
                {p.dist !== null && <div style={{ fontSize: 12, color: '#6b7280' }}>{p.dist} m</div>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    id={`poi-tts-${p.id}`}
                    onClick={() => speak(p.ttsText)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    Lire (TTS)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
