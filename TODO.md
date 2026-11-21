# TODO — Rencana bertahap TALENTA menuju produksi

Status diperbarui 21 November 2026 (selaras keputusan produk `K-01`–`K-22` di `docs/14-keputusan-terbuka.md`). Tanda `[x]` hanya untuk bukti yang sudah ada dan terverifikasi; pekerjaan kode sistem pada Fase 1–4 dijalankan berurutan setelah Fase 0 (dokumentasi) selesai. Lihat `docs/13-peta-jalan.md` untuk dependensi dan gate yang rinci.

## Kondisi awal yang terverifikasi
- [x] Frontend React/Vite dengan rute publik, mahasiswa, validator, super admin, serta adapter mock/API.
- [x] Backend Elysia, Prisma 7/MySQL, integrasi storage S3 compatible (RustFS), autentikasi Argon2id + cookie HttpOnly, SMTP reset password, serta tes unit/integrasi/Playwright E2E ada di repo.
- [x] Penutupan temuan audit keamanan, korupsi poin/ledger, crash alur nyata, dan fitur keputusan `K-15`–`K-22` (Fase 1–3) telah diselesaikan dan diverifikasi.
- [x] CI image GHCR public, `Dockerfile`, `compose.yaml` produksi, dan reverse proxy `infra/` telah disiapkan dan diverifikasi build lokal; uji push/pull GHCR serta staging di home server menunggu instruksi rilis terpisah.

---

## Ringkasan historis Stage D0–5 (sebelum rekonsiliasi lanjutan 21 November 2026)
- [x] **Stage D0 awal**: Rekonsiliasi awal PRD, spesifikasi, keputusan `K-01`–`K-14`, `AGENTS.md`, `README.md`, dan `TODO.md`.
- [x] **Stage 1**: Pemindahan frontend ke `frontend/`, pemisahan adapter `@talenta/services`, ikon Lucide, fondasi UI responsif & keyboard. Bukti historis: `docs/19-validasi-stage-1.md`.
- [x] **Stage 2**: Fondasi backend Elysia + Prisma 7/MySQL, registrasi/login manual, Argon2id, RBAC, SMTP reset password (`K-13`), proteksi CSRF/Origin. Bukti historis: `docs/20-validasi-stage-2.md`.
- [x] **Stage 3**: Domain kompetisi, target, matching, tim concurrency-safe, roadmap, konsultan, dan seleksi internal dasar. Bukti historis: `docs/21-validasi-stage-3.md`.
- [x] **Stage 4**: Pengajuan prestasi, RustFS privat dengan validasi magic-byte & cleanup orphan, verifikasi berversi, koreksi, PointLedger, dan ranking tanpa periode aktif. Bukti historis: `docs/22-validasi-stage-4.md`.
- [x] **Tindak lanjut audit awal (`docs/24`, A-01 s.d. A-10)**: Rekonsiliasi dokumen awal, SMTP reset password, validasi signature berkas & cleanup orphan, isolasi ranking tanpa periode aktif, mitigasi formula injection CSV, serta skrip `infra/scripts/backup-storage.ts`.
- [x] **Gate Stage 5 (`docs/18` & `docs/23`)**: **Gate teknis LULUS (21 November 2026)** — celah keamanan, bug poin/ledger, crash enum/avatar, fitur `K-15`–`K-22`, serta pembersihan teks/klaim terlarang telah ditutup pada Fase 1–3; uji pembaca layar manusia dan persetujuan kebijakan kampus tetap dicatat terbuka sebelum go-live nyata.

---

## Fase 0 — Penyelarasan Dokumentasi & Keputusan Produk (`K-15`–`K-22`) *(Tanpa Ubah Kode Sistem)*
- [x] Tambahkan keputusan produk `K-15` s.d. `K-22` pada `docs/14-keputusan-terbuka.md` (sistem poin 3 lapis + jenis/sub-lomba + override validator, prestasi kelompok multi-anggota, revisi penuh + batal tanpa draft, seleksi individu & beregu, aturan tim/undangan 5 aktif / 14 hari + peran/prodi sebagai indikator UI, avatar privat RustFS + nama asli staf `fullName`, manajemen pergantian periode di admin + tunda verifikasi email, struktur tab ringkas `?tab=...` + penghapusan rute legacy IDOR).
- [x] Selaraskan `PRD_TALENTA.md`, `README.md`, `docs/00`, `docs/01`, `docs/02`, `docs/03`, `docs/04`, `docs/05`, `docs/06`, `docs/08`, `docs/09`, `docs/10`, `docs/12`, `docs/13`, `docs/15`, dan `docs/16` agar bebas kontradiksi lintas dokumen.
- [x] Susun ulang `TODO.md` menjadi rencana operasional bertahap Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 (Stage 6) → Stage 7, dengan verifikasi email dan simpan draft prestasi di bagian paling bawah (*Setelah rilis awal*).
- **Gate Fase 0**: nol perubahan di `frontend/`, `backend/`, `infra/`; tidak ada kontradiksi antar-dokumen; commit Git lokal dokumentasi selesai dan disetujui pemilik produk sebelum masuk Fase 1.

