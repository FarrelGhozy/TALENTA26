# 22 — Bukti validasi Stage 4

Tanggal pemeriksaan: 21 November 2026. Cakupan: pengajuan prestasi mandiri mahasiswa, penyimpanan berkas bukti privat di RustFS S3-compatible, validasi berkas (1–3 file, maksimal 8 MB per berkas, PDF/JPG/PNG), perlindungan Anti-IDOR pada pengunduhan bukti, alur verifikasi validator dengan kontrol konkurensi (*optimistic locking*), pengiriman revisi berkas berriwayat, koreksi keputusan dengan pembalikan poin buku besar (*point ledger*), kalkulasi bobot poin berversi (`PointRule`), serta ranking publik periode aktif & *lifetime* dengan jaminan bebas PII (UU PDP / UU 27/2022).

---

## 1. Hasil Gate Stage 4

Stage 4 dinyatakan **selesai dan memenuhi seluruh kriteria Definition of Done (DoD) serta Gate 4** karena:

1. **Model Data & Migrasi MySQL Idempotent**:
   - Skema Prisma diperluas dengan entitas:
     - `Achievement` (dengan status `draft`, `menunggu`, `perlu_perbaikan`, `disetujui`, `ditolak`, `dibatalkan`, serta kontrol konkurensi `version`).
     - `AchievementEvidence` (object key acak UUID terisolasi, nama asli hanya untuk tampilan).
     - `AchievementRevision` (snapshot riwayat versi dan catatan perbaikan).
     - `AchievementDecision` (jejak aksi verifikator: `approve`, `request_changes`, `reject`, `correct`).
     - `PointRule` (matriks poin berversi per institusi).
     - `PointLedger` (buku besar transaksi mutasi poin append-only berstatus `award` dan `reversal`).
   - File migrasi `20261120221116_add_achievements_evidence_point_ledger` sukses diterapkan pada basis data `talenta_dev` dan `talenta_test`.
   - Seed data awal memuat aturan bobot poin versi 1 sesuai acuan [docs/09-spesifikasi-dashboard.md](file:///home/fazy/projek/STACK2026/docs/09-spesifikasi-dashboard.md).

2. **Penyimpanan Bukti Privat RustFS (S3-Compatible)**:
   - Berkas diunggah via multipart ke origin aplikasi backend; backend memvalidasi ukuran (maksimal 8 MB sesuai arahan pengguna) dan format MIME (`application/pdf`, `image/jpeg`, `image/png`).
   - Berkas dialirkan dan disimpan langsung ke RustFS S3 bucket `talentadevtest`.
   - Teruji berhasil menulis, membaca, dan mengalirkan berkas secara privat tanpa mengekspos endpoint RustFS ke publik.
   - **Anti-IDOR Terverifikasi**: Mahasiswa dilarang mengunduh berkas bukti milik mahasiswa lain (mengembalikan `403 Forbidden`). Validator dan pemilik sah diizinkan mengunduh (`200 OK`).

3. **Verifikasi Validator, Revisi & Concurrency Safety**:
   - Validator dapat melihat antrean pengajuan pada `GET /api/v1/admin/achievements` dengan penyaringan status dan pencarian kata kunci.
   - Aksi keputusan `request_changes` dan `reject` mewajibkan pencantuman catatan alasan minimal.
   - Mahasiswa dapat mengirimkan revisi perbaikan (`POST /api/v1/me/achievements/:id/revisions`) dengan melampirkan berkas bukti baru; data versi sebelumnya tersimpan aman dalam snapshot `AchievementRevision`.
   - **Optimistic Locking**: Dua validator yang memutuskan pengajuan berversi sama secara simultan (`Promise.all`) terbukti menghasilkan tepat satu keputusan berhasil (`200 OK`) dan satu keputusan ditolak dengan `409 Conflict` ("Status pengajuan telah diubah oleh validator lain").

4. **Kalkulasi Poin Otomatis & Pembalikan Atomik (Ledger)**:
   - Prestasi kategori `kompetisi` yang disetujui otomatis menghasilkan transaksi `PointLedger` (misal: Nasional Juara 1 = 18 poin).
   - Prestasi kategori non-lomba (misal: Konferensi Ilmiah atau Kejuaraan Seni/Olahraga Umum) tidak menghasilkan poin lomba pada Belmawa ranking (0 poin).
   - **Koreksi Keputusan (Correction Flow)**: Pengajuan yang telah disetujui dapat dikoreksi oleh validator/admin dengan alasan wajib; sistem secara atomik mencatat mutasi pembalikan (`reversal`, bertanda minus) di `PointLedger` tanpa menghapus riwayat audit sebelumnya.

5. **Mesin Ranking Publik & Perlindungan Privasi PII**:
   - Endpoint `GET /api/v1/ranking` dan `GET /api/v1/ranking/lifetime` menghitung akumulasi skor sah secara dinamis dengan aturan pemutus seri (*tie break*): Total poin DESC → Jumlah Juara 1 DESC → Total capaian sah DESC → Nama alfabetis ASC.
   - **Nol Kebocoran PII**: Respons publik terbukti tidak memuat NIM, email, nomor telepon/WhatsApp, maupun URL berkas bukti.

6. **Integrasi Frontend & Dual-Mode Compatibility**:
   - `AchievementNewPage`: Formulir pengajuan mendukung pemilihan berkas nyata (PDF/JPG/PNG max 8 MB) dan preset demo cepat.
   - `AchievementListPage`: Menampilkan riwayat capaian dan modal revisi berkas saat status `perlu_perbaikan`.
   - `VerificationListPage` & `VerificationDetailPage`: Antrean verifikator terhubung ke API dengan tautan unduh berkas privat, modal keputusan, serta fitur koreksi keputusan.
   - `RankingPage`: Papan peringkat terintegrasi dengan tab periode berjalan dan lifetime.
   - Mode produksi (`bun run build`) dan mode demo mock (`bun run build:demo`) lulus 100% tanpa regresi.

---

## 2. Pemeriksaan Otomatis

Seluruh pemeriksaan otomatis lulus dari repositori lokal:

```bash
bun run test             # 68 uji integrasi lulus across 4 test files (3.41s)
bun run typecheck        # Lulus: 0 error pada frontend & backend (tsc)
bun run lint             # Lulus: 0 error, 0 warning pada 120 file (oxlint)
bun run build            # Build mode produksi berhasil (436ms)
bun run build:demo       # Build mode demo preview berhasil (247ms)
```

### Rincian Suite Pengujian Integrasi (`bun run test`):
- `tests/integration/auth.test.ts` (17 tests): Registrasi, login, sesi aman, pemulihan akun.
- `tests/integration/rbac.test.ts` (4 tests): Hak akses validator, super admin, dan guard mahasiswa.
- `tests/integration/stage3.test.ts` (22 tests): Kompetisi, target atomik, matching bebas PII, concurrency tim, roadmap.
- `tests/integration/stage4.test.ts` (25 tests):
  1. Validasi masukan: nama kegiatan minimal 3 karakter (422).
  2. Validasi masukan: tanggal capaian masa depan ditolak (422).
  3. Validasi masukan: tanpa berkas bukti ditolak (422).
  4. Validasi masukan: format berkas selain PDF/JPG/PNG ditolak (422).
  5. Validasi masukan: berkas melebihi batas maksimal 8 MB ditolak (422).
  6. Validasi masukan: berkas bukti lebih dari 3 berkas ditolak (422).
  7. Mahasiswa 1 berhasil mengajukan prestasi lomba dengan bukti sertifikat PDF ke RustFS S3 (200 OK).
  8. Mahasiswa 1 melihat daftar dan detail prestasi miliknya (200 OK).
  9. Deteksi potensi duplikat: pengajuan serupa memunculkan indikator peringatan aman.
  10. Anti-IDOR: Mahasiswa 2 dilarang mengunduh berkas bukti Mahasiswa 1 (403 Forbidden).
  11. Pemilik sah (Mahasiswa 1) berhasil mengunduh berkas bukti miliknya (200 OK).
  12. Validator berwenang berhasil mengunduh berkas bukti mahasiswa untuk telaah (200 OK).
  13. Permintaan unduh tanpa autentikasi ditolak (401 Unauthorized).
  14. Validator melihat antrean pengajuan berstatus menunggu di portal admin (200 OK).
  15. Validator meminta perbaikan tanpa catatan wajib ditolak (422).
  16. Validator berhasil meminta perbaikan dengan catatan resmi (200 OK, status: `perlu_perbaikan`).
  17. Mahasiswa mengirimkan revisi dengan berkas SK baru (200 OK, status kembali: `menunggu`, version naik).
  18. **Uji Konkurensi Keputusan**: Dua validator memutuskan serentak pada versi yang sama menghasilkan tepat 1 status 200 OK dan 1 status 409 Conflict.
  19. Prestasi lomba disetujui (Nasional Juara 1) otomatis menghasilkan 18 poin di PointLedger.
  20. Prestasi kategori non-lomba (Konferensi Ilmiah) disetujui menghasilkan 0 poin pada buku besar kompetisi.
  21. Alur koreksi keputusan: validator mengoreksi prestasi disetujui dengan alasan wajib (200 OK, status: `perlu_perbaikan`).
  22. Reversal mutasi poin: sistem mencatat pembalikan -18 poin secara atomik di PointLedger.
  23. Koreksi tanpa alasan ditolak (422).
  24. `GET /api/v1/ranking` mengembalikan daftar ranking periode berjalan dengan pemutus seri stabil (200 OK).
  25. Jaminan Privasi PII: inspeksi respons JSON ranking membuktikan 0 kebocoran NIM, email, nomor telepon, atau URL berkas.
