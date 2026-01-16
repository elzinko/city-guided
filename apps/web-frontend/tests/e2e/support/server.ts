/**
 * Server Management for E2E Tests
 * Handles starting and stopping the Next.js development server
 */

import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';

const DEFAULT_PORT = 3080;
const DEFAULT_BASE_URL = `http://localhost:${DEFAULT_PORT}`;
const HEALTH_CHECK_TIMEOUT = 60000; // 60 seconds
const HEALTH_CHECK_INTERVAL = 1000; // 1 second

let serverProcess: ChildProcess | null = null;
let serverReady = false;

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
      resolve(res.statusCode === 200 || res.statusCode === 404); // 404 is OK, means server is running
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
 */
async function waitForServer(baseUrl: string, timeout: number): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await checkServerHealth(baseUrl)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
  }

  throw new Error(`Server did not become ready within ${timeout}ms at ${baseUrl}`);
}

/**
 * Start the Next.js development server
 */
export async function startServer(
  baseUrl: string = DEFAULT_BASE_URL,
  port: number = DEFAULT_PORT
): Promise<void> {
  // Check if server is already running
  if (await checkServerHealth(baseUrl)) {
    console.log(`✅ Server already running at ${baseUrl}`);
    serverReady = true;
    return;
  }

  // Double-check with a small delay (server might be starting)
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (await checkServerHealth(baseUrl)) {
    console.log(`✅ Server already running at ${baseUrl}`);
    serverReady = true;
    return;
  }

  console.log(`🚀 Starting Next.js server on port ${port}...`);

  // Set environment variables
  const env = {
    ...process.env,
    WEB_PORT: port.toString(),
    NODE_ENV: 'test',
  } as any as NodeJS.ProcessEnv;

  // Start the server using pnpm
  // Find the project root (where package.json with workspace config is)
  let projectRoot = process.cwd();
  
  // Navigate up to find the root (contains pnpm-workspace.yaml or root package.json)
  while (projectRoot !== path.dirname(projectRoot)) {
    if (
      fs.existsSync(path.join(projectRoot, 'pnpm-workspace.yaml')) ||
      (fs.existsSync(path.join(projectRoot, 'package.json')) &&
       !projectRoot.includes('node_modules'))
    ) {
      break;
    }
    projectRoot = path.dirname(projectRoot);
  }
  
  // Use filter to run from root, or direct if we're in the app directory
  const isInAppDir = process.cwd().includes('apps/web-frontend');
  
  if (isInAppDir && !process.cwd().endsWith('city-guided')) {
    // We're in apps/web-frontend, run directly
    serverProcess = spawn('pnpm', ['dev'], {
      env,
      cwd: process.cwd(),
      stdio: 'pipe',
      shell: true,
    });
  } else {
    // We're at the root or elsewhere, use filter
    serverProcess = spawn('pnpm', ['--filter', 'apps-web-frontend', 'dev'], {
      env,
      cwd: projectRoot,
      stdio: 'pipe',
      shell: true,
    });
  }

  // Handle server output
  serverProcess.stdout?.on('data', (data) => {
    const output = data.toString();
    // Only log if it's important (errors, ready messages)
    if (output.includes('ready') || output.includes('error') || output.includes('Error')) {
      console.log(`[Server] ${output.trim()}`);
    }
  });

  serverProcess.stderr?.on('data', (data) => {
    const output = data.toString();
    // Log errors
    if (output.includes('error') || output.includes('Error')) {
      console.error(`[Server Error] ${output.trim()}`);
    }
  });

  serverProcess.on('error', async (error: any) => {
    // If port is already in use, check if server is actually running
    if (error.code === 'EPERM' || error.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${port} appears to be in use, checking if server is running...`);
      // Wait a bit and check if server is actually responding
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (await checkServerHealth(baseUrl)) {
        console.log(`✅ Server is already running at ${baseUrl}`);
        serverReady = true;
        return;
      }
    }
    console.error(`❌ Failed to start server: ${error.message}`);
    throw error;
  });

  // Wait for server to be ready
  try {
    await waitForServer(baseUrl, HEALTH_CHECK_TIMEOUT);
    serverReady = true;
    console.log(`✅ Server is ready at ${baseUrl}`);
  } catch (error) {
    await stopServer();
    throw error;
  }
}

/**
 * Stop the server
 */
export async function stopServer(): Promise<void> {
  if (serverProcess) {
    console.log('🛑 Stopping server...');
    
    return new Promise((resolve) => {
      if (!serverProcess) {
        resolve();
        return;
      }

      // Try graceful shutdown first
      if (process.platform === 'win32') {
        // Windows doesn't support SIGTERM, use taskkill
        spawn('taskkill', ['/pid', serverProcess.pid!.toString(), '/f', '/t'], {
          stdio: 'ignore',
        });
        serverProcess = null;
        serverReady = false;
        resolve();
      } else {
        // Unix-like systems
        serverProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds if still running
        const forceKillTimeout = setTimeout(() => {
          if (serverProcess) {
            serverProcess.kill('SIGKILL');
            serverProcess = null;
            serverReady = false;
          }
          resolve();
        }, 5000);

        serverProcess.on('exit', () => {
          clearTimeout(forceKillTimeout);
          serverProcess = null;
          serverReady = false;
          console.log('✅ Server stopped');
          resolve();
        });
      }
    });
  }
  
  serverReady = false;
}

/**
 * Check if server is ready
 */
export function isServerReady(): boolean {
  return serverReady;
}
