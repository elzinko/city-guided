# Icônes

Ce dossier contient les icônes SVG réutilisables.

## Icônes Disponibles

### Lecture
- **PlayIcon**: Triangle de lecture
- **PauseIcon**: Deux barres verticales
- **StopIcon**: Carré arrondi

### Navigation
- **PrevIcon**: Aller au précédent (même icône que NextIcon avec rotation 180°)
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
- **Réutilisabilité**: Icônes symétriques (comme PrevIcon/NextIcon) partagent la même base avec rotation CSS

## Détails Techniques

### Icônes Symétriques

Les icônes de navigation `PrevIcon` et `NextIcon` utilisent la même structure SVG. `PrevIcon` applique une rotation CSS (`transform: rotate(180deg)`) pour maintenir la cohérence visuelle et faciliter la maintenance :

```tsx
// NextIcon: icône de base
<NextIcon size={16} />

// PrevIcon: même icône avec rotation
<PrevIcon size={16} /> // Utilise NextIcon + rotation CSS
```

Cette approche garantit que les deux icônes restent identiques visuellement et facilite les mises à jour futures.
