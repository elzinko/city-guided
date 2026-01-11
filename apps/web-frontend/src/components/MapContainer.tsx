import React from 'react'

type MapContainerProps = {
  id?: string
  isDesktop: boolean
  adminLevel: 'hidden' | 'peek' | 'mid' | 'full'
  guideMode: boolean
  children?: React.ReactNode
}

/**
 * Conteneur pour la carte Leaflet
 * Gère le positionnement selon le mode (desktop/mobile, guide/normal)
 */
export function MapContainer({
  id = 'map',
  isDesktop,
  adminLevel,
  guideMode,
  children,
}: MapContainerProps) {
  return (
    <div
      id={id}
      data-testid="map-container"
      style={{
        position: 'absolute',
        top: 0,
        left: isDesktop && adminLevel !== 'hidden' ? 320 : 0, // Desktop: décaler si panneau dev ouvert
        right: 0,
        // En mode navigation (guideMode), la carte va jusqu'au DevControlBlock (pas de menu)
        // Sinon, laisser de la place pour le menu du bas
        bottom: isDesktop ? 0 : (guideMode ? 0 : 'calc(64px + env(safe-area-inset-bottom, 0px))'),
        zIndex: 1, // S'assurer que la carte est sur une couche de base
        background: '#f5f5f5', // Fond gris clair pour éviter de voir à travers pendant le drag
      }}
    >
      {children}
    </div>
  )
}
