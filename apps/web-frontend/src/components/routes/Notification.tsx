import React from 'react'

export type NotificationType = 'success' | 'error'

export type NotificationProps = {
  type: NotificationType
  message: string
}

/**
 * Toast de notification fixé en bas de l'écran
 * S'affiche temporairement pour informer l'utilisateur
 */
export function Notification({ type, message }: NotificationProps) {
  return (
    <div
      id={`notification-${type}`}
      style={{
        position: 'fixed',
        bottom: 20,
        left: 12,
        right: 12,
        padding: '12px 16px',
        borderRadius: 10,
        background: type === 'success' ? '#166534' : '#dc2626',
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 500,
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        animation: 'slideUp 0.3s ease',
      }}
    >
      {type === 'success' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      {message}
    </div>
  )
}

export default Notification
