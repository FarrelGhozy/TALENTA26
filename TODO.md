# TODO — Rencana bertahap TALENTA menuju produksi

Status diperbarui 21 November 2026 (selaras keputusan produk `K-01`–`K-22` di `docs/14-keputusan-terbuka.md`). Tanda `[x]` hanya untuk bukti yang sudah ada dan terverifikasi; pekerjaan kode sistem pada Fase 1–4 dijalankan berurutan setelah Fase 0 (dokumentasi) selesai. Lihat `docs/13-peta-jalan.md` untuk dependensi dan gate yang rinci.

## Kondisi awal yang terverifikasi
- [x] Frontend React/Vite dengan rute publik, mahasiswa, validator, super admin, serta adapter mock/API.
- [x] Backend Elysia, Prisma 7/MySQL, integrasi storage S3 compatible (RustFS), autentikasi Argon2id + cookie HttpOnly, SMTP reset password, serta tes unit/integrasi/Playwright E2E ada di repo.
- [ ] Penutupan temuan audit keamanan, korupsi poin/ledger, crash alur nyata, dan fitur keputusan `K-15`–`K-22` (Fase 1–3) belum dijalankan.
- [ ] CI image GHCR public, `Dockerfile`, `compose.yaml` produksi, reverse proxy `infra/`, dan pengujian staging (Fase 4 / Stage 6) belum tersedia.

---

## Ringkasan historis Stage D0–5 (sebelum rekonsiliasi lanjutan 21 November 2026)
- [x] **Stage D0 awal**: Rekonsiliasi awal PRD, spesifikasi, keputusan `K-01`–`K-14`, `AGENTS.md`, `README.md`, dan `TODO.md`.
- [x] **Stage 1**: Pemindahan frontend ke `frontend/`, pemisahan adapter `@talenta/services`, ikon Lucide, fondasi UI responsif & keyboard. Bukti historis: `docs/19-validasi-stage-1.md`.
- [x] **Stage 2**: Fondasi backend Elysia + Prisma 7/MySQL, registrasi/login manual, Argon2id, RBAC, SMTP reset password (`K-13`), proteksi CSRF/Origin. Bukti historis: `docs/20-validasi-stage-2.md`.
- [x] **Stage 3**: Domain kompetisi, target, matching, tim concurrency-safe, roadmap, konsultan, dan seleksi internal dasar. Bukti historis: `docs/21-validasi-stage-3.md`.
- [x] **Stage 4**: Pengajuan prestasi, RustFS privat dengan validasi magic-byte & cleanup orphan, verifikasi berversi, koreksi, PointLedger, dan ranking tanpa periode aktif. Bukti historis: `docs/22-validasi-stage-4.md`.
- [x] **Tindak lanjut audit awal (`docs/24`, A-01 s.d. A-10)**: Rekonsiliasi dokumen awal, SMTP reset password, validasi signature berkas & cleanup orphan, isolasi ranking tanpa periode aktif, mitigasi formula injection CSV, serta skrip `infra/scripts/backup-storage.ts`.
- [ ] **Gate Stage 5 (`docs/18` & `docs/23`)**: **Masih terbuka** — hasil audit mendalam lanjutan (21 November 2026) menemukan celah keamanan, bug poin/ledger, crash enum/avatar, alur belum lengkap, dan sisa teks/klaim terlarang yang wajib ditutup pada Fase 1–3 di bawah sebelum Stage 6.

---

