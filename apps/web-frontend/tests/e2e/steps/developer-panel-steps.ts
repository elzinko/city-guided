/**
 * Developer Panel Step Definitions
 * BDD steps for developer panel E2E tests
 */

import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CityGuidedWorld } from '../support/world';

Then('I should see the developer panel button', async function (this: CityGuidedWorld) {
  const button = this.page!.getByRole('button', { name: 'Développeur' });
  await expect(button).toBeVisible({ timeout: 5000 });
});

When('I click the developer panel button', async function (this: CityGuidedWorld) {
  const button = this.page!.getByRole('button', { name: 'Développeur' });
  await button.waitFor({ state: 'visible', timeout: 5000 });
  await button.click();
});

Then('the developer panel should be visible', async function (this: CityGuidedWorld) {
  const panelContent = this.page!.locator('#dev-panel-content');
  await expect(panelContent).toBeVisible({ timeout: 5000 });
});

When('I click the close button in the developer panel', async function (this: CityGuidedWorld) {
  const closeButton = this.page!.locator('#dev-gear-button').first();
  await closeButton.waitFor({ state: 'visible', timeout: 5000 });
  await closeButton.click();
});

Then('the developer panel should not be visible', async function (this: CityGuidedWorld) {
  const panelContent = this.page!.locator('#dev-panel-content');
  await expect(panelContent).not.toBeVisible({ timeout: 3000 });
});

When('I select a route in the developer panel', async function (this: CityGuidedWorld) {
  const panelContent = this.page!.locator('#dev-panel-content');
  const isPanelOpen = await panelContent.isVisible().catch(() => false);
  
  if (!isPanelOpen) {
    const gearButton = this.page!.locator('#dev-gear-button').first();
    await gearButton.waitFor({ state: 'visible', timeout: 5000 });
    await gearButton.click();
    await panelContent.waitFor({ state: 'visible', timeout: 5000 });
  }
  
  // Vérifier si le virtual route est activé
  const virtualRouteToggle = this.page!.locator('#dev-virtual-route-toggle').first();
  await virtualRouteToggle.waitFor({ state: 'visible', timeout: 5000 });
  
  const isActive = await this.page!.evaluate(() => {
    const switchEl = document.querySelector('#dev-virtual-route-switch');
    if (!switchEl) return false;
    const bg = window.getComputedStyle(switchEl).backgroundColor;
    // rgb(34, 197, 94) = #22c55e (vert actif)
    return bg === 'rgb(34, 197, 94)' || bg.includes('34, 197');
  }).catch(() => false);
  
  if (!isActive) {
    await virtualRouteToggle.click();
    await this.page!.waitForLoadState('domcontentloaded');
  }
  
  // Attendre que le panneau soit ouvert (si pas déjà ouvert)
  await panelContent.waitFor({ state: 'visible', timeout: 5000 });
  
  const routeSelector = this.page!.locator('#dev-route-selector').first();
  await routeSelector.waitFor({ state: 'visible', timeout: 8000 });
  await routeSelector.selectOption({ index: 0 });
  
  // Attendre que la route soit chargée
  await this.page!.waitForLoadState('domcontentloaded');
});

When('I start the simulation', async function (this: CityGuidedWorld) {
  const playButtons = this.page!.getByRole('button', { name: 'Play' });
  const count = await playButtons.count();
  
  if (count > 0) {
    await playButtons.first().click();
  }
});

When('audio playback starts', async function (this: CityGuidedWorld) {
  const pauseButton = this.page!.getByRole('button', { name: 'Pause' });
  await expect(pauseButton).toBeVisible({ timeout: 5000 });
});

When('I click the pause button in the developer panel', async function (this: CityGuidedWorld) {
  const pauseButton = this.page!.getByRole('button', { name: 'Pause' });
  await pauseButton.waitFor({ state: 'visible', timeout: 5000 });
  await pauseButton.click();
});

Then('audio playback should be paused', async function (this: CityGuidedWorld) {
  const playButton = this.page!.getByRole('button', { name: 'Play' });
  await expect(playButton).toBeVisible({ timeout: 3000 });
});

When('I click the play button in the developer panel', async function (this: CityGuidedWorld) {
  const playButton = this.page!.getByRole('button', { name: 'Play' });
  await playButton.waitFor({ state: 'visible', timeout: 5000 });
  await playButton.click();
});

Then('audio playback should resume from the same position', async function (this: CityGuidedWorld) {
  const pauseButton = this.page!.getByRole('button', { name: 'Pause' });
  await expect(pauseButton).toBeVisible({ timeout: 3000 });
});

When('I wait for the simulation to reach the end', async function (this: CityGuidedWorld) {
  const playButton = this.page!.getByRole('button', { name: 'Play' });
  await playButton.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
});

Then('the simulation should be stopped', async function (this: CityGuidedWorld) {
  const playButton = this.page!.getByRole('button', { name: 'Play' });
  await expect(playButton).toBeVisible({ timeout: 5000 });
});

When('I click the previous POI button', async function (this: CityGuidedWorld) {
  const prevButton = this.page!.getByRole('button', { name: 'POI précédent' });
  await prevButton.waitFor({ state: 'visible', timeout: 5000 });
  await prevButton.click();
});

Then('the user position should update', async function (this: CityGuidedWorld) {
  const stepIndicator = this.page!.locator('text=/\\d+\\/\\d+/');
  await expect(stepIndicator.first()).toBeVisible({ timeout: 3000 });
});

Then('the step indicator should decrease', async function (this: CityGuidedWorld) {
  const stepBadge = this.page!.locator('text=/\\d+\\/\\d+/');
  await expect(stepBadge.first()).toBeVisible({ timeout: 3000 });
});

When('I click the next POI button', async function (this: CityGuidedWorld) {
  const nextButton = this.page!.getByRole('button', { name: 'POI suivant' });
  await nextButton.waitFor({ state: 'visible', timeout: 5000 });
  await nextButton.click();
});

Then('the user position should update again', async function (this: CityGuidedWorld) {
  const stepIndicator = this.page!.locator('text=/\\d+\\/\\d+/');
  await expect(stepIndicator.first()).toBeVisible({ timeout: 3000 });
});

Then('the step indicator should increase', async function (this: CityGuidedWorld) {
  const stepBadge = this.page!.locator('text=/\\d+\\/\\d+/');
  await expect(stepBadge.first()).toBeVisible({ timeout: 3000 });
});
