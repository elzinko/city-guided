# Bug Report – RÉSOLU

## Identifiant
routes-admin-style-mismatch

## Statut
**RÉSOLU** - 2026-01-26

## Résumé
Les trajets virtuels créés par l'utilisateur n'ont pas le même rendu visuel que le trajet système "Boucle Fontainebleau" (bordures manquantes).

## Environnement
- **Version** : Actuelle
- **Navigateur/OS** : Tous
- **Autre contexte** : Comparaison visuelle entre trajet système et trajets custom

## Comportement observé
1. Le trajet "Boucle Fontainebleau" (trajet système) a un rendu avec bordure verte
2. Les trajets créés par l'utilisateur n'ont pas de bordure ou un style différent
3. Incohérence visuelle entre les deux types de trajets

## Comportement attendu
Tous les trajets devraient avoir le même rendu visuel, ou une distinction claire et volontaire (ex: système = vert, custom = bleu).

## Étapes de reproduction
1. Aller sur `/admin/routes`
2. Observer le trajet "Boucle Fontainebleau" avec son badge "SYSTÈME" et sa bordure verte
3. Créer un nouveau trajet
4. Comparer le rendu des deux dans la liste

## Impact
- **Criticité** : Mineur (cosmétique mais confusant)
- **Utilisateurs affectés** : Développeurs utilisant les trajets virtuels

## Pistes de diagnostic
1. **Style conditionnel** : Dans `routes.tsx`, le style du trajet est conditionné par `route.isDefault` (lignes 375-396)
2. **Trajet système** : bordure `#22c55e` (vert)
3. **Trajet custom** : bordure `#e2e8f0` (gris clair)
4. **Problème** : Le rendu sur la carte principale (`index.tsx`) pourrait utiliser un style différent

## Composants concernés
- `apps/web-frontend/src/pages/admin/routes.tsx` - styles des cartes de trajet (lignes 370-483)
- `apps/web-frontend/src/pages/index.tsx` - rendu des trajets sur la carte principale (lignes 1068-1127)

## Solution proposée
1. **Aligner les styles** : S'assurer que les trajets custom et système ont des styles cohérents
2. **Distinction intentionnelle** : Si la différence est voulue, la rendre plus explicite (badge, couleur de polyline différente, etc.)

## Solution implémentée
**Distinction intentionnelle renforcée** : Les trajets système et custom ont maintenant des styles cohérents et clairement distincts.

Modifications apportées :

1. **Ajout de la propriété `isDefault` au type `RouteOption`** dans `index.tsx` :
```typescript
type RouteOption = {
  id: string
  name: string
  description?: string
  loadFn: () => Promise<any[]> | any[]
  pointsCount?: number
  isDefault?: boolean // Nouveau
}
```

2. **Marquage de la route système** :
```typescript
const DEFAULT_ROUTE_OPTIONS: RouteOption[] = [
  {
    id: 'default',
    name: 'Boucle Fontainebleau',
    // ...
    isDefault: true, // Trajet système
  },
]
```

3. **Distinction visuelle sur la carte principale** :
```typescript
// Couleurs différentes selon le type de trajet
let routeColor: string
if (isSimulating) {
  routeColor = '#ef4444' // Rouge si simulation active
} else if (isDefaultRoute) {
  routeColor = '#22c55e' // Vert pour les trajets système
} else {
  routeColor = '#3b82f6' // Bleu pour les trajets custom
}
```

4. **Composant `RouteCard` avec styles cohérents** :
- Trajets système : bordure verte (`#22c55e`), icône verte, badge "SYSTÈME"
- Trajets custom : bordure grise (`#e2e8f0`), icône grise, pas de badge

## Notes
La distinction est maintenant intentionnelle et cohérente entre :
- La liste dans `/admin/routes` (composant `RouteCard`)
- La carte principale dans `index.tsx` (polyline colorée)
