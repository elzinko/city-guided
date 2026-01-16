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
// Default to false, can be overridden by NEXT_PUBLIC_SHOW_DEV_OPTIONS env var
const envShowDevOptions = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SHOW_DEV_OPTIONS
export const SHOW_DEV_OPTIONS = envShowDevOptions === 'true' || envShowDevOptions === '1'
