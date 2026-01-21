# Icônes

Ce dossier contient les icônes SVG réutilisables.

## Icônes Disponibles

### Lecture
- **PlayIcon**: Triangle de lecture
- **PauseIcon**: Deux barres verticales
- **StopIcon**: Carré arrondi

### Navigation
- **PrevIcon**: Aller au précédent
- **NextIcon**: Aller au suivant

## Usage

```tsx
import { PlayIcon, PauseIcon, PrevIcon, NextIcon, StopIcon } from './icons'

// Taille et couleur personnalisables
<PlayIcon size={24} color="#22c55e" />
<PauseIcon size={20} color="#ef4444" />
```

## Props Communes

Toutes les icônes acceptent:
- `size?: number` (défaut: 20)
- `color?: string` (défaut: 'currentColor')
- `className?: string`

## Principes

- **Pures SVG**: Pas de dépendances externes
- **Accessibilité**: `aria-hidden="true"` par défaut
- **Cohérence**: Même API pour toutes les icônes
- **Performance**: Composants légers
