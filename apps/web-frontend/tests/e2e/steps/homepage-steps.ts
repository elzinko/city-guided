/**
 * Homepage Step Definitions
 * BDD steps for homepage E2E tests
 */

import { Given, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CityGuidedWorld } from '../support/world';

Given('I am on the homepage', async function (this: CityGuidedWorld) {
  await this.goto('/');
});

Then('I should see the map container', async function (this: CityGuidedWorld) {
  const mapContainer = await this.page!.locator('[data-testid="map-container"]');
  await expect(mapContainer).toBeVisible();
});

Then('I should see the search bar', async function (this: CityGuidedWorld) {
  const searchBar = await this.page!.locator('[data-testid="search-bar"]');
  await expect(searchBar).toBeVisible();
});
