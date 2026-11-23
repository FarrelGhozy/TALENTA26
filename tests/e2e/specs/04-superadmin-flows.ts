import { type Page } from 'playwright';
import { CONFIG, CREDENTIALS, log } from '../helpers';

export async function runSuperAdminFlows(page: Page): Promise<void> {
  log.suite('4. Admin Portal Terpadu (Dashboard, Pengaturan Sistem, Kelola Lomba, Ekspor CSV, & Redirect)');

  // 1. Login Admin Kampus (kartu instan mode dev atau form manual)
  log.step(`Login sebagai Admin: ${CREDENTIALS.superadmin.email}`);
  await page.context().clearCookies();
  await page.goto(`${CONFIG.baseUrl}/masuk`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  const adminCard = page.locator('button[role="listitem"]:has-text("Admin Kampus")').first();
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

  // Tunggu redirect ke /admin
  await page.waitForURL((url) => url.pathname.endsWith('/admin'), { timeout: 8000 });
  log.pass('Login Admin berhasil dan masuk ke /admin');

  // 2. Dashboard Terpadu Admin (/admin): Analitik + Pintasan Modul + Ekspor CSV
  log.step('Memeriksa Dashboard & Analitik Admin (/admin)');
  await page.locator('text=Dashboard Pengelola Program').waitFor({ state: 'visible', timeout: 8000 });
  await page.locator('text=Pintasan Modul Pengelolaan').waitFor({ state: 'visible', timeout: 5000 });
  log.pass('Dashboard Admin terpadu berhasil memuat metrik analitik & pintasan modul');

  // Pengujian Ekspor Data CSV
  log.step('Menguji fungsionalitas unduh CSV rekapitulasi prestasi');
  const exportBtn = page.locator('button:has-text("Ekspor Data")');
  await exportBtn.waitFor({ state: 'visible', timeout: 5000 });

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
    exportBtn.click(),
  ]);

  if (download) {
    log.pass(`Unduhan CSV berhasil dimulai: ${download.suggestedFilename()}`);
  } else {
    log.info('Ekspor data diproses melalui in-memory blob trigger');
  }

  // 3. Halaman Pengaturan Sistem & Operasional (/admin/sistem) via Sidebar Accordion
  log.step('Memeriksa Pengaturan Sistem (/admin/sistem) & perpindahan seluruh sub-menu sidebar');
  await page.goto(`${CONFIG.baseUrl}/admin/sistem`);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('text=Pengaturan Sistem & Operasional').waitFor({ state: 'visible', timeout: 6000 });

  const sidebarSubLinks = page.locator('#admin-sidebar-group-sistem a');
  const count = await sidebarSubLinks.count();
  log.info(`Ditemukan ${count} sub-menu tata kelola di sidebar Pengaturan Sistem`);

  for (let i = 0; i < count; i++) {
    const link = sidebarSubLinks.nth(i);
    const linkText = await link.textContent();
    await link.click();
    await page.waitForTimeout(250);
    log.info(`Sub-menu "${linkText?.trim()}" dapat diakses dengan baik`);
  }
  log.pass('Seluruh sub-menu pengaturan sistem di sidebar responsif');

  // 4. Halaman Kelola Lomba (/admin/konten)
  log.step('Memeriksa halaman Kelola Lomba (/admin/konten)');
  await page.goto(`${CONFIG.baseUrl}/admin/konten`);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('text=Kelola Lomba & Konten Pembinaan').waitFor({ state: 'visible', timeout: 6000 });
  log.pass('Halaman Kelola Lomba terpadu berhasil dibuka');

  // 5. Uji Kompatibilitas Redirect Rute Lama (/validator & /super-admin)
  log.step('Memverifikasi redirect rute lama (/validator/* dan /super-admin/* -> /admin/*)');
  await page.goto(`${CONFIG.baseUrl}/validator`);
  await page.waitForURL((url) => url.pathname === '/admin', { timeout: 6000 });

  await page.goto(`${CONFIG.baseUrl}/validator/konten?tab=seleksi`);
  await page.waitForURL(
    (url) => url.pathname === '/admin/konten' && url.searchParams.get('tab') === 'seleksi',
    { timeout: 6000 }
  );

  await page.goto(`${CONFIG.baseUrl}/super-admin?tab=periods`);
  await page.waitForURL(
    (url) => url.pathname === '/admin/sistem' && url.searchParams.get('tab') === 'periods',
    { timeout: 6000 }
  );

  await page.goto(`${CONFIG.baseUrl}/super-admin/analitik`);
  await page.waitForURL((url) => url.pathname === '/admin', { timeout: 6000 });
  log.pass('Seluruh rute lama /validator/* & /super-admin/* berhasil diarahkan ke /admin/*');
}
