# Proposition de Tests E2E et BDD

Ce document propose une stratégie de tests pour éviter les régressions sur les fonctionnalités UX implémentées.

## Stratégie de Tests

### Tests BDD (Cucumber) - Priorité Haute
Les tests BDD permettent de valider le comportement métier sans dépendre des détails d'implémentation. Ils sont plus maintenables et peuvent être écrits en langage naturel.

### Tests E2E (Playwright) - Priorité Moyenne
Les tests E2E valident l'intégration complète mais sont plus fragiles et plus lents. À utiliser pour les flux critiques uniquement.

---

## Tests BDD Proposés

### 1. Recherche et Navigation

#### Feature: Recherche de POI
```gherkin
Feature: Recherche de Points d'Intérêt
  As a user
  I want to search for points of interest
  So that I can find places to visit

  Scenario: Recherche basique
    Given I am on the homepage
    When I click on the search bar
    Then I should see the search overlay
    And I should see quick search chips
    And I should see saved addresses section
    When I type "Château" in the search field
    And I press Enter
    Then I should see search results
    And the bottom menu should be hidden
    And the search overlay should be closed

  Scenario: Recherche avec chip rapide
    Given I am on the homepage
    When I click on the "Château" quick search chip
    Then I should see search results for "Château" in the bottom sheet
    And the bottom menu should be hidden
    And the search overlay should be closed
    And the bottom sheet should be at mid position

  Scenario: Fermeture de la recherche avec sauvegarde de la query
    Given I am on the homepage
    When I type "test" in the search field
    And I click the back arrow
    Then the search overlay should be closed
    And the bottom menu should be visible
    And the search query should NOT be cleared (still "test")
    When I click on the search bar again
    Then the search overlay should appear
    And the search field should contain "test"

  Scenario: Recherche active cache le menu
    Given I am on the homepage
    When I activate the search (click on search bar)
    Then the bottom menu should not be visible
    When I close the search
    Then the bottom menu should be visible again
```

#### Feature: Menu du Bas et Navigation
```gherkin
Feature: Menu de Navigation du Bas
  As a user
  I want to navigate between different sections
  So that I can access different features

  Scenario: Affichage du menu par défaut
    Given I am on the homepage
    Then I should see the bottom menu
    And the menu should have three tabs: "Découvrir", "Enregistrés", "Contribuer"
    And "Découvrir" should be the active tab

  Scenario: Changement de tab
    Given I am on the homepage
    When I click on "Enregistrés" tab
    Then "Enregistrés" should be the active tab
    And the bottom sheet should be visible
    And the sheet title should be "Enregistrés"
    When I click on "Contribuer" tab
    Then "Contribuer" should be the active tab

  Scenario: Menu caché en mode recherche
    Given I am on the homepage
    When I activate the search
    Then the bottom menu should not be visible
    When I close the search without results
    Then the bottom menu should be visible again

  Scenario: Menu caché avec résultats de recherche
    Given I am on the homepage
    When I perform a search that returns results
    Then the bottom menu should not be visible
    And the bottom sheet should show search results
```

#### Feature: Panneau Glissant (Bottom Sheet)
```gherkin
Feature: Panneau Glissant
  As a user
  I want to interact with the sliding panel
  So that I can view and navigate content

  Scenario: Ouverture du panneau depuis le menu
    Given I am on the homepage
    When I click on "Découvrir" tab
    Then the bottom sheet should slide up to mid position
    And I should see POI items in the sheet

  Scenario: Fermeture du panneau
    Given I am on the homepage with open bottom sheet
    When I click the close button (X)
    Then the bottom sheet should be hidden
    And only the bottom menu should be visible

  Scenario: Fermeture du panneau de résultats réaffiche le menu
    Given I am on the homepage
    When I click on a quick search chip (e.g., "Château")
    Then I should see search results in the bottom sheet
    And the bottom menu should be hidden
    And the bottom sheet should be at mid position
    When I click the close button (X) on the bottom sheet
    Then the bottom sheet should be hidden
    And the bottom menu should be visible again
    And the search query should be cleared

  Scenario: Recherche rapide affiche les résultats correctement
    Given I am on the homepage
    When I click on the "Musée" quick search chip
    Then the search overlay should be closed
    And the bottom sheet should slide up to mid position
    And I should see search results for "Musée"
    And the bottom menu should be hidden
    When I click the close button (X) on the bottom sheet
    Then the bottom sheet should be hidden
    And the bottom menu should be visible again

  Scenario: Glissement du panneau (drag)
    Given I am on the homepage with open bottom sheet
    When I drag the sheet handle upward
    Then the sheet should expand to full position
    When I drag the sheet handle downward
    Then the sheet should collapse to peek position
```

### 2. Adresses Enregistrées

#### Feature: Adresses Enregistrées dans la Recherche
```gherkin
Feature: Adresses Enregistrées
  As a user
  I want to see my saved addresses in search
  So that I can quickly access them

  Scenario: Affichage des adresses enregistrées
    Given I am on the homepage
    When I activate the search
    Then I should see "Adresses enregistrées" section
    And I should see saved addresses with icons
    And each address should have a circular icon
    And addresses should be separated by vertical bars

  Scenario: Navigation vers Enregistrés depuis Plus
    Given I am on the homepage
    When I activate the search
    And I click on the "Plus" address at the end
    Then I should be redirected to "Enregistrés" tab
    And the bottom sheet should be open
    And the search should be closed
```

