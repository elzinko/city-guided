import React, { useState, useEffect, useCallback } from 'react'
import { convertToChapters, PoiWithStory } from '../types/story'
import { PlayIcon, PauseIcon, StopIcon, ReplayIcon, SkipBackIcon, SkipForwardIcon } from './icons'

type StoryPanelProps = {
  id?: string
  activeStory: { poiId: string; segmentIdx: number } | null
  pois: PoiWithStory[]
  getStorySegments: (poi: PoiWithStory) => string[]
  speak: (text: string) => void
  stopSpeech?: () => void
  pauseSpeech?: () => void
  resumeSpeech?: () => void
  onStopNavigation?: () => void
  onSegmentChange?: (poiId: string, segmentIdx: number) => void
}

// Hauteur fixe du panneau
const PANEL_HEIGHT = 200

/**
 * Composant d'indicateur de statut de lecture
 * Affiche soit "En cours...", soit "Réécouter" selon l'état
 */
type PlaybackStatusProps = {
  id?: string
  isPlaying: boolean
  isPaused: boolean
  hasCompleted: boolean
  onReplay: () => void
}

function PlaybackStatus({ id, isPlaying, isPaused, hasCompleted, onReplay }: PlaybackStatusProps) {
  // Si en lecture (et pas en pause)
  if (isPlaying && !isPaused) {
    return (
      <div
        id={id ? `${id}-playing` : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: '#22c55e',
          fontSize: 11,
          fontWeight: 500,
          padding: '6px 12px',
          background: '#dcfce7',
          borderRadius: 8,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#22c55e',
            animation: 'pulse 1s infinite',
          }}
        />
        En cours...
      </div>
    )
  }

  // Si chapitre terminé
  if (hasCompleted && !isPlaying) {
    return (
      <button
        id={id ? `${id}-replay` : undefined}
        onClick={onReplay}
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          border: 'none',
          background: '#eff6ff',
          color: '#3b82f6',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
        title="Réécouter ce chapitre"
      >
        <ReplayIcon size={12} />
        Réécouter
      </button>
    )
  }

  // État neutre (pas de lecture, pas terminé) - afficher un placeholder vide pour garder l'espace
  return <div style={{ width: 80 }} />
}

