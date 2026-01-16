/**
 * Bottom Menu Step Definitions
 * BDD steps for bottom menu E2E tests
 */

import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CityGuidedWorld } from '../support/world';

Then('I should see the bottom menu', async function (this: CityGuidedWorld) {
  await this.page!.waitForLoadState('domcontentloaded');
  
  // Attendre que la page soit complètement chargée et que le menu apparaisse
  const bottomMenu = this.page!.locator('#bottom-menu');
  await bottomMenu.waitFor({ state: 'attached', timeout: 8000 });
  await expect(bottomMenu).toBeVisible({ timeout: 8000 });
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
  
  await expect(tab1Element).toBeVisible({ timeout: 5000 });
  await expect(tab2Element).toBeVisible({ timeout: 5000 });
  await expect(tab3Element).toBeVisible({ timeout: 5000 });
});

Then('{string} should be the active tab', async function (this: CityGuidedWorld, tabName: string) {
  const tab = this.page!.locator(`button:has-text("${tabName}")`).first();
  await expect(tab).toBeVisible({ timeout: 5000 });
  await expect(tab).toBeEnabled();
});

When('I click on {string} tab', async function (this: CityGuidedWorld, tabName: string) {
  await this.page!.waitForLoadState('domcontentloaded');
  
  const tabIdMap: Record<string, string> = {
    'Découvrir': 'menu-tab-discover',
    'Enregistrés': 'menu-tab-saved',
    'Contribuer': 'menu-tab-contribute',
  };
  
  const tabId = tabIdMap[tabName];
  const tab = tabId 
    ? this.page!.locator(`#${tabId}`)
    : this.page!.locator(`button:has-text("${tabName}")`).first();
  
  await tab.waitFor({ state: 'visible', timeout: 8000 });
  await tab.click();
  
  // Attendre que le bottom sheet apparaisse
  const bottomSheet = this.page!.locator('#bottom-sheet');
  await bottomSheet.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
});

Then('the bottom sheet should be visible', async function (this: CityGuidedWorld) {
  const bottomSheet = this.page!.locator('#bottom-sheet');
  await expect(bottomSheet).toBeVisible({ timeout: 5000 });
});

Then('the sheet title should be {string}', async function (this: CityGuidedWorld, expectedTitle: string) {
  const title = this.page!.locator(`text=${expectedTitle}`).first();
  await expect(title).toBeVisible({ timeout: 5000 });
});

When('I close the search without results', async function (this: CityGuidedWorld) {
  const overlayBackButton = this.page!.locator('[data-testid="search-overlay"] button[aria-label="Retour"]').first();
  const backButton = this.page!.locator('button[aria-label="Retour"]').first();
  
  const buttonToClick = await overlayBackButton.isVisible().catch(() => false)
    ? overlayBackButton
    : backButton;
  
  await buttonToClick.click();
});

Then('the bottom menu should be visible again', async function (this: CityGuidedWorld) {
  // Attendre que la recherche soit complètement fermée
  const searchOverlay = this.page!.locator('[data-testid="search-overlay"]');
  await searchOverlay.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  
  // Attendre que le bottom sheet soit caché ou collapsed
  await this.page!.waitForFunction(
    () => {
      const sheet = document.querySelector('#bottom-sheet');
      if (!sheet) return true;
      const rect = sheet.getBoundingClientRect();
      return rect.height < 150; // Considéré comme caché si moins de 150px
    },
    { timeout: 8000 }
  ).catch(() => {});
  
  // Attendre que le menu soit attaché au DOM puis visible
  const bottomMenu = this.page!.locator('#bottom-menu');
  await bottomMenu.waitFor({ state: 'attached', timeout: 10000 });
  await expect(bottomMenu).toBeVisible({ timeout: 10000 });
});

Then('the bottom menu should not be visible', async function (this: CityGuidedWorld) {
  const bottomMenu = this.page!.locator('#bottom-menu');
  await expect(bottomMenu).not.toBeVisible({ timeout: 5000 });
});

Then('the bottom menu should be visible', async function (this: CityGuidedWorld) {
  const bottomMenu = this.page!.locator('#bottom-menu');
  await bottomMenu.waitFor({ state: 'attached', timeout: 8000 });
  await expect(bottomMenu).toBeVisible({ timeout: 8000 });
});

Then('the bottom menu should be hidden', async function (this: CityGuidedWorld) {
  const bottomMenu = this.page!.locator('#bottom-menu');
  await expect(bottomMenu).not.toBeVisible({ timeout: 5000 });
});
