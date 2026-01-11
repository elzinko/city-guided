import React from 'react'

type AppContainerProps = {
  id?: string
  children: React.ReactNode
}

/**
 * Conteneur principal de l'application
 * Gère le positionnement relatif et les dimensions
 */
export function AppContainer({ id = 'app-container', children }: AppContainerProps) {
  return (
    <div
      id={id}
      style={{
        position: 'relative',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}
