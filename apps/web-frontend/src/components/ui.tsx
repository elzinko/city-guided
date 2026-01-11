import React from 'react'

type CardProps = {
  id?: string
  children: React.ReactNode
  style?: React.CSSProperties
}

export function Card({ id, children, style }: CardProps) {
  return (
    <div
      id={id}
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
        padding: '5px 8px 5px 10px', // Moins de padding à gauche pour rapprocher l'icône
        borderRadius: 999, // Bords totalement arrondis
        border: active ? '1px solid #16a34a' : '1px solid #d4d9e1',
        background: active ? '#e3f6eb' : '#eef2f7',
        color: active ? '#0f5132' : '#0f172a',
        fontSize: 13,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {children}
    </button>
  )
}

export function Toggle({ id, checked, onChange, label }: any) {
  return (
    <label
      id={id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        cursor: 'pointer',
        color: 'inherit',
      }}
    >
      <div
        onClick={(e) => {
          e.preventDefault()
          onChange(!checked)
        }}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? '#22c55e' : '#475569',
          position: 'relative',
          transition: 'background 0.2s ease',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: 8,
            background: '#fff',
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </div>
      <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
    </label>
  )
}

type BadgeProps = {
  id?: string
  children: React.ReactNode
}

export function Badge({ id, children }: BadgeProps) {
  return (
    <span
      id={id}
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