---

## Fase 1 — Patch Kritis Keamanan, Bug Poin/Ledger, & Crash Alur Nyata
### 1.1 Keamanan Backend, Privasi, & Konfigurasi
- [x] Hapus kebocoran `passwordHash` dan PII (`email`, `nim`, `phone`) pada `GET /api/v1/users/:userId`, `getMyTeam`, dan `getMyInvites` dengan Prisma explicit `select` serta enforce filter `institutionId`.
- [x] Hapus rute legacy rawan IDOR (`/api/v1/users/:userId/target`, query `?userId=` pada checklist roadmap, alias `/api/v1/matching/invites`, dan duplikat `POST /api/v1/competitions`).
- [x] Enforce filter `status: 'published'` pada endpoint publik `GET /competitions/:slug`, `GET /roadmaps/:slug`, dan `GET /consultants`.
- [x] Simpan `sessionToken` dalam bentuk hash HMAC-SHA256 di `auth_sessions`, aktifkan validasi fail-fast `SESSION_SECRET`/`COOKIE_SECRET` di produksi, hapus pengembalian token sesi di JSON body saat `NODE_ENV=production`, dan kunci `login()`/`validateSession()` konsisten pada status `active`.
- [x] Perbaiki `resolveClientIp` agar memakai IP soket nyata saat `TRUST_PROXY=false`, batasi CORS `localhost` hanya untuk non-production, dan matikan fallback `.storage/` lokal pada `NODE_ENV=production`.
- [x] Bersihkan `.env.example` (hapus hostname privat dan password konkret; tambahkan `IMAGE_TAG`, `LOG_LEVEL`, `UPLOAD_MAX_BYTES`, `TIMEZONE_DISPLAY`, `PORT`) dan kunci `backend/prisma/seed.ts` agar pada `NODE_ENV=production` tidak memakai password fallback hardcoded serta tidak meng-upsert konten demo/kontak dummy.

### 1.2 Bug Kritis Poin, Ledger, & Verifikasi
- [x] Perbaiki query `PointRule` di `decideAchievement` agar mengambil versi aktif terbaru (hapus hardcode `version: 1`).
- [x] Perbaiki bug double-negation reversal poin pada `getStudentDashboard` dan `generateAchievementsCsv` (`sum += item.points`).
- [x] Cegah double-reversal & double-count pada re-approval pasca koreksi (hitung net aktif per user/aturan, hitung `approvedCount`/`juara1Count` per `achievementId` unik, dan tambahkan tie-break ke-5 `userId.localeCompare`).
- [x] Enforce transisi status ketat (`ach.status === 'menunggu'`) pada `decideAchievement`, kunci baris atomik (`FOR UPDATE`), dan panggil `recordAuditEvent` pada `decideAchievement` serta `correctAchievement` (header `Idempotency-Key` dan kolom DB uniknya dilanjutkan pada migrasi Fase 2).
- [x] Perbaiki validasi tanggal capaian prestasi agar memakai zona waktu `Asia/Jakarta`, validasi enum ketat (`category`, `level`, `result`), dan validasi ukuran buffer nyata.

