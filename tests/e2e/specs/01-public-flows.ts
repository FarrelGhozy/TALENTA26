import { type Page } from 'playwright';
import { CONFIG, log } from '../helpers';

export async function runPublicFlows(page: Page): Promise<void> {
  log.suite('1. Public Flows (Landing, Kompetisi, Ranking)');

  // 1. Landing Page
  log.step('Memeriksa halaman landing (/)');
  await page.goto(`${CONFIG.baseUrl}/`);
  await page.waitForLoadState('domcontentloaded');

  const title = await page.title();
  if (!title.includes('TALENTA UNIDA Gontor')) {
    throw new Error(`Judul landing page tidak sesuai: ${title}`);
  }

  // Periksa elemen utama landing
  const brandLogo = page.locator('text=TALENTA UNIDA GONTOR');
  await brandLogo.first().waitFor({ state: 'visible', timeout: 5000 });

  // Verifikasi tidak ada icon AI atau klaim AI
  const sparklesIcon = await page.locator('svg.lucide-sparkles').count();
  if (sparklesIcon > 0) {
    throw new Error('Ditemukan icon Sparkles (AI) pada antarmuka publik!');
  }

  // Verifikasi seksi Sorotan Papan Peringkat tampil pada Landing (PRD & K-11)
  const rankingSpotlight = page.getByRole('heading', { name: /Sorotan Mahasiswa Berprestasi/i }).first();
  await rankingSpotlight.waitFor({ state: 'visible', timeout: 8000 });

  // Verifikasi tidak ada <button> bersarang di dalam <a> pada Landing Page
  const nestedInteractiveCount = await page.locator('a button, button a').count();
  if (nestedInteractiveCount > 0) {
    throw new Error(`Ditemukan ${nestedInteractiveCount} elemen interaktif bersarang (<button> di dalam <a>) pada Landing Page!`);
  }
  log.pass('Landing page, sorotan ranking, aksesibilitas tautan, dan validasi non-AI berhasil');

  // 2. Katalog Kompetisi
  log.step('Memeriksa halaman katalog kompetisi (/kompetisi)');
  await page.goto(`${CONFIG.baseUrl}/kompetisi`);
  await page.waitForLoadState('domcontentloaded');

  const compHeader = page.getByRole('heading', { name: /Katalog Kompetisi/i }).first();
  await compHeader.waitFor({ state: 'visible', timeout: 5000 });

  // Cari kompetisi
  const searchInput = page.locator('input[placeholder*="Cari"]');
  if (await searchInput.isVisible()) {
    await searchInput.fill('Gemastik');
    await page.waitForTimeout(500);
  }

  // Klik salah satu kartu kompetisi
  const detailLink = page.locator('a[href^="/kompetisi/"]').first();
  await detailLink.waitFor({ state: 'visible', timeout: 8000 });
  await detailLink.click();

  // Verifikasi halaman detail kompetisi
  await page.waitForURL((url) => url.pathname.includes('/kompetisi/'), { timeout: 8000 });
  const firstTab = page.locator('[role="tab"]').first();
  await firstTab.waitFor({ state: 'visible', timeout: 8000 });
  const tabs = page.locator('[role="tab"]');
  const tabCount = await tabs.count();
  if (tabCount < 2) {
    throw new Error('Tab detail kompetisi (Ringkasan/Syarat/Jadwal) tidak lengkap');
  }
  log.pass('Navigasi dan detail katalog kompetisi berhasil');

  // 3. Peringkat Publik (/ranking)
  log.step('Memeriksa halaman peringkat / leaderboard (/ranking)');
  await page.goto(`${CONFIG.baseUrl}/ranking`);
  await page.waitForLoadState('domcontentloaded');

  const rankHeader = page.getByRole('heading', { name: /Ranking Prestasi/i }).first();
  await rankHeader.waitFor({ state: 'visible', timeout: 5000 });

  // Pastikan tidak ada icon AI di ranking
  const rankingSparkles = await page.locator('svg.lucide-sparkles').count();
  if (rankingSparkles > 0) {
    throw new Error('Icon Sparkles terdeteksi di halaman ranking!');
  }

  // 4. Verifikasi tata letak responsif Landing & Katalog (Mobile 390x844, Tablet 768x1024, Desktop 1440x900)
  for (const vp of [
    { width: 390, height: 844, label: 'Mobile' },
    { width: 768, height: 1024, label: 'Tablet' },
    { width: 1440, height: 900, label: 'Desktop' },
  ]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const route of ['/', '/kompetisi']) {
      await page.goto(`${CONFIG.baseUrl}${route}`);
      await page.waitForLoadState('domcontentloaded');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      if (overflow) {
        throw new Error(`Terdeteksi horizontal overflow pada ${route} viewport ${vp.label} (${vp.width}x${vp.height})`);
      }
    }
  }
  await page.setViewportSize({ width: 1280, height: 800 });

  log.pass('Halaman ranking & tata letak responsif terverifikasi bersih');
}