### 3. Mode Navigation/Guide

#### Feature: Mode Visite Guidée
```gherkin
Feature: Visite Guidée
  As a user
  I want to start a guided tour
  So that I can explore the city with audio

  Scenario: Démarrage de la visite guidée
    Given I am on the homepage
    When I click the play button (green)
    Then the guide mode should be activated
    And the navigation panel should be visible
    And the developer button should be hidden
    And the bottom menu should be hidden

  Scenario: Arrêt de la visite guidée
    Given I am on the homepage in guide mode
    When I click the stop button (red)
    Then the guide mode should be deactivated
    And the navigation panel should be hidden
    And the developer button should be visible
    And the bottom menu should be visible
```

---

## Tests E2E Proposés (Playwright direct)

### Tests d'Intégration Visuelle (Critiques)

#### 1. Test de Cohérence Visuelle
```typescript
test('Champ de recherche a les bonnes proportions', async ({ page }) => {
  await page.goto('/');
  const searchBar = page.locator('[data-testid="search-bar"]');
  const box = await searchBar.boundingBox();
  
  // Vérifier la hauteur (44px)
  expect(box?.height).toBeCloseTo(44, 1);
  
  // Vérifier le borderRadius (28px)
  const borderRadius = await searchBar.evaluate((el) => {
    return window.getComputedStyle(el).borderRadius;
  });
  expect(borderRadius).toContain('28px');
});
```

#### 2. Test des Icônes
```typescript
test('Icônes sont correctement affichées', async ({ page }) => {
  await page.goto('/');
  
  // Icône POI visible quand pas de texte
  const poiIcon = page.locator('svg[viewBox="0 0 24 24"]').first();
  await expect(poiIcon).toBeVisible();
  
  // Icône micro sans carré
  const micButton = page.locator('button[aria-label="Dictée vocale"]');
  const micStyles = await micButton.evaluate((el) => {
    const styles = window.getComputedStyle(el);
    return {
      border: styles.border,
      background: styles.background,
    };
  });
  expect(micStyles.border).toBe('0px none rgb(0, 0, 0)');
  
  // Icône micro agrandie (24x24)
  const micSvg = micButton.locator('svg');
  const svgBox = await micSvg.boundingBox();
  expect(svgBox?.width).toBeCloseTo(24, 1);
  expect(svgBox?.height).toBeCloseTo(24, 1);
});
```

#### 3. Test de Responsivité Mobile
```typescript
test('Interface est optimisée pour mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  
  // Menu du bas visible
  const bottomMenu = page.locator('#bottom-menu');
  await expect(bottomMenu).toBeVisible();
  
  // Champs de recherche accessibles
  const searchBar = page.locator('[data-testid="search-bar"]');
  await expect(searchBar).toBeVisible();
  
  // Boutons d'action visibles
  const actionButtons = page.locator('[aria-label*="position"], [aria-label*="visite"], [aria-label*="développeur"]');
  const count = await actionButtons.count();
  expect(count).toBeGreaterThan(0);
});
```

---

## Priorisation des Tests

### Phase 1 - Tests BDD Critiques (À implémenter en premier)
1. ✅ Recherche basique et fermeture
2. ✅ Menu caché en mode recherche
3. ✅ Navigation entre tabs
4. ✅ Ouverture/fermeture du panneau glissant

### Phase 2 - Tests BDD Importants
1. Recherche avec chips rapides
2. Navigation vers Enregistrés depuis "Plus"
3. Mode visite guidée (démarrage/arrêt)

### Phase 3 - Tests E2E Visuels (Optionnels)
1. Tests de cohérence visuelle (hauteurs, borderRadius)
2. Tests des icônes (tailles, styles)
3. Tests de responsivité mobile

---

## Structure de Fichiers Proposée

```
apps/web-frontend/tests/e2e/
├── features/
│   ├── homepage.feature (existant)
│   ├── search.feature (nouveau)
│   ├── bottom-menu.feature (nouveau)
│   ├── bottom-sheet.feature (nouveau)
│   ├── saved-addresses.feature (nouveau)
│   └── guide-mode.feature (nouveau)
├── steps/
│   ├── homepage-steps.ts (existant)
│   ├── search-steps.ts (nouveau)
│   ├── bottom-menu-steps.ts (nouveau)
│   ├── bottom-sheet-steps.ts (nouveau)
│   ├── saved-addresses-steps.ts (nouveau)
│   └── guide-mode-steps.ts (nouveau)
└── support/
    ├── world.ts (existant)
    └── hooks.ts (existant)
```

---

## Recommandations

1. **Commencer par les tests BDD** : Plus maintenables, plus faciles à comprendre
2. **Limiter les tests E2E visuels** : Fragiles, à utiliser uniquement pour les cas critiques
3. **Tests de régression** : Ajouter un test BDD pour chaque bug corrigé
4. **Tests de non-régression** : Vérifier que les fonctionnalités existantes continuent de fonctionner

---

## Exemple de Test de Non-Régression

Pour chaque nouvelle fonctionnalité, ajouter un test qui vérifie que les fonctionnalités existantes ne sont pas cassées :

```gherkin
Scenario: Non-régression - Recherche ne casse pas la carte
  Given I am on the homepage
  Then the map should be visible
  When I perform a search
  Then the map should still be visible
  And the map should still be interactive
```

