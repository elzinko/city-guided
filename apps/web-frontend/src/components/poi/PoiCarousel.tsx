import React, { useRef, useEffect, useState } from 'react'
import type { PoiWithStory } from '../../types/story'
import { convertToChapters } from '../../types/story'

type PoiCarouselProps = {
  id?: string
  poi: PoiWithStory
  currentChapterIndex: number
  onChapterChange: (index: number) => void
}

export function PoiCarousel({ id, poi, currentChapterIndex, onChapterChange }: PoiCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const chapters = convertToChapters(poi)

  // Scroll vers le chapitre courant quand il change (depuis les contrôles)
  useEffect(() => {
    if (!scrollRef.current || isScrolling) return
    const container = scrollRef.current
    const cardWidth = container.offsetWidth * 0.7 + 12 // 70% + gap
    container.scrollTo({
      left: currentChapterIndex * cardWidth,
      behavior: 'smooth',
    })
  }, [currentChapterIndex, isScrolling])

  // Détecter le scroll manuel et mettre à jour le chapitre courant
  const handleScroll = () => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    const cardWidth = container.offsetWidth * 0.7 + 12 // 70% + gap
    const newIndex = Math.round(container.scrollLeft / cardWidth)
    if (newIndex !== currentChapterIndex && newIndex >= 0 && newIndex < chapters.length) {
      setIsScrolling(true)
      onChapterChange(newIndex)
      // Réactiver la synchronisation après un court délai
      setTimeout(() => setIsScrolling(false), 150)
    }
  }

  // Générer une couleur basée sur le nom du POI pour le placeholder
  const hue = (poi.name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360

  if (chapters.length === 0) {
    return (
      <div
        id={id}
        style={{
          width: '100%',
          height: 180,
          borderRadius: 12,
          background: `linear-gradient(135deg, hsl(${hue}, 60%, 65%) 0%, hsl(${(hue + 40) % 360}, 50%, 55%) 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    )
  }

  return (
    <div id={id} style={{ position: 'relative' }}>
      {/* Conteneur scrollable horizontal */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 8,
          // Masquer la scrollbar mais garder le scroll
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {chapters.map((chapter, index) => (
          <div
            key={index}
            style={{
              flexShrink: 0,
              width: '70%',
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {/* Image du chapitre */}
            <div
              style={{
                width: '100%',
                height: 160,
                borderRadius: 12,
                overflow: 'hidden',
                background: chapter.mediaUrl
                  ? `url(${chapter.mediaUrl}) center/cover no-repeat`
                  : poi.image
                  ? `url(${poi.image}) center/cover no-repeat`
                  : `linear-gradient(135deg, hsl(${(hue + index * 30) % 360}, 60%, 65%) 0%, hsl(${(hue + index * 30 + 40) % 360}, 50%, 55%) 100%)`,
                position: 'relative',
              }}
            >
              {!chapter.mediaUrl && !poi.image && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              )}
              {/* Badge numéro de chapitre */}
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {index + 1}/{chapters.length}
              </div>
            </div>

            {/* Texte du chapitre - taille adaptée pour 15-20s de lecture */}
            <div
              style={{
                margin: 0,
                color: '#1e293b',
                fontSize: 15,
                lineHeight: 1.6,
                fontWeight: 400,
                maxHeight: 120, // ~5-6 lignes pour 15-20s de lecture
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
              } as React.CSSProperties}
            >
              {chapter.text}
            </div>
          </div>
        ))}
        {/* Padding de fin pour permettre de voir la dernière carte */}
        <div style={{ flexShrink: 0, width: '30%' }} />
      </div>

      {/* Indicateurs de points (dots) */}
      {chapters.length > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            marginTop: 8,
          }}
        >
          {chapters.map((_, index) => (
            <button
              key={index}
              onClick={() => onChapterChange(index)}
              style={{
                width: index === currentChapterIndex ? 20 : 8,
                height: 8,
                borderRadius: 4,
                border: 'none',
                background: index === currentChapterIndex ? '#3b82f6' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                padding: 0,
              }}
              aria-label={`Aller au chapitre ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
