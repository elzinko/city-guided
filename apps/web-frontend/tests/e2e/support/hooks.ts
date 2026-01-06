/**
 * Cucumber Hooks
 * Setup and teardown for test scenarios
 */

import { Before, After, Status } from '@cucumber/cucumber';
import { CityGuidedWorld } from './world';

Before(async function (this: CityGuidedWorld) {
  // Initialize browser before each scenario
  await this.initBrowser();
  await this.createPage();
});

After(async function (this: CityGuidedWorld, { result }) {
  // Take screenshot on failure
  if (result && result.status === Status.FAILED && this.page) {
    const screenshot = await this.page.screenshot();
    this.attach(screenshot, 'image/png');
  }

  // Close browser after each scenario
  await this.closeBrowser();
});
