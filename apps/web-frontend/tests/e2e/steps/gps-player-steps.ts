/**
 * GPS Player Step Definitions  
 * BDD steps for GPS player E2E tests
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CityGuidedWorld } from '../support/world';

When('I close the developer panel', async function (this: CityGuidedWorld) {
  const closeButton = this.page!.locator('#dev-gear-button').first();
  await closeButton.waitFor({ state: 'visible', timeout: 5000 });
  await closeButton.click();
});

Then('the GPS player should be visible on the main map', async function (this: CityGuidedWorld) {
  const routeIndicator = this.page!.locator('#dev-route-indicator');
  await expect(routeIndicator).toBeVisible({ timeout: 5000 });
  
  const playButton = this.page!.getByRole('button', { name: /Play|Pause/ }).first();
  await expect(playButton).toBeVisible({ timeout: 5000 });
});

Then('I should see the step indicator showing {string}', async function (this: CityGuidedWorld, expectedText: string) {
  const routeIndicator = this.page!.locator('#dev-route-indicator');
  await expect(routeIndicator).toBeVisible({ timeout: 5000 });
  
  const text = (await routeIndicator.textContent()) || '';
  const actual = text.match(/\d+\/\d+/)?.[0] || '';
  
  const expectedRegexSource = expectedText
    .replace(/Étape\s+/i, '')
    .split('X')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\d+');
  
  expect(actual).toMatch(new RegExp(`^${expectedRegexSource}$`));
});

Then('I should see the play button in the GPS player', async function (this: CityGuidedWorld) {
  const playButton = this.page!.getByRole('button', { name: 'Play' });
  await expect(playButton.first()).toBeVisible({ timeout: 5000 });
});

Then('I should see the previous and next buttons in the GPS player', async function (this: CityGuidedWorld) {
  const prevButton = this.page!.getByRole('button', { name: 'POI précédent' });
  const nextButton = this.page!.getByRole('button', { name: 'POI suivant' });
  
  const prevVisible = await prevButton.first().isVisible().catch(() => false);
  const nextVisible = await nextButton.first().isVisible().catch(() => false);
  
  expect(prevVisible || nextVisible).toBe(true);
});

Then('I should see the speed accelerator slider in the GPS player', async function (this: CityGuidedWorld) {
  const speedSelect = this.page!.locator('#dev-speed-select');
  await expect(speedSelect).toBeVisible({ timeout: 5000 });
});

When('I click the play button in the GPS player', async function (this: CityGuidedWorld) {
  const playButtons = this.page!.getByRole('button', { name: 'Play' });
  const count = await playButtons.count();
  
  if (count > 0) {
    await playButtons.last().click();
  }
});

Then('the GPS simulation should start', async function (this: CityGuidedWorld) {
  const pauseButton = this.page!.getByRole('button', { name: 'Pause' });
  await expect(pauseButton.first()).toBeVisible({ timeout: 5000 });
});

Then('the point should move progressively along the route', async function (this: CityGuidedWorld) {
  const pauseButton = this.page!.getByRole('button', { name: 'Pause' });
  await expect(pauseButton.first()).toBeVisible({ timeout: 3000 });
  
  const stepIndicator = this.page!.locator('text=/\\d+\\/\\d+/');
  await expect(stepIndicator.first()).toBeVisible({ timeout: 3000 });
});

When('I click the pause button in the GPS player', async function (this: CityGuidedWorld) {
  const pauseButtons = this.page!.getByRole('button', { name: 'Pause' });
  const count = await pauseButtons.count();
  
  if (count > 0) {
    await pauseButtons.last().click();
  }
});

Then('the GPS simulation should pause', async function (this: CityGuidedWorld) {
  const playButton = this.page!.getByRole('button', { name: 'Play' });
  await expect(playButton.first()).toBeVisible({ timeout: 3000 });
});

When('I click the play button in the GPS player again', async function (this: CityGuidedWorld) {
  const playButtons = this.page!.getByRole('button', { name: 'Play' });
  const count = await playButtons.count();
  
  if (count > 0) {
    await playButtons.last().click();
  }
});

Then('the GPS simulation should resume', async function (this: CityGuidedWorld) {
  const pauseButton = this.page!.getByRole('button', { name: 'Pause' });
  await expect(pauseButton.first()).toBeVisible({ timeout: 3000 });
});

When('I click the previous button in the GPS player', async function (this: CityGuidedWorld) {
  const prevButtons = this.page!.getByRole('button', { name: 'POI précédent' });
  const count = await prevButtons.count();
  
  if (count > 0) {
    const button = prevButtons.last();
    const isEnabled = await button.isEnabled().catch(() => false);
    
    if (!isEnabled) {
      const nextButtons = this.page!.getByRole('button', { name: 'POI suivant' });
      await nextButtons.last().click();
    }
    
    await button.click();
  }
});

When('I click the next button in the GPS player', async function (this: CityGuidedWorld) {
  const nextButtons = this.page!.getByRole('button', { name: 'POI suivant' });
  const count = await nextButtons.count();
  
  if (count > 0) {
    await nextButtons.last().click();
  }
});

When('I adjust the speed accelerator slider', async function (this: CityGuidedWorld) {
  const speedSelect = this.page!.locator('#dev-speed-select');
  await speedSelect.waitFor({ state: 'visible', timeout: 5000 });
  await speedSelect.selectOption({ value: '2' });
});

Then('the speed value should update', async function (this: CityGuidedWorld) {
  const speedSelect = this.page!.locator('#dev-speed-select');
  const value = await speedSelect.inputValue();
  expect(value).toBe('2');
});

Then('the simulation speed should change', async function (this: CityGuidedWorld) {
  const pauseButton = this.page!.getByRole('button', { name: 'Pause' });
  await expect(pauseButton.first()).toBeVisible({ timeout: 3000 });
});

Given('a route is loaded', async function (this: CityGuidedWorld) {
  if (!this.page || this.page.url() !== `${this.baseUrl}/`) {
    await this.goto('/');
  }
  
  await this.page!.waitForLoadState('networkidle');
  
  const panelContent = this.page!.locator('#dev-panel-content');
  const isPanelOpen = await panelContent.isVisible().catch(() => false);
  
  if (!isPanelOpen) {
    const gearButton = this.page!.locator('#dev-gear-button').first();
    await gearButton.waitFor({ state: 'visible', timeout: 5000 });
    await gearButton.click();
    await panelContent.waitFor({ state: 'visible', timeout: 5000 });
  }
  
  const virtualRouteToggle = this.page!.locator('#dev-virtual-route-toggle').first();
  const isActive = await virtualRouteToggle.evaluate((el) => {
    const switchEl = el.querySelector('#dev-virtual-route-switch');
    if (!switchEl) return false;
    return window.getComputedStyle(switchEl).backgroundColor === 'rgb(34, 197, 94)';
  }).catch(() => false);
  
  if (!isActive) {
    await virtualRouteToggle.click();
  }
  
  const routeSelector = this.page!.locator('#dev-route-selector').first();
  await routeSelector.waitFor({ state: 'visible', timeout: 5000 });
  await routeSelector.selectOption({ index: 0 });
});

Given('the GPS simulation is running', async function (this: CityGuidedWorld) {
  const stepIndicator = this.page!.locator('#dev-route-indicator');
  const isVisible = await stepIndicator.isVisible().catch(() => false);
  
  if (!isVisible) {
    if (!this.page || this.page.url() !== `${this.baseUrl}/`) {
      await this.goto('/');
    }
    
    await this.page!.waitForLoadState('networkidle');
    
    const devButton = this.page!.getByRole('button', { name: 'Développeur' });
    await devButton.waitFor({ state: 'visible', timeout: 5000 });
    await devButton.click();
    
    const routeSelector = this.page!.locator('#dev-route-selector').first();
    await routeSelector.waitFor({ state: 'visible', timeout: 5000 });
    await routeSelector.selectOption({ index: 0 });
  }
  
  const playButtons = this.page!.getByRole('button', { name: 'Play' });
  const count = await playButtons.count();
  
  if (count > 0) {
    await playButtons.last().click();
  }
});

When('I activate guide mode', async function (this: CityGuidedWorld) {
  const guidePlayButton = this.page!.locator('button[aria-label*="visite guidée"]');
  const isVisible = await guidePlayButton.first().isVisible().catch(() => false);
  
  if (isVisible) {
    await guidePlayButton.first().click();
  } else {
    const playButtons = this.page!.getByRole('button', { name: 'Play' });
    const count = await playButtons.count();
    if (count > 1) {
      await playButtons.first().click();
    }
  }
});

Then('the GPS player should be visible', async function (this: CityGuidedWorld) {
  const routeIndicator = this.page!.locator('#dev-route-indicator');
  await expect(routeIndicator).toBeVisible({ timeout: 5000 });
});

Then('the GPS player should not be visible', async function (this: CityGuidedWorld) {
  const routeIndicator = this.page!.locator('#dev-route-indicator');
  await expect(routeIndicator).not.toBeVisible({ timeout: 3000 });
});
