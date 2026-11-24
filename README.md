# TALENTA — Sistem Pembinaan Lomba dan Pengelolaan Prestasi Mahasiswa

TALENTA adalah aplikasi web untuk membantu mahasiswa menemukan perlombaan, membentuk tim melalui rekrutmen berbasis pengajuan & kode undangan, mengikuti roadmap persiapan, berkonsultasi dengan dosen/konsultan, mengajukan prestasi beserta bukti privat, dan melihat papan peringkat berbasis capaian sah. Rilis pertama ditujukan untuk satu kampus, **Universitas Darussalam (UNIDA) Gontor**, dengan portal publik, portal mahasiswa (`/app/*`), dan portal admin terpadu (`/admin/*`).

---

## Status Implementasi & Arsitektur

- **Frontend (`frontend/`)**: React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 4, Lucide React. Mendukung adapter API produksi (`factory.api.ts`, dikunci otomatis pada `bun run build`) dan adapter mock khusus pratinjau/demo (`bun run build:demo`).
- **Backend (`backend/`)**: Bun 1.4, Elysia, Prisma 7 (`@prisma/adapter-mariadb`) dengan MySQL/MariaDB, autentikasi Argon2id + sesi cookie `HttpOnly` (hash HMAC-SHA256 di DB), proteksi CSRF/Origin, RBAC, SMTP reset password, serta integrasi object storage S3-compatible (**RustFS / MinIO**) dengan validasi magic-byte.
- **Container & Operasi (`infra/`)**: `frontend/Dockerfile` (multi-stage build produksi + Nginx same-origin proxy `/` dan `/api/`), `backend/Dockerfile`, `infra/docker-compose.yaml` (pull image GHCR), skrip backup/restore MySQL & RustFS, serta workflow CI/CD `.github/workflows/ci-publish.yml`.
- **Pengujian**: 22 unit test, 10 suite integration test backend, dan 4 suite Playwright E2E lintas peran.
- **Catatan Rilis**: Gate teknis lokal telah lulus (`TODO.md`). Pengesahan kebijakan kampus (`O-01`–`O-06` di `docs/14-keputusan-terbuka.md`), uji pembaca layar manusia, serta deployment produksi/staging ke home server dilakukan sebagai tahap operasional terpisah. Fitur di luar rilis awal (AI, login Google, SSO, verifikasi email registrasi, simpan draft prestasi, beasiswa, SKPI/klaim BAAK, multi-kampus) tidak aktif.

---

## Prasyarat

| Kebutuhan | Versi / Catatan |
|---|---|
| **Bun** | `1.4.x` (paket dan lockfile dikelola dengan Bun; jangan mengganti package manager) |
| **MySQL / MariaDB** | MySQL 8.x atau MariaDB setara untuk pengembangan lokal dan produksi |
| **RustFS / MinIO (S3)** | Wajib di produksi; pada pengembangan lokal **opsional** (otomatis fallback ke direktori `.storage/` bila S3 tidak dikonfigurasi) |
| **Docker & Docker Compose** | Diperlukan bila menjalankan aplikasi menggunakan container (`infra/docker-compose.yaml`) |

---

## 1. Menjalankan Secara Lokal (Full Stack FE + BE + MySQL)

Ikuti langkah berurutan berikut untuk menjalankan aplikasi lengkap sampai siap dipakai di browser.

### Langkah 1 — Clone & Pasang Dependensi
```bash
git clone <url-repositori-anda>
cd STACK2026
bun install --frozen-lockfile
```

### Langkah 2 — Siapkan Konfigurasi `.env`
Salin template `.env.example` ke root repositori:
```bash
cp .env.example .env
```
Sesuaikan parameter utama pada `.env` untuk lingkungan pengembangan lokal:
```env
NODE_ENV=development
VITE_APP_ENV=DEPLOYMENT
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api/v1
VITE_API_PROXY_TARGET=http://127.0.0.1:3001
PUBLIC_ORIGIN=http://localhost:5173
TRUST_PROXY=false

# Koneksi MySQL lokal
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=talenta_dev
```
> **Catatan S3 & SMTP di mode lokal**: Jika RustFS/MinIO lokal berjalan di `http://127.0.0.1:9000`, isi `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, dan `S3_SECRET_KEY`. Jika tidak tersedia di lokal (`NODE_ENV=development`), unggahan berkas otomatis memakai penyimpanan lokal `.storage/`. Di mode `NODE_ENV=production`, RustFS/S3 dan SMTP wajib terkonfigurasi.

### Langkah 3 — Buat Database MySQL
Buat database `talenta_dev` (dan `talenta_test` bila ingin menjalankan integration test backend):
```sql
CREATE DATABASE IF NOT EXISTS talenta_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS talenta_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Langkah 4 — Generate Prisma Client & Jalankan Migrasi Database
Konfigurasi Prisma berada di root `prisma.config.ts` dan membaca `DB_*` (atau `DATABASE_URL`) dari `.env`:
```bash
# 1. Generate Prisma Client
bun run db:generate

# 2. Terapkan seluruh file migrasi ke database
bun run db:migrate
```
*(Khusus saat mengembangkan perubahan skema Prisma baru di lokal, gunakan `bun run db:migrate:dev` untuk membuat file migrasi baru).*

