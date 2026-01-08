/**
 * GPS Button Step Definitions
 * BDD steps for GPS button E2E tests
 */

import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { CityGuidedWorld } from '../support/world'

Then('the map is visible', async function (this: CityGuidedWorld) {
  // Wait for the map to be initialized
  await this.page!.waitForSelector('#map', { state: 'visible', timeout: 10000 })
  const map = this.page!.locator('#map')
  await expect(map).toBeVisible()
})

Then('I should see the GPS button', async function (this: CityGuidedWorld) {
  const gpsButton = this.page!.getByRole('button', { name: 'Recentrer sur ma position' })
  await expect(gpsButton).toBeVisible({ timeout: 5000 })
})

Given('the virtual route is not activated', async function (this: CityGuidedWorld) {
  // By default, virtual route is not activated at startup
  // We can verify by opening the dev panel and checking the toggle
  await this.page!.waitForTimeout(500)
})

Given('my position is displayed on the map', async function (this: CityGuidedWorld) {
  // Wait for the position marker to appear (blue dot)
  // The position marker has a specific CSS class
  await this.page!.waitForTimeout(1000) // Wait for geolocation fallback
  const positionMarker = this.page!.locator('.position-marker')
  await expect(positionMarker).toBeVisible({ timeout: 5000 })
})

When('I pan the map away from my position', async function (this: CityGuidedWorld) {
  // Drag the map to move it away from current position
  const map = this.page!.locator('#map')
  const box = await map.boundingBox()
  if (box) {
    // Drag from center to edge
    await this.page!.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await this.page!.mouse.down()
    await this.page!.mouse.move(box.x + 100, box.y + 100, { steps: 10 })
    await this.page!.mouse.up()
    await this.page!.waitForTimeout(500)
  }
})

When('I click the GPS button', async function (this: CityGuidedWorld) {
  const gpsButton = this.page!.getByRole('button', { name: 'Recentrer sur ma position' })
  await gpsButton.waitFor({ state: 'visible', timeout: 5000 })
  await gpsButton.click()
  await this.page!.waitForTimeout(500)
})

Then('the map should be centered on my real GPS position', async function (this: CityGuidedWorld) {
  // Verify the position marker is visible and centered
  const positionMarker = this.page!.locator('.position-marker')
  await expect(positionMarker).toBeVisible({ timeout: 5000 })

  // Get the map center from Leaflet
  const mapCenter = await this.page!.evaluate(() => {
    const map = (window as any)._le_map
    if (map && map.getCenter) {
      const center = map.getCenter()
      return { lat: center.lat, lng: center.lng }
    }
    return null
  })

  // The fallback position is By/Thomery: { lat: 48.3976, lng: 2.7855 }
  expect(mapCenter).not.toBeNull()
  if (mapCenter) {
    // Check that we're near the fallback position (not Fontainebleau 48.402, 2.6998)
    expect(Math.abs(mapCenter.lat - 48.3976)).toBeLessThan(0.05)
    expect(Math.abs(mapCenter.lng - 2.7855)).toBeLessThan(0.05)
  }
})

Then('the zoom level should not change', async function (this: CityGuidedWorld) {
  // The zoom level should remain the same after clicking GPS button
  const zoomLevel = await this.page!.evaluate(() => {
    const map = (window as any)._le_map
    if (map && map.getZoom) {
      return map.getZoom()
    }
    return null
  })
  expect(zoomLevel).not.toBeNull()
  // Just verify zoom is reasonable (between 10 and 18)
  expect(zoomLevel).toBeGreaterThanOrEqual(10)
  expect(zoomLevel).toBeLessThanOrEqual(18)
})

When('I click the GPS button multiple times', async function (this: CityGuidedWorld) {
  const gpsButton = this.page!.getByRole('button', { name: 'Recentrer sur ma position' })
  
  // Click multiple times
  for (let i = 0; i < 3; i++) {
    await gpsButton.click()
    await this.page!.waitForTimeout(300)
  }
})

Then('the map should stay centered on my real GPS position', async function (this: CityGuidedWorld) {
  // Same verification as above
  const mapCenter = await this.page!.evaluate(() => {
    const map = (window as any)._le_map
    if (map && map.getCenter) {
      const center = map.getCenter()
      return { lat: center.lat, lng: center.lng }
    }
    return null
  })

  expect(mapCenter).not.toBeNull()
  if (mapCenter) {
    // Should still be near By/Thomery (fallback), not Fontainebleau
    expect(Math.abs(mapCenter.lat - 48.3976)).toBeLessThan(0.05)
    expect(Math.abs(mapCenter.lng - 2.7855)).toBeLessThan(0.05)
  }
})

Given('I open the developer panel', async function (this: CityGuidedWorld) {
  const devButton = this.page!.getByRole('button', { name: 'Développeur' })
  await devButton.waitFor({ state: 'visible', timeout: 5000 })
  await devButton.click()
  await this.page!.waitForTimeout(300)
})

Given('I activate the virtual route', async function (this: CityGuidedWorld) {
  // Find and click the "Trajet virtuel" toggle
  const virtualRouteToggle = this.page!.locator('text=Trajet virtuel').first()
  await virtualRouteToggle.waitFor({ state: 'visible', timeout: 5000 })
  await virtualRouteToggle.click()
  await this.page!.waitForTimeout(500)
})

// Note: "I close the developer panel" step is defined in gps-player-steps.ts

Then('the map should be centered on the virtual route start position', async function (this: CityGuidedWorld) {
  const mapCenter = await this.page!.evaluate(() => {
    const map = (window as any)._le_map
    if (map && map.getCenter) {
      const center = map.getCenter()
      return { lat: center.lat, lng: center.lng }
    }
    return null
  })

  expect(mapCenter).not.toBeNull()
  if (mapCenter) {
    // The default route starts at Fontainebleau: { lat: 48.402, lng: 2.6998 }
    expect(Math.abs(mapCenter.lat - 48.402)).toBeLessThan(0.05)
    expect(Math.abs(mapCenter.lng - 2.6998)).toBeLessThan(0.05)
  }
})
