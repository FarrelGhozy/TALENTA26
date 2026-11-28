# Infrastruktur & Deployment Production (GHCR + Docker Compose)

Konsep kontainerisasi UNIDA Student Championship (USC) **khusus untuk lingkungan production** (pengembangan lokal tetap berjalan langsung memakai `bun run dev` dan `bun run dev:backend` tanpa Docker).

## Berkas di Direktori Ini
- `infra/docker-compose.yaml`: Orkestrasi container **production** (`migrate` job satu kali, `api` Bun/Elysia non-root, dan `web` Nginx reverse proxy + injeksi `PUBLIC_ORIGIN` SEO & `API_PUBLIC_ORIGIN` runtime). Seluruh image ditarik langsung dari GHCR (`ghcr.io/<owner>/talenta-frontend` dan `talenta-backend`) dengan rotasi log (`json-file` 10 MB × 5), batas `mem_limit`/`cpus`/`pids_limit`, `init: true`, `no-new-privileges:true`, bind loopback default (`WEB_BIND_HOST:-127.0.0.1` port `3350` untuk FE dan `API_BIND_HOST:-127.0.0.1` port `3360` untuk BE), serta terhubung ke network eksternal `homelab-net` untuk menjangkau container MySQL existing.
- `infra/nginx/default.conf`, `infra/nginx/security-headers.conf`, `infra/nginx/proxy-api.conf`, & `infra/nginx/40-usc-runtime.sh`: Reverse proxy (`/` menuju static build React, bot sosial `/kompetisi/*`, `/ranking`, `/` menuju `/api/v1/public/meta`, `/sitemap.xml` dinamis + fallback statis, `/robots.txt`, `/api/` & `/health` menuju `api:3001`, serta injeksi runtime `PUBLIC_ORIGIN` ke `index.html`/SEO dan `API_PUBLIC_ORIGIN` via `/runtime-config.js`) dengan proteksi edge DDoS (`set_real_ip_from` + `CF-Connecting-IP`, `limit_conn` 50/IP, `limit_req` berjenjang auth/upload tulis-saja/API/health-ready dengan respons 429 JSON, `client_max_body_size` per rute `256k`/`1m`/`3m`/`26m`, timeout anti-Slowloris, `gzip`, CSP & security headers anti-duplikasi, serta `/nginx-health` khusus loopback/RFC1918).
- `infra/scripts/backup-db.sh`: Backup MySQL atomik (`--defaults-extra-file` 0600, `gzip -t`, `--hex-blob`, SHA-256), uji restore database terisolasi (bersih & otomatis dihapus pasca-verifikasi), serta rotasi retensi `--keep-days`.
- `infra/scripts/backup-storage.ts`: Backup & restore streaming objek RustFS S3-compatible terverifikasi SHA-256 dengan staging atomik 0700/0600, toleran `NoSuchKey`, serta rotasi retensi `--keep-days`.

---

## Cara Kerja CI/CD (`.github/workflows/ci-publish.yml`)
1. **Pemicu**:
   - **Push / merge PR ke branch `main`**: langsung menjalankan **2 job** berurutan.
   - **Push Git tag rilis (`v*`)** (misalnya `v1.0.0`): juga memicu **2 job** berurutan.
   - **Pull Request menuju `main`**: hanya menjalankan Job 1 untuk validasi sebelum merge.
2. **Job 1 (`test-and-build`, `timeout-minutes: 20`)**: Menyiapkan MySQL 8.4 CI service (`talenta_test` & `talenta_e2e`), migrasi Prisma, audit dependensi advisory (`bun audit --audit-level=high`), `typecheck`, `lint`, seluruh 33 tes unit & 11 suite integrasi dengan laporan **coverage** (`bun run test:coverage` + artefak LCOV), **Playwright E2E**, `bun run build` (mode production), pemindaian kebocoran mock/`.env`, `bash -n`, `nginx -t`, serta validasi `infra/docker-compose.yaml`.
3. **Job 2 (`publish`, `timeout-minutes: 15`)**: Berjalan setelah Job 1 lulus pada event `push` (`main` atau tag `v*`). Membangun image production (`frontend/Dockerfile` dan `backend/Dockerfile` multi-stage non-root) dan mengunggahnya ke GHCR dengan tag `:latest` (pada `main`), `:<nama-tag>` (pada tag), dan `:sha-<commit>`, serta mencatat digest image pada ringkasan workflow.

---

## Menjalankan Production di Server (`pull` + `up -d`)