### 1.3 Patch Crash & Build Frontend
- [x] Jadikan build produksi fail-safe: `frontend/vite.config.ts` mengunci `factory.api.ts` pada `--mode production` (abaikan `VITE_USE_MOCK=true`), default `APP_ENV` ke `'PRODUCTION'`, lazy/conditional load `RoleCardLogin` hanya di mode dev/demo agar kredensial demo tidak masuk bundle produksi, dan sembunyikan preset berkas PDF palsu (`AchievementForm.tsx`) pada produksi.
- [x] Selaraskan enum `AchievementType` frontend ↔ `AchievementResult` Prisma (`finalis`, `penghargaan_khusus`, dll.) di `AchievementForm`, `StatusBadge`, dan `format.ts`.
- [x] Perbaiki bug infinite loading (`if (cancelled) return;`) di `ProfilePage.tsx` dan `AdminDashboardPage.tsx`, perbaiki perhitungan progres roadmap di `PreparationPage.tsx`, perbaiki cancel invite & re-join tim di `teams/service.ts` + `PartnerPage.tsx`, pertahankan status `terkunci_seleksi` di mapper tim, hapus fallback user palsu di `userApiService.getById`, dan perbaiki `statsApiService` agar chart analitik peserta per kompetisi & delegasi terkonfirmasi akurat.
- **Gate Fase 1**: **LULUS (21 November 2026)** — `bun run typecheck`, `bun run lint`, `bun run build` (pemindaian `frontend/dist` bebas kredensial/mock), 13 unit tests, dan seluruh 6 suite integrasi (termasuk `fase1-security-points.test.ts`) lulus 100%.

---

## Fase 2 — Implementasi Fitur & Alur Baru (`K-15` s.d. `K-22`)
### 2.1 Skema & Migrasi Prisma MySQL
- [x] Buat migrasi Prisma (`20261121134000_add_fase2_features`) dan terapkan ke `talenta_dev` + `talenta_test`:
  - `User.fullName` (nama asli staf/pengguna, `K-20`).
  - `StudentProfile.avatarObjectKey` (objek privat RustFS, `K-20`).
  - `AcademicPeriod.startDate`, `endDate`, `archivedAt` + `StudentTarget.academicPeriodId` (`K-21`).
  - `CompetitionCategory` (jenis lomba), `CompetitionSubCategory` (sub-lomba/cabang), `PointTemplate`, `CompetitionPointRule` (+ `description`/keterangan poin) (`K-15`).
  - `Achievement`: `participationType` (`individu | kelompok`), `teamId?`, `competitionCategoryId?`, `subCategoryId?`, `subCompetitionName?`, `potentialDuplicateOfId?`, tabel `AchievementParticipant` (`K-16`), `AchievementEvidence.isActive/supersededByRevisionId` (`K-17`).
  - Provenance poin & anti-double-reversal: `AchievementDecision` (`calculatedPoints`, `awardedPoints`, `pointSource`, `overrideReason`) dan `PointLedger` (`idempotencyKey @unique`, `pointSource`, `calculatedPoints`, `overrideReason`, `reversedByLedgerId?`).
  - `InternalSelection`: `teamId?` opsional, `userId?` opsional, `notes?`, `confirmedAt?`, `validatorId?` (`K-18`).

### 2.2 Sistem Poin 3 Lapis, Jenis/Sub-Lomba, Override Validator, & Prestasi Kelompok (`K-15`, `K-16`, `K-17`)
- [x] **Admin/Super Admin**: Endpoint & UI `/super-admin?tab=poin` untuk kelola **Template Poin berversi** (`PointTemplate`), dan **Master Jenis & Sub-Lomba** serta bobot default + keterangannya di `/validator/konten?tab=poin` (dapat diakses validator & super admin).
- [x] **Admin/Validator**: Pengaturan poin per perlombaan/sub-lomba (pakai template atau custom bobot + keterangan poin) pada `/validator/konten?tab=poin` dan `/validator/konten?tab=kompetisi`.
- [x] **Mahasiswa**: Perbarui `/app/prestasi/baru` untuk pilih **jenis & sub-lomba**, lihat keterangan poin, pilih kepesertaan `individu` atau `kelompok` (tarik dari tim aktif atau cari rekan satu institusi); buat halaman detail `/app/prestasi/:id`; lengkapi **revisi penuh** (semua field + ganti berkas bukti lama via `replaceEvidenceIds`) dan aksi **batalkan pengajuan** (`menunggu → dibatalkan`).
- [x] **Validator**: Perbarui `/validator/prestasi/:id` untuk menampilkan detail lengkap (jenis/sub-lomba, anggota kelompok, deskripsi, potensi duplikat, riwayat revisi/keputusan, kalkulasi poin rekomendasi + sumber aturan & keterangannya), tampilkan panel keputusan hanya pada status `menunggu`, sediakan input **override poin + alasan wajib** saat *approve*, beri poin penuh ke seluruh anggota kelompok secara atomik, dan balikkan seluruh anggota saat koreksi.

