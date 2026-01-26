# Bug Report – RÉSOLU

## Identifiant
routes-admin-back-button

## Statut
**RÉSOLU** - 2026-01-26

## Résumé
Le bloc `dev-control-block` disparaît quand on revient de la page d'édition des trajets virtuels (`/admin/routes`) vers l'accueil.

## Environnement
- **Version** : Actuelle
- **Navigateur/OS** : Tous
- **Autre contexte** : Navigation depuis `/admin/routes` vers `/`

## Comportement observé
1. Depuis la page principale, cliquer sur le bouton d'édition des routes (`dev-edit-routes-link`)
2. Arriver sur `/admin/routes`
3. Cliquer sur le bouton retour (flèche) pour revenir à l'accueil
4. Le bloc `dev-control-block` n'est plus visible
5. Il faut rafraîchir la page (F5) pour le faire réapparaître

## Comportement attendu
Le `dev-control-block` doit rester visible après le retour depuis `/admin/routes`.

## Étapes de reproduction
1. Ouvrir l'application avec `SHOW_DEV_OPTIONS=true`
2. Cliquer sur l'icône engrenage pour ouvrir le panneau dev
3. Cliquer sur le bouton d'édition des routes (icône crayon violet)
4. Sur la page `/admin/routes`, cliquer sur la flèche retour
5. Constater que le `dev-control-block` a disparu

## Impact
- **Criticité** : Majeur
- **Utilisateurs affectés** : Développeurs utilisant les trajets virtuels

## Pistes de diagnostic
1. **Navigation client-side** : `router.push('/?devPanel=open')` pourrait ne pas déclencher correctement le re-render
2. **Condition `showDevOptions`** : Le contexte `ConfigContext` est passé via `getInitialProps` dans `_app.tsx`. Lors d'une navigation client-side, cette valeur pourrait ne pas être correctement transmise.
3. **Re-render conditionnel** : Le composant `DevControlBlock` est conditionné par `{showDevOptions && <DevControlBlock ... />}`. Si `showDevOptions` devient `false` temporairement, le bloc disparaît.

## Composants concernés
- `apps/web-frontend/src/pages/admin/routes.tsx` - ligne 240 : `router.push('/?devPanel=open')`
- `apps/web-frontend/src/pages/index.tsx` - ligne 1687 : condition `{showDevOptions && ...}`
- `apps/web-frontend/src/pages/_app.tsx` - `getInitialProps` avec `showDevOptions`
- `apps/web-frontend/src/contexts/ConfigContext.tsx` - Provider du contexte

## Solution proposée
**Option A** : Utiliser `router.replace()` au lieu de `router.push()`
**Option B** : Vérifier que `showDevOptions` est bien préservé lors de la navigation client-side
**Option C** : Persister `showDevOptions` dans localStorage comme backup
**Option D** : Utiliser `window.location.href` pour forcer un rechargement complet

## Workaround
Rafraîchir la page (F5) après le retour.

## Solution implémentée
**Option D retenue** : Utilisation de `window.location.href` pour forcer un rechargement complet.

```typescript
// apps/web-frontend/src/pages/admin/routes.tsx
const handleBackToHome = () => {
  window.location.href = '/?devPanel=open'
}
```

Cette solution garantit que `getInitialProps` de `_app.tsx` soit appelé et que `showDevOptions` soit correctement évalué.

**Amélioration UX supplémentaire** : Le bouton retour (flèche) a été modifié pour avoir un comportement contextuel :
- En mode **liste** : retourne à l'accueil
- En mode **édition** : retourne à la liste des trajets

Le bouton "Liste" redondant en haut à droite a été supprimé.

## Notes
Le bouton retour a été conservé comme élément inline mais avec un comportement dynamique basé sur `showRouteList`. Les composants ont été refactorisés dans des fichiers séparés (`RouteCard`, `NewRouteButton`, etc.).
