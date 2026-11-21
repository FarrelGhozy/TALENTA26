# Infrastruktur & Deployment Production (GHCR + Docker Compose)

Konsep kontainerisasi TALENTA **khusus untuk lingkungan production** (pengembangan lokal tetap berjalan langsung memakai `bun run dev` dan `bun run dev:backend` tanpa Docker).

## Berkas di Direktori Ini
- `infra/docker-compose.yaml`: Orkestrasi container **production** (`migrate` job satu kali, `api` Bun/Elysia, dan `web` Nginx same-origin proxy). Tidak melakukan build lokal dan seluruh image ditarik langsung dari GHCR (`ghcr.io/<owner>/talenta-frontend` dan `talenta-backend`). Database MySQL dan object storage RustFS tetap memakai layanan existing yang dikonfigurasi lewat `infra/.env`.
- `infra/nginx/default.conf`: Reverse proxy satu origin (`/` menuju static build React, `/api/` & `/health` menuju `api:3001`) dengan header keamanan dan batas unggah `30m` (dikemas di dalam image `talenta-frontend`).
- `infra/scripts/backup-db.sh`: Backup MySQL + SHA-256 checksum + uji restore database terisolasi.
- `infra/scripts/backup-storage.ts`: Backup & restore objek RustFS S3-compatible terverifikasi checksum.

---

## Cara Kerja CI/CD (`.github/workflows/ci-publish.yml`)
1. **Pemicu**:
   - **Push / merge PR ke branch `main`**: langsung menjalankan **2 job** berurutan.
   - **Push Git tag** (misalnya `v1.0.0`): juga memicu **2 job** berurutan.
   - **Pull Request menuju `main`**: hanya menjalankan Job 1 untuk validasi sebelum merge.
2. **Job 1 (`test-and-build`)**: Menyiapkan MySQL 8.4 CI service (`talenta_test` & `talenta_e2e`), migrasi Prisma, `typecheck`, `lint`, seluruh tes unit & 7 suite integrasi dengan laporan **coverage** (`bun run test:coverage` + artefak LCOV), **Playwright E2E**, `bun run build` (mode production), pemindaian kebocoran mock/`.env`, serta validasi `infra/docker-compose.yaml`.
3. **Job 2 (`publish`)**: Berjalan setelah Job 1 lulus pada event `push` (`main` atau tag). Membangun image production (`frontend/Dockerfile` dan `backend/Dockerfile`) dan mengunggahnya ke GHCR dengan tag:
   - `:latest` dan `:sha-<commit>` (ketika push/merge ke `main`),
   - `:<nama-tag>` dan `:sha-<commit>` (ketika push Git tag).

---

## Menjalankan Production di Server (`pull` + `up -d`)

1. Masuk ke folder `infra/` dan **wajib siapkan `.env` produksi** terlebih dahulu:
   ```bash
   cd infra
   cp ../.env.example .env
   chmod 600 .env
   ```
   Pastikan minimal variabel berikut sudah diisi benar di `infra/.env`:
   - `GHCR_OWNER=farrelghozy` (huruf kecil)
   - `IMAGE_TAG=latest` *(default `latest`; ganti ke tag rilis seperti `v1.0.0` atau `sha-...` bila diperlukan)*
   - `WEB_PORT=8080`
   - `PUBLIC_ORIGIN=https://domain-anda.example.com` dan `TRUST_PROXY=true`
   - `SESSION_SECRET` & `COOKIE_SECRET` (string acak kuat >= 32 karakter)
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` *(gunakan `host.docker.internal` bila MySQL di host server Docker yang sama)*
   - `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE=true`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

2. Tarik image terbaru dari GHCR dan jalankan stack:
   ```bash
   docker compose pull
   docker compose up -d
   docker compose ps
   ```

3. **Menggunakan atau beralih ke Tag Tertentu (Pinning / Rollback)**:
   - Ubah `IMAGE_TAG=v1.0.0` (atau `sha-<commit>`) di dalam `infra/.env`, lalu:
     ```bash
     docker compose pull
     docker compose up -d
     ```
   - Atau sementara lewat environment shell:
     ```bash
     IMAGE_TAG=v1.0.0 docker compose pull
     IMAGE_TAG=v1.0.0 docker compose up -d
     ```

4. **Memantau CI dari laptop dengan GitHub CLI (`gh`)**:
   ```bash
   gh run list --workflow ci-publish.yml -L 5
   gh run watch
   ```

Lihat [docs/17-runbook-operasi.md](../docs/17-runbook-operasi.md) untuk langkah rilis lengkap, migrasi, backup/restore, dan rollback.
