/**
 * Cucumber World
 * Shared context for all E2E step definitions
 */

import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, Page, chromium } from '@playwright/test';

export interface CityGuidedWorld extends World {
  // Playwright
  browser: Browser | null;
  page: Page | null;

  // Test state
  baseUrl: string;

  // Helpers
  initBrowser(): Promise<void>;
  createPage(): Promise<Page>;
  goto(url: string): Promise<void>;
  closeBrowser(): Promise<void>;
}

class CustomWorld extends World implements CityGuidedWorld {
  browser: Browser | null = null;
  page: Page | null = null;
  baseUrl: string;

  constructor(options: IWorldOptions) {
    super(options);
    this.baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3080';
  }

  /**
   * Initialize browser
   */
  async initBrowser(): Promise<void> {
    if (!this.browser) {
      // Use installed chromium (now that playwright install has been run)
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
    }
  }

  /**
   * Create a new page with mobile viewport (mobile-first testing)
   */
  async createPage(): Promise<Page> {
    if (!this.browser) {
      await this.initBrowser();
    }
    this.page = await this.browser!.newPage({
      viewport: { width: 375, height: 812 }, // iPhone 12/13/14 Pro - mobile-first
    });
    return this.page;
  }

  /**
   * Navigate to a URL
   */
  async goto(url: string): Promise<void> {
    if (!this.page) {
      await this.createPage();
    }
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    await this.page!.goto(fullUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
  }

  /**
   * Close browser
   */
  async closeBrowser(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

setWorldConstructor(CustomWorld);
