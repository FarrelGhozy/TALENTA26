import { type Page } from 'playwright';
import path from 'node:path';
import { CONFIG, log, generateTestStudent } from '../helpers';

export interface MahasiswaTestResult {
  student: ReturnType<typeof generateTestStudent>;
  achievementTitle: string;
}

export async function runMahasiswaFlows(page: Page): Promise<MahasiswaTestResult> {
  log.suite('2. Mahasiswa Flows (Registrasi, Profil, Roadmap, Unggah Prestasi)');

  const student = generateTestStudent();
  const achievementTitle = `Juara 1 E2E Competition ${Date.now().toString().slice(-4)}`;

  // 1. Registrasi Mahasiswa Baru
  log.step(`Mendaftarkan mahasiswa baru: ${student.fullName} (NIM: ${student.nim})`);
  await page.goto(`${CONFIG.baseUrl}/daftar`);
  await page.waitForLoadState('domcontentloaded');

  // Isi formulir registrasi
  await page.locator('input[placeholder*="432026101"]').fill(student.nim);
  await page.locator('input[placeholder*="identitas"]').fill(student.fullName);
  await page.locator('input[type="email"]').fill(student.email);
  await page.locator('input[type="password"]').first().fill(student.password);
  await page.locator('input[type="password"]').nth(1).fill(student.password);

  // Submit registrasi
  await page.locator('button[type="submit"]').click();

  // Tunggu redirect ke beranda atau konfirmasi berhasil
  try {
    await page.waitForURL((url) => url.pathname.includes('/app/beranda'), { timeout: 8000 });
    log.pass('Registrasi berhasil dan langsung dialihkan ke Beranda');
  } catch {
    // Jika perlu login manual
    log.info('Mencoba login setelah registrasi...');
    await page.goto(`${CONFIG.baseUrl}/masuk`);
    await page.locator('input[type="text"], input[type="email"]').first().fill(student.email);
    await page.locator('input[type="password"]').first().fill(student.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => url.pathname.includes('/app/beranda'), { timeout: 8000 });
    log.pass('Login mahasiswa baru berhasil');
  }

  // 2. Beranda Mahasiswa
  log.step('Memeriksa Beranda Mahasiswa (/app/beranda)');
  await page.goto(`${CONFIG.baseUrl}/app/beranda`);
  await page.waitForLoadState('domcontentloaded');
  const greeting = page.locator('h1, h2').first();
  await greeting.waitFor({ state: 'visible', timeout: 5000 });
  log.pass('Beranda Mahasiswa tampil dengan benar');

  // 3. Roadmap & Checklist Persiapan
  log.step('Memeriksa Roadmap & Checklist Lomba (/app/kompetisi/gemastik-2026/persiapan)');
  await page.goto(`${CONFIG.baseUrl}/app/kompetisi/gemastik-2026/persiapan`);
  await page.waitForLoadState('domcontentloaded');

  const checklistBoxes = page.locator('input[type="checkbox"]');
  const checkCount = await checklistBoxes.count();
  if (checkCount > 0) {
    const firstCheckbox = checklistBoxes.first();
    const initialChecked = await firstCheckbox.isChecked();
    await firstCheckbox.click();
    await page.waitForTimeout(500);
    const newChecked = await firstCheckbox.isChecked();
    if (newChecked === initialChecked) {
      log.info('Checkbox status did not toggle via click, trying forced click');
      await firstCheckbox.click({ force: true });
    }
    log.pass(`Checklist roadmap berhasil diinteraksi (${checkCount} butir checklist ditemukan)`);
  } else {
    log.info('Tidak ada butir checklist interaktif pada kompetisi ini, lanjut ke form prestasi');
  }

  // 4. Form Pengajuan Prestasi Baru
  log.step('Mengisi pengajuan prestasi baru dengan bukti berkas asli (/app/prestasi/baru)');
  await page.goto(`${CONFIG.baseUrl}/app/prestasi/baru`);
  await page.waitForLoadState('domcontentloaded');

  // Isi data formulir
  await page.locator('#nama-kegiatan').fill(achievementTitle);
  await page.locator('#penyelenggara').fill('Pusat Prestasi Nasional Kemendikbudristek');
  await page.locator('#kategori').selectOption('kompetisi');
  await page.locator('#tingkat').selectOption('nasional');
  await page.locator('#capaian').selectOption('juara_1');

  const today = new Date().toISOString().split('T')[0];
  await page.locator('#tanggal').fill(today);

  // Unggah berkas sertifikat asli (PDF)
  const fixturePdf = path.join(CONFIG.fixturesDir, 'sertifikat-lomba.pdf');
  const fileInput = page.locator('#bukti-file-input');
  await fileInput.setInputFiles(fixturePdf);
  log.info(`Berkas sertifikat ${fixturePdf} berhasil dimasukkan ke input`);

  // Kirim formulir pengajuan prestasi
  await page.locator('button[type="submit"]').click();

  // Tunggu redirect ke /app/prestasi
  await page.waitForURL((url) => url.pathname.includes('/app/prestasi'), { timeout: 10000 });
  await page.waitForLoadState('domcontentloaded');

  // Verifikasi prestasi yang baru diajukan muncul dengan status 'submitted'
  const submittedItem = page.locator(`text=${achievementTitle}`);
  await submittedItem.first().waitFor({ state: 'visible', timeout: 8000 });
  log.pass(`Prestasi "${achievementTitle}" berhasil diajukan dan muncul di daftar prestasi`);

  return { student, achievementTitle };
}
