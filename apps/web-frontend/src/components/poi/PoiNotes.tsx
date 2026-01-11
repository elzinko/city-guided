import React from 'react'

type PoiNotesProps = {
  id?: string
  notes?: string
}

const DEFAULT_NOTES =
  "Ce point d'intérêt fait partie du circuit de découverte. Vous pouvez écouter la description audio en cliquant sur le bouton lecture ci-dessous."

export function PoiNotes({ id, notes }: PoiNotesProps) {
  return (
    <div
      id={id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        background: '#fefce8',
        borderRadius: 10,
        border: '1px solid #fef08a',
      }}
    >
      <div
        id={id ? `${id}-title` : undefined}
        style={{
          fontWeight: 600,
          fontSize: 13,
          color: '#854d0e',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>📝</span> Notes
      </div>
      <p
        id={id ? `${id}-content` : undefined}
        style={{ margin: 0, fontSize: 13, color: '#713f12', lineHeight: 1.5 }}
      >
        {notes || DEFAULT_NOTES}
      </p>
    </div>
  )
}
