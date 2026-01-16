/**
 * Cucumber Hooks
 * Setup and teardown for test scenarios
 */

import { Before, After, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { CityGuidedWorld } from './world';
import { startServer, stopServer, isServerReady } from './server';

// Increased timeout for server startup and page loads
setDefaultTimeout(30 * 1000);

// Track if server has been started (global state)
let serverStarted = false;
let serverStartPromise: Promise<void> | null = null;

Before(async function (this: CityGuidedWorld) {
  // Start server only once (before first test)
  if (!serverStarted && !isServerReady()) {
    if (!serverStartPromise) {
      const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3080';
      serverStartPromise = startServer(baseUrl).then(() => {
        serverStarted = true;
      });
    }
    await serverStartPromise;
  } else if (!isServerReady()) {
    // Server was started but not ready yet, wait a bit
    await new Promise((resolve) => setTimeout(resolve, 1000));
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

// Register cleanup on process exit
process.on('SIGINT', async () => {
  if (serverStarted) {
    await stopServer();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (serverStarted) {
    await stopServer();
  }
  process.exit(0);
});

// Cleanup on normal exit (after all tests)
process.on('exit', async () => {
  if (serverStarted) {
    await stopServer();
  }
});
