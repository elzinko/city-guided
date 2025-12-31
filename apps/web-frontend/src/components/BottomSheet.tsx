import React from 'react'
import { distanceMeters } from '../utils/distance'
import { ghostButtonStyle } from './ui'
import { SHEET_HEIGHTS } from '../config/constants'

type Level = 'hidden' | 'peek' | 'mid' | 'full'

type Props = {
  level: Level
  setLevel: (v: Level) => void
  query: string
  items: any[]
  speak: (text?: string) => void
  pos: { lat: number; lng: number } | null
  mode: 'ambience' | 'results'
  actions?: { label: string; icon?: string; onClick?: () => void }[]
}

export function BottomSheet({ level, setLevel, query, items, speak, pos, mode, actions = [] }: Props) {
  if (level === 'hidden') return null
  const heights: any = {
    peek: `${SHEET_HEIGHTS.peek}vh`,
    mid: `${SHEET_HEIGHTS.mid}vh`,
    full: `${SHEET_HEIGHTS.full}vh`,
  }
  const height = heights[level] || `${SHEET_HEIGHTS.peek}vh`
  const startYRef = React.useRef<number | null>(null)
  const startLevelRef = React.useRef<Level>(level)
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
    const move = (ev: any) => {
      const y =
        ev.clientY ??
        ev.touches?.[0]?.clientY ??
        ev.changedTouches?.[0]?.clientY ??
        null
      if (y === null) return
    }
    const up = (ev: any) => {
      const y =
        ev.clientY ??
        ev.touches?.[0]?.clientY ??
        ev.changedTouches?.[0]?.clientY ??
        null
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

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height,
        background: '#0b1220',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        border: '1px solid #1f2937',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.45)',
        zIndex: 12050,
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.2s ease, transform 0.2s ease',
      }}
    >
      <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid #111827',
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
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <div style={{ width: 60, height: 4, borderRadius: 999, background: '#1f2937', margin: '0 auto' }} />
        </div>
        <button style={ghostButtonStyle} onClick={() => setLevel('hidden')}>
          ✕
        </button>
      </div>

      <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        <div style={{ fontWeight: 700 }}>{mode === 'results' ? query : 'Ambiance locale'}</div>

        {mode === 'ambience' && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {actions.map((a) => (
              <button
                key={a.label}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid #1f2937',
                  background: '#0f172a',
                  color: '#e5e7eb',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onClick={a.onClick}
              >
                <span>{a.icon || ''}</span> {a.label}
              </button>
            ))}
            {actions.length === 0 && (
              <div style={{ color: '#9ca3af', fontSize: 13 }}>Suggestions à venir…</div>
            )}
          </div>
        )}

        {mode === 'results' && level === 'peek' && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {featured.map((p: any) => (
              <button
                key={p.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 12,
                  border: '1px solid #1f2937',
                  background: '#0f172a',
                  color: '#e5e7eb',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        {mode === 'results' && (level === 'mid' || level === 'full') && (
          <div style={{ overflowY: 'auto', maxHeight: '100%', display: 'grid', gap: 10, paddingBottom: 20 }}>
            {sorted.map((p: any) => (
              <div
                key={p.id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid #1f2937',
                  background: '#0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    height: 90,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #1f2937, #0b1220)',
                    border: '1px solid #111827',
                  }}
                />
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: '#9ca3af' }}>{p.shortDescription}</div>
                {p.dist !== null && <div style={{ fontSize: 12, color: '#6b7280' }}>{p.dist} m</div>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button style={ghostButtonStyle} onClick={() => speak(p.ttsText)}>
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