export function StoryPanel({ 
  id, 
  activeStory, 
  pois, 
  getStorySegments: _getStorySegments,  
  speak, 
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  onStopNavigation,
  onSegmentChange,
}: StoryPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [hasCompletedCurrentChapter, setHasCompletedCurrentChapter] = useState(false)
  const [lastChapterKey, setLastChapterKey] = useState<string>('')

  // Récupérer le POI et ses chapitres
  const poi = activeStory ? pois.find((p) => p.id === activeStory.poiId) : null
  const chapters = poi ? convertToChapters(poi) : []
  const currentChapter = chapters[activeStory?.segmentIdx ?? 0]
  const totalChapters = chapters.length
  const currentChapterIndex = activeStory?.segmentIdx ?? 0

  // Clé unique pour le chapitre actuel
  const chapterKey = `${activeStory?.poiId}_${activeStory?.segmentIdx}`

  // Réinitialiser l'état de completion quand on change de chapitre
  useEffect(() => {
    if (chapterKey !== lastChapterKey) {
      setHasCompletedCurrentChapter(false)
      setLastChapterKey(chapterKey)
    }
  }, [chapterKey, lastChapterKey])

  // Écouter l'état du speech synthesis
  useEffect(() => {
    if (typeof window === 'undefined') return
    const synth = window.speechSynthesis
    if (!synth) return

    const checkPlaying = () => {
      const speaking = synth.speaking && !synth.paused
      const wasSpeaking = isPlaying
      setIsPlaying(speaking)
      setIsPaused(synth.paused)
      
      // Détecter la fin de lecture du chapitre
      if (!speaking && wasSpeaking && !synth.paused) {
        setHasCompletedCurrentChapter(true)
      }
    }

    const interval = setInterval(checkPlaying, 200)
    return () => clearInterval(interval)
  }, [isPlaying])

  // Actions de lecture
  const handlePlayPause = useCallback(() => {
    if (isPlaying && !isPaused) {
      // Mettre en pause
      if (pauseSpeech) pauseSpeech()
      else if (typeof window !== 'undefined') window.speechSynthesis?.pause()
      setIsPaused(true)
    } else if (isPaused) {
      // Reprendre
      if (resumeSpeech) resumeSpeech()
      else if (typeof window !== 'undefined') window.speechSynthesis?.resume()
      setIsPaused(false)
    } else if (currentChapter) {
      // Démarrer la lecture
      speak(currentChapter.text)
      setIsPlaying(true)
      setIsPaused(false)
    }
  }, [isPlaying, isPaused, currentChapter, speak, pauseSpeech, resumeSpeech])

  // Navigation entre chapitres
  const goToPrevChapter = useCallback(() => {
    if (!activeStory || currentChapterIndex <= 0) return
    if (stopSpeech) stopSpeech()
    setHasCompletedCurrentChapter(false)
    if (onSegmentChange) {
      onSegmentChange(activeStory.poiId, currentChapterIndex - 1)
    }
  }, [activeStory, currentChapterIndex, stopSpeech, onSegmentChange])

  const goToNextChapter = useCallback(() => {
    if (!activeStory || currentChapterIndex >= totalChapters - 1) return
    if (stopSpeech) stopSpeech()
    setHasCompletedCurrentChapter(false)
    if (onSegmentChange) {
      onSegmentChange(activeStory.poiId, currentChapterIndex + 1)
    }
  }, [activeStory, currentChapterIndex, totalChapters, stopSpeech, onSegmentChange])

  const handleStop = useCallback(() => {
    if (stopSpeech) stopSpeech()
    if (onStopNavigation) onStopNavigation()
  }, [stopSpeech, onStopNavigation])

  // Rejouer le chapitre actuel
  const handleReplay = useCallback(() => {
    if (currentChapter) {
      setHasCompletedCurrentChapter(false)
      speak(currentChapter.text)
      setIsPlaying(true)
      setIsPaused(false)
    }
  }, [currentChapter, speak])

  if (!activeStory || !poi) {
    return (
      <div
        id={id}
        style={{
          height: PANEL_HEIGHT,
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(12px)',
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center' }}>
          Aucun POI actif pour l'instant
        </div>
        <div style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>
          Déplace-toi pour découvrir des lieux
        </div>
      </div>
    )
  }

  // Tronquer le texte si trop long
  const maxTextLength = 150
  const displayText = currentChapter?.text 
    ? (currentChapter.text.length > maxTextLength 
        ? currentChapter.text.substring(0, maxTextLength) + '...' 
        : currentChapter.text)
    : ''

  const canGoPrev = currentChapterIndex > 0
  const canGoNext = currentChapterIndex < totalChapters - 1

  return (
    <div
      id={id}
      style={{
        height: PANEL_HEIGHT,
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(12px)',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* Média à gauche (si disponible) */}
      {currentChapter?.mediaUrl && (
        <div
          id="story-panel-media"
          style={{
            width: 120,
            minWidth: 120,
            height: '100%',
            background: '#1e293b',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <img
            src={currentChapter.mediaUrl}
            alt={currentChapter.mediaCaption || poi.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              // Fallback si l'image ne charge pas
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          {/* Overlay avec numéro du chapitre */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              background: 'rgba(0, 0, 0, 0.7)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 600,
              padding: '3px 6px',
              borderRadius: 4,
            }}
          >
            {currentChapterIndex + 1}/{totalChapters}
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div
        id="story-panel-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 14,
          minWidth: 0,
        }}
      >
        {/* Header : nom du POI + bouton stop */}
        <div
          id="story-panel-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 6,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              id="story-panel-poi-name"
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {poi.name}
            </div>
            <div style={{ 
              fontSize: 11, 
              color: '#64748b', 
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span>{poi.category || 'Lieu d\'intérêt'}</span>
              {currentChapter?.title && (
                <>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <span style={{ color: '#3b82f6', fontWeight: 500 }}>
                    {currentChapter.title}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Bouton Stop */}
          <button
            id="story-panel-stop-button"
            onClick={handleStop}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '2px solid #dc2626',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: 8,
            }}
            title="Arrêter la visite"
          >
            <StopIcon size={12} />
          </button>
        </div>

        {/* Texte du chapitre */}
        <div
          id="story-panel-text"
          style={{
            flex: 1,
            fontSize: 13,
            color: '#475569',
            lineHeight: 1.4,
            overflow: 'hidden',
          }}
        >
          {displayText}
        </div>

        {/* Contrôles de lecture - style lecteur audio */}
        <div
          id="story-panel-controls"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 8,
            paddingTop: 10,
            borderTop: '1px solid #e2e8f0',
          }}
        >
          {/* Groupe de gauche : contrôles de navigation (position fixe) */}
          <div
            id="story-panel-nav-controls"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Indicateur de chapitre */}
            {!currentChapter?.mediaUrl && (
              <div
                id="story-panel-chapter-indicator"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#3b82f6',
                  background: '#eff6ff',
                  padding: '4px 8px',
                  borderRadius: 6,
                  minWidth: 40,
                  textAlign: 'center',
                }}
              >
                {currentChapterIndex + 1}/{totalChapters}
              </div>
            )}

            {/* Bouton Chapitre précédent */}
            <button
              id="story-panel-prev-chapter"
              onClick={goToPrevChapter}
              disabled={!canGoPrev}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: canGoPrev ? '#f1f5f9' : '#f8fafc',
                color: canGoPrev ? '#475569' : '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canGoPrev ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
              title="Chapitre précédent"
            >
              <SkipBackIcon size={18} />
            </button>

            {/* Bouton Play/Pause central */}
            <button
              id="story-panel-play-pause"
              onClick={handlePlayPause}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: 'none',
                background: isPlaying && !isPaused ? '#3b82f6' : '#22c55e',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.15s ease',
              }}
              title={isPlaying && !isPaused ? 'Pause' : (isPaused ? 'Reprendre' : 'Écouter')}
            >
              {isPlaying && !isPaused ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
            </button>

            {/* Bouton Chapitre suivant (SkipBackIcon pivoté 180°) */}
            <button
              id="story-panel-next-chapter"
              onClick={goToNextChapter}
              disabled={!canGoNext}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: canGoNext ? '#f1f5f9' : '#f8fafc',
                color: canGoNext ? '#475569' : '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canGoNext ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
              title="Chapitre suivant"
            >
              <SkipForwardIcon size={18} />
            </button>
          </div>

          {/* Spacer pour pousser l'indicateur de statut à droite */}
          <div style={{ flex: 1 }} />

          {/* Indicateur de statut à droite (position fixe) */}
          <PlaybackStatus
            id="story-panel-status"
            isPlaying={isPlaying}
            isPaused={isPaused}
            hasCompleted={hasCompletedCurrentChapter}
            onReplay={handleReplay}
          />
        </div>
      </div>

      {/* Animation pulse CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
