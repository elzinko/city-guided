import React from 'react'

export function Card({ children, style }: any) {
  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 14,
        boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06)',
        color: '#0f172a',
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
        border: active ? '1px solid #16a34a' : '1px solid #d4d9e1',
        background: active ? '#e3f6eb' : '#eef2f7',
        color: active ? '#0f5132' : '#0f172a',
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
        background: '#eef2f7',
        border: '1px solid #e2e8f0',
        fontSize: 12,
        color: '#0f172a',
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
  border: '1px solid #d4d9e1',
  background: '#f5f7fb',
  color: '#0f172a',
  fontWeight: 600,
}

export const ghostButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #d4d9e1',
  background: '#fdfefe',
  color: '#0f172a',
}
