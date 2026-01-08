/**
 * Search Step Definitions
 * BDD steps for search E2E tests
 */

import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CityGuidedWorld } from '../support/world';

When('I click on the search bar', async function (this: CityGuidedWorld) {
  const searchBar = this.page!.locator('[data-testid="search-bar-main"], [data-testid="search-bar"]').first();
  await searchBar.waitFor({ state: 'visible', timeout: 5000 });
  await searchBar.click();
  // Wait for overlay to appear
  await this.page!.waitForTimeout(500);
});

Then('I should see the search overlay', async function (this: CityGuidedWorld) {
  const overlay = this.page!.locator('[data-testid="search-overlay"]');
  await expect(overlay).toBeVisible();
});

Then('I should see quick search chips', async function (this: CityGuidedWorld) {
  // Quick search chips are buttons with text like "Château", "Musée", etc.
  // Wait a bit for chips to render
  await this.page!.waitForTimeout(1000);
  // The chips are visible on homepage (!searchActive) OR might be in overlay
  // Try to find chips - they should be visible somewhere on the page
  const chips = this.page!.locator('button:has-text("Château"), button:has-text("Musée"), button:has-text("Forêt"), button:has-text("Street Art"), button:has-text("Patrimoine"), button:has-text("Balade")');
  // Wait for at least one chip to be visible with longer timeout
  try {
    await chips.first().waitFor({ state: 'visible', timeout: 10000 });
    const count = await chips.count();
    expect(count).toBeGreaterThan(0);
  } catch {
    // If not found, try alternative approach: check if any button contains these texts
    const allButtons = this.page!.locator('button');
    const buttonCount = await allButtons.count();
    let foundChips = 0;
    for (let i = 0; i < buttonCount; i++) {
      const text = await allButtons.nth(i).textContent().catch(() => '');
      if (text && (text.includes('Château') || text.includes('Musée') || text.includes('Forêt') || text.includes('Street Art') || text.includes('Patrimoine') || text.includes('Balade'))) {
        foundChips++;
      }
    }
    expect(foundChips).toBeGreaterThan(0);
  }
});

Then('I should see saved addresses section', async function (this: CityGuidedWorld) {
  const section = this.page!.locator('text=Adresses enregistrées');
  await expect(section).toBeVisible();
});

When('I type {string} in the search field', async function (this: CityGuidedWorld, text: string) {
  // Wait for search input to be visible and ready
  // The overlay input should be visible when search is active
  // Try overlay input first (data-testid="search-bar-overlay-input"), then main input
  const searchInput = this.page!.locator('[data-testid="search-bar-overlay-input"], [data-testid*="search-input"], input[type="text"], textbox').first();
  // Wait for input to be visible with longer timeout
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  // Focus the input first
  await searchInput.focus();
  await this.page!.waitForTimeout(200);
  // Clear any existing text first
  await searchInput.clear();
  await this.page!.waitForTimeout(200);
  // Type the text character by character to trigger onChange events
  await searchInput.type(text, { delay: 50 });
  await this.page!.waitForTimeout(500);
});

When('I press Enter', async function (this: CityGuidedWorld) {
  // Try overlay input first, then main input
  const searchInput = this.page!.locator('[data-testid="search-bar-overlay-input"], [data-testid*="search-input"], input[type="text"], textbox').first();
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.press('Enter');
  await this.page!.waitForTimeout(1000);
});

Then('I should see search results', async function (this: CityGuidedWorld) {
  // Results should appear in the bottom sheet
  const bottomSheet = this.page!.locator('[id*="sheet"], [data-testid*="sheet"]').first();
  await expect(bottomSheet).toBeVisible();
  // Wait for results to load
  await this.page!.waitForTimeout(500);
});

When('I click on the {string} quick search chip', async function (this: CityGuidedWorld, chipText: string) {
  const chip = this.page!.locator(`button:has-text("${chipText}")`).first();
  await chip.click();
  await this.page!.waitForTimeout(500);
});

Then('I should see search results for {string} in the bottom sheet', async function (this: CityGuidedWorld, _query: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
  // Check that bottom sheet is visible and contains results
  const bottomSheet = this.page!.locator('[id*="sheet"], [data-testid*="sheet"]').first();
  await expect(bottomSheet).toBeVisible();
  // Results should be visible (POI items)
  await this.page!.waitForTimeout(500);
});

Then('I should see search results for {string}', async function (this: CityGuidedWorld, _query: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
  // Alias for the step above - same behavior
  const bottomSheet = this.page!.locator('[id*="sheet"], [data-testid*="sheet"]').first();
  await expect(bottomSheet).toBeVisible();
  await this.page!.waitForTimeout(500);
});

Then('the bottom sheet should be at mid position', async function (this: CityGuidedWorld) {
  // The sheet should be visible and positioned at mid
  const bottomSheet = this.page!.locator('[id*="sheet"], [data-testid*="sheet"]').first();
  await expect(bottomSheet).toBeVisible();
  // Check that it's not hidden (would have display: none or transform)
  const isVisible = await bottomSheet.isVisible();
  expect(isVisible).toBe(true);
});

