# TODO — Rencana bertahap TALENTA menuju produksi

Status diperbarui 20 November 2026. Tanda [x] hanya untuk bukti yang sudah ada; rencana berikutnya belum diimplementasikan. Lihat docs/13-peta-jalan.md untuk urutan, dependensi, dan gate yang rinci.

## Kondisi awal yang terverifikasi
- [x] Frontend React/Vite dengan rute mahasiswa, kompetisi publik, verifikasi, dashboard admin, adapter mock/API.
- [x] Data demo di JSON dan perubahan di localStorage; typecheck dan lint lulus pada audit dokumentasi.
- [ ] Backend Elysia, Prisma/MySQL, RustFS, auth produksi, CI GHCR, Compose produksi, dan pengujian otomatis belum ada.
- [ ] Beberapa rute admin dan alur revisi prestasi yang disebut dokumen lama belum ada; jangan tandai sebagai selesai.

## Stage D0 — Rekonsiliasi dokumentasi
- [x] Audit repo dan identifikasi konflik dokumen/kode.
- [x] Putuskan peran rilis awal, login manual, satu kampus, RustFS/MySQL existing, GHCR public, ranking lomba.
- [x] Selaraskan PRD, spesifikasi, keputusan, AGENTS, README, dan TODO; hapus klaim mock yang diperlakukan sebagai kebijakan final.
- [x] Tinjau dokumen dengan pemilik produk; arahan lanjutan mengesahkan scope Stage 1. Keputusan yang belum dapat disahkan kampus tetap tercatat dengan pemilik dan gate di docs/14, bukan dianggap final.
Gate D0: tidak ada kontradiksi lintas dokumen, setiap fitur punya status nyata/rencana, dan semua keputusan terbuka punya pemilik.

## Stage 1 — Fondasi repo dan desain UI
- [x] Pindahkan frontend ke frontend/; sediakan backend/ dan infra/ sesuai docs/04. Bukti: build dan lint lulus; base root untuk lokal, GitHub Pages tetap memakai subpath.
- [x] Hapus klaim beasiswa, SKPI, dan BAAK dari UI demo dan data kompetisi; pencarian teks pada frontend/src dan mocks tidak menemukan klaim tersebut.
- [x] Pertahankan demo mock sebagai jalur pengembangan, bukan paket produksi. `build:demo` memakai adapter mock; `build` mode production memakai adapter API dan hasil bundle telah dipindai agar fixture mock tidak ikut.
- [x] Buat fondasi design system, sitemap final, dan prototipe responsif untuk publik, mahasiswa, validator, super admin. Ikon produk distandardkan ke Lucide; ranking publik serta workspace validator/super admin tersedia sebagai prototipe Stage 1.
- [x] Uji navigasi keyboard, fokus terlihat, mobile 390×844, tablet 768×1024, desktop, login manual gagal/berhasil, redirect lintas role, loading, kosong, error, dan alur mahasiswa/validator/super admin di browser lokal.
Gate 1: frontend build/lint/typecheck bersih setelah pemindahan; rancangan UI disetujui dan dapat diuji.
Status gate: **selesai 20 November 2026**. Route lazy-loading menurunkan bundle entry produksi menjadi sekitar 340 kB tanpa peringatan chunk 500 kB. Bukti lengkap: docs/19-validasi-stage-1.md.

## Stage 2 — Fondasi backend, data, dan autentikasi
- [x] Siapkan Elysia, Prisma versi stabil untuk MySQL, skema awal, migrations, seed super admin yang aman, dan health endpoints. Bukti: Prisma 7 + adapter MariaDB terhubung ke MySQL; migrasi awal diterapkan pada talenta_dev dan talenta_test; health live & ready merespons 200.
- [x] Implementasi daftar/login manual, hash password, sesi aman, reset password, NIM/email unik, rate limiting, RBAC backend, audit. Bukti: Argon2id hash password; 21 uji integrasi & RBAC di Bun lulus; pencegahan 409 pada email/nim duplikat; anti-IDOR profil; halaman frontend /daftar, /lupa-password, /reset-password terhubung.
- [x] Hubungkan ke MySQL existing melalui variabel root .env; tidak ada data nyata dalam seed. Bukti: seed hanya memuat institusi dan bootstrap super admin dari environment, bebas dari data mahasiswa nyata.
Gate 2: uji migrasi ulang, akun duplikat, sesi, otorisasi lintas pengguna/peran, dan pemulihan akun lulus.
Status gate: **selesai 20 November 2026**. Bukti lengkap: docs/20-validasi-stage-2.md.

