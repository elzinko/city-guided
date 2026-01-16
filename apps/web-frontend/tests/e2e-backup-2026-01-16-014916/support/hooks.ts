/**
 * Cucumber Hooks
 * Setup and teardown for test scenarios
 */

import { Before, After, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { CityGuidedWorld } from './world';

// Set default timeout to 10 seconds for all steps (reduced for faster test execution)
setDefaultTimeout(10 * 1000);

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
