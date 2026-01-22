# Composants Partagés

Ce dossier contient les composants React réutilisables utilisés à travers toute l'application.

## Composants

### PlayPauseButton

Bouton unifié pour gérer la lecture audio/vidéo.

**Variantes:**
- Simple play/pause
- Avec navigation (prev/next)
- Mode play-stop (pour navigation)

**Usage:**
```tsx
// Simple
<PlayPauseButton 
  playing={isPlaying} 
  onPlayPause={handleToggle} 
/>

// Avec navigation
<PlayPauseButton 
  playing={isPlaying}
  onPlayPause={handleToggle}
  showNavigation
  onPrevious={handlePrev}
  onNext={handleNext}
/>
```

### PoiCard

Carte pour afficher un Point d'Intérêt (POI).

**Variantes:**
- `chip`: Compacte, horizontale (pour carousel)
- `card`: Complète avec image et description

**Usage:**
```tsx
// Chip
<PoiCard poi={poi} variant="chip" onClick={handleClick} />

// Card complète
<PoiCard 
  poi={poi} 
  isPlaying={isPlaying}
  onPlayPause={handlePlayPause}
  onClick={handleClick}
/>
```

### GuidePlaceholder

Placeholder coloré pour les guides sans image.

**Usage:**
```tsx
<GuidePlaceholder title="Mon Guide" size={70} />
```

### NavigationButton

Bouton de navigation réutilisable pour précédent/suivant. Utilise la même icône avec rotation pour garantir la cohérence visuelle.

**Usage:**
```tsx
// Bouton précédent
<NavigationButton
  id="prev-button"
  testId="prev-button"
  direction="previous"
  onClick={handlePrevious}
  disabled={!hasPrevious}
  ariaLabel="Élément précédent"
  title="Élément précédent"
  style={buttonStyle}
/>

// Bouton suivant
<NavigationButton
  id="next-button"
  testId="next-button"
  direction="next"
  onClick={handleNext}
  disabled={!hasNext}
  ariaLabel="Élément suivant"
  title="Élément suivant"
  style={buttonStyle}
/>
```

**Props:**
- `id`: Identifiant HTML
- `testId`: Attribut `data-testid`
- `direction`: `'previous'` | `'next'` (détermine la rotation de l'icône)
- `onClick`: Handler de clic
- `disabled`: État désactivé
- `ariaLabel`: Label d'accessibilité
- `title`: Tooltip
- `style`: Styles personnalisés

## Principes

- **Réutilisabilité**: Chaque composant doit être utilisable dans plusieurs contextes
- **Props flexibles**: API simple et cohérente
- **Pas de dépendances**: Aucun composant ne dépend d'un autre composant shared
- **Tests**: Composants critiques testés unitairement
