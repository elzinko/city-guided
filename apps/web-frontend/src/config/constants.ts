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
export const Z_INDEX = {
  map: 1,
  bottomSheet: 99997, // Bottom sheet (peut être derrière le menu quand très bas)
  bottomMenu: 99998, // Menu toujours au-dessus du bottom-sheet quand ils se chevauchent
  devControlBlock: 99999, // Dev block au-dessus du menu et du bottom-sheet
  mapControlButtons: 100001, // Boutons au-dessus du bottom-sheet quand panneau petit, mais en dessous quand panneau grand
} as const

// Developer options visibility
// Default to false, can be overridden by NEXT_PUBLIC_SHOW_DEV_OPTIONS env var
const envShowDevOptions = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SHOW_DEV_OPTIONS
export const SHOW_DEV_OPTIONS = envShowDevOptions === 'true' || envShowDevOptions === '1'
