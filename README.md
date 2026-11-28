# UNIDA STUDENT CHAMPIONSHIP (USC) — Sistem Pembinaan Lomba dan Pengelolaan Prestasi Mahasiswa

**UNIDA Student Championship (USC)** *(sebelumnya dikenal dengan nama kode TALENTA)* adalah aplikasi web untuk membantu mahasiswa menemukan perlombaan, membentuk tim melalui rekrutmen berbasis pengajuan & kode undangan, mengikuti roadmap persiapan, berkonsultasi dengan dosen/konsultan, mengajukan prestasi beserta bukti privat, dan melihat papan peringkat berbasis capaian sah. Rilis pertama ditujukan untuk satu kampus, **Universitas Darussalam (UNIDA) Gontor**, dengan portal publik, portal mahasiswa (`/app/*`), dan portal admin terpadu (`/admin/*`).

---

## Status Implementasi & Arsitektur

- **Frontend (`frontend/`)**: React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 4, Lucide React. Mendukung adapter API produksi (`factory.api.ts`, dikunci otomatis pada `bun run build`) dan adapter mock khusus pratinjau/demo (`bun run build:demo`).
- **Backend (`backend/`)**: Bun 1.4, Elysia, Prisma 7 (`@prisma/adapter-mariadb`) dengan MySQL/MariaDB, autentikasi Argon2id (dengan semaphore konkurensi) + sesi cookie `HttpOnly` (hash HMAC-SHA256 di DB), proteksi CSRF/Origin, rate limiting berjenjang, RBAC ketat (`/admin/sistem` & `/api/v1/system/*` khusus `super_admin`), SMTP reset password (fail-closed `K-13`), integrasi object storage S3-compatible (**RustFS / MinIO**) dengan streaming + `ETag`/`304` + validasi magic-byte, serta worker & CLI pemeliharaan anti-bloat MySQL/RustFS (`K-25`).
- **Container & Operasi (`infra/`)**: `frontend/Dockerfile` (multi-stage build produksi + Nginx same-origin proxy `/` dan `/api/` dengan proteksi edge DDoS & CSP), `backend/Dockerfile` (multi-stage non-root `USER bun`), `infra/docker-compose.yaml` (pull image GHCR, rotasi log, limit memori/CPU/PID, loopback bind default), skrip backup/restore MySQL & RustFS atomik ber-retensi, serta workflow CI/CD `.github/workflows/ci-publish.yml`.
- **Pengujian**: 33 unit test, 11 suite integration test backend, dan 4 suite Playwright E2E lintas peran.
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
git clone https://github.com/FarrelGhozy/TALENTA26.git
cd TALENTA26
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
> **Catatan S3 & SMTP di mode lokal**: Jika RustFS/MinIO lokal berjalan di `http://127.0.0.1:9000`, isi `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, dan `S3_SECRET_KEY`. Jika tidak tersedia di lokal (`NODE_ENV=development`), unggahan berkas otomatis memakai penyimpanan lokal `.storage/`. Di mode `NODE_ENV=production`, RustFS/S3 wajib terkonfigurasi, sedangkan SMTP opsional saat startup (bila belum valid/tak tersedia, fitur pemulihan kata sandi mencatat error log dan gagal tertutup `503` saat dipakai).

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
USC menyediakan **2 skrip seed** yang idempotent sesuai kebutuhan:

| Perintah | Target Lingkungan | Isi Data yang Dibuat |
|---|---|---|
| `bun run db:seed:demo` *(atau `bun run seed:simulasi`)* | **Development / Demo** *(ditolak otomatis jika `NODE_ENV=production`)* | Menjalankan seed dasar **ditambah** 12 mahasiswa simulasi berfoto profil, 2 periode akademik (aktif & arsip), 4 lomba + roadmap + konsultan, 3 tim terbuka/terbentuk beserta pelamar, 28 prestasi disetujui lintas 2 periode + berkas PDF + `PointLedger` (papan ranking langsung terisi), 2 antrean verifikasi `menunggu`, dan 1 `perlu_perbaikan`. **Menghasilkan tampilan aplikasi penuh seperti kondisi demo saat ini.** |
| `bun run db:seed` *(atau `bunx prisma db seed`)* | **Development atau Production** | Pada `NODE_ENV=development`: Institusi, Super Admin (memakai `SUPER_ADMIN_BOOTSTRAP_EMAIL`/`PASSWORD` di `.env`, atau default `admin@unida.gontor.ac.id` / `AdminGontor2026!` jika kosong/placeholder), Validator, 2 akun mahasiswa uji, 1 periode aktif, 4 lomba + roadmap + konsultan, Template & Aturan Poin v1, dan Master Jenis/Sub-Lomba.<br>Pada `NODE_ENV=production`: **hanya** Institusi, akun Super Admin dari `SUPER_ADMIN_BOOTSTRAP_EMAIL`/`PASSWORD` (email & kata sandi 8–128 karakter untuk login pertama di `/masuk`), dan Template & Aturan Poin v1 (nol akun/konten demo). |

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

## 2. Menjalankan dengan Docker & Docker Compose (Khusus Production)

`infra/docker-compose.yaml` dirancang **murni untuk runtime production** di server (bukan untuk development, bukan mode demo, tidak menjalankan Vite dev server, dan tidak melakukan build lokal). Pengembangan lokal maupun uji demo tetap dijalankan langsung dengan Bun (`bun run dev` & `bun run dev:backend`) pada bagian 1 di atas.

Arsitektur 3 container production (menarik image resmi dari GHCR yang dibangun otomatis oleh `.github/workflows/ci-publish.yml`):
1. **`migrate`** (`ghcr.io/farrelghozy/talenta-backend`): job satu kali dengan `NODE_ENV=production` yang **otomatis menjalankan `bunx prisma migrate deploy`** sebelum API menyala (`restart: "no"`).
2. **`api`** (`ghcr.io/farrelghozy/talenta-backend`): server backend Bun/Elysia dengan `NODE_ENV=production` dan port internal `3001`, terekspos di loopback host via `API_PORT` (default `127.0.0.1:3360`) serta terhubung ke network internal + network eksternal `homelab-net` untuk menjangkau container MySQL/RustFS existing (fail-fast bila secret/RustFS belum siap).
3. **`web`** (`ghcr.io/farrelghozy/talenta-frontend`): Nginx 1.27-alpine serving static build production React (bebas mock & kartu login demo) di `WEB_PORT` (default `127.0.0.1:3350`), mendukung satu domain (reverse proxy `/api/` & `/health` ke `api:3001`) maupun dua subdomain terpisah melalui injeksi runtime `API_PUBLIC_ORIGIN`.

> MySQL di container pada external network `homelab-net` (atau host server) dan object storage RustFS tetap berjalan sebagai layanan eksternal existing yang dihubungkan lewat `infra/.env`.

### Langkah 1 — Clone Repositori & Siapkan `infra/.env`
```bash
git clone https://github.com/FarrelGhozy/TALENTA26.git
cd TALENTA26/infra
cp ../.env.example .env
chmod 600 .env
```
Edit `infra/.env` dan pastikan seluruh variabel wajib production terisi benar:
- **Image & Origin**:
  - `GHCR_OWNER=farrelghozy` (huruf kecil)
  - `IMAGE_TAG=latest` *(atau sematkan tag rilis spesifik seperti `v1.0.0` / `sha-<commit>`)*
  - `WEB_BIND_HOST=127.0.0.1` *(default loopback aman untuk Cloudflare Tunnel; ubah ke `0.0.0.0` hanya jika sengaja mengekspos LAN)*
  - `WEB_PORT=3350` *(port Frontend / Nginx di host -> `http://localhost:3350`)*
  - `API_BIND_HOST=127.0.0.1`
  - `API_PORT=3360` *(port Backend / Elysia di host -> `http://localhost:3360`)*
  - `PUBLIC_ORIGIN=https://app.domain-anda.example.com`
  - `API_PUBLIC_ORIGIN=https://api.domain-anda.example.com` *(isi jika FE & BE memakai dua subdomain terpisah di Cloudflare Tunnel; kosongkan jika FE & BE satu domain lewat `localhost:3350`)*
  - `TRUST_PROXY=true` *(set `true` jika berada di balik Cloudflare Tunnel / reverse proxy HTTPS)*
  - *(Opsional sesuai `O-03`/`O-06`)*: `DB_POOL_LIMIT`, `USER_STORAGE_QUOTA_MB`, `MAX_REVISIONS_PER_ACHIEVEMENT`, `MAX_ACHIEVEMENTS_PER_PERIOD`, `MAX_SESSIONS_PER_USER`, `AUDIT_RETENTION_DAYS`, `STORAGE_RETENTION_INACTIVE_DAYS`, `MAINTENANCE_INTERVAL_MINUTES`, `BACKUP_RETENTION_DAYS`
