# Rancangan logo TALENTA — 24 November 2026

Status: tiga konsep pembanding untuk dipilih pemilik produk. Belum ada pilihan final atau pemasangan ke aplikasi. Konsep ini bukan lambang resmi kampus dan tidak mengubah keputusan brand institusi `O-05`.

## Arah dan hasil

Modern minimal, bentuk tebal, ruang negatif jelas, serta palet acuan biru `#1D4ED8`, navy `#0F172A`, dan putih `#FFFFFF`. Tipografi acuan adalah Plus Jakarta Sans Bold, sesuai keluarga font aplikasi. Setiap papan berisi simbol, identitas horizontal TALENTA, versi satu warna, ikon aplikasi, serta contoh navbar terang dan gelap.

| Konsep | Makna dan kelebihan | Berkas |
|---|---|---|
| **01 — T Bertumbuh (rekomendasi)** | Monogram T dengan ujung kanan naik: talenta berkembang. Bentuk paling langsung dikenali dan paling sederhana untuk favicon. | [Papan PNG](01-t-bertumbuh.png) |
| **02 — Jalur Prestasi** | Dua bidang naik dengan jalur diagonal: persiapan menuju pencapaian. Arah geraknya kuat dan tetap terbaca dalam satu warna. | [Papan PNG](02-jalur-prestasi.png) |
| **03 — Simpul Talenta** | Dua bidang saling mengunci dengan ruang negatif T: kolaborasi, tim, dan pembinaan. Maknanya paling menekankan kebersamaan. | [Papan PNG](03-simpul-talenta.png) |

Ketiga papan adalah PNG RGB 1536 × 1024, dihasilkan melalui built-in `image_gen`. [Prompt lengkap](prompts.txt) disimpan untuk penelusuran dan iterasi. PNG disalin dari keluaran asli tanpa modifikasi.

## Pemeriksaan visual

Papan diperiksa langsung: ejaan TALENTA benar pada identitas dan kedua navbar; masing-masing memuat contoh satu warna, ikon aplikasi, serta latar terang dan gelap. Bentuk utama tidak menggunakan perisai, pita, atau efek 3D.

[Bukti pemeriksaan ukuran](qa-small-sizes.png) menampilkan sampel simbol dari tiap papan, dikecilkan ke 16, 24, dan 32 piksel memakai Pillow LANCZOS. Setiap sampel ditampilkan pada ukuran asli dan pembesaran piksel 4×. Sampel mencakup versi warna pada latar terang, satu warna pada latar terang, dan putih pada latar gelap. Ini pemeriksaan keterbacaan konsep, bukan uji favicon browser atau aset produksi.

| Konsep | 16 px | 24 / 32 px | Satu warna |
|---|---|---|---|
| T Bertumbuh | Huruf T dan arah ujung naik masih terbaca; paling kuat dari tiga konsep. | Siluet jelas. | T tetap dikenali pada terang dan gelap. |
| Jalur Prestasi | Celah diagonal masih terlihat; lekukan kecil pada bidang atas menjadi kurang menonjol. | Jalur dan bidang bertingkat lebih jelas. | Dua bidang tetap terpisah. |
| Simpul Talenta | Bentuk keseluruhan terlihat, tetapi ruang negatif T dan kait simpul lebih sulit dibaca. | Hubungan dua bidang dan ruang negatif lebih jelas. | Simpul tetap dikenali, detail paling padat dari tiga konsep. |

Rekomendasi: lanjutkan **T Bertumbuh** karena paling terikat pada nama TALENTA dan paling jelas pada ukuran kecil. Jalur Prestasi menjadi alternatif bila prioritasnya kesan perkembangan; Simpul Talenta bila prioritasnya kolaborasi.

## Batas dan tindak lanjut setelah pemilihan

- Papan raster merupakan eksplorasi desain. Ada variasi kecil proporsi antarpengulangan simbol serta variasi warna permukaan hasil generasi; warna piksel tidak diklaim identik dengan token hex.
- Font pada gambar diminta sebagai Plus Jakarta Sans Bold, tetapi identitas font hasil generasi tidak dapat dipastikan dari raster. Saat finalisasi, gunakan berkas font Plus Jakarta Sans asli dan satu geometri master untuk seluruh turunan.
- Simpul Talenta perlu penyederhanaan ruang negatif bila dipilih untuk favicon 16 px. Ketiga konsep memerlukan finalisasi vektor, penetapan padding, dan ekspor ukuran nyata sebelum digunakan.
- Pemasangan navbar/footer/favicon, penggantian logo lama, dan persetujuan institusional berada di luar tugas konsep ini. Tidak ada kode aplikasi atau konfigurasi produksi yang diubah.

Pemeriksaan kode dicatat pada `TODO.md`; tidak ada tes domain/API baru karena perubahan hanya berupa dokumen dan artefak konsep.
