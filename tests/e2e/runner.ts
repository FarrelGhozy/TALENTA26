import { setupTestContext, teardownTestContext, captureScreenshot, CONFIG, log } from './helpers';
import { runPublicFlows } from './specs/01-public-flows';
import { runMahasiswaFlows } from './specs/02-mahasiswa-flows';
import { runValidatorFlows } from './specs/03-validator-flows';
import { runSuperAdminFlows } from './specs/04-superadmin-flows';

async function verifyServers(): Promise<boolean> {
  log.info(`Memeriksa koneksi frontend: ${CONFIG.baseUrl}`);
  try {
    const feRes = await fetch(CONFIG.baseUrl, { method: 'GET' });
    if (!feRes.ok && feRes.status !== 304) {
      log.fail(`Frontend tidak merespons dengan status 200/304 (status: ${feRes.status})`);
      return false;
    }
  } catch (err) {
    log.fail(`Frontend tidak dapat dijangkau di ${CONFIG.baseUrl}. Pastikan 'bun run dev' berjalan.`);
    return false;
  }

  log.info(`Memeriksa koneksi backend: ${CONFIG.apiUrl}`);
  try {
    const beRes = await fetch(`${CONFIG.apiUrl}/health`, { method: 'GET' });
    if (!beRes.ok) {
      log.fail(`Backend /health mengembalikan status ${beRes.status}`);
      return false;
    }
  } catch (err) {
    log.fail(`Backend tidak dapat dijangkau di ${CONFIG.apiUrl}. Pastikan 'bun run dev:backend' berjalan.`);
    return false;
  }

  return true;
}

async function main() {
  console.log('\n\x1b[1m\x1b[34m================================================================');
  console.log('   TALENTA UNIDA GONTOR — PLAYWRIGHT END-TO-END TEST SUITE');
  console.log('================================================================\x1b[0m\n');

  const startTime = Date.now();

  const isUp = await verifyServers();
  if (!isUp) {
    console.error('\n\x1b[31m[ERROR] Server dev frontend/backend belum siap. Jalankan kedua server sebelum memulai tes.\x1b[0m\n');
    process.exit(1);
  }

  log.info('Koneksi server terverifikasi. Menjalankan browser Chromium (Headless: ' + CONFIG.headless + ')...');
  const testCtx = await setupTestContext();

  try {
    // 1. Public Flows
    await runPublicFlows(testCtx.page);

    // 2. Mahasiswa Flows
    const { student, achievementTitle } = await runMahasiswaFlows(testCtx.page);

    // 3. Validator Flows
    await runValidatorFlows(testCtx.page, achievementTitle, student.fullName);

    // 4. Super Admin Flows
    await runSuperAdminFlows(testCtx.page);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n\x1b[1m\x1b[32m================================================================');
    console.log(`   SEMUA PENGUJIAN END-TO-END BERHASIL! (Durasi: ${duration}s)`);
    console.log('================================================================\x1b[0m\n');
    process.exit(0);
  } catch (err: any) {
    const screenPath = await captureScreenshot(testCtx.page, 'e2e_failure');
    console.error('\n\x1b[1m\x1b[31m================================================================');
    console.log('   PENGUJIAN END-TO-END GAGAL');
    console.log('================================================================\x1b[0m');
    console.error(`Pesan Error: ${err.message || err}`);
    if (err.stack) {
      console.error(err.stack);
    }
    console.error(`Screenshot kegagalan disimpan di: ${screenPath}\n`);
    process.exit(1);
  } finally {
    await teardownTestContext(testCtx);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
