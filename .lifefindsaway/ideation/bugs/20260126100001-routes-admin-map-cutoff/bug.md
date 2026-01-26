# Bug Report – RÉSOLU

## Identifiant
routes-admin-map-cutoff

## Statut
**RÉSOLU** - 2026-01-26

## Résumé
La carte est coupée en deux lors de l'édition d'un trajet virtuel dans `/admin/routes`.

## Environnement
- **Version** : Actuelle
- **Navigateur/OS** : Mobile principalement (toggle formulaire/carte)
- **Autre contexte** : Page `/admin/routes` en mode édition

## Comportement observé
1. Créer ou éditer un trajet virtuel
2. Cliquer sur l'onglet "Carte" pour voir la carte
3. La carte n'occupe que la moitié de l'espace disponible ou est mal dimensionnée
4. Possible problème d'invalidation du size de Leaflet

## Comportement attendu
La carte doit occuper tout l'espace disponible et s'afficher correctement lors du toggle entre formulaire et carte.

## Étapes de reproduction
1. Aller sur `/admin/routes`
2. Cliquer sur "Nouveau trajet" ou éditer un trajet existant
3. Cliquer sur le bouton "Carte" (toggle formulaire/carte)
4. Observer que la carte est mal dimensionnée

## Impact
- **Criticité** : Majeur
- **Utilisateurs affectés** : Utilisateurs sur mobile ou en mode édition

## Pistes de diagnostic
1. **Leaflet invalidateSize** : Leaflet ne recalcule pas correctement ses dimensions quand le container change de taille via CSS transitions
2. **Transition CSS** : Le panneau utilise `transition: 'all 0.2s ease'` et `width: showMap ? '100%' : 0`. Leaflet n'aime pas les containers qui changent de taille dynamiquement.
3. **Timing** : Le resize de Leaflet n'est peut-être pas déclenché après la transition CSS

## Composants concernés
- `apps/web-frontend/src/pages/admin/routes.tsx` - lignes 533-680 (container de la carte)
- `apps/web-frontend/src/components/routes/RouteMap.tsx` - gestion de la carte Leaflet

## Solution proposée
**Option A** : Appeler `map.invalidateSize()` après le toggle avec un délai correspondant à la durée de la transition (200ms)
```typescript
useEffect(() => {
  if (showMap && mapRef.current) {
    setTimeout(() => mapRef.current?.invalidateSize(), 250)
  }
}, [showMap])
```

**Option B** : Utiliser `ResizeObserver` pour détecter le changement de taille et appeler `invalidateSize()`

**Option C** : Supprimer la transition CSS pour un affichage instantané

## Solution implémentée
**Option A retenue** : Appel de `map.invalidateSize()` avec délai après le toggle.

Modifications apportées :

1. **Nouvelle prop `visible` dans `RouteMap.tsx`** :
```typescript
type RouteMapProps = {
  // ... existing props
  visible?: boolean
}
```

2. **useEffect pour gérer le resize** :
```typescript
// apps/web-frontend/src/components/routes/RouteMap.tsx
useEffect(() => {
  if (visible && mapReady && mapRef.current) {
    const timeoutId = setTimeout(() => {
      mapRef.current?.invalidateSize()
    }, 250)
    return () => clearTimeout(timeoutId)
  }
}, [visible, mapReady])
```

3. **Passage de la prop dans `routes.tsx`** :
```typescript
<RouteMap
  // ... other props
  visible={showMap}
/>
```

## Notes
Ce bug est commun avec Leaflet et les containers dynamiques. La solution `invalidateSize()` est standard. Le délai de 250ms (200ms transition + 50ms buffer) garantit que Leaflet recalcule ses dimensions après la fin de la transition CSS.