## Fase 0 — Penyelarasan Dokumentasi & Keputusan Produk (`K-15`–`K-22`) *(Tanpa Ubah Kode Sistem)*
- [x] Tambahkan keputusan produk `K-15` s.d. `K-22` pada `docs/14-keputusan-terbuka.md` (sistem poin 3 lapis + jenis/sub-lomba + override validator, prestasi kelompok multi-anggota, revisi penuh + batal tanpa draft, seleksi individu & beregu, aturan tim/undangan 5 aktif / 14 hari + peran/prodi sebagai indikator UI, avatar privat RustFS + nama asli staf `fullName`, manajemen pergantian periode di admin + tunda verifikasi email, struktur tab ringkas `?tab=...` + penghapusan rute legacy IDOR).
- [x] Selaraskan `PRD_TALENTA.md`, `README.md`, `docs/00`, `docs/01`, `docs/02`, `docs/03`, `docs/04`, `docs/05`, `docs/06`, `docs/08`, `docs/09`, `docs/10`, `docs/12`, `docs/13`, `docs/15`, dan `docs/16` agar bebas kontradiksi lintas dokumen.
- [x] Susun ulang `TODO.md` menjadi rencana operasional bertahap Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 (Stage 6) → Stage 7, dengan verifikasi email dan simpan draft prestasi di bagian paling bawah (*Setelah rilis awal*).
- **Gate Fase 0**: nol perubahan di `frontend/`, `backend/`, `infra/`; tidak ada kontradiksi antar-dokumen; commit Git lokal dokumentasi selesai dan disetujui pemilik produk sebelum masuk Fase 1.

---

## Fase 1 — Patch Kritis Keamanan, Bug Poin/Ledger, & Crash Alur Nyata
### 1.1 Keamanan Backend, Privasi, & Konfigurasi
- [ ] Hapus kebocoran `passwordHash` dan PII (`email`, `nim`, `phone`) pada `GET /api/v1/users/:userId`, `getMyTeam`, dan `getMyInvites` dengan Prisma explicit `select` serta enforce filter `institutionId`.
- [ ] Hapus rute legacy rawan IDOR (`/api/v1/users/:userId/target`, query `?userId=` pada checklist roadmap, alias `/api/v1/matching/invites`, dan duplikat `POST /api/v1/competitions`).
- [ ] Enforce filter `status: 'published'` pada endpoint publik `GET /competitions/:slug`, `GET /roadmaps/:slug`, dan `GET /consultants`.
- [ ] Simpan `sessionToken` dalam bentuk hash SHA-256 di `auth_sessions`, aktifkan validasi fail-fast `SESSION_SECRET`/`COOKIE_SECRET` di produksi, hapus pengembalian token sesi di JSON body jika cookie HttpOnly aktif penuh, dan kunci `login()`/`validateSession()` konsisten pada status `active`.
- [ ] Perbaiki `resolveClientIp` agar memakai IP soket nyata saat `TRUST_PROXY=false` (mencegah seluruh pengguna berbagi 1 bucket `'unknown'`), batasi CORS `localhost` hanya untuk non-production, dan matikan fallback `.storage/` lokal pada `NODE_ENV=production`.
- [ ] Bersihkan `.env.example` (hapus hostname privat `sr-farrel-myserver...` dan password konkret; tambahkan `IMAGE_TAG`, `LOG_LEVEL`, `UPLOAD_MAX_BYTES`, `TIMEZONE_DISPLAY`, `PORT`) dan kunci `backend/prisma/seed.ts` agar pada `NODE_ENV=production` tidak memakai password fallback hardcoded serta tidak meng-upsert 4 lomba 2026 / nomor WA dummy.

### 1.2 Bug Kritis Poin, Ledger, & Verifikasi
- [ ] Perbaiki query `PointRule` di `decideAchievement` agar mengambil versi aktif terbaru (hapus hardcode `version: 1`).
- [ ] Perbaiki bug double-negation reversal poin pada `getStudentDashboard` dan `generateAchievementsCsv` (`sum += entry.points`).
- [ ] Cegah double-reversal & double-count pada re-approval pasca koreksi (tandai award yang sudah dibalik, hitung `approvedCount`/`juara1Count` per `achievementId` unik, dan tambahkan tie-break ke-5 `userId.localeCompare`).
- [ ] Enforce transisi status ketat (`ach.status === 'menunggu'`) pada `decideAchievement`, kunci baris atomik (`FOR UPDATE` / conditional update `version` wajib), dukungan `idempotencyKey`, dan panggil `recordAuditEvent` pada `decideAchievement` serta `correctAchievement`.
- [ ] Perbaiki validasi tanggal capaian prestasi agar memakai zona waktu `Asia/Jakarta`, validasi enum ketat (`category`, `level`, `result`), dan validasi ukuran buffer nyata (bukan `item.size` klien).

