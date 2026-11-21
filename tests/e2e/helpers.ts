import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

export const CONFIG = {
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:5173',
  apiUrl: process.env.E2E_API_URL || 'http://localhost:3001',
  headless: process.env.HEADLESS !== 'false',
  timeout: 15000,
  fixturesDir: path.resolve(__dirname, 'fixtures'),
  screenshotsDir: path.resolve(__dirname, 'screenshots'),
};

export const CREDENTIALS = {
  validator: {
    email: 'validator@unida.gontor.ac.id',
    password: 'Validator2026!',
    name: 'Validator Utama',
  },
  superadmin: {
    email: 'admin@unida.gontor.ac.id',
    password: 'AdminGontor2026!',
    name: 'Super Admin',
  },
};

export function generateTestStudent() {
  const ts = Date.now().toString().slice(-6);
  return {
    nim: `44${ts}`,
    fullName: `Mahasiswa E2E ${ts}`,
    studyProgram: 'Teknik Informatika',
    faculty: 'Sains dan Teknologi',
    email: `mhs.e2e.${ts}@unida.gontor.ac.id`,
    password: 'Mahasiswa2026!',
    enrollmentYear: 2024,
  };
}

export interface TestContext {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export async function setupTestContext(): Promise<TestContext> {
  const browser = await chromium.launch({
    headless: CONFIG.headless,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(CONFIG.timeout);

  return { browser, context, page };
}

export async function teardownTestContext({ browser }: TestContext): Promise<void> {
  try {
    await browser.close();
  } catch {
    // ignore
  }
}

export async function captureScreenshot(page: Page, testName: string): Promise<string> {
  try {
    if (!fs.existsSync(CONFIG.screenshotsDir)) {
      fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });
    }
    const filename = `${testName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.png`;
    const fullPath = path.join(CONFIG.screenshotsDir, filename);
    await page.screenshot({ path: fullPath, fullPage: true });
    return fullPath;
  } catch (err) {
    return `Gagal mengambil screenshot: ${err}`;
  }
}

export const log = {
  step: (msg: string) => console.log(`  \x1b[36m▸\x1b[0m ${msg}`),
  info: (msg: string) => console.log(`  \x1b[90mℹ ${msg}\x1b[0m`),
  pass: (msg: string) => console.log(`  \x1b[32m✔ PASS:\x1b[0m ${msg}`),
  fail: (msg: string) => console.log(`  \x1b[31m✖ FAIL:\x1b[0m ${msg}`),
  suite: (title: string) => console.log(`\n\x1b[1m\x1b[35m=== ${title} ===\x1b[0m`),
};
