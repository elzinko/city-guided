/**
 * Cucumber Hooks
 * Setup and teardown for test scenarios
 */

import { Before, After, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { CityGuidedWorld } from './world';
import { waitForServer } from './server';

// Increased timeout for server startup and page loads
setDefaultTimeout(30 * 1000);

// Track if server has been checked (global state)
let serverChecked = false;
let serverCheckPromise: Promise<void> | null = null;

Before(async function (this: CityGuidedWorld) {
  // Wait for server to be ready (only once, before first test)
  if (!serverChecked) {
    if (!serverCheckPromise) {
      const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3080';
      serverCheckPromise = waitForServer(baseUrl).then(() => {
        serverChecked = true;
      });
    }
    await serverCheckPromise;
  }
  
  await this.initBrowser();
  await this.createPage();
});

After(async function (this: CityGuidedWorld, { result }) {
  if (result && result.status === Status.FAILED && this.page) {
    const screenshot = await this.page.screenshot();
    this.attach(screenshot, 'image/png');
  }
  await this.closeBrowser();
});