### 1.3 Patch Crash & Build Frontend
- [ ] Jadikan build produksi fail-safe: `frontend/vite.config.ts` mengunci `factory.api.ts` pada `--mode production` (abaikan `VITE_USE_MOCK=true`), default `APP_ENV` ke `'PRODUCTION'`, lazy/conditional load `RoleCardLogin` hanya di mode dev/demo agar kredensial demo tidak masuk bundle produksi, dan sembunyikan preset berkas PDF palsu (`AchievementForm.tsx`) pada produksi.
- [ ] Selaraskan enum `AchievementType` frontend ↔ `AchievementResult` Prisma (`finalis`, `penghargaan_khusus`, dll.) di `AchievementForm`, `StatusBadge`, dan `format.ts`.
- [ ] Perbaiki bug infinite loading (`if (!cancelled) return;`) di `ProfilePage.tsx` dan `AdminDashboardPage.tsx`, perbaiki perhitungan progres roadmap di `PreparationPage.tsx` (hapus efek dual-key >100%), perbaiki cancel invite & re-join tim di `teams/service.ts` + `PartnerPage.tsx`, pertahankan status `terkunci_seleksi` di mapper tim, hapus fallback user palsu di `userApiService.getById`, dan perbaiki `statsApiService` agar chart analitik peserta per kompetisi & delegasi terkonfirmasi akurat.
- **Gate Fase 1**: `bun run typecheck`, `bun run lint`, `bun run build`, `bun run build:demo` lulus; uji integrasi keamanan (IDOR, no `passwordHash`, PointRule v2, reversal dashboard/CSV, build scan bebas kredensial/mock) lulus; commit Git lokal.

---

## Fase 2 — Implementasi Fitur & Alur Baru (`K-15` s.d. `K-22`)
### 2.1 Skema & Migrasi Prisma MySQL
- [ ] Buat migrasi Prisma untuk:
  - `User.fullName` (nama asli staf/pengguna, `K-20`).
  - `StudentProfile.avatarObjectKey` (objek privat RustFS, `K-20`).
  - `AcademicPeriod.startDate`, `endDate`, `archivedAt` + `StudentTarget.academicPeriodId` (`K-21`).
  - `CompetitionCategory` (jenis lomba), `CompetitionSubCategory` (sub-lomba/cabang), `PointTemplate`, `CompetitionPointRule` (+ `description`/keterangan poin) (`K-15`).
  - `Achievement`: `participationType` (`individu | kelompok`), `teamId?`, `competitionCategoryId?`, `subCategoryId?`, `subCompetitionName?`, `potentialDuplicateOfId?`, tabel `AchievementParticipant` (`K-16`), `AchievementEvidence.isActive/supersededByRevisionId` (`K-17`).
  - Provenance poin & anti-double-reversal: `AchievementDecision` (`calculatedPoints`, `awardedPoints`, `pointSource`, `overrideReason`) dan `PointLedger` (`idempotencyKey @unique`, `pointSource`, `calculatedPoints`, `overrideReason`, `reversedByLedgerId?`).
  - `InternalSelection`: `teamId?` opsional, `userId?` opsional, `notes?`, `confirmedAt?`, `validatorId?` (`K-18`).

