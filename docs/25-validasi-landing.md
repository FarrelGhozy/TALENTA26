# 25 — Validasi penyegaran landing TALENTA

Tanggal: 24 November 2026. Tugas mandiri antarmuka publik, berdasarkan permintaan pemilik produk untuk menyesuaikan landing dengan kondisi proyek terkini. Acuan: PRD publik/J1/J2/J4, keputusan rekrutmen `K-19`/`K-23`, identitas `K-24`, dan spesifikasi UI `docs/11`.

## Hasil

- Hero statis navy/biru memperkenalkan manfaat TALENTA dengan CTA katalog serta pendaftaran/portal sesuai sesi. Deskripsi tetap utuh; diagram alur desktop disembunyikan pada mobile/tablet supaya CTA terlihat pada layar pertama. Carousel otomatis dan foto hero lama tidak lagi dimuat.
- Tiga lomba ditampilkan lebih awal, mengikuti urutan layanan publik (API mengurutkan terbaru dibuat). Kartu memuat kategori, tingkat, format individu/beregu, jumlah anggota, status pendaftaran dari data, serta tenggat seleksi internal dalam Asia/Jakarta jika tersedia. Katalog lengkap tetap melalui halaman katalog; tidak ada klaim jumlah keseluruhan dari respons berhalaman.
- Alur empat langkah merangkum target → persiapan individu/tim → roadmap/konsultasi dan seleksi sesuai aturan → pengajuan capaian. Tiga jalur beregu menjelaskan tim baru, pengajuan ke tim terbuka, serta kode undangan ketua. Tidak ada janji matching otomatis, akun dosen, atau pendampingan yang pasti tersedia.
- Sorotan tiga mahasiswa berasal dari `achievementService.getRanking()` dan periode respons. Hanya nama tampilan, prodi, posisi, poin, dan jumlah capaian disetujui yang dirender. Tidak menggunakan avatar atau field privat, dan tidak menjumlahkan capaian kelompok antar mahasiswa menjadi statistik palsu.
- FAQ native dan footer menyelaraskan penjelasan akses akun, pemeriksaan validator, roadmap, dan privasi bukti dengan fitur saat ini. Tidak ada perubahan API, domain, data, dependensi, atau operasi produksi.

## Pemeriksaan

| Pemeriksaan | Bukti/hasil |
|---|---|
| Loading mandiri | Hero tetap terbaca ketika respons lomba dan ranking ditahan; masing-masing menampilkan status pemuatan. |
| Data sukses | Maksimal tiga lomba dan tiga entri ranking, format individu/beregu, status ditutup, periode dan poin dari respons. |
| Data kosong | Pesan katalog kosong, periode aktif tanpa poin, dan tidak ada periode aktif berbeda; tidak memakai riwayat sepanjang waktu sebagai pengganti. |
| Gagal dan pemulihan | Gangguan 503 pada satu sumber tidak menutupi sumber lain; tombol coba lagi hanya mengulang sumber yang gagal. |
| Privasi | Fixture dengan avatar/email/NIM/kontak/bukti sentinel tidak dirender pada landing; screenshot ranking memakai data sintetis. |
| Tanggal | Tenggat `2030-03-10T17:30:00Z` ditampilkan `11 Mar 2030`, sesuai Asia/Jakarta. |
| Keyboard dan ukuran sentuh | FAQ dapat dibuka dengan Enter dan ditutup dengan Space; aksi dalam isi landing minimal 44 px. |
| Responsif | 390×844, 768×1024, 1440×900: CTA utama terlihat pada layar pertama, tanpa overflow; nama lomba/mahasiswa/prodi panjang tanpa spasi juga membungkus. |
| Integrasi publik | Suite publik membaca landing, katalog, detail lomba, dan ranking melalui API lokal setelah fixture landing dilepas; tidak ada `pageerror`. |

Kasus otomatis berada di `tests/e2e/specs/00-landing-page.ts` dan dipanggil suite publik `01-public-flows.ts`. Pemeriksaan dijalankan pada Vite frontend dan Bun/Elysia backend lokal yang sudah berjalan, tanpa migrasi, seed, atau mutasi data. Pemeriksaan kode dan build akhir dicatat pada `TODO.md`.

Pratinjau visual: [desktop](design/landing-2026-11/desktop.png), [tablet](design/landing-2026-11/tablet.png), [mobile](design/landing-2026-11/mobile.png). Screenshot menunjukkan tampilan representatif; pengujian data/ranking menggunakan fixture sintetis.

## Batas verifikasi

Pengujian ini mencakup landing dan regresi alur publik, bukan pengulangan suite mahasiswa/validator/super admin atau pengesahan WCAG lengkap oleh manusia. Aturan poin, dasar publikasi nama, serta persetujuan institusional/operasional tetap mengikuti gate `docs/14`; tugas ini tidak menutupnya. Tidak ada push atau deploy. Frontend dan backend development lokal tetap berjalan untuk peninjauan pemilik produk.
