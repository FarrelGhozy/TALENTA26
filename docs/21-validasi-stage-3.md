# 21 — Bukti validasi Stage 3

Tanggal pemeriksaan: 21 November 2026. Cakupan: domain kompetisi, target kompetisi mahasiswa, pencarian rekan tim (matching) transparan tanpa PII, pembentukan tim dengan jaminan *concurrency safety*, kurikulum roadmap persiapan kompetisi, kontak konsultan WhatsApp resmi, serta integrasi frontend React dan backend Bun + Elysia + Prisma MySQL.

---

## 1. Hasil Gate Stage 3

Stage 3 dinyatakan **selesai dan memenuhi kriteria Definition of Done (DoD)** karena:

1. **Model Data & Migrasi MySQL Idempotent**:
   - Skema diperluas dengan entitas: `AcademicPeriod`, `Competition`, `StudentTarget`, `Team`, `TeamMember`, `TeamInvite`, `Roadmap`, `RoadmapPhase`, `RoadmapTask`, `RoadmapProgress`, dan `ConsultantContact`.
   - Kolom profil mahasiswa (`StudentProfile`) diperkaya dengan `skills`, `interests`, `availability`, dan `rolesCapable`.
   - File migrasi `20261120181913_add_competitions_teams_roadmaps` teruji dan berhasil dieksekusi pada basis data `talenta_dev` dan `talenta_test`.
2. **Katalog & Detail Kompetisi**:
   - Endpoint publik `GET /api/v1/competitions` mendukung penyaringan dinamis berdasarkan `category`, `level`, `format` (individu/beregu), dan pencarian kata kunci (`q`).
   - Endpoint detail `GET /api/v1/competitions/:slug` mengembalikan data lengkap kompetisi.
   - Perlindungan RBAC: mahasiswa dilarang membuat kompetisi (`POST /api/v1/competitions` mengembalikan 403 Forbidden); hanya validator dan super admin yang berwenang.
3. **Pengelolaan Target Kompetisi Mahasiswa**:
   - Mahasiswa menetapkan target lomba aktif via `POST /api/v1/me/target`.
   - **Arsip Atomik**: Saat mahasiswa berpindah target ke kompetisi lain, target lama secara atomik diarsipkan (`archived`) dan keanggotaan tim lama diarsipkan guna menjaga konsistensi data institusi.
4. **Pencarian Rekan (Matching) Transparan & Bebas PII**:
   - Algoritma pencocokan menghitung skor kesesuaian berdasarkan: kesamaan target kompetisi (baseline), komplementaritas peran dan keahlian, kesamaan minat bidang, serta komitmen ketersediaan jam belajar.
   - Hasil pencocokan menyertakan label dan alasan transparan (`alasanKecocokan`).
   - **Perlindungan Privasi**: Respons matching TIDAK memuat PII sensitif (tidak ada NIM, alamat email, maupun nomor telepon/WhatsApp pribadi mahasiswa).
5. **Pembentukan Tim & Jaminan Concurrency Safety**:
   - Mahasiswa dapat membentuk tim dengan nama unik; pembuat otomatis menjadi ketua tim.
   - Pembatasan maksimal 5 undangan aktif yang belum direspon per tim untuk mencegah spam.
   - **Anti-IDOR**: Mahasiswa dilarang menerima atau menolak undangan yang ditujukan untuk orang lain (mengembalikan 404/Forbidden).
   - **Pencegahan Race Condition (Deadlock-Free & Concurrency-Safe)**:
     - Menggunakan penguncian pesimistik baris tim (`SELECT id FROM teams WHERE id = ? FOR UPDATE`) dan locking read pada anggota aktif (`SELECT COUNT(*) ... FOR UPDATE`).
     - Pengujian simultan (`Promise.all`) dengan dua mahasiswa menerima undangan serentak pada satu sisa slot kapasitas (`maxTeamMembers`) membuktikan bahwa tepat 1 permintaan yang diterima (200 OK) dan 1 permintaan lainnya ditolak dengan `409 Conflict` ("Kapasitas anggota tim telah penuh oleh rekan lain"). Jumlah anggota aktif di basis data terbukti tidak pernah melampaui batas kapasitas kompetisi.
6. **Ruang Persiapan & Roadmap Mandiri**:
   - Endpoint `GET /api/v1/roadmaps/:competitionSlug` menyajikan tahapan fase belajar dan tugas latihan mandiri terstruktur.
   - Checklist progres mandiri mahasiswa dikelola via `POST /api/v1/roadmaps/:competitionSlug/checklist` dengan status persisten di basis data.
   - Kontak konsultan/dosen pembimbing resmi tersedia via `GET /api/v1/consultants?slug=...` dengan tautan klik-ke-chat WhatsApp resmi tanpa mengekspos nomor pribadi mahasiswa.