- **Keamanan Sesi (Wajib acak minimal 32 karakter — jalankan `openssl rand -base64 32`)**:
  - `SESSION_SECRET=...`
  - `COOKIE_SECRET=...`
- **Database MySQL Existing**:
  - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - *(Jika MySQL berjalan sebagai container di network `homelab-net`, gunakan nama container/service MySQL tersebut sebagai `DB_HOST`; jika berjalan langsung di host server Docker yang sama, gunakan `DB_HOST=host.docker.internal`).*
- **Object Storage S3 Existing (RustFS / MinIO)**:
  - `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE=true`
- **SMTP (Opsional saat startup — Pemulihan Kata Sandi)**:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` *(tidak memblokir startup server bila belum diset/placeholder; bila belum valid saat endpoint `/auth/forgot-password` dipanggil di produksi, server mencatat error log dan mengembalikan `503`)*
- **Bootstrap Super Admin Pertama Kali**:
  - `SUPER_ADMIN_BOOTSTRAP_EMAIL` (email pengenal login pada `/masuk`) dan `SUPER_ADMIN_BOOTSTRAP_PASSWORD` (kata sandi 8–128 karakter, wajib kuat & bukan `change-with-*`/`dev-*`; putar/hapus setelah bootstrap awal & login pertama selesai). Non-destruktif: tidak menimpa akun `super_admin` yang sudah ada.

### Langkah 2 — Tarik Image Production GHCR & Jalankan Stack (Migrasi Otomatis)
Dari direktori `infra/`:
```bash
docker compose pull
docker compose up -d
```
Urutan eksekusi otomatis Docker Compose:
1. Container `migrate` berjalan terlebih dahulu mengeksekusi `bunx prisma migrate deploy`.
2. Setelah migrasi selesai sukses (`service_completed_successfully`), container `api` menyala dan melewati health check `/health/ready`.
3. Setelah `api` berstatus `healthy`, container `web` (Nginx) menyala sehingga Frontend tersedia pada `http://127.0.0.1:${WEB_PORT:-3350}` dan Backend API tersedia pada `http://127.0.0.1:${API_PORT:-3360}` (siap dibelokkan ke luar lewat Cloudflare Tunnel).

