import React from 'react'
import { RecordingItem } from './RecordingItem'

export type RecordedRoute = {
  id: string
  name: string
  points: { lat: number; lng: number; timestamp: string; accuracy?: number }[]
  startTime: string
  endTime?: string
  isRecording: boolean
}

export type RecordingsListProps = {
  recordings: RecordedRoute[]
  selectedId: string | null
  onSelect: (recording: RecordedRoute) => void
  onExport: (recording: RecordedRoute) => void
  onDelete: (recordingId: string) => void
  onRename: (recordingId: string, newName: string) => void
  formatDuration: (startTime: string, endTime?: string) => string
}

/**
 * Liste des enregistrements GPS
 */
export function RecordingsList({
  recordings,
  selectedId,
  onSelect,
  onExport,
  onDelete,
  onRename,
  formatDuration,
}: RecordingsListProps) {
  return (
    <div id="recordings-list-container" style={{ flex: 1 }}>
      <h2
        id="recordings-list-title"
        style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#64748b' }}
      >
        Enregistrements ({recordings.length})
      </h2>

      {recordings.length === 0 ? (
        <div
          id="recordings-list-empty"
          style={{
            padding: 32,
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: 13,
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
          }}
        >
          Aucun enregistrement
        </div>
      ) : (
        <div id="recordings-list-items" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recordings.map((recording) => (
            <RecordingItem
              key={recording.id}
              id={recording.id}
              name={recording.name}
              pointsCount={recording.points.length}
              duration={formatDuration(recording.startTime, recording.endTime)}
              isSelected={selectedId === recording.id}
              onSelect={() => onSelect(recording)}
              onExport={() => onExport(recording)}
              onDelete={() => onDelete(recording.id)}
              onRename={(newName) => onRename(recording.id, newName)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default RecordingsList