### Langkah 5 — Isi Data Awal (Seed Database)
TALENTA menyediakan **2 skrip seed** yang idempotent sesuai kebutuhan:

| Perintah | Target Lingkungan | Isi Data yang Dibuat |
|---|---|---|
| `bun run db:seed:demo` *(atau `bun run seed:simulasi`)* | **Development / Demo** *(ditolak otomatis jika `NODE_ENV=production`)* | Menjalankan seed dasar **ditambah** 12 mahasiswa simulasi berfoto profil, 2 periode akademik (aktif & arsip), 4 lomba + roadmap + konsultan, 3 tim terbuka/terbentuk beserta pelamar, 28 prestasi disetujui lintas 2 periode + berkas PDF + `PointLedger` (papan ranking langsung terisi), 2 antrean verifikasi `menunggu`, dan 1 `perlu_perbaikan`. **Menghasilkan tampilan aplikasi penuh seperti kondisi demo saat ini.** |
| `bun run db:seed` *(atau `bunx prisma db seed`)* | **Development atau Production** | Pada `NODE_ENV=development`: Institusi, Super Admin, Validator, 2 akun mahasiswa uji, 1 periode aktif, 4 lomba + roadmap + konsultan, Template & Aturan Poin v1, dan Master Jenis/Sub-Lomba.<br>Pada `NODE_ENV=production`: **hanya** Institusi, akun Super Admin dari `SUPER_ADMIN_BOOTSTRAP_EMAIL`/`PASSWORD`, dan Template & Aturan Poin v1 (nol akun/konten demo). |

Untuk menjalankan aplikasi lokal dengan tampilan data lengkap seperti demo saat ini:
```bash
bun run db:seed:demo
```
> **Penting tentang perubahan manual vs seed**: Data yang Anda tambah atau ubah secara manual lewat antarmuka aplikasi disimpan di database MySQL, **tidak** ditulis otomatis ke dalam file `seed-simulation.ts`. Untuk mencadangkan atau memindahkan data nyata yang sudah diisi manual, gunakan skrip backup (`infra/scripts/backup-db.sh` & `infra/scripts/backup-storage.ts`).

### Langkah 6 — Jalankan Server Backend & Frontend
Buka **2 terminal terpisah** di root proyek:

**Terminal 1 — Backend API (`http://localhost:3001`)**:
```bash
bun run dev:backend
```

**Terminal 2 — Frontend Vite (`http://localhost:5173`)**:
```bash
bun run dev
```

### Langkah 7 — Verifikasi Aplikasi Berjalan
1. Cek kesiapan backend melalui proxy same-origin Vite:
   ```bash
   curl http://localhost:5173/health/ready
   ```
   Respons normal: `{"data":{"status":"ready","database":"connected",...}}`
2. Buka browser ke **`http://localhost:5173`**.

---

## Opsi Cepat Tanpa Database (Mode Mock Frontend Saja)

Jika hanya ingin meninjau tampilan antarmuka frontend tanpa menyalakan MySQL/Backend:
```bash
VITE_USE_MOCK=true bun run dev
```
Untuk membuat build statis demo (mode mock):
```bash
bun run build:demo
bun run preview
```
> **Catatan Keamanan**: `bun run build` (mode produksi) secara fail-safe selalu mengunci adapter API nyata dan menghapus seluruh kode mock maupun kartu login instan dari bundle `frontend/dist`.

---

## Akun Uji Coba Lokal (Khusus Development / Demo)

Pada mode `VITE_APP_ENV=DEPLOYMENT`, halaman `/masuk` menyediakan kartu login cepat 1-klik sekaligus tab login manual. Akun berikut **hanya** dipasang pada lingkungan non-production:

| Peran | Email | Kata Sandi Lokal | Rute Utama |
|---|---|---|---|
| **Super Admin** | `admin@unida.gontor.ac.id` | `AdminGontor2026!` | `/admin` (Dashboard, Kelola Lomba, Validasi Prestasi, Pengaturan Sistem) |
| **Validator** | `validator@unida.gontor.ac.id` | `Validator2026!` | `/admin` (Portal Admin Terpadu) |
| **Mahasiswa** | `mhs@unida.gontor.ac.id` | `Mahasiswa2026!` | `/app/beranda` (Beranda, Persiapan, Tim, Prestasi) |
| **Mahasiswa 2** | `zaidan@unida.gontor.ac.id` | `Mahasiswa2026!` | `/app/beranda` |