7. **Integrasi Antarmuka Frontend**:
   - `CompetitionListPage` dan `CompetitionDetailPage` terhubung dengan data katalog dan target kompetisi backend.
   - `PartnerPage` menyajikan kartu rekomendasi rekan berbasis skor transparansi dan tab manajemen undangan.
   - `TeamPage` mengelola status tim, anggota, dan fitur keluar tim mandiri.
   - `PreparationPage` mengelola silabus fase persiapan dan checklist progres belajar.
   - Mode demo mock (`bun run build:demo`) dan build produksi (`bun run build`) tetap 100% fungsional tanpa regresi.

---

## 2. Pemeriksaan Otomatis

Seluruh pemeriksaan otomatis lulus dari repositori lokal:

```bash
bun run test             # 43 uji integrasi lulus across 3 test files (1.41s)
cd backend && bun run typecheck   # Lulus tanpa error (tsc --noEmit)
cd frontend && bun run typecheck  # Lulus tanpa error (tsc -p frontend && tsc -p backend)
bun run lint             # Lulus: 0 warning, 0 error pada 117 file (oxlint)
bun run build            # Build mode produksi berhasil (342ms)
bun run build:demo       # Build mode demo preview berhasil (301ms)
```

### Rincian Suite Pengujian Integrasi (`bun run test`):
- `tests/integration/auth.test.ts` (17 tests): Autentikasi, registrasi NIM/email unik, login, sesi, reset password.
- `tests/integration/rbac.test.ts` (4 tests): Hak akses validator, super admin, dan guard profil mahasiswa.
- `tests/integration/stage3.test.ts` (22 tests):
  1. `GET /api/v1/competitions`: daftar kompetisi resmi berstatus published (200 OK).
  2. Filter `category=Teknologi`: penyaringan akurat (200 OK).
  3. `GET /api/v1/competitions/:slug`: detail kompetisi format beregu (200 OK).
  4. `GET /api/v1/competitions/:slug`: slug tidak valid menghasilkan 404 Not Found.
  5. `POST /api/v1/me/target`: penetapan target kompetisi aktif (200 OK).
  6. `GET /api/v1/me/target`: pengambilan target aktif saat ini (200 OK).
  7. Perpindahan target kompetisi: target lama otomatis berstatus `archived`, target baru `active`.
  8. `GET /api/v1/matching/candidates`: rekomendasi calon partner dengan skor dan alasan transparan.
  9. Verifikasi keamanan PII: tidak ada NIM, email, atau nomor HP pribadi pada respons matching.
  10. `POST /api/v1/teams`: pembuatan tim berhasil, pembuat menjadi ketua tim.
  11. Pembuatan tim kedua pada kompetisi yang sama: ditolak 409 Conflict.
  12. `POST /api/v1/teams/:id/invites`: pengiriman undangan ke rekan sukses.
  13. Undangan duplikat ke rekan yang sama: ditolak 409 Conflict.
  14. Anti-IDOR: respon undangan oleh user selain penerima ditolak 404 Not Found.
  15. Penerimaan undangan oleh penerima yang sah: bergabung ke dalam tim (200 OK).
  16. **Uji Konkurensi Kapasitas Tim**: 2 respon undangan serentak untuk 1 sisa slot menghasilkan tepat satu 200 OK dan satu 409 Conflict; kapasitas maksimal tidak terlampaui.
  17. `POST /api/v1/teams/:id/leave`: anggota dapat keluar tim mandiri.
  18. `GET /api/v1/roadmaps/:slug`: silabus kurikulum persiapan tersedia.
  19. `POST /api/v1/roadmaps/:slug/checklist`: centang/batal centang progres tersimpan persisten.
  20. `GET /api/v1/consultants`: kontak pembimbing/konsultan resmi tersedia.
  21. RBAC Guard: Mahasiswa dilarang membuat kompetisi admin (403 Forbidden).
  22. Validator Admin: Berhasil menambah/memperbarui kontak konsultan kompetisi (200 OK).

---

## 3. Catatan Arsitektur & Mitigasi Risiko

- **MySQL Deadlock Handling**: Penguncian eksplisit baris tim via `SELECT ... FOR UPDATE` dan perhitungan jumlah anggota via locking read mencegah *phantom read* pada tingkat isolasi default InnoDB `REPEATABLE READ`. Ditambah mekanisme *retry loop* otomatis hingga 3 kali untuk menangani transient lock contention.
- **Zero PII Leakage**: API matching hanya mengekspos nama lengkap, program studi, fakultas, peran keahlian, skill, minat, dan ketersediaan waktu. Kontak pribadi mahasiswa tidak pernah disajikan kepada pengguna lain.
- **Sisa Risiko untuk Stage 4**:
  - Pengunggahan berkas bukti prestasi (PDF/JPG) ke RustFS object storage S3-compatible.
  - Alur pengajuan prestasi lomba, review validator, revisi berkas, dan ledger persetujuan berstatus final.
