# Rancangan logo TALENTA — 24 November 2026

Status: pemilik produk menyatakan tim menyetujui **03 — Simpul Talenta** dan meminta pemasangan pada 24 November 2026 (`K-24`). Identitas ini sudah diterapkan pada aplikasi; tiga papan awal di bawah tetap menjadi arsip eksplorasi. Ini bukan lambang resmi kampus dan tidak mengubah keputusan institusional `O-05`.

## Arah dan hasil

Modern minimal, bentuk tebal, ruang negatif jelas, serta palet acuan biru `#1D4ED8`, navy `#0F172A`, dan putih `#FFFFFF`. Tipografi acuan adalah Plus Jakarta Sans Bold, sesuai keluarga font aplikasi. Setiap papan berisi simbol, identitas horizontal TALENTA, versi satu warna, ikon aplikasi, serta contoh navbar terang dan gelap.

| Konsep | Makna dan kelebihan | Berkas |
|---|---|---|
| **01 — T Bertumbuh** | Monogram T dengan ujung kanan naik: talenta berkembang. Rekomendasi awal eksplorasi, sebelum keputusan tim. | [Papan PNG](01-t-bertumbuh.png) |
| **02 — Jalur Prestasi** | Dua bidang naik dengan jalur diagonal: persiapan menuju pencapaian. Arah geraknya kuat dan tetap terbaca dalam satu warna. | [Papan PNG](02-jalur-prestasi.png) |
| **03 — Simpul Talenta (dipilih)** | Dua bidang saling mengunci dengan ruang negatif T: kolaborasi, tim, dan pembinaan. Maknanya paling menekankan kebersamaan. | [Papan PNG](03-simpul-talenta.png) |

Ketiga papan adalah PNG RGB 1536 × 1024, dihasilkan melalui built-in `image_gen`. [Prompt lengkap](prompts.txt) disimpan untuk penelusuran dan iterasi. PNG disalin dari keluaran asli tanpa modifikasi.

## Pemeriksaan visual

Papan diperiksa langsung: ejaan TALENTA benar pada identitas dan kedua navbar; masing-masing memuat contoh satu warna, ikon aplikasi, serta latar terang dan gelap. Bentuk utama tidak menggunakan perisai, pita, atau efek 3D.

[Bukti pemeriksaan ukuran](qa-small-sizes.png) menampilkan sampel simbol dari tiap papan, dikecilkan ke 16, 24, dan 32 piksel memakai Pillow LANCZOS. Setiap sampel ditampilkan pada ukuran asli dan pembesaran piksel 4×. Sampel mencakup versi warna pada latar terang, satu warna pada latar terang, dan putih pada latar gelap. Ini pemeriksaan keterbacaan konsep, bukan uji favicon browser atau aset produksi.

| Konsep | 16 px | 24 / 32 px | Satu warna |
|---|---|---|---|
| T Bertumbuh | Huruf T dan arah ujung naik masih terbaca; paling kuat dari tiga konsep. | Siluet jelas. | T tetap dikenali pada terang dan gelap. |
| Jalur Prestasi | Celah diagonal masih terlihat; lekukan kecil pada bidang atas menjadi kurang menonjol. | Jalur dan bidang bertingkat lebih jelas. | Dua bidang tetap terpisah. |
| Simpul Talenta | Bentuk keseluruhan terlihat, tetapi ruang negatif T dan kait simpul lebih sulit dibaca. | Hubungan dua bidang dan ruang negatif lebih jelas. | Simpul tetap dikenali, detail paling padat dari tiga konsep. |

Rekomendasi awal eksplorasi adalah T Bertumbuh untuk keterbacaan kecil. Keputusan pemilik produk memilih Simpul Talenta menjadi acuan implementasi; SVG final menyederhanakan kait dan memberi celah tegas untuk penggunaan ukuran kecil.

## Batas papan eksplorasi