Jika ingin menjalankan ulang migrasi secara eksplisit:
```bash
docker compose run --rm migrate
```

### Langkah 3 — Bootstrap Awal Database Production (Satu Kali Saat Install Pertama)
Jalankan seed production bersih untuk membuat entri Institusi, akun Super Admin pertama dari `infra/.env`, dan Template Poin Standar v1 (tanpa akun/data demo):
```bash
docker compose run --rm api bun backend/prisma/seed.ts
```

> **Menjalankan Seed Demo / Simulasi di Docker (Khusus Server Uji Coba / Demo, Bukan Produksi Resmi)**:
> Secara bawaan image `talenta-backend` tidak menyertakan `backend/prisma/seed-simulation.ts` (dikecualikan oleh `.dockerignore`), dan skrip tersebut otomatis menolak `NODE_ENV=production` agar kredensial demo (`Validator2026!`, `Mahasiswa2026!`) tidak masuk ke database produksi resmi.
>
> Jika Anda sengaja ingin mengisi **data simulasi lengkap** (12 mahasiswa berfoto profil, 4 lomba + roadmap + konsultan, tim, 28 prestasi disetujui, & antrean verifikasi) ke database Docker staging/demo setelah `docker compose up -d` dan `S3_*` (RustFS) di `infra/.env` aktif, mount berkas skrip lokal lalu override `NODE_ENV=development` khusus untuk perintah satu kali tersebut dari direktori `infra/`:
> ```bash
> docker compose run --rm --no-deps \
>   -e NODE_ENV=development \
>   -v "$(pwd)/../backend/prisma/seed-simulation.ts:/app/backend/prisma/seed-simulation.ts:ro" \
>   api bun backend/prisma/seed-simulation.ts
> ```
> **Catatan penting**:
> - Jangan jalankan perintah ini pada database produksi nyata yang sudah memiliki data pengguna aktif.
> - Karena `S3_*` di `infra/.env` terisi ke RustFS, foto profil dan berkas PDF simulasi akan langsung tersimpan di RustFS sehingga terbaca oleh container `api`.
> - Container `web` memakai build production (hanya form **Login Manual** di `/masuk`), jadi masuklah secara manual menggunakan kredensial Super Admin di `infra/.env` atau akun uji pada bagian *"Akun Pengujian Cepat"* di atas.