### 2.3 Avatar Privat RustFS & Nama Asli Staf (`K-20`)
- [x] Implementasikan `POST /api/v1/me/profile/avatar` (validasi magic-byte JPEG/PNG/WebP maks 2 MB → unggah ke RustFS privat), `DELETE /api/v1/me/profile/avatar`, dan `GET /api/v1/users/:id/avatar` (stream terotorisasi; tidak muncul di ranking publik).
- [x] Perbarui `StepIdentitas.tsx` & `ProfilePage.tsx` (pakai endpoint upload avatar + `AuthContext.refreshUser()`, hapus `window.alert()`, tampilkan NIM dengan status belum terverifikasi kampus, field pengalaman/bio/telepon/fakultas, kunci input email agar tidak hilang diam-diam).
- [x] Perbarui form pembuatan/edit staf di `/super-admin?tab=staf` (wajib `fullName`), simpan & tampilkan nama asli staf di `AuthContext`/`Navbar`, `AchievementDecision`, dan `AuditEvent`.

### 2.4 Lomba Individu, Seleksi Internal, Konten Validator, & Manajemen Pergantian Periode (`K-18`, `K-19`, `K-21`, `K-22`)
- [x] Pisahkan alur lomba **individu** vs **beregu** secara konsisten di `ProfilePage` (redirect ke `/app/kompetisi/:slug/persiapan` untuk individu), `BerandaPage`, `PartnerPage`, `CompetitionDetailPage`, dan dialog konfirmasi ganti target.
- [x] Tambahkan form buat tim kustom di `TeamPage`, tampilkan banner status `terkunci_seleksi` (disable keluar mandiri), tampilkan label kesesuaian (bukan `%` mentah) di `PartnerCard`, dan jadikan `requiredRoles`/lintas prodi sebagai indikator saran UI.
- [x] Lengkapi `/validator/konten` (dengan sinkronisasi `?tab=...`): edit penuh kompetisi + jadwal/syarat/sumber/poin, editor roadmap multi-fase/multi-tugas non-destruktif (pertahankan ID agar `RoadmapProgress` mahasiswa tetap utuh), daftar/edit/arsip/hapus konsultan + `capacityNote`, serta tab seleksi internal dengan **dropdown peserta tim/individu** + catatan & konfirmasi.
- [x] Bangun bagian **Manajemen Pergantian Periode** di `/super-admin?tab=periode`: buat periode dengan `startDate`/`endDate`, endpoint `activation-preview` (jumlah target & tim aktif terdampak), modal konfirmasi eksplisit, dan aktivasi atomik yang mengarsipkan target & tim periode lama tanpa menghapus riwayat.
- **Gate Fase 2**: **LULUS (21 November 2026)** — migrasi `20261121134000_add_fase2_features` diterapkan ke `talenta_dev` & `talenta_test`; `bun run typecheck`, `bun run lint`, `bun run build` (+ bundle clean), `bun run build:demo`, 13 unit test, dan seluruh 7 suite integrasi (termasuk `fase2-features.test.ts` — 7 test, 52 assertions) lulus 100%. (Integrasi `BerandaPage` & UI/E2E polish berlanjut ke Fase 3).

---

## Fase 3 — Pembersihan UI/UX, Kepatuhan Kebijakan, & Penutupan Gate Stage 5
- [x] Bersihkan seluruh sisa klaim terlarang (`BAAK`, `SK dan transkrip`, `PDDIKTI`), copy `"demo"`/`"simulasi"` pada halaman non-demo, emoji (`🎉`, `🤝`), dan nomor WA palsu (`628120000001`).
- [x] Hubungkan `BerandaPage` ke `GET /api/v1/me/dashboard` (dengan `actionUrl` rute `/app/*` valid dan metrik penuh tanpa pemotongan 4 item), perbaiki `RequireRole` agar user yang sudah login tanpa izin diarahkan ke `/403`, perbaiki double-active `Navbar`, perbaiki error login ganda, `await logout()`, stale closure filter peran & mutasi state aturan poin di `SuperAdminDashboardPage`, dan ganti seluruh modal mentah ke `<Modal>` aksesibel.
- [x] Lengkapi filter katalog (`/kompetisi`), filter/cari nama & NIM di antrean validator (`/validator/prestasi`), filter status/kategori ekspor CSV validator, serta konfirmasi untuk aksi sensitif super admin (suspend, ubah peran, aktifkan periode) + larangan suspend/downgrade diri sendiri.
- [x] Jalankan verifikasi penuh Gate Stage 5 sesuai `docs/18`:
  - `bun run typecheck`, `bun run lint`, `bun run build`, `bun run build:demo` (cek bundle bebas mock/kredensial).
  - Seluruh unit test (13/13), 7 integration test suites, dan Playwright E2E (Publik + responsif 390×844 / 768×1024 / 1440×900, Mahasiswa, Validator, Super Admin).
  - Optimasi `backend/src/lib/storage-archive.ts` (`HeadObjectCommand` pada listing agar tidak mengunduh 2×), validasi nama DB pada `infra/scripts/backup-db.sh`, dan uji nyata `./infra/scripts/backup-db.sh --test-restore talenta_restore_check` (30 tabel pulih + SHA-256 OK); dicatat di `docs/23-validasi-stage-5.md`.
