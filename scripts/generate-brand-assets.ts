import { fileURLToPath } from 'node:url';

// Delegasikan ekspor aset merek deterministik USC ke skrip Python (Pillow + NumPy)
// agar seluruh varian WebP, PNG, ICO, PWA, OG Card, dan QA dihasilkan dari satu master.
const pyScript = fileURLToPath(new URL('./generate-brand-assets.py', import.meta.url));
const proc = Bun.spawnSync(['python3', pyScript], {
  stdout: 'inherit',
  stderr: 'inherit',
});

if (proc.exitCode !== 0) {
  process.exit(proc.exitCode ?? 1);
}
