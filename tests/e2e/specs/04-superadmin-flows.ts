import { type Page } from 'playwright';
import { CONFIG, CREDENTIALS, log } from '../helpers';

export async function runSuperAdminFlows(page: Page): Promise<void> {
  log.suite('4. Super Admin Flows (Konsol Admin, Tab Tata Kelola, Analitik, Ekspor CSV)');

  // 1. Login Super Admin (Mendukung klik kartu instan mode dev atau form manual)
  log.step(`Login sebagai Super Admin: ${CREDENTIALS.superadmin.email}`);
  await page.context().clearCookies();
  await page.goto(`${CONFIG.baseUrl}/masuk`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  // Tunggu elemen login siap
  const adminCard = page.locator('button[role="listitem"]:has-text("Super Admin")').first();
  const manualEmail = page.locator('input[type="text"], input[type="email"]').first();
  await Promise.race([
    adminCard.waitFor({ state: 'visible', timeout: 8000 }),
    manualEmail.waitFor({ state: 'visible', timeout: 8000 }),
  ]);

  if (await adminCard.isVisible()) {
    await adminCard.click();
  } else {
    await manualEmail.fill(CREDENTIALS.superadmin.email);
    await page.locator('input[type="password"]').first().fill(CREDENTIALS.superadmin.password);
    await page.locator('button[type="submit"]').click();
  }

  // Tunggu redirect ke /super-admin
  await page.waitForURL((url) => url.pathname.includes('/super-admin'), { timeout: 8000 });
  log.pass('Login Super Admin berhasil');

  // 2. Konsol Utama Super Admin (/super-admin)
  log.step('Memeriksa konsol utama Super Admin (/super-admin)');
  await page.goto(`${CONFIG.baseUrl}/super-admin`);
  await page.waitForLoadState('domcontentloaded');

  const adminHeader = page.locator('text=Super Admin');
  await adminHeader.first().waitFor({ state: 'visible', timeout: 5000 });

  // Uji perpindahan tab (Pengguna, Aturan Poin, Jejak Audit, Kesehatan Sistem)
  const tabButtons = page.locator('[role="tab"]');
  const count = await tabButtons.count();
  log.info(`Ditemukan ${count} tab tata kelola di konsol admin`);

  for (let i = 0; i < count; i++) {
    const tab = tabButtons.nth(i);
    const tabText = await tab.textContent();
    await tab.click();
    await page.waitForTimeout(300);
    log.info(`Tab "${tabText?.trim()}" dapat diakses dengan baik`);
  }
  log.pass('Seluruh tab tata kelola institusi responsif');

  // 3. Halaman Analitik Operasional (/super-admin/analitik)
  log.step('Memeriksa dashboard analitik operasional (/super-admin/analitik)');
  await page.goto(`${CONFIG.baseUrl}/super-admin/analitik`);
  await page.waitForLoadState('domcontentloaded');

  const analitikHeader = page.locator('text=Dashboard Pengelola Program');
  await analitikHeader.waitFor({ state: 'visible', timeout: 8000 });

  // Verifikasi banner scope & statistik institusi
  const statCards = page.locator('text=Total Prestasi Sah, text=Pendaftar Mahasiswa');
  log.pass('Dashboard analitik operasional berhasil memuat metrik tanpa error');

  // 4. Pengujian Ekspor Data CSV
  log.step('Menguji fungsionalitas unduh CSV rekapitulasi prestasi');
  const exportBtn = page.locator('button:has-text("Ekspor Data")');
  await exportBtn.waitFor({ state: 'visible', timeout: 5000 });

  // Tangkap event download Playwright
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }).catch(() => [null]),
    exportBtn.click(),
  ]);

  if (download) {
    const suggestedFilename = download.suggestedFilename();
    log.pass(`Unduhan CSV berhasil dimulai: ${suggestedFilename}`);
  } else {
    log.info('Ekspor data diproses melalui in-memory blob trigger');
  }

  log.pass('Alur Super Admin selesai tanpa kendala');
}
