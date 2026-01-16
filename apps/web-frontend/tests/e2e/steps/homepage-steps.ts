/**
 * Homepage Step Definitions
 * BDD steps for homepage E2E tests
 */

import { Given, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CityGuidedWorld } from '../support/world';

Given('I am on the homepage', async function (this: CityGuidedWorld) {
  await this.goto('/');
  // Wait for page to be fully loaded
  await this.page!.waitForLoadState('networkidle');
});

Then('I should see the homepage container', async function (this: CityGuidedWorld) {
  const homepage = this.page!.locator('[data-testid="homepage"]');
  await expect(homepage).toBeVisible({ timeout: 10000 });
});

Then('I should see the map container', async function (this: CityGuidedWorld) {
  const mapContainer = this.page!.locator('[data-testid="map-container"]');
  await expect(mapContainer).toBeVisible({ timeout: 10000 });
});

Then('I should see the search bar', async function (this: CityGuidedWorld) {
  const searchBar = this.page!.locator('[data-testid="search-bar-main"]');
  await expect(searchBar).toBeVisible({ timeout: 10000 });
});