*Semua 12 akun mahasiswa simulasi hasil `bun run db:seed:demo` memakai kata sandi lokal `Mahasiswa2026!` dan identitas sintetis.*

---

## 2. Menjalankan dengan Docker & Docker Compose

Konfigurasi Docker di `infra/docker-compose.yaml` dirancang untuk runtime container (production / staging) dengan 3 service terkoordinasi:
1. **`migrate`**: job satu kali dari image `talenta-backend` yang **otomatis menjalankan `bunx prisma migrate deploy`** sebelum API menyala.
2. **`api`**: server backend Bun/Elysia pada jaringan internal Docker (port `3001`, tidak diekspos langsung ke publik).
3. **`web`**: Nginx reverse proxy satu origin pada port `WEB_PORT` (default `8080`) yang melayani static build React di `/` dan meneruskan `/api/` serta `/health` ke `api:3001`.

> MySQL dan object storage RustFS/MinIO tetap berjalan sebagai layanan eksternal (existing di server/host) yang dihubungkan lewat `infra/.env`.

### A. Menjalankan dari Image GHCR (Standar Server Production / Staging)

#### Langkah 1 — Siapkan `infra/.env`
```bash
cd infra
cp ../.env.example .env
chmod 600 .env
```
Edit `infra/.env` dan pastikan variabel wajib berikut terisi benar:
- **Container & Origin**:
  - `GHCR_OWNER=farrelghozy` (huruf kecil)
  - `IMAGE_TAG=latest` *(atau tag spesifik seperti `v1.0.0` / `sha-<commit>`)*
  - `WEB_PORT=8080`
  - `NODE_ENV=production`
  - `PUBLIC_ORIGIN=https://domain-anda.example.com` *(atau `http://localhost:8080` untuk uji lokal)*
  - `TRUST_PROXY=true` *(set `true` jika di belakang Cloudflare Tunnel/Nginx/Traefik)*
- **Keamanan Sesi (Wajib acak minimal 32 karakter — jalankan `openssl rand -base64 32`)**:
  - `SESSION_SECRET=...`
  - `COOKIE_SECRET=...`
- **Database MySQL**:
  - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - *(Jika MySQL berjalan langsung di host mesin Docker yang sama, isi `DB_HOST=host.docker.internal` — `extra_hosts` sudah dikonfigurasi di `infra/docker-compose.yaml`).*
- **Object Storage S3 (RustFS / MinIO)**:
  - `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE=true`
- **SMTP (Pemulihan Kata Sandi)**:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- **Bootstrap Super Admin Pertama Kali**:
  - `SUPER_ADMIN_BOOTSTRAP_EMAIL` dan `SUPER_ADMIN_BOOTSTRAP_PASSWORD` *(wajib kuat saat produksi, lalu putar/hapus setelah bootstrap)*.

#### Langkah 2 — Tarik Image & Jalankan Stack (Migrasi Otomatis)
Dari direktori `infra/`:
```bash
docker compose pull
docker compose up -d
```
Urutan otomatis Docker Compose:
1. Container `migrate` berjalan terlebih dahulu mengeksekusi `bunx prisma migrate deploy`.
2. Setelah migrasi selesai sukses (`service_completed_successfully`), container `api` menyala dan melewati health check `/health/live`.
3. Setelah `api` berstatus `healthy`, container `web` (Nginx) menyala dan melayani aplikasi di `http://localhost:${WEB_PORT:-8080}`.

Jika suatu saat Anda ingin menjalankan ulang migrasi secara eksplisit:
```bash
docker compose run --rm migrate
```

#### Langkah 3 — Jalankan Seed Awal di Dalam Container Docker
- **Mode Production (bersih — hanya Institusi, Super Admin dari `infra/.env`, & Template Poin v1)**:
  ```bash
  docker compose run --rm api bun backend/prisma/seed.ts
  ```
- **Mode Demo / Staging Non-Production (opsional — mengisi data simulasi lengkap seperti tampilan demo saat ini)**:
  > **PERINGATAN**: Jangan pernah menjalankan perintah simulasi ini pada database produksi kampus!
  ```bash
  docker compose run --rm -e NODE_ENV=development api bun backend/prisma/seed-simulation.ts
  ```

#### Langkah 4 — Verifikasi Status Container & Health Check
```bash
docker compose ps
curl http://localhost:8080/health/ready
docker compose logs -f api web
```