1. Masuk ke folder `infra/` dan **wajib siapkan `.env` produksi** terlebih dahulu:
   ```bash
   cd infra
   cp ../.env.example .env
   chmod 600 .env
   ```
   Pastikan variabel wajib production terisi benar di `infra/.env` (dan pastikan external network `homelab-net` sudah tersedia di Docker server sebelum `docker compose up -d`):
   - `GHCR_OWNER=farrelghozy` (huruf kecil), `IMAGE_TAG=latest` *(atau tag rilis `vX.Y.Z` / `sha-...`)*
   - `WEB_BIND_HOST=127.0.0.1` & `WEB_PORT=3350` *(target Cloudflare Tunnel Frontend: `http://localhost:3350`)*
   - `API_BIND_HOST=127.0.0.1` & `API_PORT=3360` *(target Cloudflare Tunnel Backend: `http://localhost:3360`)*
   - `PUBLIC_ORIGIN=https://talenta.utc.web.id` *(wajib HTTPS non-localhost; sekaligus otomatis mengisi domain FE pada tag SEO/Open Graph/Canonical/`robots.txt`/`sitemap.xml` saat container menyala — bila ganti domain kampus nantinya cukup ubah variabel ini lalu `docker compose up -d`)* & `TRUST_PROXY=true`
   - `API_PUBLIC_ORIGIN=https://api-talenta.utc.web.id` *(isi jika FE & BE memakai dua subdomain terpisah di Cloudflare Tunnel; kosongkan bila menggunakan satu domain yang sama via `localhost:3350`)*
   - `SESSION_SECRET` & `COOKIE_SECRET` (string acak kuat >= 32 karakter)
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` *(gunakan nama container/service MySQL di network `homelab-net`, atau `host.docker.internal` bila MySQL di host server)*
   - `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE=true`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - *(Opsional sesuai kebijakan kapasitas/retensi `O-03`/`O-06`)*: `DB_POOL_LIMIT`, `USER_STORAGE_QUOTA_MB`, `MAX_REVISIONS_PER_ACHIEVEMENT`, `MAX_ACHIEVEMENTS_PER_PERIOD`, `MAX_SESSIONS_PER_USER`, `AUDIT_RETENTION_DAYS`, `STORAGE_RETENTION_INACTIVE_DAYS`, `MAINTENANCE_INTERVAL_MINUTES`, `BACKUP_RETENTION_DAYS`

2. Tarik image terbaru dari GHCR dan jalankan stack:
   ```bash
   docker compose pull
   docker compose up -d
   docker compose ps
   ```

   Bootstrap database awal (pilih salah satu sesuai peruntukan server):
   - **Produksi bersih (disarankan)**:
     ```bash
     docker compose run --rm api bun backend/prisma/seed.ts
     ```
   - **Staging / Showcase Demo saja (JANGAN di DB produksi nyata)**: karena `seed-simulation.ts` tidak disertakan di image GHCR dan menolak `NODE_ENV=production`, mount file lokal + override `NODE_ENV=development` sekali jalan:
     ```bash
     docker compose run --rm --no-deps \
       -e NODE_ENV=development \
       -v "$(pwd)/../backend/prisma/seed-simulation.ts:/app/backend/prisma/seed-simulation.ts:ro" \
       api bun backend/prisma/seed-simulation.ts
     ```

3. **Menggunakan atau beralih ke Tag Tertentu (Pinning / Rollback)**:
   - Ubah `IMAGE_TAG=v1.0.0` (atau `sha-<commit>`) di dalam `infra/.env`, lalu jalankan `docker compose pull && docker compose up -d`.
   - Atau sementara lewat environment shell: `IMAGE_TAG=v1.0.0 docker compose pull && IMAGE_TAG=v1.0.0 docker compose up -d`.

4. **Backup, Retensi, & Pemeliharaan Anti-Bloat**:
   ```bash
   ./infra/scripts/backup-db.sh --env-file infra/.env --keep-days 14
   bun infra/scripts/backup-storage.ts backup --env-file infra/.env --output storage-backups/$(date +%Y%m%d_%H%M%S) --keep-days 14
   bun --env-file=infra/.env backend/src/scripts/maintenance.ts --dry-run
   ```

5. **Memantau CI dari laptop dengan GitHub CLI (`gh`)**:
   ```bash
   gh run list --workflow ci-publish.yml -L 5
   gh run watch
   ```

Lihat [docs/17-runbook-operasi.md](../docs/17-runbook-operasi.md) untuk langkah rilis lengkap, migrasi, backup/restore, pemeliharaan anti-bloat, dan rollback.