- Papan raster merupakan eksplorasi desain. Ada variasi kecil proporsi antarpengulangan simbol serta variasi warna permukaan hasil generasi; warna piksel tidak diklaim identik dengan token hex.
- Font pada gambar diminta sebagai Plus Jakarta Sans Bold, tetapi identitas font hasil generasi tidak dapat dipastikan dari raster. Saat finalisasi, gunakan berkas font Plus Jakarta Sans asli dan satu geometri master untuk seluruh turunan.
- Catatan kepadatan Simpul Talenta pada 16 px berlaku untuk papan raster awal. Pemeriksaan SVG final dicatat terpisah di bawah.
- Tugas konsep awal tidak memasang aset ke aplikasi. Pemasangan berikutnya dilakukan setelah persetujuan pemilik produk; pengesahan institusional tetap terpisah.

## Implementasi Simpul Talenta

Master [SVG biru/navy](../../../frontend/public/images/talenta-mark.svg) memfinalkan dua kait geometris, celah bagian atas 8 unit dan batang ruang negatif 22 unit pada bidang 128 × 128. Pembulatan sudut dan warna dibuat datar serta konsisten, tanpa menyalin bayangan/variasi raster. [Versi putih](../../../frontend/public/images/talenta-mark-light.svg) dan [satu warna navy](../../../frontend/public/images/talenta-mark-mono.svg) memiliki geometri yang sama.

- Navbar landing dan footer menggunakan putih; navbar halaman terang serta sidebar/drawer admin menggunakan biru/navy melalui satu komponen `TalentaMark`. Simbol dekoratif memakai `alt=""`/`aria-hidden`, sementara nama aplikasi tetap dibaca dari teks merek. Tautan merek mempunyai tinggi minimal 44 px.
- Tulisan merek tetap teks HTML dengan keluarga font Plus Jakarta Sans yang sudah dimuat aplikasi. Tidak ada tulisan raster dari papan konsep di antarmuka.
- Favicon SVG/PNG/ICO memakai bidang putih agar logo berwarna terlihat pada tab terang/gelap. ICO memiliki entri native 16/24/32/48/64 px. Apple touch icon 180 px dan [ikon aplikasi PNG 512 px](../../../frontend/public/images/talenta-app-icon.png) memakai simbol putih di bidang biru. Parameter `v=simpul-1` pada tautan ikon meminta browser mengambil versi baru.
- URL lama `images/logo-icon.png`, `images/logo-icon.jpg`, dan `images/talenta-shield.svg` tetap tersedia dengan geometri baru untuk tautan langsung. Logo resmi UNIDA tidak diubah.

Regenerasi dengan `bun run brand:generate` (memerlukan Chromium Playwright yang sudah terpasang). Skrip `scripts/generate-brand-assets.ts` menurunkan semua varian dari SVG master dan merender raster melalui Chromium; tidak memanggil imagegen atau layanan eksternal. Ubah master dahulu, regenerasi, lalu tinjau diff semua turunan. Perubahan dependensi tidak diperlukan.

### Bukti verifikasi implementasi

- [Pemeriksaan ukuran final](simpul-final-qa.png): simbol warna, putih, dan satu warna dirender Chromium pada 16/24/32 px, lalu ditampilkan pada ukuran asli dan pembesaran piksel 4×. Ini bukti SVG final, berbeda dari sampel raster eksplorasi.
- Playwright pada preview lokal mode demo: sembilan skenario (landing, katalog, sidebar/drawer admin × 390×844 / 768×1024 / 1440×900) lulus. Simbol berhasil dimuat, tidak ada overflow horizontal, fokus keyboard tautan merek berfungsi, empat tautan favicon/touch icon memberi HTTP 200, dan tidak ada `pageerror`. Data mock saja; backend tidak digunakan.
- `bun run typecheck`, typecheck skrip ekspor tersendiri, `bun run lint`, lint skrip ekspor, serta `bun run build` produksi lulus. Tidak ada perubahan aturan bisnis/API sehingga tes domain dan integrasi backend tidak ditambahkan.

Logo baru terpasang di checkout lokal; tidak ada push atau deploy.
