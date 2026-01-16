import React from 'react'

type PoiImageProps = {
  id?: string
  name: string
  imageUrl?: string
  chapterImageUrl?: string // URL de l'image du chapitre courant (prioritaire)
}

export function PoiImage({ id, name, imageUrl, chapterImageUrl }: PoiImageProps) {
  // Génère une couleur basée sur le nom du POI pour le placeholder
  const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  
  // Utiliser l'image du chapitre courant en priorité
  const displayImageUrl = chapterImageUrl || imageUrl

  // Calculer la hauteur de l'image selon le device
  // Mobile : 40% de la hauteur du viewport, avec min 280px et max 400px
  // Desktop : 35% de la hauteur du viewport, avec min 300px et max 450px
  const getImageHeight = () => {
    if (typeof window === 'undefined') return 350 // Fallback SSR
    const vh = window.innerHeight
    const isMobile = window.innerWidth < 768
    const percentage = isMobile ? 0.4 : 0.35
    const calculatedHeight = vh * percentage
    const minHeight = isMobile ? 280 : 300
    const maxHeight = isMobile ? 400 : 450
    return Math.max(minHeight, Math.min(maxHeight, calculatedHeight))
  }

  const imageHeight = getImageHeight()

  return (
    <div
      id={id}
      style={{
        width: '100%',
        height: `${imageHeight}px`,
        borderRadius: 12,
        overflow: 'hidden',
        background: displayImageUrl
          ? `url(${displayImageUrl}) center/cover no-repeat`
          : `linear-gradient(135deg, 
              hsl(${hue}, 60%, 65%) 0%, 
              hsl(${(hue + 40) % 360}, 50%, 55%) 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0, // Empêcher la réduction de taille
      }}
    >
      {!displayImageUrl && (
        <>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            opacity="0.6"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            📷 Photo à venir
          </div>
        </>
      )}
    </div>
  )
}
