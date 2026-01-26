import React from 'react'

export type RouteFormProps = {
  name: string
  onNameChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  onSave: () => void
  onExport: () => void
  isSaving: boolean
  canExport: boolean
}

/**
 * Formulaire d'édition d'un trajet (nom, description, boutons)
 */
export function RouteForm({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  onSave,
  onExport,
  isSaving,
  canExport,
}: RouteFormProps) {
  return (
    <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
      {/* Champ Nom */}
      <div style={{ marginBottom: 10 }}>
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            color: '#64748b',
            marginBottom: 4,
          }}
        >
          Nom *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex: Boucle centre-ville"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            fontSize: 14,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Champ Description */}
      <div style={{ marginBottom: 10 }}>
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            color: '#64748b',
            marginBottom: 4,
          }}
        >
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Description..."
          rows={2}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            fontSize: 14,
            resize: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Boutons d'action */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onSave}
          disabled={isSaving}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 8,
            border: 'none',
            background: '#22c55e',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'opacity 0.15s ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {isSaving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          onClick={onExport}
          disabled={!canExport}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: !canExport ? '#cbd5e1' : '#64748b',
            cursor: !canExport ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease',
          }}
          title="Exporter GPX"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default RouteForm
