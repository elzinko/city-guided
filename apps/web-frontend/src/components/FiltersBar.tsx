import React from 'react'

type Props = {
  category: string | null
  setCategory: (v: string | null) => void
  setQuery: (v: string) => void
  setSheetLevel: (v: 'hidden' | 'peek' | 'mid' | 'full') => void
  setSearchReady?: (v: boolean) => void
}

export function FiltersBar({ category, setCategory, setQuery, setSheetLevel, setSearchReady }: Props) {
  const filters = ['Monuments', 'Musees', 'Art', 'Insolite', 'Autre']
  return (
    <div
      style={{
        position: 'absolute',
        top: 74,
        left: 12,
        right: 12,
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        padding: '6px 0',
        zIndex: 9,
      }}
    >
      {filters.map((c) => (
        <button
          key={c}
          onClick={() => {
            setCategory(category === c ? null : c)
            setQuery(c)
            if (setSearchReady) setSearchReady(true)
            setSheetLevel('mid')
          }}
          style={{
            padding: '10px 14px',
            borderRadius: 999,
            border: category === c ? '1px solid #22c55e' : '1px solid #1f2937',
            background: category === c ? 'rgba(34,197,94,0.2)' : 'rgba(15,23,42,0.9)',
            color: '#e5e7eb',
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            whiteSpace: 'nowrap',
          }}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
