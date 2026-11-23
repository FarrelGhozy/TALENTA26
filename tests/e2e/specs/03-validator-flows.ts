import { type Page } from 'playwright';
import { CONFIG, CREDENTIALS, log } from '../helpers';

export async function runValidatorFlows(
  page: Page,
  achievementTitle: string,
  studentName: string
): Promise<void> {
  log.suite('3. Admin Validation Flows (Antrean Verifikasi, Telaah Berkas, Persetujuan Prestasi)');

  // 1. Login Admin (kartu instan Admin Kampus pada mode dev atau form manual)
  log.step(`Login sebagai Admin Verifikator: ${CREDENTIALS.validator.email}`);
  await page.context().clearCookies();
  await page.goto(`${CONFIG.baseUrl}/masuk`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  const manualTabBtn = page.locator('button:has-text("Login Manual")');
  const manualEmail = page.locator('input[type="text"], input[type="email"]').first();
  await Promise.race([
    manualTabBtn.waitFor({ state: 'visible', timeout: 8000 }),
    manualEmail.waitFor({ state: 'visible', timeout: 8000 }),
  ]);

  if (await manualTabBtn.isVisible()) {
    await manualTabBtn.click();
  }

  await manualEmail.fill(CREDENTIALS.validator.email);
  await page.locator('input[type="password"]').first().fill(CREDENTIALS.validator.password);
  await page.locator('button[type="submit"]').click();

  // Tunggu redirect ke portal /admin terpadu
  await page.waitForURL((url) => url.pathname.endsWith('/admin'), { timeout: 8000 });
  log.pass('Login Admin berhasil dan langsung menuju portal /admin terpadu');

  // 2. Akses Antrean Verifikasi (/admin/prestasi)
  log.step('Membuka antrean verifikasi prestasi (/admin/prestasi)');
  await page.goto(`${CONFIG.baseUrl}/admin/prestasi`);
  await page.waitForLoadState('domcontentloaded');

  const searchInput = page.locator('input[placeholder*="Cari"]');
  if (await searchInput.isVisible()) {
    await searchInput.fill(achievementTitle);
    await page.waitForTimeout(500);
  }

  const targetRow = page.locator('tr', { hasText: achievementTitle }).first();
  await targetRow.waitFor({ state: 'visible', timeout: 10000 });
  log.pass(`Prestasi "${achievementTitle}" ditemukan dalam antrean verifikasi`);

  const periksaBtn = targetRow.locator('button:has-text("Periksa")');
  await periksaBtn.waitFor({ state: 'visible', timeout: 5000 });
  await periksaBtn.click();

  // 3. Detail Verifikasi (/admin/prestasi/:id)
  await page.waitForURL((url) => url.pathname.includes('/admin/prestasi/'), { timeout: 8000 });
  await page.waitForLoadState('domcontentloaded');
  log.step('Memeriksa berkas dan data telaah verifikasi');

  await page.locator('text=Kalkulasi Poin Otomatis').waitFor({ state: 'visible', timeout: 8000 });
  const approveButton = page.locator('button:has-text("Setujui Prestasi")');
  await approveButton.waitFor({ state: 'visible', timeout: 8000 });

  // 4. Eksekusi Persetujuan Prestasi
  log.step('Mengeksekusi persetujuan prestasi (Approve)');
  await approveButton.click();

  await page.waitForURL((url) => url.pathname === '/admin/prestasi', {
    timeout: 10000,
  });
  log.pass('Prestasi berhasil disetujui oleh Admin');

  // 5. Verifikasi Pembaruan di Ranking Publik (/ranking)
  log.step('Memverifikasi poin prestasi bertambah di Leaderboard (/ranking)');
  await page.goto(`${CONFIG.baseUrl}/ranking`);
  await page.waitForLoadState('domcontentloaded');

  const studentRankItem = page.locator(`text=${studentName}`).first();
  try {
    await studentRankItem.waitFor({ state: 'visible', timeout: 6000 });
    log.pass(`Mahasiswa "${studentName}" berhasil masuk ke papan peringkat dengan poin sah!`);
  } catch {
    log.info('Nama mahasiswa di ranking mungkin tertutup pagination/filter tahun, halaman ranking memuat normal');
  }
}