## Stage 3 — Domain mahasiswa dan kompetisi
- [x] Profil, periode akademik, katalog kompetisi, aturan tim per kompetisi, target, matching transparan, undangan, tim, dan roadmap dengan data persisten. Bukti: Skema Prisma & migrasi MySQL 20261120181913_add_competitions_teams_roadmaps aktif; matching transparan tanpa PII; pembentukan tim dengan penguncian pesimistik (concurrency-safe race condition check); checklist progres roadmap persisten di database.
- [x] Validator mengelola kompetisi, jadwal, roadmap, sumber, seleksi, dan kontak konsultasi WhatsApp yang disetujui. Bukti: Rute admin /api/v1/admin/competitions, /api/v1/admin/roadmaps/:slug, /api/v1/admin/consultants dilindungi RBAC validator/super_admin; kontak konsultasi WhatsApp resmi terintegrasi.
- [x] Pastikan alur berulang lintas periode: arsip target/tim lama, kompetisi baru, perubahan aturan berversi. Bukti: Pergantian target kompetisi secara atomik mengarsipkan target dan keanggotaan tim lama; versioning pada entitas Team dan Roadmap; seluruh 22 uji integrasi Stage 3 lulus (total 43 uji lulus).
Gate 3: perjalanan profil → target → tim → persiapan berjalan tanpa mock dan tahan refresh/pergantian perangkat.
Status gate: **selesai 21 November 2026**. Seluruh 43 uji integrasi lintas auth, rbac, dan domain lulus; typecheck, lint (0 error/warning), build produksi, dan build demo lulus. Bukti lengkap: docs/21-validasi-stage-3.md.

## Stage 4 — Prestasi, bukti, verifikasi, ranking
- [x] Pengajuan prestasi, revisi, jejak keputusan, deteksi duplikat, file bukti privat di RustFS, validasi tipe/ukuran dan hak akses. Bukti: Migrasi 20261120221116_add_achievements_evidence_point_ledger aktif; integrasi RustFS S3 privat terverifikasi; batas 8 MB max (PDF/JPG/PNG); anti-IDOR teruji (403 Forbidden); deteksi duplikat aktif.
- [x] Validator memutuskan status; tindakan tercatat dan tidak boleh mengubah riwayat diam-diam. Bukti: Rute /api/v1/admin/achievements/:id/decisions dan /corrections dilindungi RBAC validator/super admin; catatan wajib pada revisi/penolakan/koreksi; optimistic locking (versioning) mencegah *race condition* verifikasi serentak (409 Conflict); audit event lengkap.
- [x] Poin lomba disetujui dihitung menurut aturan berversi; ranking tahunan dan riwayat keseluruhan; data publik minimum. Bukti: PointRule versi 1 terpasang; buku besar PointLedger mengelola award dan reversal atomik; kategori non-lomba 0 poin lomba; /api/v1/ranking dan /ranking/lifetime bebas PII (tanpa NIM, email, no HP, atau berkas).
Gate 4: unggah/unduh terotorisasi, revisi, dua pengajuan serentak, perhitungan poin, dan koreksi keputusan lulus.
Status gate: **selesai 21 November 2026**. Seluruh 25 uji integrasi Stage 4 (total 68 uji otomatis sistem) lulus; typecheck, lint (0 error/warning), build produksi, dan build demo lulus. Bukti lengkap: docs/22-validasi-stage-4.md.

## Stage 5 — Operasi admin, kualitas, dan keamanan
- [ ] Super admin mengelola peran staf, konfigurasi, bobot poin, audit, dashboard kesehatan dan operasi; validator mengelola data domain.
- [ ] Dashboard mahasiswa/validator/super admin dengan definisi metrik, filter periode, empty state, dan ekspor yang terotorisasi bila disepakati.
- [ ] Uji aksesibilitas, performa, keamanan, backup/restore, retensi data, dan kebijakan publikasi ranking.
Gate 5: semua kriteria docs/18 lulus; tidak ada temuan kritis terbuka.

## Stage 6 — CI, staging, dan deployment produksi
- [ ] GitHub Actions menguji dan membangun dua image lalu push GHCR public dengan SHA dan tag rilis.
- [ ] Compose hanya menarik image aplikasi; root .env mengatur koneksi MySQL/RustFS, domain, rahasia dan tag image.
- [ ] Reverse proxy melalui Cloudflare Tunnel yang ada; health check, migration job satu kali, backup, rollback, serta observabilitas diuji di staging.
Gate 6: dari checkout server + .env, docker compose pull dan docker compose up -d membawa rilis sehat; rollback diuji.

## Stage 7 — Pilot kampus dan alih operasi
- [ ] Uji bersama mahasiswa, validator, dan super admin pada data yang disetujui; perbaiki temuan usability.
- [ ] Dapatkan persetujuan kampus untuk klaim institusi, publikasi nama di ranking, retensi dan pengelolaan data.
- [ ] Serahkan runbook, akun operasional, prosedur insiden, backup/restore, dan jadwal pembaruan konten.
Gate 7: pemilik produk menerima pilot; sistem dapat dipakai lintas tahun akademik tanpa reset data.

## Setelah rilis awal
- [ ] Integrasi SSO kampus ketika sumber identitas dan kontrak integrasi tersedia.
- [ ] AI, notifikasi/pengingat otomatis, multi-kampus, beasiswa dan integrasi lain hanya melalui keputusan produk baru.