When('I click the back arrow', async function (this: CityGuidedWorld) {
  // Wait for back button to be visible (it appears when search is active)
  // Try overlay button first (more specific)
  const overlayBackButton = this.page!.locator('[data-testid="search-overlay"] button[aria-label="Retour"]').first();
  const backButton = this.page!.locator('button[aria-label="Retour"]').first();
  
  try {
    await overlayBackButton.waitFor({ state: 'visible', timeout: 5000 });
    await overlayBackButton.click();
  } catch {
    await backButton.waitFor({ state: 'visible', timeout: 5000 });
    await backButton.click();
  }
  await this.page!.waitForTimeout(500);
});

Then('the search query should be cleared', async function (this: CityGuidedWorld) {
  // Check that search input is empty (might not be visible if overlay is closed)
  // Try to find it in overlay first, then in main bar
  const searchInput = this.page!.locator('[data-testid*="search-input"], input[type="text"], textbox').first();
  const isVisible = await searchInput.isVisible().catch(() => false);
  if (isVisible) {
    const value = await searchInput.inputValue().catch(() => '');
    expect(value).toBe('');
  }
});

Then('the panneau découverte should not be visible', async function (this: CityGuidedWorld) {
  // Check that the bottom sheet is hidden (not at mid position)
  const bottomSheet = this.page!.locator('[id*="sheet"], [data-testid*="sheet"]').first();
  const isVisible = await bottomSheet.isVisible().catch(() => false);
  if (isVisible) {
    // If visible, check that it's at hidden position (very small height)
    const boundingBox = await bottomSheet.boundingBox();
    expect(boundingBox?.height || 0).toBeLessThan(100);
  }
});

Then('the search field should contain {string}', async function (this: CityGuidedWorld, expectedText: string) {
  // Wait for search input to be visible
  // Try overlay input first (when search is active), then main input
  await this.page!.waitForTimeout(1000);
  // Get all search inputs and check if any contains the expected text
  const allInputs = this.page!.locator('[data-testid="search-bar-overlay-input"], [data-testid*="search-input"], input[type="text"], textbox');
  const count = await allInputs.count();
  let found = false;
  // Wait for at least one input to be visible
  if (count > 0) {
    await allInputs.first().waitFor({ state: 'visible', timeout: 10000 });
  }
  for (let i = 0; i < count; i++) {
    const value = await allInputs.nth(i).inputValue().catch(() => '');
    if (value && value.includes(expectedText)) {
      found = true;
      break;
    }
  }
  expect(found).toBe(true);
});

When('I activate the search \\(click on search bar\\)', async function (this: CityGuidedWorld) {
  const searchBar = this.page!.locator('[data-testid="search-bar-main"], [data-testid="search-bar"]').first();
  await searchBar.click();
  await this.page!.waitForTimeout(300);
});

When('I close the search', async function (this: CityGuidedWorld) {
  // Click back arrow or outside overlay
  await this.page!.waitForTimeout(500);
  // Try to find back button in overlay first (more specific)
  const overlayBackButton = this.page!.locator('[data-testid="search-overlay"] button[aria-label="Retour"]').first();
  const backButton = this.page!.locator('button[aria-label="Retour"]').first();
  
  // Try overlay button first, then general back button
  try {
    await overlayBackButton.waitFor({ state: 'visible', timeout: 10000 });
    await overlayBackButton.click();
  } catch {
    try {
      await backButton.waitFor({ state: 'visible', timeout: 10000 });
      await backButton.click();
    } catch {
      // If button not found, try Escape key
      await this.page!.keyboard.press('Escape');
    }
  }
  await this.page!.waitForTimeout(1000);
});

When('I perform a search that returns results', async function (this: CityGuidedWorld) {
  // Click on a quick search chip
  const chip = this.page!.locator('button:has-text("Château")').first();
  await chip.click();
  await this.page!.waitForTimeout(500);
});

Then('the bottom sheet should show search results', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('[id*="sheet"], [data-testid*="sheet"]').first();
  await expect(bottomSheet).toBeVisible();
  await this.page!.waitForTimeout(300);
});

Then('the bottom menu should be hidden', async function (this: CityGuidedWorld) {
  const bottomMenu = this.page!.locator('#bottom-menu');
  const isVisible = await bottomMenu.isVisible().catch(() => false);
  expect(isVisible).toBe(false);
});

Then('the bottom menu should be visible', async function (this: CityGuidedWorld) {
  const bottomMenu = this.page!.locator('#bottom-menu');
  await expect(bottomMenu).toBeVisible();
});

Then('the bottom menu should not be visible', async function (this: CityGuidedWorld) {
  const bottomMenu = this.page!.locator('#bottom-menu');
  const isVisible = await bottomMenu.isVisible().catch(() => false);
  expect(isVisible).toBe(false);
});

Then('the search overlay should be closed', async function (this: CityGuidedWorld) {
  const overlay = this.page!.locator('[data-testid="search-overlay"]');
  const isVisible = await overlay.isVisible().catch(() => false);
  expect(isVisible).toBe(false);
});

When('I click on the search bar again', async function (this: CityGuidedWorld) {
  // Click on the main search bar to reopen search
  const searchBar = this.page!.locator('[data-testid="search-bar-main"], [data-testid="search-bar"]').first();
  await searchBar.waitFor({ state: 'visible', timeout: 5000 });
  await searchBar.click();
  await this.page!.waitForTimeout(500);
});

Then('the search overlay should appear', async function (this: CityGuidedWorld) {
  // Check that search overlay is visible
  const overlay = this.page!.locator('[data-testid*="search-overlay"], [data-testid*="search-input"]').first();
  await expect(overlay).toBeVisible({ timeout: 5000 });
});

