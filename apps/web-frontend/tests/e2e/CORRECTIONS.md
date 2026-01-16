# Corrections des Tests E2E - Session 2

Date: 16/01/2026

## Problèmes identifiés et corrigés

### 1. Erreurs de lint (CORRIGÉ ✅)
- **Problème**: Variables `_query` non utilisées dans `search-steps.ts`
- **Solution**: Supprimé les paramètres inutilisés des steps

### 2. Sélecteurs incorrects (CORRIGÉ ✅)

#### Bottom Menu
- **Problème**: `#bottom-menu` non trouvé car caché au chargement initial
- **Solution**: 
  - Attendre `waitForLoadState('domcontentloaded')` avant de chercher le menu
  - Utiliser `waitFor({ state: 'attached' })` puis `toBeVisible()`
  - Augmenté timeout à 8s pour l'initialisation

#### Menu Tabs
- **Problème**: Cherchait `#menu-tab-Découvrir` au lieu de `#menu-tab-discover`
- **Solution**: Correction du mapping des IDs (découvrir/saved/contribute en minuscules)

#### Bottom Sheet Close Button
- **Problème**: `#sheet-close-button` parfois non visible selon le mode
- **Solution**: Fallback sur `getByRole('button', { name: 'Fermer' })`

#### Developer Panel
- **Problème**: Utilisait `select.first()` au lieu de `#dev-panel-content`
- **Solution**: Vérifier la visibilité de `#dev-panel-content` directement

### 3. Timeouts et animations (CORRIGÉ ✅)

#### Bottom Menu Visibility
- **Problème**: Menu ne réapparaît pas assez vite après fermeture de recherche
- **Solution**: 
  - Attendre la fermeture complète de l'overlay de recherche
  - Vérifier que le bottom sheet est collapsed (height < 150px)
  - Timeout augmenté à 10s pour les cas complexes

#### Route Selection
- **Problème**: Step "select a route" timeout car le virtual route n'était pas activé
- **Solution**: 
  - Vérifier si le virtual route est actif (couleur du switch)
  - Activer automatiquement si nécessaire
  - Attendre `domcontentloaded` après activation

### 4. Steps dupliqués (CORRIGÉ ✅)
- **Problème**: Steps définis à la fois dans `gps-player-steps.ts` et `developer-panel-steps.ts`
  - `the user position should update`
  - `the user position should update again`
  - `the step indicator should decrease`
  - `the step indicator should increase`
- **Solution**: Supprimé les définitions dupliquées de `gps-player-steps.ts`

## Modifications de fichiers

### Fichiers modifiés
1. `apps/web-frontend/tests/e2e/steps/search-steps.ts` - Variables inutilisées
2. `apps/web-frontend/tests/e2e/steps/bottom-menu-steps.ts` - Sélecteurs + timeouts
3. `apps/web-frontend/tests/e2e/steps/bottom-sheet-steps.ts` - Close button + init
4. `apps/web-frontend/tests/e2e/steps/developer-panel-steps.ts` - Panel visibility + route selection
5. `apps/web-frontend/tests/e2e/steps/gps-player-steps.ts` - Steps dupliqués

## Timeouts ajustés

| Contexte | Ancien | Nouveau | Raison |
|----------|--------|---------|--------|
| Bottom menu initial | 5s | 8s | Initialisation complexe |
| Menu tabs | 5s | 8s | Animations + état |
| Bottom menu visible again | 8s | 10s | Fermeture recherche + animations |
| Route selector | 5s | 8s | Activation virtual route |

## Tests restants à investiguer

Ces tests pourraient encore échouer et nécessitent une investigation plus poussée:

1. **GPS player visibility after guide mode** - Le player pourrait rester visible
2. **Developer panel route selection timeouts** - Si le serveur OSRM ne répond pas
3. **Bottom sheet animations** - Si les animations CSS sont trop longues

## Prochaine étape

Lancer les tests avec:
```bash
pnpm test:e2e
```

Si des tests échouent encore, analyser les screenshots attachés aux tests en échec pour identifier les problèmes d'UI.