### B. Membangun & Menjalankan Image Docker Secara Lokal (Tanpa Pull GHCR)

Jika ingin membangun image langsung dari source code lokal (misalnya sebelum push ke GHCR), jalankan dari **root repositori**:
```bash
# 1. Build kedua image produksi dengan tag lokal yang cocok dengan infra/docker-compose.yaml
docker build -f backend/Dockerfile -t ghcr.io/farrelghozy/talenta-backend:local .
docker build -f frontend/Dockerfile -t ghcr.io/farrelghozy/talenta-frontend:local .

# 2. Siapkan infra/.env lalu jalankan memakai IMAGE_TAG=local
cd infra
IMAGE_TAG=local docker compose up -d
```

### C. Update Versi, Pinning Tag, Rollback & Backup
- **Pinning / Rollback ke versi tertentu**: ubah `IMAGE_TAG=v1.0.0` (atau `sha-<commit>`) di `infra/.env`, lalu jalankan:
  ```bash
  cd infra
  docker compose pull
  docker compose up -d
  ```
- **Backup & Uji Restore MySQL**:
  ```bash
  ./infra/scripts/backup-db.sh
  ./infra/scripts/backup-db.sh --test-restore talenta_restore_check
  ```
- **Backup & Restore Object Storage (RustFS)**:
  Lihat panduan lengkap di `docs/17-runbook-operasi.md` dan `infra/README.md`.

---

## Daftar Skrip Utama (`package.json`)

| Perintah | Fungsi |
|---|---|
| `bun run dev` | Menjalankan frontend Vite dev server (`http://localhost:5173`) |
| `bun run dev:backend` | Menjalankan backend Elysia dev server dengan watch mode (`http://localhost:3001`) |
| `bun run db:generate` | Menghasilkan Prisma Client dari `backend/prisma/schema.prisma` |
| `bun run db:migrate` | Menerapkan migrasi Prisma (`prisma migrate deploy`) ke database target |
| `bun run db:migrate:dev` | Membuat & menerapkan migrasi pengembangan baru (`prisma migrate dev`) |
| `bun run db:seed` | Menjalankan seed dasar (`backend/prisma/seed.ts`, aman untuk dev & production) |
| `bun run db:seed:demo` | Alias `seed:simulasi` — menjalankan seed dasar + data simulasi lengkap lokal |
| `bun run typecheck` | Pemeriksaan TypeScript pada `frontend` dan `backend` |
| `bun run lint` | Pemeriksaan lint (`oxlint`) pada `frontend/src` dan `backend/src` |
| `bun run test` | Menjalankan seluruh unit test (22) & 10 suite integration test backend |
| `bun run test:coverage` | Menjalankan tes backend dengan laporan coverage (`text` & `lcov`) |
| `bun run test:e2e` | Menjalankan seluruh 4 suite Playwright E2E (membutuhkan FE `:5173` & BE `:3001` aktif) |
| `bun run build` | Build produksi fail-safe (mengunci adapter API, bebas mock/kartu demo) |
| `bun run build:demo` | Build statis demo dengan adapter mock |

---

## Struktur Direktori & Peta Dokumentasi

```text
frontend/          Aplikasi React/Vite/TypeScript, komponen UI, layanan API & mock, Dockerfile
backend/           Server Elysia/Bun, domain & rute API, Prisma schema/migrations/seed, tes unit & integrasi, Dockerfile
infra/             docker-compose.yaml (production GHCR), Nginx proxy, skrip backup DB & RustFS, infra/README.md
tests/e2e/         Suite pengujian Playwright end-to-end (Publik, Mahasiswa, Validator, Admin)
docs/              Spesifikasi produk, sitemap, kontrak API, keputusan terbuka, runbook operasi, dan bukti validasi
.env.example       Template konfigurasi environment lokal & produksi
prisma.config.ts   Konfigurasi Prisma 7 (schema, migrations, seed)
```

### Dokumen Acuan Utama
- **`PRD_TALENTA.md`**: Tujuan produk, aktor, alur utama, dan batasan rilis pertama.
- **`docs/README.md`**: Indeks lengkap seluruh dokumen spesifikasi (`docs/00`–`docs/24`).
- **`docs/14-keputusan-terbuka.md`**: Keputusan produk yang disepakati (`K-01`–`K-23`) dan poin kebijakan terbuka (`O-01`–`O-06`).
- **`docs/17-runbook-operasi.md`** & **`infra/README.md`**: Prosedur rilis CI/CD GHCR, migrasi, backup, restore, dan rollback.
- **`TODO.md`**: Status pekerjaan bertahap dan bukti verifikasi gate.
- **`AGENTS.md`**: Panduan kerja, arsitektur, dan aturan kualitas repositori.
