import React, { useRef, useState } from 'react'

// Type pour les enregistrements du Recorder
export type RecordedRoute = {
  id: string
  name: string
  points: { lat: number; lng: number; timestamp: string; accuracy?: number }[]
  startTime: string
  endTime?: string
  isRecording: boolean
}

export type ImportModalProps = {
  isOpen: boolean
  onClose: () => void
  recordings: RecordedRoute[]
  onFileImport: (file: File) => void
  onRecorderImport: (recording: RecordedRoute) => void
  importError: string | null
}

/**
 * Modal d'import de trajet (GPX ou depuis Recorder)
 */
export function ImportModal({
  isOpen,
  onClose,
  recordings,
  onFileImport,
  onRecorderImport,
  importError,
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  if (!isOpen) return null

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.gpx')) {
      onFileImport(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileImport(file)
      e.target.value = ''
    }
  }

  return (
    <div
      id="import-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        id="import-modal-content"
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 400,
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          id="import-modal-header"
          style={{
            padding: 16,
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <h2
            id="import-modal-title"
            style={{ margin: 0, fontSize: 16, fontWeight: 700, flex: 1 }}
          >
            Importer un trajet
          </h2>
          <button
            id="import-modal-close-btn"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: '#f1f5f9',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Fermer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Contenu */}
        <div id="import-modal-body" style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          {/* Option 1: Fichier GPX */}
          <div id="import-gpx-section" style={{ marginBottom: 16 }}>
            <h3
              id="import-gpx-title"
              style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#64748b' }}
            >
              Depuis un fichier GPX
            </h3>
            <label
              id="import-gpx-dropzone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 16,
                borderRadius: 10,
                border: dragOver ? '2px dashed #3b82f6' : '2px dashed #e2e8f0',
                background: dragOver ? '#eff6ff' : '#f8fafc',
                color: '#64748b',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {dragOver ? 'Déposez le fichier' : 'Choisir un fichier .gpx'}
              <input
                id="import-gpx-input"
                ref={fileInputRef}
                type="file"
                accept=".gpx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* Erreur */}
          {importError && (
            <div
              id="import-error-message"
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: 13,
              }}
            >
              {importError}
            </div>
          )}

          {/* Option 2: Depuis le Recorder */}
          <div id="import-recorder-section">
            <h3
              id="import-recorder-title"
              style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#64748b' }}
            >
              Depuis le Recorder ({recordings.length})
            </h3>
            
            {recordings.length === 0 ? (
              <div
                id="import-recorder-empty"
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: 13,
                }}
              >
                Aucun enregistrement disponible
                <div style={{ marginTop: 8 }}>
                  <a
                    id="import-recorder-link"
                    href="/admin/routes/recorder"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px solid #dc2626',
                      background: '#fef2f2',
                      color: '#dc2626',
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#dc2626">
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                    Ouvrir le Recorder
                  </a>
                </div>
              </div>
            ) : (
              <div id="import-recorder-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recordings.map((rec) => (
                  <button
                    key={rec.id}
                    id={`import-recorder-item-${rec.id}`}
                    onClick={() => onRecorderImport(rec)}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                        {rec.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {rec.points.length} points
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportModal
