export const DEFAULT_CENTER_RADIUS_METERS = 1500
export const MAX_POIS_DISPLAYED = 30

// Bottom sheet levels (percent of viewport height)
export const SHEET_HEIGHTS = {
  peek: 20,
  mid: 50, // Réduit à 50% pour laisser plus de place à la carte visible
  full: 95,
} as const

// Floating GPS button distance from bottom of viewport (vh to stay au-dessus du peek)
export const GPS_BUTTON_MARGIN_PX = 12
export const GPS_HIDE_THRESHOLD_PERCENT = 50

// Z-index hierarchy (higher = on top)
// Ordre visuel du bas vers le haut : dev-control-block < bottom-menu < map-control-buttons
// Le dev-control-block est en bas (bottom: 0), le bottom-menu est au-dessus (bottom: 52px), 
// donc le bottom-menu doit avoir un z-index plus élevé pour être visible au-dessus
export const Z_INDEX = {
  map: 1,
  bottomSheet: 99997, // Bottom sheet (peut être derrière le menu quand très bas)
  devControlBlock: 99998, // Dev block en bas (bottom: 0)
  bottomMenu: 99999, // Menu au-dessus du dev-control-block (bottom: 52px)
  mapControlButtons: 100001, // Boutons au-dessus de tout (en haut)
} as const

// Developer options visibility
// NOTE: This is now managed via ConfigContext (see contexts/ConfigContext.tsx)
// The value is read server-side in _app.tsx and passed via React Context
// This allows the same Docker image to be used for staging and prod
//
// Uses SHOW_DEV_OPTIONS (runtime variable, no NEXT_PUBLIC_ prefix needed)
// Default: false
const envShowDevOptions = typeof process !== 'undefined' && process.env?.SHOW_DEV_OPTIONS
export const SHOW_DEV_OPTIONS = envShowDevOptions === 'true' || envShowDevOptions === '1'

// Export a hook-compatible version (preferred way to use in components)
// Import useConfig from contexts/ConfigContext instead of this constant
