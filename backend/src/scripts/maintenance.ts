import { runMaintenance } from '../lib/maintenance';
import { closeDatabase } from '../lib/prisma';

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--help') || args.has('-h')) {
    console.log(`Penggunaan: bun backend/src/scripts/maintenance.ts [opsi]

Opsi:
  --dry-run   Hitung data/berkas kandidat pembersihan tanpa menghapus apa pun
  --json      Cetak ringkasan dalam format JSON murni
  -h, --help  Tampilkan bantuan ini`);
    process.exit(0);
  }

  const dryRun = args.has('--dry-run');
  const jsonOutput = args.has('--json');

  try {
    const summary = await runMaintenance({ dryRun });
    if (jsonOutput) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(
        `[MAINTENANCE] Selesai (${dryRun ? 'DRY-RUN' : 'LIVE'}) dalam ${summary.durationMs}ms`
      );
      console.log('  MySQL:', JSON.stringify(summary.mysql));
      console.log('  Storage:', JSON.stringify(summary.storage));
    }
  } finally {
    await closeDatabase();
  }
}

main().catch((err) => {
  console.error('[MAINTENANCE] Gagal menjalankan pemeliharaan:', err);
  process.exit(1);
});
