import React from 'react'
import { Badge, Card, primaryButtonStyle } from './ui'

export function StoryPanel({ activeStory, pois, getStorySegments, speak }: any) {
  if (!activeStory) {
    return (
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Story en cours</div>
        <div style={{ color: '#9ca3af' }}>Aucun POI actif pour l'instant (déplace la carte ou lance la simulation).</div>
      </Card>
    )
  }
  const poi = pois.find((p: any) => p.id === activeStory.poiId)
  const segs = poi ? getStorySegments(poi) : []
  const seg = segs[activeStory.segmentIdx] || '...'
  const remaining = segs.length ? `${activeStory.segmentIdx + 1}/${segs.length}` : ''

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontWeight: 700 }}>Story en cours</div>
        <Badge>{remaining ? `Segment ${remaining}` : ''}</Badge>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{poi ? poi.name : '...'}</div>
      <div style={{ fontStyle: 'italic', marginTop: 6, color: '#d1d5db' }}>{seg}</div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={primaryButtonStyle} onClick={() => speak(seg)}>
          Réécouter ce passage
        </button>
      </div>
    </Card>
  )
}
