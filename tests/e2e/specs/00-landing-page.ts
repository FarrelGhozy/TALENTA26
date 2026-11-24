import assert from 'node:assert/strict';
import { type Page } from 'playwright';
import { CONFIG, log } from '../helpers';

// Semua data di sini sintetis; tidak menulis atau membaca identitas mahasiswa nyata.
const competitions = [
  {
    id: 'qa-individu',
    slug: 'qa-individu',
    name: 'Kompetisi Contoh Individu',
    format: 'individu',
    minTeamMembers: 1,
    maxTeamMembers: 1,
  },
  {
    id: 'qa-beregu',
    slug: 'qa-beregu',
    name: 'Kompetisi Contoh Beregu',
    format: 'beregu',
    minTeamMembers: 3,
    maxTeamMembers: 5,
  },
  {
    id: 'qa-tutup',
    slug: 'qa-tutup',
    name: 'Kompetisi Contoh Ditutup',
    format: 'beregu',
    minTeamMembers: 2,
    maxTeamMembers: 2,
  },
  {
    id: 'qa-lain',
    slug: 'qa-lain',
    name: 'Kompetisi Keempat',
    format: 'individu',
    minTeamMembers: 1,
    maxTeamMembers: 1,
  },
].map((item, index) => ({
  ...item,
  category: 'Kategori Contoh',
  level: 'nasional',
  description: 'Informasi sintetis untuk pengujian pratinjau lomba.',
  registrationStatus: index === 2 ? 'tutup' : 'buka',
  internalSelectionDeadline: '2030-03-10T17:30:00.000Z',
}));
const period = { id: 'qa-period', name: 'Periode Akademik Contoh', year: 2030, semester: 'ganjil' };
const ranking = [1, 2, 3, 4].map((rank) => ({
  rank,
  userId: `qa-student-${rank}`,
  fullName: `Mahasiswa Contoh ${rank}`,
  studyProgram: 'Program Studi Contoh',
  points: (5 - rank) * 10,
  approvedCount: 5 - rank,
  juara1Count: 0,
  // Payload berlebih sengaja diberikan untuk memastikan landing tidak merendernya.
  avatarUrl: '/private-avatar-sentinel',
  email: 'private-sentinel@example.invalid',
  nim: 'QA-NIM-PRIVAT',
  phone: 'QA-KONTAK-PRIVAT',
  evidence: '/private-evidence-sentinel',
}));

