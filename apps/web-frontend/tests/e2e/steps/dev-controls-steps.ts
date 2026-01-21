/**
 * Dev Controls Step Definitions
 * BDD steps for dev controls panel E2E tests
 */

import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CityGuidedWorld } from '../support/world';

When('I click on the dev gear button', async function (this: CityGuidedWorld) {
  const gearButton = this.page!.locator('[data-testid="dev-gear-button"]');
  await expect(gearButton).toBeVisible({ timeout: 5000 });
  await gearButton.click();
});

When('I click on the virtual route toggle', async function (this: CityGuidedWorld) {
  const toggle = this.page!.locator('[data-testid="dev-virtual-route-toggle"]');
  await expect(toggle).toBeVisible({ timeout: 5000 });
  await toggle.click();
  // Wait for toggle visual state change (transition: 0.2s ease)
  await this.page!.waitForTimeout(500);
});

Then('I should see the dev panel content', async function (this: CityGuidedWorld) {
  const panel = this.page!.locator('#dev-panel-content');
  await expect(panel).toBeVisible({ timeout: 5000 });
});

Then('I should see the virtual route toggle in the panel', async function (this: CityGuidedWorld) {
  const panel = this.page!.locator('#dev-panel-content');
  const toggle = panel.locator('[data-testid="dev-virtual-route-toggle"]');
  await expect(toggle).toBeVisible({ timeout: 5000 });
});

Then('I should see the edit routes link in the panel', async function (this: CityGuidedWorld) {
  const panel = this.page!.locator('#dev-panel-content');
  const editLink = panel.locator('[data-testid="dev-edit-routes-link"]');
  await expect(editLink).toBeVisible({ timeout: 5000 });
});

Then('I should see the route selector in the panel', async function (this: CityGuidedWorld) {
  const panel = this.page!.locator('#dev-panel-content');
  const selector = panel.locator('[data-testid="dev-route-selector"]');
  await expect(selector).toBeVisible({ timeout: 5000 });
});

Then('I should see the route controls in the panel', async function (this: CityGuidedWorld) {
  const panel = this.page!.locator('#dev-panel-content');
  const controls = panel.locator('[data-testid="dev-route-controls"]');
  await expect(controls).toBeVisible({ timeout: 10000 });
});

Then('I should see the player controls in the panel', async function (this: CityGuidedWorld) {
  const panel = this.page!.locator('#dev-panel-content');
  const playerControls = panel.locator('[data-testid="dev-player-controls"]');
  await expect(playerControls).toBeVisible({ timeout: 5000 });
});

Then('I should see the previous button with title {string}', async function (this: CityGuidedWorld, title: string) {
  const panel = this.page!.locator('#dev-panel-content');
  const prevButton = panel.locator('[data-testid="dev-previous-button"]');
  await expect(prevButton).toBeVisible({ timeout: 5000 });
  await expect(prevButton).toHaveAttribute('title', title);
});

Then('I should see the play\\/pause button', async function (this: CityGuidedWorld) {
  const panel = this.page!.locator('#dev-panel-content');
  const playPauseButton = panel.locator('[data-testid="dev-play-pause-button"]');
  await expect(playPauseButton).toBeVisible({ timeout: 5000 });
});

Then('I should see the next button with title {string}', async function (this: CityGuidedWorld, title: string) {
  const panel = this.page!.locator('#dev-panel-content');
  const nextButton = panel.locator('[data-testid="dev-next-button"]');
  await expect(nextButton).toBeVisible({ timeout: 5000 });
  await expect(nextButton).toHaveAttribute('title', title);
});

Then('I should see the dev control bar', async function (this: CityGuidedWorld) {
  const controlBar = this.page!.locator('[data-testid="dev-control-bar"]');
  await expect(controlBar).toBeVisible({ timeout: 5000 });
});

Then('I should see the dev gear button', async function (this: CityGuidedWorld) {
  const gearButton = this.page!.locator('[data-testid="dev-gear-button"]');
  await expect(gearButton).toBeVisible({ timeout: 5000 });
});

Then('the dev control bar should not contain virtual route toggle', async function (this: CityGuidedWorld) {
  const controlBar = this.page!.locator('[data-testid="dev-control-bar"]');
  const toggle = controlBar.locator('[data-testid="dev-virtual-route-toggle"]');
  await expect(toggle).not.toBeVisible();
});

Then('the dev control bar should not contain route selector', async function (this: CityGuidedWorld) {
  const controlBar = this.page!.locator('[data-testid="dev-control-bar"]');
  const selector = controlBar.locator('[data-testid="dev-route-selector"]');
  await expect(selector).not.toBeVisible();
});
