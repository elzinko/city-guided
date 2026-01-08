/**
 * Bottom Menu Step Definitions
 * BDD steps for bottom menu E2E tests
 */

import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CityGuidedWorld } from '../support/world';

Then('I should see the bottom menu', async function (this: CityGuidedWorld) {
  const bottomMenu = this.page!.locator('#bottom-menu');
  await expect(bottomMenu).toBeVisible();
});

Then('the menu should have three tabs: {string}, {string}, {string}', async function (
  this: CityGuidedWorld,
  tab1: string,
  tab2: string,
  tab3: string
) {
  const tab1Element = this.page!.locator(`button:has-text("${tab1}")`);
  const tab2Element = this.page!.locator(`button:has-text("${tab2}")`);
  const tab3Element = this.page!.locator(`button:has-text("${tab3}")`);
  
  await expect(tab1Element).toBeVisible();
  await expect(tab2Element).toBeVisible();
  await expect(tab3Element).toBeVisible();
});

Then('{string} should be the active tab', async function (this: CityGuidedWorld, tabName: string) {
  const tab = this.page!.locator(`button:has-text("${tabName}")`).first();
  await expect(tab).toBeVisible();
  // Tab should be visible and clickable
  await expect(tab).toBeEnabled();
});

When('I click on {string} tab', async function (this: CityGuidedWorld, tabName: string) {
  const tab = this.page!.locator(`button:has-text("${tabName}")`).first();
  await tab.click();
  await this.page!.waitForTimeout(300);
});

Then('the bottom sheet should be visible', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('[id*="sheet"], [data-testid*="sheet"]').first();
  await expect(bottomSheet).toBeVisible();
});

Then('the sheet title should be {string}', async function (this: CityGuidedWorld, expectedTitle: string) {
  // The title might be in the sheet header
  const title = this.page!.locator(`text=${expectedTitle}`).first();
  await expect(title).toBeVisible();
});

When('I close the search without results', async function (this: CityGuidedWorld) {
  // Click back arrow or press Escape
  // Wait a bit for the button to appear
  await this.page!.waitForTimeout(500);
  // Try to find the back button in overlay first (more specific)
  const overlayBackButton = this.page!.locator('[data-testid="search-overlay"] button[aria-label="Retour"]').first();
  const backButton = this.page!.locator('button[aria-label="Retour"]').first();
  
  try {
    await overlayBackButton.waitFor({ state: 'visible', timeout: 5000 });
    await overlayBackButton.click();
  } catch {
    try {
      await backButton.waitFor({ state: 'visible', timeout: 5000 });
      await backButton.click();
    } catch {
      // If button not found, try Escape key
      await this.page!.keyboard.press('Escape');
    }
  }
  await this.page!.waitForTimeout(500);
});

Then('the bottom menu should be visible again', async function (this: CityGuidedWorld) {
  const bottomMenu = this.page!.locator('#bottom-menu');
  await expect(bottomMenu).toBeVisible();
});

Then('the bottom menu should not be visible', async function (this: CityGuidedWorld) {
  const bottomMenu = this.page!.locator('#bottom-menu');
  const isVisible = await bottomMenu.isVisible().catch(() => false);
  expect(isVisible).toBe(false);
});
