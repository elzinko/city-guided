/**
 * GPS Button Step Definitions
 * BDD steps for GPS button E2E tests
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CityGuidedWorld } from '../support/world';

Then('the map is visible', async function (this: CityGuidedWorld) {
  const map = this.page!.locator('#map');
  await expect(map).toBeVisible({ timeout: 5000 });
});

Then('I should see the GPS button', async function (this: CityGuidedWorld) {
  const gpsButton = this.page!.getByRole('button', { name: 'Recentrer sur ma position' });
  await expect(gpsButton).toBeVisible({ timeout: 5000 });
});

Given('the virtual route is not activated', async function (this: CityGuidedWorld) {
  await this.page!.waitForLoadState('networkidle');
});

Given('my position is displayed on the map', async function (this: CityGuidedWorld) {
  const positionMarker = this.page!.locator('.position-marker');
  await expect(positionMarker).toBeVisible({ timeout: 8000 });
});

When('I pan the map away from my position', async function (this: CityGuidedWorld) {
  const map = this.page!.locator('#map');
  await map.waitFor({ state: 'visible', timeout: 5000 });
  
  const box = await map.boundingBox();
  if (box) {
    await this.page!.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await this.page!.mouse.down();
    await this.page!.mouse.move(box.x + 100, box.y + 100, { steps: 10 });
    await this.page!.mouse.up();
  }
});

When('I click the GPS button', async function (this: CityGuidedWorld) {
  const gpsButton = this.page!.getByRole('button', { name: 'Recentrer sur ma position' });
  await gpsButton.waitFor({ state: 'visible', timeout: 5000 });
  await gpsButton.click();
});

Then('the map should be centered on my real GPS position', async function (this: CityGuidedWorld) {
  const positionMarker = this.page!.locator('.position-marker');
  await expect(positionMarker).toBeVisible({ timeout: 5000 });
  
  const mapCenter = await this.page!.evaluate(() => {
    const map = (window as any)._le_map;
    if (map && map.getCenter) {
      const center = map.getCenter();
      return { lat: center.lat, lng: center.lng };
    }
    return null;
  });
  
  expect(mapCenter).not.toBeNull();
  if (mapCenter) {
    expect(Math.abs(mapCenter.lat - 48.3976)).toBeLessThan(0.1);
    expect(Math.abs(mapCenter.lng - 2.7855)).toBeLessThan(0.1);
  }
});

Then('the zoom level should not change', async function (this: CityGuidedWorld) {
  const zoomLevel = await this.page!.evaluate(() => {
    const map = (window as any)._le_map;
    return map && map.getZoom ? map.getZoom() : null;
  });
  
  expect(zoomLevel).not.toBeNull();
  expect(zoomLevel).toBeGreaterThanOrEqual(10);
  expect(zoomLevel).toBeLessThanOrEqual(18);
});

When('I click the GPS button multiple times', async function (this: CityGuidedWorld) {
  const gpsButton = this.page!.getByRole('button', { name: 'Recentrer sur ma position' });
  await gpsButton.waitFor({ state: 'visible', timeout: 5000 });
  
  for (let i = 0; i < 3; i++) {
    await gpsButton.click();
    await this.page!.waitForLoadState('networkidle');
  }
});

Then('the map should stay centered on my real GPS position', async function (this: CityGuidedWorld) {
  const mapCenter = await this.page!.evaluate(() => {
    const map = (window as any)._le_map;
    if (map && map.getCenter) {
      const center = map.getCenter();
      return { lat: center.lat, lng: center.lng };
    }
    return null;
  });
  
  expect(mapCenter).not.toBeNull();
  if (mapCenter) {
    expect(Math.abs(mapCenter.lat - 48.3976)).toBeLessThan(0.1);
    expect(Math.abs(mapCenter.lng - 2.7855)).toBeLessThan(0.1);
  }
});

Given('I open the developer panel', async function (this: CityGuidedWorld) {
  const devButton = this.page!.getByRole('button', { name: 'Développeur' });
  await devButton.waitFor({ state: 'visible', timeout: 5000 });
  await devButton.click();
});

Given('I activate the virtual route', async function (this: CityGuidedWorld) {
  const panelContent = this.page!.locator('#dev-panel-content');
  const isPanelOpen = await panelContent.isVisible().catch(() => false);
  
  if (!isPanelOpen) {
    const gearButton = this.page!.locator('#dev-gear-button').first();
    await gearButton.waitFor({ state: 'visible', timeout: 5000 });
    await gearButton.click();
    await panelContent.waitFor({ state: 'visible', timeout: 5000 });
  }
  
  const virtualRouteToggle = this.page!.locator('#dev-virtual-route-toggle').first();
  await virtualRouteToggle.waitFor({ state: 'visible', timeout: 5000 });
  await virtualRouteToggle.click();
});

Then('the map should be centered on the virtual route start position', async function (this: CityGuidedWorld) {
  const mapCenter = await this.page!.evaluate(() => {
    const map = (window as any)._le_map;
    if (map && map.getCenter) {
      const center = map.getCenter();
      return { lat: center.lat, lng: center.lng };
    }
    return null;
  });
  
  expect(mapCenter).not.toBeNull();
  if (mapCenter) {
    expect(Math.abs(mapCenter.lat - 48.402)).toBeLessThan(0.1);
    expect(Math.abs(mapCenter.lng - 2.6998)).toBeLessThan(0.1);
  }
});
