# Tests des Contrôles de Développement

Ce dossier contient les tests pour le composant `DevControlBlock` après sa restructuration.

## Structure des tests

### 1. Tests Cucumber (BDD)

**Fichier de features**: `tests/e2e/features/dev-controls.feature`
**Steps**: `tests/e2e/steps/dev-controls-steps.ts`

Les tests BDD couvrent les scénarios utilisateur suivants :
- Ouverture du panneau développeur
- Activation du trajet virtuel
- Vérification de la présence des contrôles
- Vérification que la barre de contrôle ne contient que le bouton engrenage

#### Lancer les tests BDD

```bash
cd apps/web-frontend
pnpm test:e2e
```

### 2. Tests Playwright

**Fichier**: `tests/dev-controls.spec.ts`

Les tests Playwright valident la structure et l'organisation des composants :
- Structure de la barre de contrôle
- Contenu du panneau développeur
- Hiérarchie des éléments
- Présence des IDs et data-testid

#### Lancer les tests Playwright

```bash
cd apps/web-frontend

# Installer Playwright si nécessaire
pnpm install @playwright/test

# Lancer tous les tests
pnpm playwright test

# Lancer uniquement les tests dev-controls
pnpm playwright test tests/dev-controls.spec.ts

# Lancer avec l'interface UI
pnpm playwright test --ui

# Lancer en mode debug
pnpm playwright test tests/dev-controls.spec.ts --debug
```

## Prérequis

### 1. Installation des dépendances

```bash
# À la racine du projet
pnpm install

# Installer les navigateurs Playwright
cd apps/web-frontend
pnpm playwright install
```

### 2. Démarrer le serveur de développement

Les tests nécessitent que l'application soit en cours d'exécution :

```bash
# Option 1 : Utiliser le script de développement global
./scripts/dev-start.sh

# Option 2 : Démarrer uniquement le frontend
cd apps/web-frontend
pnpm dev
```

L'application devrait être accessible sur `http://localhost:3000` (ou le port configuré dans `$WEB_PORT`).

## Structure du composant testé

Voir le fichier `/docs/dev-controls-restructure.md` pour une documentation complète de la structure du composant.

### Hiérarchie simplifiée

```
dev-control-block
├─ dev-panel-content (si panelOpen)
│  └─ dev-virtual-route-block
│     ├─ dev-virtual-route-toggle + dev-edit-routes-link
│     ├─ dev-route-selector (si virtualRouteActive)
│     └─ dev-route-controls (si virtualRouteActive)
│        ├─ dev-route-indicator
│        ├─ dev-player-controls ⭐ NOUVEAU
│        │  ├─ dev-previous-button
│        │  ├─ dev-play-pause-button
│        │  └─ dev-next-button
│        └─ dev-speed-select
└─ dev-control-bar
   └─ dev-gear-button (centré)
```

## Sélecteurs disponibles

Tous les éléments importants ont à la fois un `id` et un `data-testid` :

### Dans dev-control-bar
- `#dev-control-bar` / `[data-testid="dev-control-bar"]`
- `#dev-gear-button` / `[data-testid="dev-gear-button"]`

### Dans dev-panel-content
- `#dev-virtual-route-toggle` / `[data-testid="dev-virtual-route-toggle"]`
- `#dev-edit-routes-link` / `[data-testid="dev-edit-routes-link"]`
- `#dev-route-selector` / `[data-testid="dev-route-selector"]`
- `#dev-route-controls` / `[data-testid="dev-route-controls"]`
- `#dev-route-indicator` / `[data-testid="dev-route-indicator"]`
- `#dev-player-controls` / `[data-testid="dev-player-controls"]`
- `#dev-previous-button` / `[data-testid="dev-previous-button"]`
- `#dev-play-pause-button` / `[data-testid="dev-play-pause-button"]`
- `#dev-next-button` / `[data-testid="dev-next-button"]`
- `#dev-speed-select` / `[data-testid="dev-speed-select"]`

## Exemples de tests

### Vérifier que le panneau s'ouvre

```typescript
import { test, expect } from '@playwright/test';

test('should open dev panel', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  const gearButton = page.locator('[data-testid="dev-gear-button"]');
  await gearButton.click();
  
  const panel = page.locator('#dev-panel-content');
  await expect(panel).toBeVisible();
});
```

### Vérifier les boutons du lecteur

```typescript
test('should show player controls when route is active', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Ouvrir le panneau
  await page.locator('[data-testid="dev-gear-button"]').click();
  
  // Activer le trajet virtuel
  await page.locator('[data-testid="dev-virtual-route-toggle"]').click();
  
  // Vérifier les boutons
  const prevButton = page.locator('[data-testid="dev-previous-button"]');
  await expect(prevButton).toHaveAttribute('title', 'POI précédent');
  
  const nextButton = page.locator('[data-testid="dev-next-button"]');
  await expect(nextButton).toHaveAttribute('title', 'POI suivant');
});
```

## Dépannage

### Les tests échouent avec "Timeout"

- Vérifiez que le serveur de développement est lancé
- Vérifiez le port (devrait être 3000 par défaut)
- Augmentez le timeout dans la configuration Playwright si nécessaire

### Les sélecteurs ne trouvent pas les éléments

- Vérifiez que `SHOW_DEV_OPTIONS` est à `true` dans `/apps/web-frontend/src/config/constants.ts`
- Ouvrez l'application dans un navigateur et vérifiez que les éléments sont présents dans le DOM
- Utilisez le mode debug de Playwright pour inspecter l'état de la page

### Les tests BDD ne se lancent pas

- Vérifiez que Cucumber est installé : `pnpm list @cucumber/cucumber`
- Vérifiez la configuration dans `cucumber.js`
- Vérifiez que les steps sont bien exportés avec `Given`, `When`, `Then`

## Ressources

- [Documentation Playwright](https://playwright.dev/)
- [Documentation Cucumber](https://cucumber.io/docs/cucumber/)
- [Structure du composant DevControlBlock](/docs/dev-controls-restructure.md)
