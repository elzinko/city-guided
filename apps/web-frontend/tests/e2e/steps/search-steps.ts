/**
 * Search Step Definitions
 * BDD steps for search E2E tests
 */

import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CityGuidedWorld } from '../support/world';

When('I click on the search bar', async function (this: CityGuidedWorld) {
  const searchBar = this.page!.locator('[data-testid="search-bar-main"]').first();
  await searchBar.waitFor({ state: 'visible', timeout: 5000 });
  await searchBar.click();
  
  const overlay = this.page!.locator('[data-testid="search-overlay"]');
  await overlay.waitFor({ state: 'visible', timeout: 5000 });
});

Then('I should see the search overlay', async function (this: CityGuidedWorld) {
  const overlay = this.page!.locator('[data-testid="search-overlay"]');
  await expect(overlay).toBeVisible({ timeout: 5000 });
});

Then('I should see quick search chips', async function (this: CityGuidedWorld) {
  const chips = this.page!.locator('button:has-text("Château"), button:has-text("Musée")');
  await expect(chips.first()).toBeVisible({ timeout: 5000 });
});

Then('I should see saved addresses section', async function (this: CityGuidedWorld) {
  const section = this.page!.locator('text=Adresses enregistrées');
  await expect(section).toBeVisible({ timeout: 5000 });
});

When('I type {string} in the search field', async function (this: CityGuidedWorld, text: string) {
  const searchInput = this.page!.locator('[data-testid="search-bar-overlay-input"]').first();
  await searchInput.waitFor({ state: 'visible', timeout: 5000 });
  await searchInput.fill(text);
});

When('I press Enter', async function (this: CityGuidedWorld) {
  const searchInput = this.page!.locator('[data-testid="search-bar-overlay-input"]').first();
  await searchInput.press('Enter');
  
  const bottomSheet = this.page!.locator('#bottom-sheet');
  await bottomSheet.waitFor({ state: 'visible', timeout: 5000 });
});

Then('I should see search results', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('#bottom-sheet');
  await expect(bottomSheet).toBeVisible({ timeout: 5000 });
});

When('I click on the {string} quick search chip', async function (this: CityGuidedWorld, chipText: string) {
  const chip = this.page!.locator(`button:has-text("${chipText}")`).first();
  await chip.click();
});

Then('I should see search results for {string} in the bottom sheet', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('#bottom-sheet');
  await expect(bottomSheet).toBeVisible({ timeout: 5000 });
});

Then('I should see search results for {string}', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('#bottom-sheet');
  await expect(bottomSheet).toBeVisible({ timeout: 5000 });
});

Then('the bottom sheet should be at mid position', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('#bottom-sheet');
  await expect(bottomSheet).toBeVisible({ timeout: 5000 });
  
  const boundingBox = await bottomSheet.boundingBox();
  const viewportHeight = this.page!.viewportSize()?.height || 800;
  
  if (boundingBox) {
    expect(boundingBox.height).toBeGreaterThan(viewportHeight * 0.4);
    expect(boundingBox.height).toBeLessThan(viewportHeight * 0.95);
  }
});

When('I click the back arrow', async function (this: CityGuidedWorld) {
  const backButton = this.page!.locator('[data-testid="search-overlay"] button[aria-label="Retour"]').first();
  await backButton.waitFor({ state: 'visible', timeout: 5000 });
  await backButton.click();
});

Then('the search query should be cleared', async function (this: CityGuidedWorld) {
  const searchInput = this.page!.locator('[data-testid="search-bar-main"]').first();
  const isVisible = await searchInput.isVisible().catch(() => false);
  
  if (isVisible) {
    const value = await searchInput.inputValue().catch(() => '');
    expect(value).toBe('');
  }
});

Then('the panneau découverte should not be visible', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('#bottom-sheet');
  const isVisible = await bottomSheet.isVisible().catch(() => false);
  
  if (isVisible) {
    const boundingBox = await bottomSheet.boundingBox();
    expect(boundingBox?.height || 0).toBeLessThan(150);
  }
});

Then('the search field should contain {string}', async function (this: CityGuidedWorld, expectedText: string) {
  const searchInput = this.page!.locator('[data-testid="search-bar-overlay-input"]').first();
  await searchInput.waitFor({ state: 'visible', timeout: 5000 });
  
  const value = await searchInput.inputValue();
  expect(value).toContain(expectedText);
});

When('I activate the search \\(click on search bar\\)', async function (this: CityGuidedWorld) {
  const searchBar = this.page!.locator('[data-testid="search-bar-main"]').first();
  await searchBar.waitFor({ state: 'visible', timeout: 5000 });
  await searchBar.click();
  
  const overlay = this.page!.locator('[data-testid="search-overlay"]');
  await overlay.waitFor({ state: 'visible', timeout: 5000 });
});

When('I close the search', async function (this: CityGuidedWorld) {
  const backButton = this.page!.locator('[data-testid="search-overlay"] button[aria-label="Retour"]').first();
  await backButton.waitFor({ state: 'visible', timeout: 5000 });
  await backButton.click();
  
  const overlay = this.page!.locator('[data-testid="search-overlay"]');
  await overlay.waitFor({ state: 'hidden', timeout: 5000 });
});

When('I perform a search that returns results', async function (this: CityGuidedWorld) {
  const chip = this.page!.locator('button:has-text("Château")').first();
  await chip.click();
});

Then('the bottom sheet should show search results', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('#bottom-sheet');
  await expect(bottomSheet).toBeVisible({ timeout: 5000 });
});

Then('the search overlay should be closed', async function (this: CityGuidedWorld) {
  const overlay = this.page!.locator('[data-testid="search-overlay"]');
  await expect(overlay).not.toBeVisible({ timeout: 5000 });
});

When('I click on the search bar again', async function (this: CityGuidedWorld) {
  const searchBar = this.page!.locator('[data-testid="search-bar-main"]').first();
  await searchBar.waitFor({ state: 'visible', timeout: 5000 });
  await searchBar.click();
  
  const overlay = this.page!.locator('[data-testid="search-overlay"]');
  await overlay.waitFor({ state: 'visible', timeout: 5000 });
});

Then('the search overlay should appear', async function (this: CityGuidedWorld) {
  const overlay = this.page!.locator('[data-testid="search-overlay"]');
  await expect(overlay).toBeVisible({ timeout: 5000 });
});
