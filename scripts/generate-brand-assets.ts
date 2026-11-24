import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Semua turunan identitas berasal dari dua bidang pada satu SVG master.
const publicDir = fileURLToPath(new URL('../frontend/public/', import.meta.url));
const master = await readFile(`${publicDir}images/talenta-mark.svg`, 'utf8');
const light = master.replaceAll('#1D4ED8', '#FFFFFF').replaceAll('#0F172A', '#FFFFFF');
const mono = master.replaceAll('#1D4ED8', '#0F172A');
const favicon = master.replace(
  'fill="none">',
  'fill="none"><rect width="128" height="128" rx="24" fill="#FFFFFF"/>',
);
const appIcon = light.replace(
  'fill="none">',
  'fill="none"><rect width="128" height="128" fill="#1D4ED8"/>',
);

await mkdir(`${publicDir}images`, { recursive: true });
await writeFile(`${publicDir}images/talenta-mark-light.svg`, light);
await writeFile(`${publicDir}images/talenta-mark-mono.svg`, mono);
await writeFile(`${publicDir}favicon.svg`, favicon);
// Pertahankan URL aset lama dengan identitas baru untuk pemakai tautan langsung.
await writeFile(`${publicDir}images/talenta-shield.svg`, master);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  async function render(svg: string, size: number, type: 'png' | 'jpeg' = 'png') {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}</style>${svg}`,
    );
    return page.screenshot({ type, omitBackground: type === 'png' });
  }

  await writeFile(`${publicDir}images/logo-icon.png`, await render(master, 512));
  await writeFile(`${publicDir}images/logo-icon.jpg`, await render(master, 512, 'jpeg'));
  await writeFile(`${publicDir}images/talenta-app-icon.png`, await render(appIcon, 512));
  await writeFile(`${publicDir}apple-touch-icon.png`, await render(appIcon, 180));
  await writeFile(`${publicDir}favicon.png`, await render(favicon, 64));

  // ICO dengan entri PNG native pada tiap ukuran, tanpa dependensi tambahan.
  const sizes = [16, 24, 32, 48, 64];
  const entries: Buffer[] = [];
  const pixels: Buffer[] = [];
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + sizes.length * 16;
  for (const size of sizes) {
    const png = await render(favicon, size);
    const entry = Buffer.alloc(16);
    entry[0] = entry[1] = size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(entry);
    pixels.push(png);
  }
  await writeFile(`${publicDir}favicon.ico`, Buffer.concat([header, ...entries, ...pixels]));
  console.log('Aset Simpul Talenta berhasil diekspor dari SVG master.');
} finally {
  await browser.close();
}
