/**
 * Composants pour l'édition des trajets virtuels
 * Architecture modulaire pour future migration vers backoffice
 */

// Composants de base
export { RoutePointsList } from './RoutePointsList'
export type { RoutePoint } from './RoutePointsList'

export { RouteImporter } from './RouteImporter'

export { RouteMap } from './RouteMap'

// Composants UI réutilisables
export { RouteCard } from './RouteCard'
export type { RouteCardProps } from './RouteCard'

export { NewRouteButton } from './NewRouteButton'
export type { NewRouteButtonProps } from './NewRouteButton'

export { MobileViewToggle } from './MobileViewToggle'
export type { MobileViewToggleProps } from './MobileViewToggle'

export { RouteForm } from './RouteForm'
export type { RouteFormProps } from './RouteForm'

export { Notification } from './Notification'
export type { NotificationProps, NotificationType } from './Notification'

// Modals et popups
export { ImportModal } from './ImportModal'
export type { ImportModalProps, RecordedRoute } from './ImportModal'

export { HelpPopup } from './HelpPopup'
export type { HelpPopupProps } from './HelpPopup'

// Composants Recorder
export { RecordButton } from './RecordButton'
export type { RecordButtonProps } from './RecordButton'

export { RecordingStatus } from './RecordingStatus'
export type { RecordingStatusProps } from './RecordingStatus'

export { RecordingItem } from './RecordingItem'
export type { RecordingItemProps } from './RecordingItem'

export { RecordingsList } from './RecordingsList'
export type { RecordingsListProps } from './RecordingsList'
