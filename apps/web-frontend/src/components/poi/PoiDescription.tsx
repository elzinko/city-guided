import React from 'react'

type PoiDescriptionProps = {
  id?: string
  shortDescription?: string
  longDescription?: string
}

export function PoiDescription({ id, shortDescription, longDescription }: PoiDescriptionProps) {
  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Description courte */}
      {shortDescription && (
        <p
          id={id ? `${id}-short` : undefined}
          style={{
            margin: 0,
            color: '#475569',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {shortDescription}
        </p>
      )}

      {/* Description longue (si disponible) */}
      {longDescription && (
        <div
          id={id ? `${id}-long` : undefined}
          style={{
            padding: 12,
            background: '#f8fafc',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#334155',
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            {longDescription}
          </p>
        </div>
      )}
    </div>
  )
}