### 2.2 Sistem Poin 3 Lapis, Jenis/Sub-Lomba, Override Validator, & Prestasi Kelompok (`K-15`, `K-16`, `K-17`)
- [ ] **Admin/Super Admin**: Endpoint & UI `/super-admin?tab=poin` untuk kelola **Template Poin berversi**, **Master Jenis & Sub-Lomba**, dan bobot default + keterangannya.
- [ ] **Admin/Validator**: Pengaturan poin per perlombaan/sub-lomba (pakai template atau custom bobot + keterangan poin) pada `/validator/konten?tab=kompetisi`.
- [ ] **Mahasiswa**: Perbarui `/app/prestasi/baru` untuk pilih **jenis & sub-lomba**, lihat keterangan poin, pilih kepesertaan `individu` atau `kelompok` (tarik dari tim aktif atau cari rekan satu institusi); buat halaman detail `/app/prestasi/:id`; lengkapi **revisi penuh** (semua field + ganti berkas bukti lama) dan aksi **batalkan pengajuan** (`menunggu → dibatalkan`).
- [ ] **Validator**: Perbarui `/validator/prestasi/:id` untuk menampilkan detail lengkap (jenis/sub-lomba, anggota kelompok, deskripsi, potensi duplikat, riwayat revisi/keputusan, kalkulasi poin rekomendasi + sumber aturan & keterangannya), tampilkan panel keputusan hanya pada status `menunggu`, sediakan input **override poin + alasan wajib** saat *approve*, beri poin penuh ke seluruh anggota kelompok secara atomik, dan balikkan seluruh anggota saat koreksi.

### 2.3 Avatar Privat RustFS & Nama Asli Staf (`K-20`)
- [ ] Implementasikan `POST /api/v1/me/profile/avatar` (validasi magic-byte JPEG/PNG/WebP maks 2 MB → unggah ke RustFS privat) dan `GET /api/v1/users/:id/avatar` (stream terotorisasi; pastikan tidak muncul di ranking publik).
- [ ] Perbarui `StepIdentitas.tsx` & `ProfilePage.tsx` (pakai endpoint upload avatar + `AuthContext.refreshUser()`, hapus `window.alert()`, tampilkan NIM dengan status belum terverifikasi kampus, field pengalaman/bio, kunci input email agar tidak hilang diam-diam).
- [ ] Perbarui form pembuatan/edit staf di `/super-admin?tab=staf` (wajib `fullName`), simpan & tampilkan nama asli staf di `Navbar`, `AchievementDecision`, dan `AuditEvent` (bukan "Tim Validator" / "Super Administrator").

### 2.4 Lomba Individu, Seleksi Internal, Konten Validator, & Manajemen Pergantian Periode (`K-18`, `K-19`, `K-21`, `K-22`)
- [ ] Pisahkan alur lomba **individu** vs **beregu** secara konsisten di `ProfilePage` (redirect ke `/app/kompetisi/:slug/persiapan` untuk individu), `BerandaPage`, `PartnerPage`, `CompetitionDetailPage`, dan tambahkan dialog konfirmasi arsip tim saat ganti target.
- [ ] Tambahkan form buat tim kustom di `TeamPage`, tampilkan banner status `terkunci_seleksi` (disable keluar mandiri), tampilkan label kesesuaian (bukan `%` mentah) di `PartnerCard`, dan jadikan `requiredRoles`/lintas prodi sebagai indikator saran UI.
- [ ] Lengkapi `/validator/konten` (dengan sinkronisasi `?tab=...`): edit penuh kompetisi + pratinjau + jadwal/syarat/sumber, editor roadmap multi-fase/multi-tugas non-destruktif (tanpa `deleteMany` yang menghapus progres mahasiswa), daftar/edit/arsip konsultan + `capacityNote` + persetujuan publikasi, serta tab seleksi internal dengan **dropdown peserta tim/individu** + catatan & konfirmasi.
- [ ] Bangun bagian **Manajemen Pergantian Periode** di `/super-admin?tab=periode`: buat periode dengan `startDate`/`endDate`, endpoint `activation-preview` (jumlah target & tim aktif terdampak), modal konfirmasi eksplisit, dan aktivasi atomik yang mengarsipkan target & tim periode lama tanpa menghapus riwayat.
- **Gate Fase 2**: migrasi teruji pada DB uji + data eksisting; uji unit & integrasi mencakup poin 3 lapis, override validator, prestasi kelompok + koreksi, revisi/ganti bukti, batal pengajuan, avatar RustFS, nama staf, seleksi individu/beregu, dan pergantian periode; commit Git lokal.

---

