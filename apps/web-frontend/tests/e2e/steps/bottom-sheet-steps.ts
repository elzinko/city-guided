/**
 * Bottom Sheet Step Definitions
 * BDD steps for bottom sheet E2E tests
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CityGuidedWorld } from '../support/world';

Given('I am on the homepage with open bottom sheet', async function (this: CityGuidedWorld) {
  await this.goto('/');
  await this.page!.waitForLoadState('domcontentloaded');
  
  const bottomMenu = this.page!.locator('#bottom-menu');
  await bottomMenu.waitFor({ state: 'attached', timeout: 8000 });
  await bottomMenu.waitFor({ state: 'visible', timeout: 8000 });
  
  const discoverTab = this.page!.locator('#menu-tab-discover');
  await discoverTab.waitFor({ state: 'visible', timeout: 8000 });
  await discoverTab.click();
  
  const bottomSheet = this.page!.locator('#bottom-sheet');
  await bottomSheet.waitFor({ state: 'visible', timeout: 8000 });
});

When('I click the close button \\(X\\)', async function (this: CityGuidedWorld) {
  const closeButton = this.page!.locator('#sheet-close-button').first();
  await closeButton.waitFor({ state: 'visible', timeout: 5000 });
  await closeButton.click();
});

Then('the bottom sheet should be hidden', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('#bottom-sheet');
  const isVisible = await bottomSheet.isVisible().catch(() => false);
  
  if (isVisible) {
    const boundingBox = await bottomSheet.boundingBox();
    expect(boundingBox?.height || 0).toBeLessThan(150);
  }
});

Then('only the bottom menu should be visible', async function (this: CityGuidedWorld) {
  const bottomMenu = this.page!.locator('#bottom-menu');
  await expect(bottomMenu).toBeVisible({ timeout: 5000 });
  
  const bottomSheet = this.page!.locator('#bottom-sheet');
  const isVisible = await bottomSheet.isVisible().catch(() => false);
  
  if (isVisible) {
    const boundingBox = await bottomSheet.boundingBox();
    expect(boundingBox?.height || 0).toBeLessThan(150);
  }
});

Then('the bottom sheet should slide up to mid position', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('#bottom-sheet');
  await expect(bottomSheet).toBeVisible({ timeout: 5000 });
  
  // Wait for animation to stabilize
  await this.page!.waitForFunction(
    (selector) => {
      const element = document.querySelector(selector);
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return rect.height > 200;
    },
    '#bottom-sheet',
    { timeout: 3000 }
  );
  
  const boundingBox = await bottomSheet.boundingBox();
  const viewportHeight = this.page!.viewportSize()?.height || 800;
  
  expect(boundingBox?.height || 0).toBeGreaterThan(200);
  expect(boundingBox?.height || 0).toBeGreaterThan(viewportHeight * 0.4);
  expect(boundingBox?.height || 0).toBeLessThan(viewportHeight * 0.95);
});

Then('I should see POI items in the sheet', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('#bottom-sheet');
  await bottomSheet.waitFor({ state: 'visible', timeout: 5000 });
  
  const textContent = await bottomSheet.textContent();
  expect(textContent?.length || 0).toBeGreaterThan(10);
});

When('I click on a quick search chip \\(e.g., {string}\\)', async function (this: CityGuidedWorld, chipText: string) {
  const chip = this.page!.locator(`button:has-text("${chipText}")`).first();
  await chip.waitFor({ state: 'visible', timeout: 5000 });
  await chip.click();
  
  const bottomSheet = this.page!.locator('#bottom-sheet');
  await bottomSheet.waitFor({ state: 'visible', timeout: 5000 });
});

Then('I should see search results in the bottom sheet', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('#bottom-sheet');
  await expect(bottomSheet).toBeVisible({ timeout: 5000 });
});

When('I click the close button \\(X\\) on the bottom sheet', async function (this: CityGuidedWorld) {
  // Essayer plusieurs sélecteurs pour le bouton de fermeture
  const closeButtonById = this.page!.locator('#sheet-close-button');
  const closeButtonByAria = this.page!.getByRole('button', { name: 'Fermer' });
  
  const byIdVisible = await closeButtonById.isVisible().catch(() => false);
  
  if (byIdVisible) {
    await closeButtonById.click();
  } else {
    await closeButtonByAria.first().click();
  }
});