- [ ] Catatan gate operasional/kebijakan yang masih menunggu pengesahan eksternal sebelum go-live data nyata: sesi pembaca layar manusia, ambang kapasitas `O-06`, retensi/RTO/RPO `O-03`, uji restore bucket RustFS uji nyata di server, dan pengesahan publikasi ranking `O-01`/`O-02`.
- **Gate Fase 3 (Stage 5)**: **LULUS teknis (21 November 2026)** — seluruh kriteria teknis `docs/18` lulus tanpa temuan kritis terbuka; commit Git lokal.

---

## Fase 4 (Stage 6) — CI/CD GHCR Public, Container, Compose Produksi, & Staging
- [x] Rapikan struktur monorepo & lockfile (`"workspaces": ["backend"]`, sinkronisasi penuh dependensi root/backend termasuk `@aws-sdk/client-s3: 3.1174.0` dengan versi tepat + `bun install --frozen-lockfile` terverifikasi; perbaiki `run-e2e.sh` agar tidak menjalankan `bun add`).
- [x] Sediakan `frontend/Dockerfile` (multi-stage build produksi + Nginx alpine), `backend/Dockerfile` (Bun 1.4.4 + Prisma 7.10.1 client), `.dockerignore`, konfigurasi reverse proxy `infra/nginx/default.conf` (same-origin `/` dan `/api/`, `/health`, header keamanan, batas unggah `30m`), dan root `compose.yaml` (`migrate`, `api`, `web`; terhubung ke MySQL & RustFS existing via root `.env`).
- [x] Tambahkan workflow `.github/workflows/ci-publish.yml` untuk CI (`typecheck`, `lint`, unit tests, build produksi, scan bundle & `.env`) + build & push image `talenta-frontend` dan `talenta-backend` ke GHCR public dengan tag commit SHA dan tag rilis (tanpa menyematkan secret server di build).
- [ ] Perbarui `docs/17-runbook-operasi.md`, `infra/README.md`, dan uji di staging: *(dokumentasi & verifikasi build container lokal `talenta-frontend` + `talenta-backend`, `docker compose config`, `nginx -t`, dan `prisma --version` di container sudah lulus; push ke GHCR, `docker compose pull` di home server, Cloudflare Tunnel HTTPS, serta uji rollback nyata menunggu instruksi deploy server terpisah sesuai `AGENTS.md`)*.
- **Gate Stage 6**: artefak build, Compose, Nginx, dan workflow CI selesai dan terverifikasi lokal; aktivasi staging/produksi home server menunggu persetujuan deploy terpisah; commit Git lokal.

---

## Stage 7 — Pilot kampus dan alih operasi
- [ ] Uji bersama mahasiswa, validator, dan super admin pada data yang disetujui; perbaiki temuan usability.
- [ ] Dapatkan persetujuan kampus untuk klaim institusi (`O-05`), publikasi nama di ranking (`O-01`/`O-02`), retensi dan pengelolaan data (`O-03`), serta ambang kapasitas/keamanan file (`O-06`).
- [ ] Serahkan runbook, akun operasional (staf bernamakan asli), prosedur insiden, backup/restore, dan jadwal pembaruan konten.
- **Gate Stage 7**: pemilik produk menerima pilot; sistem dapat dipakai lintas tahun akademik tanpa reset data.

---

## Setelah rilis awal
- [ ] **Verifikasi kepemilikan email saat registrasi** (`pending_verification`, token verifikasi email via SMTP, kirim ulang tautan verifikasi — ditunda per `K-21`).
- [ ] **Simpan draft pengajuan prestasi** (`PATCH /me/achievements/:id/draft` → `POST /me/achievements/:id/submit` — ditunda per `K-17`).
- [ ] Integrasi SSO kampus ketika sumber identitas dan kontrak integrasi tersedia (dengan prosedur pemadanan identitas NIM yang diaudit).
- [ ] AI, notifikasi/pengingat otomatis, multi-kampus, beasiswa, dan integrasi resmi lain hanya melalui keputusan produk baru.
