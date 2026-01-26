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
  isReadOnly?: boolean
}

/**
 * Formulaire d'édition d'un trajet (nom, description, boutons)
 * Design compact pour mobile-first
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
  isReadOnly = false,
}: RouteFormProps) {
  return (
    <div id="route-form">
      {/* Badge lecture seule */}
      {isReadOnly && (
        <div
          id="route-form-readonly-badge"
          style={{
            marginBottom: 12,
            padding: '8px 12px',
            borderRadius: 8,
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            color: '#92400e',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Trajet importé (lecture seule)
        </div>
      )}

      {/* Champs sur une ligne pour mobile */}
      <div id="route-form-fields" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {/* Champ Nom */}
        <div id="route-form-name-field" style={{ flex: 2 }}>
          <label
            id="route-form-name-label"
            htmlFor="route-form-name-input"
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
              marginBottom: 4,
            }}
          >
            Nom {!isReadOnly && '*'}
          </label>
          <input
            id="route-form-name-input"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ex: Boucle centre-ville"
            disabled={isReadOnly}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 14,
              boxSizing: 'border-box',
              background: isReadOnly ? '#f8fafc' : '#ffffff',
              color: isReadOnly ? '#64748b' : '#0f172a',
            }}
          />
        </div>

        {/* Champ Description compact */}
        <div id="route-form-description-field" style={{ flex: 3 }}>
          <label
            id="route-form-description-label"
            htmlFor="route-form-description-input"
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
          <input
            id="route-form-description-input"
            type="text"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Description..."
            disabled={isReadOnly}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 14,
              boxSizing: 'border-box',
              background: isReadOnly ? '#f8fafc' : '#ffffff',
              color: isReadOnly ? '#64748b' : '#0f172a',
            }}
          />
        </div>
      </div>

      {/* Boutons d'action */}
      <div id="route-form-actions" style={{ display: 'flex', gap: 8 }}>
        {!isReadOnly && (
          <button
            id="route-form-save-btn"
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
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        )}
        <button
          id="route-form-export-btn"
          onClick={onExport}
          disabled={!canExport}
          style={{
            flex: isReadOnly ? 1 : undefined,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: !canExport ? '#cbd5e1' : '#64748b',
            cursor: !canExport ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          title="Exporter GPX"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span style={{ fontSize: 13 }}>GPX</span>
        </button>
      </div>
    </div>
  )
}

export default RouteForm