export async function runLandingPageChecks(page: Page): Promise<void> {
  log.step('Landing: pemuatan, data publik minimum, kegagalan mandiri, pemulihan, dan responsif');
  let competitionMode: 'success' | 'empty' | 'error' = 'success';
  let rankingMode: 'success' | 'empty' | 'error' | 'inactive' = 'success';
  let rankingRequests = 0;
  let competitionRequests = 0;
  let releaseLoading = () => {};
  const loadingGate = new Promise<void>((resolve) => {
    releaseLoading = resolve;
  });
  const competitionUrl = '**/api/v1/competitions';
  const rankingUrl = '**/api/v1/ranking';
  const authUrl = '**/api/v1/auth/me';
  const catalog = page.getByRole('region', { name: 'Mulai dari lomba yang tepat.' });
  const achievements = page.getByRole('region', { name: 'Usaha yang layak diapresiasi.' });
  const reload = async () => {
    await page.goto(`${CONFIG.baseUrl}/`);
  };

  await page.route(authUrl, (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: 'UNAUTHORIZED', message: 'Belum masuk.' } },
    }),
  );
  await page.route(competitionUrl, async (route) => {
    competitionRequests++;
    await loadingGate;
    await route.fulfill(
      competitionMode === 'error'
        ? { status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Gangguan uji.' } } }
        : { json: { data: competitionMode === 'empty' ? [] : competitions } },
    );
  });
  await page.route(rankingUrl, async (route) => {
    rankingRequests++;
    await loadingGate;
    await route.fulfill(
      rankingMode === 'error'
        ? { status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Gangguan uji.' } } }
        : {
            json: {
              data: {
                period: rankingMode === 'inactive' ? null : period,
                ranking: rankingMode === 'success' ? ranking : [],
              },
            },
          },
    );
  });

  try {
    await reload();
    await page.getByRole('heading', { level: 1, name: /Dari potensi,/ }).waitFor();
    await catalog.getByRole('status').waitFor();
    await achievements.getByRole('status').waitFor();
    assert.equal(await page.getByRole('button', { name: /^Slide / }).count(), 0);
    releaseLoading();
    await catalog
      .getByRole('link', { name: 'Detail Kompetisi Contoh Individu', exact: true })
      .waitFor();
    await achievements.getByRole('heading', { name: 'Mahasiswa Contoh 1', exact: true }).waitFor();
    assert.equal(await catalog.locator('article').count(), 3);
    assert.equal(await achievements.locator('ol > li').count(), 3);
    assert.equal(await catalog.getByText('Pendaftaran ditutup', { exact: true }).count(), 1);
    assert.equal(await catalog.getByText('Individu', { exact: true }).count(), 1);
    assert.ok(
      (await catalog.innerText()).includes('11 Mar 2030'),
      'Tanggal ditampilkan dalam Asia/Jakarta',
    );
    assert.ok((await achievements.innerText()).includes(period.name));
    assert.equal(await page.locator('main a[href="/daftar"]').count(), 2);
    assert.equal(await page.locator('main a[href="/masuk?redirect=%2Fapp%2Ftim"]').count(), 1);
    const text = await page.locator('body').innerText();
    for (const sentinel of [
      'private-sentinel',
      'QA-NIM-PRIVAT',
      'QA-KONTAK-PRIVAT',
      'private-evidence',
    ])
      assert.ok(!text.includes(sentinel));
    assert.equal(await page.locator('img[src*="private-avatar"]').count(), 0);

    const faq = page.getByText('Apakah saya harus punya tim untuk ikut lomba?', { exact: true });
    await faq.focus();
    await page.keyboard.press('Enter');
    assert.ok(await faq.evaluate((element) => element.closest('details')?.open));
    await page.keyboard.press('Space');
    assert.equal(await faq.evaluate((element) => element.closest('details')?.open), false);

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => window.scrollTo(0, 0));
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
        `Overflow landing ${viewport.width}`,
      );
      const cta = page.locator('main').getByRole('link', { name: 'Jelajahi Lomba', exact: true });
      const box = await cta.boundingBox();
      assert.ok(
        box && box.height >= 44 && box.y + box.height <= viewport.height,
        'CTA utama terlihat pada layar pertama',
      );
      for (const control of await page.locator('main a, main button, main summary').all()) {
        const controlBox = await control.boundingBox();
        if (controlBox) assert.ok(controlBox.height >= 44, 'Target sentuh minimal 44 px');
      }
      await page.getByRole('link', { name: 'Temukan langkah pertamamu' }).click();
      const headingBox = await catalog.getByRole('heading', { level: 2 }).boundingBox();
      assert.ok(headingBox && headingBox.y >= 64, 'Judul tujuan anchor tidak tertutup navbar');
    }

    competitionMode = 'error';
    await reload();
    await catalog.getByRole('alert').waitFor();
    await achievements.getByRole('heading', { name: 'Mahasiswa Contoh 1', exact: true }).waitFor();
    const rankBeforeRetry = rankingRequests;
    competitionMode = 'success';
    await catalog.getByRole('button', { name: 'Coba lagi' }).click();
    await catalog
      .getByRole('link', { name: 'Detail Kompetisi Contoh Individu', exact: true })
      .waitFor();
    assert.equal(rankingRequests, rankBeforeRetry, 'Pemulihan lomba tidak memuat ulang ranking');

    rankingMode = 'error';
    await reload();
    await achievements.getByRole('alert').waitFor();
    await catalog
      .getByRole('link', { name: 'Detail Kompetisi Contoh Individu', exact: true })
      .waitFor();
    const competitionsBeforeRetry = competitionRequests;
    rankingMode = 'success';
    await achievements.getByRole('button', { name: 'Coba lagi' }).click();
    await achievements.getByRole('heading', { name: 'Mahasiswa Contoh 1', exact: true }).waitFor();
    assert.equal(
      competitionRequests,
      competitionsBeforeRetry,
      'Pemulihan ranking tidak memuat ulang lomba',
    );

    competitionMode = 'empty';
    rankingMode = 'empty';
    await reload();
    await catalog.getByRole('heading', { name: 'Belum ada lomba terbit' }).waitFor();
    await achievements
      .getByText('Belum ada poin prestasi lomba yang disetujui pada periode ini.')
      .waitFor();
    assert.ok((await achievements.innerText()).includes(period.name));
    rankingMode = 'inactive';
    await reload();
    await achievements.getByRole('heading', { name: 'Belum ada periode akademik aktif' }).waitFor();
    assert.equal(await achievements.locator('ol > li').count(), 0);

    // Nama panjang tanpa spasi tetap membungkus, bukan memperlebar layar.
    const originalName = ranking[0].fullName;
    const originalStudyProgram = ranking[0].studyProgram;
    const originalCompetitionName = competitions[0].name;
    try {
      ranking[0].fullName = 'MahasiswaContoh'.repeat(10);
      ranking[0].studyProgram = 'ProgramStudiContoh'.repeat(7);
      competitions[0].name = 'KompetisiContoh'.repeat(10);
      rankingMode = 'success';
      competitionMode = 'success';
      await reload();
      await achievements.getByRole('heading', { name: ranking[0].fullName, exact: true }).waitFor();
      await catalog.getByRole('heading', { name: competitions[0].name, exact: true }).waitFor();
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
          `Nama panjang pada ${width}px`,
        );
      }
    } finally {
      ranking[0].fullName = originalName;
      ranking[0].studyProgram = originalStudyProgram;
      competitions[0].name = originalCompetitionName;
    }
    log.pass(
      'Landing: loading/sukses/kosong/gagal/pemulihan, privasi, tanggal WIB, keyboard, dan 3 viewport lulus',
    );
  } finally {
    releaseLoading();
    await page.unroute(competitionUrl);
    await page.unroute(rankingUrl);
    await page.unroute(authUrl);
  }
}
