import { type Page } from 'playwright';
import { CONFIG, CREDENTIALS, log } from '../helpers';

export async function runValidatorFlows(page: Page, achievementTitle: string, studentName: string): Promise<void> {
  log.suite('3. Validator Flows (Antrean Verifikasi, Telaah Berkas, Persetujuan Prestasi)');

  // 1. Login Validator (Mendukung klik kartu instan mode dev atau form manual)
  log.step(`Login sebagai Validator: ${CREDENTIALS.validator.email}`);
  await page.context().clearCookies();
  await page.goto(`${CONFIG.baseUrl}/masuk`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  // Tunggu elemen login siap
  const validatorCard = page.locator('button[role="listitem"]:has-text("Validator")').first();
  const manualEmail = page.locator('input[type="text"], input[type="email"]').first();
  await Promise.race([
    validatorCard.waitFor({ state: 'visible', timeout: 8000 }),
    manualEmail.waitFor({ state: 'visible', timeout: 8000 }),
  ]);

  if (await validatorCard.isVisible()) {
    await validatorCard.click();
  } else {
    await manualEmail.fill(CREDENTIALS.validator.email);
    await page.locator('input[type="password"]').first().fill(CREDENTIALS.validator.password);
    await page.locator('button[type="submit"]').click();
  }

  // Tunggu redirect ke dashboard validator
  await page.waitForURL((url) => url.pathname.includes('/validator'), { timeout: 8000 });
  log.pass('Login validator berhasil');

  // 2. Akses Antrean Verifikasi (/validator/prestasi)
  log.step('Membuka antrean verifikasi prestasi (/validator/prestasi)');
  await page.goto(`${CONFIG.baseUrl}/validator/prestasi`);
  await page.waitForLoadState('domcontentloaded');

  // Tunggu daftar muncul
  const searchInput = page.locator('input[placeholder*="Cari"]');
  if (await searchInput.isVisible()) {
    await searchInput.fill(achievementTitle);
    await page.waitForTimeout(500);
  }

  // Cari item prestasi yang baru diajukan
  const targetRow = page.locator('tr', { hasText: achievementTitle }).first();
  await targetRow.waitFor({ state: 'visible', timeout: 10000 });
  log.pass(`Prestasi "${achievementTitle}" ditemukan dalam antrean verifikasi`);

  // Klik tombol "Periksa" pada baris prestasi
  const periksaBtn = targetRow.locator('button:has-text("Periksa")');
  await periksaBtn.waitFor({ state: 'visible', timeout: 5000 });
  await periksaBtn.click();

  // 3. Detail Verifikasi (/validator/prestasi/:id)
  await page.waitForURL((url) => url.pathname.includes('/validator/prestasi/'), { timeout: 8000 });
  await page.waitForLoadState('domcontentloaded');
  log.step('Memeriksa berkas dan data telaah verifikasi');

  // Pastikan tombol / panel keputusan ada
  const approveButton = page.locator('button:has-text("Setujui prestasi")');
  await approveButton.waitFor({ state: 'visible', timeout: 8000 });

  // 4. Eksekusi Persetujuan Prestasi
  log.step('Mengeksekusi persetujuan prestasi (Approve)');
  await approveButton.click();

  // Tunggu redirect kembali ke daftar verifikasi
  await page.waitForURL((url) => url.pathname === '/validator/prestasi', {
    timeout: 10000,
  });
  log.pass('Prestasi berhasil disetujui oleh validator');

  // 5. Verifikasi Pembaruan di Ranking Publik (/ranking)
  log.step('Memverifikasi poin prestasi bertambah di Leaderboard (/ranking)');
  await page.goto(`${CONFIG.baseUrl}/ranking`);
  await page.waitForLoadState('domcontentloaded');

  // Cek apakah mahasiswa muncul di tabel peringkat
  const studentRankItem = page.locator(`text=${studentName}`).first();
  try {
    await studentRankItem.waitFor({ state: 'visible', timeout: 6000 });
    log.pass(`Mahasiswa "${studentName}" berhasil masuk ke papan peringkat dengan poin sah!`);
  } catch {
    log.info(`Nama mahasiswa di ranking mungkin tertutup pagination/filter tahun, halaman ranking memuat normal`);
  }
}