### Langkah 4 — Verifikasi Status Container & Health Check
```bash
docker compose ps
curl http://127.0.0.1:${API_PORT:-3360}/health/ready
curl http://127.0.0.1:${WEB_PORT:-3350}/health/ready
docker compose logs -f api web
```

### Langkah 5 — Update Versi, Pinning Tag, Rollback & Backup
- **Rilis baru otomatis ke GHCR**: setiap push/merge ke branch `main` atau push Git tag (`v1.0.0`) menjalankan `.github/workflows/ci-publish.yml` (uji penuh + build & push image `ghcr.io/farrelghozy/talenta-frontend` dan `ghcr.io/farrelghozy/talenta-backend`).
- **Update / Pinning / Rollback di server**: ubah `IMAGE_TAG` di `infra/.env` (mis. `latest`, `v1.0.0`, atau `sha-<commit>`), lalu jalankan:
  ```bash
  cd infra
  docker compose pull
  docker compose up -d
  ```
- **Backup & Uji Restore MySQL**:
  ```bash
  ./infra/scripts/backup-db.sh --env-file infra/.env
  ./infra/scripts/backup-db.sh --env-file infra/.env --test-restore talenta_restore_check
  ```
- **Pemeliharaan Anti-Bloat MySQL & RustFS (Dry-run / Eksekusi Manual)**:
  ```bash
  bun --env-file=infra/.env backend/src/scripts/maintenance.ts --dry-run
  bun --env-file=infra/.env backend/src/scripts/maintenance.ts
  ```
- **Backup & Restore Object Storage (RustFS)**:
  Lihat panduan operasional lengkap di `docs/17-runbook-operasi.md` dan `infra/README.md`.

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
| `bun run test` | Menjalankan seluruh unit test (33) & 11 suite integration test backend |
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
- **`docs/14-keputusan-terbuka.md`**: Keputusan produk yang disepakati (`K-01`–`K-27`) dan poin kebijakan terbuka (`O-01`–`O-06`).
- **`docs/17-runbook-operasi.md`** & **`infra/README.md`**: Prosedur rilis CI/CD GHCR, migrasi, backup, restore, dan rollback.
- **`TODO.md`**: Status pekerjaan bertahap dan bukti verifikasi gate.
- **`AGENTS.md`**: Panduan kerja, arsitektur, dan aturan kualitas repositori.
