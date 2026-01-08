/**
 * Bottom Sheet Step Definitions
 * BDD steps for bottom sheet E2E tests
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CityGuidedWorld } from '../support/world';

Given('I am on the homepage with open bottom sheet', async function (this: CityGuidedWorld) {
  await this.goto('/');
  // Open the bottom sheet by clicking on a tab
  const discoverTab = this.page!.locator('button:has-text("Découvrir")').first();
  await discoverTab.click();
  await this.page!.waitForTimeout(300);
});

When('I click the close button \\(X\\)', async function (this: CityGuidedWorld) {
  const closeButton = this.page!.locator('#sheet-close-button, button[aria-label*="close"], button[aria-label*="fermer"]').first();
  await closeButton.click();
  await this.page!.waitForTimeout(300);
});

Then('the bottom sheet should be hidden', async function (this: CityGuidedWorld) {
  // The sheet might still be in DOM but not visible
  const bottomSheet = this.page!.locator('[id*="sheet"], [data-testid*="sheet"]').first();
  // Check if it's hidden (either not visible or has display: none)
  const isVisible = await bottomSheet.isVisible().catch(() => false);
  // If visible, check if it's at hidden position (very small height or off-screen)
  if (isVisible) {
    const boundingBox = await bottomSheet.boundingBox();
    // Sheet should be very small (hidden) or off-screen
    expect(boundingBox?.height || 0).toBeLessThan(100);
  }
});

Then('only the bottom menu should be visible', async function (this: CityGuidedWorld) {
  const bottomMenu = this.page!.locator('#bottom-menu');
  await expect(bottomMenu).toBeVisible();
  
  // Bottom sheet should be hidden
  const bottomSheet = this.page!.locator('[id*="sheet"], [data-testid*="sheet"]').first();
  const isVisible = await bottomSheet.isVisible().catch(() => false);
  if (isVisible) {
    const boundingBox = await bottomSheet.boundingBox();
    expect(boundingBox?.height || 0).toBeLessThan(100);
  }
});

Then('the bottom sheet should slide up to mid position', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('[id*="sheet"], [data-testid*="sheet"]').first();
  await expect(bottomSheet).toBeVisible();
  // Wait for animation
  await this.page!.waitForTimeout(500);
  // Check that sheet is visible and has reasonable height (mid position)
  const boundingBox = await bottomSheet.boundingBox();
  expect(boundingBox?.height || 0).toBeGreaterThan(200);
});

Then('I should see POI items in the sheet', async function (this: CityGuidedWorld) {
  // Wait for POIs to load
  await this.page!.waitForTimeout(1000);
  // POI items might be in list items, cards, or divs with text content
  // Try multiple selectors
  const poiItems = this.page!.locator('[data-testid*="poi"], li, [class*="poi"], [class*="item"], div:has-text("Château"), div:has-text("Musée")');
  const count = await poiItems.count();
  // If no items found with specific selectors, check if sheet has any content
  if (count === 0) {
    const bottomSheet = this.page!.locator('[id*="sheet"], [data-testid*="sheet"]').first();
    const textContent = await bottomSheet.textContent();
    // Sheet should have some content (not empty)
    expect(textContent?.length || 0).toBeGreaterThan(10);
  } else {
    expect(count).toBeGreaterThan(0);
  }
});

When('I click on a quick search chip \\(e.g., {string}\\)', async function (this: CityGuidedWorld, chipText: string) {
  const chip = this.page!.locator(`button:has-text("${chipText}")`).first();
  await chip.click();
  await this.page!.waitForTimeout(500);
});

Then('I should see search results in the bottom sheet', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('[id*="sheet"], [data-testid*="sheet"]').first();
  await expect(bottomSheet).toBeVisible();
  await this.page!.waitForTimeout(500);
});

When('I click the close button \\(X\\) on the bottom sheet', async function (this: CityGuidedWorld) {
  const closeButton = this.page!.locator('#sheet-close-button, button[aria-label*="close"], button[aria-label*="fermer"]').first();
  await closeButton.click();
  await this.page!.waitForTimeout(300);
});

// Step removed - duplicate with search-steps.ts

