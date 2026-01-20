/**
 * Test rapide pour valider la structure du composant DevControlBlock
 * Ce test vérifie que les éléments sont bien positionnés dans les bons conteneurs
 */

import { test, expect } from '@playwright/test';

test.describe('DevControlBlock Structure', () => {
  test('dev-control-bar should only contain the gear button', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Attendre que le dev-control-bar soit visible
    const controlBar = page.locator('[data-testid="dev-control-bar"]');
    await expect(controlBar).toBeVisible({ timeout: 10000 });
    
    // Vérifier que le bouton engrenage est présent
    const gearButton = controlBar.locator('[data-testid="dev-gear-button"]');
    await expect(gearButton).toBeVisible();
    
    // Vérifier que le toggle de route virtuelle N'EST PAS dans la barre
    const toggleInBar = controlBar.locator('[data-testid="dev-virtual-route-toggle"]');
    await expect(toggleInBar).not.toBeVisible();
    
    // Vérifier que le sélecteur de route N'EST PAS dans la barre
    const selectorInBar = controlBar.locator('[data-testid="dev-route-selector"]');
    await expect(selectorInBar).not.toBeVisible();
  });

  test('dev-panel-content should contain virtual route controls when opened', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Ouvrir le panneau développeur
    const gearButton = page.locator('[data-testid="dev-gear-button"]');
    await gearButton.click();
    
    // Attendre que le panneau soit visible
    const panel = page.locator('#dev-panel-content');
    await expect(panel).toBeVisible({ timeout: 5000 });
    
    // Vérifier que le toggle de route virtuelle EST dans le panneau
    const toggleInPanel = panel.locator('[data-testid="dev-virtual-route-toggle"]');
    await expect(toggleInPanel).toBeVisible();
    
    // Vérifier que le lien d'édition est dans le panneau
    const editLink = panel.locator('[data-testid="dev-edit-routes-link"]');
    await expect(editLink).toBeVisible();
  });

  test('dev-panel-content should show route controls when virtual route is active', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Ouvrir le panneau développeur
    const gearButton = page.locator('[data-testid="dev-gear-button"]');
    await gearButton.click();
    
    // Attendre que le panneau soit visible
    const panel = page.locator('#dev-panel-content');
    await expect(panel).toBeVisible({ timeout: 5000 });
    
    // Activer le trajet virtuel
    const toggle = panel.locator('[data-testid="dev-virtual-route-toggle"]');
    await toggle.click();
    
    // Attendre un peu que l'état se mette à jour
    await page.waitForTimeout(500);
    
    // Vérifier que le sélecteur de route est visible
    const routeSelector = panel.locator('[data-testid="dev-route-selector"]');
    await expect(routeSelector).toBeVisible();
    
    // Vérifier que les contrôles de route sont visibles
    const routeControls = panel.locator('[data-testid="dev-route-controls"]');
    await expect(routeControls).toBeVisible();
    
    // Vérifier que les contrôles du lecteur sont visibles
    const playerControls = panel.locator('[data-testid="dev-player-controls"]');
    await expect(playerControls).toBeVisible();
    
    // Vérifier les boutons individuels
    const prevButton = playerControls.locator('[data-testid="dev-previous-button"]');
    await expect(prevButton).toBeVisible();
    await expect(prevButton).toHaveAttribute('title', 'POI précédent');
    
    const playPauseButton = playerControls.locator('[data-testid="dev-play-pause-button"]');
    await expect(playPauseButton).toBeVisible();
    
    const nextButton = playerControls.locator('[data-testid="dev-next-button"]');
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toHaveAttribute('title', 'POI suivant');
  });

  test('player controls should have correct IDs', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Ouvrir le panneau et activer le trajet virtuel
    const gearButton = page.locator('[data-testid="dev-gear-button"]');
    await gearButton.click();
    
    const panel = page.locator('#dev-panel-content');
    await expect(panel).toBeVisible({ timeout: 5000 });
    
    const toggle = panel.locator('[data-testid="dev-virtual-route-toggle"]');
    await toggle.click();
    await page.waitForTimeout(500);
    
    // Vérifier les IDs des boutons
    const playerControls = page.locator('#dev-player-controls');
    await expect(playerControls).toBeVisible();
    
    const prevButton = page.locator('#dev-previous-button');
    await expect(prevButton).toBeVisible();
    
    const playPauseButton = page.locator('#dev-play-pause-button');
    await expect(playPauseButton).toBeVisible();
    
    const nextButton = page.locator('#dev-next-button');
    await expect(nextButton).toBeVisible();
  });
});
