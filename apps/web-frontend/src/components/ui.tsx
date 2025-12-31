import React from 'react'

export function Card({ children, style }: any) {
  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #1f2937',
        borderRadius: 16,
        padding: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Chip({ children, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 12px',
        borderRadius: 999,
        border: active ? '1px solid #22c55e' : '1px solid #1f2937',
        background: active ? 'rgba(34,197,94,0.12)' : '#0b1220',
        color: active ? '#bbf7d0' : '#e5e7eb',
      }}
    >
      {children}
    </button>
  )
}

export function Toggle({ checked, onChange, label }: any) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  )
}

export function Badge({ children }: any) {
  return (
    <span
      style={{
        padding: '6px 10px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        fontSize: 12,
      }}
    >
      {children}
    </span>
  )
}

export const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #22c55e',
  background: 'linear-gradient(120deg, #22c55e, #16a34a)',
  color: '#f8fafc',
  fontWeight: 700,
}

export const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
  fontWeight: 600,
}

export const ghostButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #1f2937',
  background: 'transparent',
  color: '#e5e7eb',
}
