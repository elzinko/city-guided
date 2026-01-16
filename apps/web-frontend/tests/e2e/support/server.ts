/**
 * Server Health Check for E2E Tests
 * Verifies that the server is ready before running tests.
 * The server MUST be started before running tests (via pnpm dev or docker:start).
 */

import * as http from 'http';

const HEALTH_CHECK_TIMEOUT = 60000; // 60 seconds
const HEALTH_CHECK_INTERVAL = 1000; // 1 second

/**
 * Check if the server is responding
 */
async function checkServerHealth(baseUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const url = new URL(baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/',
      method: 'GET',
      timeout: 2000,
    };

    const req = http.request(options, (res) => {
      // 200 = OK, 404 = server running but route not found (also OK)
      resolve(res.statusCode === 200 || res.statusCode === 404);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Wait for server to be ready
 * Throws an error if the server is not ready within the timeout.
 * 
 * @param baseUrl - Base URL of the server (e.g., http://localhost:3080)
 * @param timeout - Maximum time to wait in milliseconds (default: 60s)
 * @throws Error if server is not ready within timeout
 */
export async function waitForServer(
  baseUrl: string = 'http://localhost:3080',
  timeout: number = HEALTH_CHECK_TIMEOUT
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await checkServerHealth(baseUrl)) {
      console.log(`✅ Server is ready at ${baseUrl}`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
  }

  throw new Error(
    `❌ Server did not become ready within ${timeout}ms at ${baseUrl}\n` +
    `   Make sure to start the server before running tests:\n` +
    `   - Local: pnpm docker:start local (or pnpm dev)\n` +
    `   - CI: pnpm docker:start ci`
  );
}