## Fase 3 — Pembersihan UI/UX, Kepatuhan Kebijakan, & Penutupan Gate Stage 5
- [ ] Bersihkan seluruh sisa klaim terlarang (`BAAK`, `SK dan transkrip`, `PDDIKTI`), copy `"demo"`/`"simulasi"` hardcoded, emoji (`🎉`, `🤝`), dan nomor WA palsu (`628120000001`).
- [ ] Hubungkan `BerandaPage` ke `GET /api/v1/me/dashboard` (dengan `actionUrl` rute `/app/*` valid dan metrik akurat tanpa pemotongan 4 item), perbaiki `RequireRole` agar user yang sudah login tanpa izin diarahkan ke `/403`, perbaiki double-active `Navbar`, perbaiki error login ganda, `await logout()`, stale closure filter peran & mutasi state aturan poin di `SuperAdminDashboardPage`, dan ganti seluruh modal mentah ke `<Modal>` aksesibel.
- [ ] Lengkapi filter katalog (`/kompetisi`), filter/cari nama & NIM di antrean validator (`/validator/prestasi`), filter periode di dashboard validator & ekspor CSV terfilter, serta konfirmasi untuk aksi sensitif super admin (suspend, ubah peran, aktifkan periode) + larangan suspend/downgrade diri sendiri.
- [ ] Jalankan verifikasi penuh Gate Stage 5 sesuai `docs/18`:
  - `bun run typecheck`, `bun run lint`, `bun run build`, `bun run build:demo` (cek bundle bebas mock/kredensial).
  - Seluruh unit test, integration test, dan Playwright E2E J1–J5 (termasuk alur poin override, kelompok, avatar, pergantian periode) pada mobile 390×844, tablet 768×1024, desktop 1440×900.
  - Optimasi `infra/scripts/backup-storage.ts` (hindari unduh objek 2×), validasi nama DB pada `infra/scripts/backup-db.sh`, serta catat hasil uji backup/restore MySQL & RustFS terisolasi di `docs/23-validasi-stage-5.md`.
- [ ] Catatan gate operasional/kebijakan yang masih menunggu pengesahan eksternal sebelum go-live data nyata: sesi pembaca layar manusia, ambang kapasitas `O-06`, retensi/RTO/RPO `O-03`, uji restore bucket RustFS uji nyata di server, dan pengesahan publikasi ranking `O-01`/`O-02`.
- **Gate Fase 3 (Stage 5)**: seluruh kriteria teknis `docs/18` lulus tanpa temuan kritis terbuka; commit Git lokal.

---

## Fase 4 (Stage 6) — CI/CD GHCR Public, Container, Compose Produksi, & Staging
- [ ] Rapikan struktur monorepo & lockfile (`workspaces` atau sinkronisasi penuh dependensi root/backend termasuk `@aws-sdk/client-s3` dengan versi terkunci; perbaiki `run-e2e.sh` agar tidak menjalankan `bun add`).
- [ ] Sediakan `frontend/Dockerfile` (multi-stage build produksi + static web server), `backend/Dockerfile` (Bun + Prisma client), konfigurasi reverse proxy `infra/` (same-origin `/` dan `/api`, header keamanan), dan root `compose.yaml` (`web`, `api`, serta `migrate` job satu kali; terhubung ke MySQL & RustFS existing via root `.env`).
- [ ] Ganti/tambahkan workflow GitHub Actions CI + build & push dua image (`frontend` & `backend`) ke GHCR public dengan tag commit SHA dan tag rilis (pin versi/digest action, jalankan typecheck/lint/unit/integration/build/scan rahasia, tanpa secret server di build).
- [ ] Perbarui `docs/17-runbook-operasi.md` dan uji di staging: `docker compose pull`, migration job satu kali, `docker compose up -d`, `GET /health/live` & `GET /health/ready` (cek DB + storage), Cloudflare Tunnel HTTPS, serta uji rollback.
- **Gate Stage 6**: dari checkout server + root `.env`, `docker compose pull && docker compose up -d` membawa rilis sehat; rollback teruji; commit Git lokal.

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
