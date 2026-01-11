import React, { useState, useEffect, useCallback } from 'react'
import { convertToChapters, PoiWithStory } from '../types/story'

// Icônes similaires à celles de DevControlBlock
function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  )
}

function PauseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

function PrevIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <rect x="4" y="5" width="3" height="14" rx="1" />
      <path d="M20 5v14l-10-7 10-7z" />
    </svg>
  )
}

function NextIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M4 5v14l10-7-10-7z" />
      <rect x="17" y="5" width="3" height="14" rx="1" />
    </svg>
  )
}

function ReplayIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

type ChapterPlayerProps = {
  id?: string
  poi: PoiWithStory
  speak: (text: string) => void
  stopSpeech?: () => void
  pauseSpeech?: () => void
  resumeSpeech?: () => void
  compact?: boolean // Mode compact pour le bottom sheet
  onChapterChange?: (chapterIndex: number) => void
}

export function ChapterPlayer({
  id,
  poi,
  speak,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  compact = false,
  onChapterChange,
}: ChapterPlayerProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [hasCompletedChapter, setHasCompletedChapter] = useState(false)

  // Récupérer les chapitres du POI
  const chapters = convertToChapters(poi)
  const totalChapters = chapters.length
  const currentChapter = chapters[currentChapterIndex]

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

      // Détecter la fin de lecture
      if (!speaking && wasSpeaking && !synth.paused) {
        setHasCompletedChapter(true)
      }
    }

    const interval = setInterval(checkPlaying, 200)
    return () => clearInterval(interval)
  }, [isPlaying])

  // Réinitialiser quand le POI change
  useEffect(() => {
    setCurrentChapterIndex(0)
    setHasCompletedChapter(false)
    if (onChapterChange) onChapterChange(0)
  }, [poi.id, onChapterChange])

  // Notifier le parent quand le chapitre change
  useEffect(() => {
    if (onChapterChange) onChapterChange(currentChapterIndex)
  }, [currentChapterIndex, onChapterChange])

  const handlePlayPause = useCallback(() => {
    if (isPlaying && !isPaused) {
      if (pauseSpeech) pauseSpeech()
      else if (typeof window !== 'undefined') window.speechSynthesis?.pause()
      setIsPaused(true)
    } else if (isPaused) {
      if (resumeSpeech) resumeSpeech()
      else if (typeof window !== 'undefined') window.speechSynthesis?.resume()
      setIsPaused(false)
    } else if (currentChapter) {
      speak(currentChapter.text)
      setIsPlaying(true)
      setIsPaused(false)
      setHasCompletedChapter(false)
    }
  }, [isPlaying, isPaused, currentChapter, speak, pauseSpeech, resumeSpeech])

  const goToPrevChapter = useCallback(() => {
    if (currentChapterIndex <= 0) return
    if (stopSpeech) stopSpeech()
    setHasCompletedChapter(false)
    setCurrentChapterIndex(currentChapterIndex - 1)
  }, [currentChapterIndex, stopSpeech])

  const goToNextChapter = useCallback(() => {
    if (currentChapterIndex >= totalChapters - 1) return
    if (stopSpeech) stopSpeech()
    setHasCompletedChapter(false)
    setCurrentChapterIndex(currentChapterIndex + 1)
  }, [currentChapterIndex, totalChapters, stopSpeech])

  const handleReplay = useCallback(() => {
    if (currentChapter) {
      setHasCompletedChapter(false)
      speak(currentChapter.text)
      setIsPlaying(true)
      setIsPaused(false)
    }
  }, [currentChapter, speak])

  const canGoPrev = currentChapterIndex > 0
  const canGoNext = currentChapterIndex < totalChapters - 1

  // Styles des boutons (similaires à DevControlBlock)
  const navButtonStyle = (enabled: boolean): React.CSSProperties => ({
    width: compact ? 32 : 36,
    height: compact ? 32 : 36,
    borderRadius: '50%',
    border: 'none',
    background: enabled ? '#e2e8f0' : '#f1f5f9',
    color: enabled ? '#475569' : '#cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: enabled ? 'pointer' : 'default',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  })

  const playButtonStyle: React.CSSProperties = {
    width: compact ? 44 : 52,
    height: compact ? 44 : 52,
    borderRadius: '50%',
    border: 'none',
    background:
      isPlaying && !isPaused
        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
        : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  }

  // Si un seul chapitre et mode compact, afficher un bouton simple
  if (totalChapters <= 1 && compact) {
    return (
      <button
        id={id}
        onClick={handlePlayPause}
        style={{
          width: '100%',
          padding: '14px 20px',
          background:
            isPlaying && !isPaused
              ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
              : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          color: 'white',
          border: 'none',
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        {isPlaying && !isPaused ? (
          <>
            <PauseIcon size={18} />
            Pause
          </>
        ) : isPaused ? (
          <>
            <PlayIcon size={18} />
            Reprendre
          </>
        ) : (
          <>
            <PlayIcon size={18} />
            Écouter la description
          </>
        )}
      </button>
    )
  }

  return (
    <div
      id={id}
      style={{
        background: '#f8fafc',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      {/* En-tête avec média si disponible */}
      {currentChapter?.mediaUrl && !compact && (
        <div
          id={id ? `${id}-media` : undefined}
          style={{
            width: '100%',
            height: 120,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <img
            src={currentChapter.mediaUrl}
            alt={currentChapter.mediaCaption || currentChapter.title || poi.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Badge chapitre */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              background: 'rgba(0, 0, 0, 0.7)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 4,
            }}
          >
            Chapitre {currentChapterIndex + 1}/{totalChapters}
          </div>
          {currentChapter.mediaCaption && (
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                background: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 4,
                maxWidth: '60%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentChapter.mediaCaption}
            </div>
          )}
        </div>
      )}

      {/* Contenu du chapitre */}
      <div id={id ? `${id}-content` : undefined} style={{ padding: compact ? 12 : 14 }}>
        {/* Titre du chapitre */}
        {currentChapter?.title && (
          <div
            id={id ? `${id}-title` : undefined}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {!currentChapter.mediaUrl && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#3b82f6',
                  background: '#eff6ff',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                {currentChapterIndex + 1}/{totalChapters}
              </span>
            )}
            {currentChapter.title}
          </div>
        )}

        {/* Texte du chapitre */}
        <p
          id={id ? `${id}-text` : undefined}
          style={{
            margin: 0,
            fontSize: 13,
            color: '#475569',
            lineHeight: 1.5,
            marginBottom: 12,
            maxHeight: compact ? 60 : 100,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: compact ? 3 : 5,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {currentChapter?.text}
        </p>

        {/* Contrôles de lecture - Largeur fixe pour éviter les mouvements */}
        <div
          id={id ? `${id}-controls` : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: compact ? 8 : 12,
            paddingTop: 10,
            borderTop: '1px solid #e2e8f0',
            minHeight: compact ? 52 : 60, // Hauteur fixe pour éviter les mouvements
          }}
        >
          {/* Bouton précédent */}
          <button
            id={id ? `${id}-prev` : undefined}
            onClick={goToPrevChapter}
            disabled={!canGoPrev}
            style={navButtonStyle(canGoPrev)}
            title="Chapitre précédent"
          >
            <PrevIcon size={compact ? 12 : 14} />
          </button>

          {/* Bouton Play/Pause central */}
          <button
            id={id ? `${id}-play` : undefined}
            onClick={handlePlayPause}
            style={playButtonStyle}
            title={isPlaying && !isPaused ? 'Pause' : isPaused ? 'Reprendre' : 'Écouter'}
          >
            {isPlaying && !isPaused ? (
              <PauseIcon size={compact ? 16 : 20} />
            ) : (
              <PlayIcon size={compact ? 16 : 20} />
            )}
          </button>

          {/* Bouton suivant */}
          <button
            id={id ? `${id}-next` : undefined}
            onClick={goToNextChapter}
            disabled={!canGoNext}
            style={navButtonStyle(canGoNext)}
            title="Chapitre suivant"
          >
            <NextIcon size={compact ? 12 : 14} />
          </button>
        </div>

        {/* Zone d'état fixe sous les contrôles - évite les mouvements */}
        <div
          id={id ? `${id}-status` : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 28, // Hauteur fixe pour la zone d'état
            marginTop: 8,
          }}
        >
          {hasCompletedChapter && !isPlaying ? (
            <button
              id={id ? `${id}-replay` : undefined}
              onClick={handleReplay}
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
          ) : isPlaying && !isPaused ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#22c55e',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#22c55e',
                  animation: 'chapterPulse 1s infinite',
                }}
              />
              Lecture en cours...
            </div>
          ) : null}
        </div>
      </div>

      {/* Animation CSS */}
      <style>{`
        @keyframes chapterPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
