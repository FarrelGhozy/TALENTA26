# 15 — Konfigurasi, mock, CI dan image

Nama file dipertahankan agar tautan lama tidak putus. Rancangan ini menggantikan matriks DEPLOYMENT/PRODUCTION + VITE_USE_MOCK lama untuk rilis produksi.

Stage 1 telah memisahkan adapter melalui alias `@talenta/services`: `dev` dan `build:demo` memakai `factory.mock.ts` (bila mode demo/mock diaktifkan), sedangkan `build` mode production **wajib fail-safe** memakai `factory.api.ts` (dan mengunci `base: '/'`) tanpa terpengaruh `VITE_USE_MOCK=true` atau `VITE_BASE_PATH` di `.env` lokal serta tanpa mengikutsertakan `RoleCardLogin` maupun preset berkas PDF demo pada bundle produksi. Seluruh gate teknis backend, frontend, keamanan DDoS, anti-bloat, serta container produksi telah diverifikasi lokal (`TODO.md`).

## Lingkungan
| Lingkungan | Frontend | Data | Operasi |
|---|---|---|---|
| development | Vite lokal | mock atau MySQL/RustFS dev | Bun + `.env` lokal |
| CI | build dan tes | database/storage test terisolasi | GitHub Actions |
| staging | image GHCR | MySQL dan bucket staging | `infra/.env` + Compose |
| production | image GHCR | MySQL dan RustFS existing | `infra/.env` + Compose |

Mock hanya untuk demo/tes, tidak ada toggle mock pada image produksi. Vite mengganti VITE_* saat build; alamat server dan rahasia tidak boleh bergantung pada variabel itu. Browser meminta /api pada origin yang sama sehingga domain dapat berubah tanpa rebuild. Rujukan: https://vite.dev/guide/env-and-mode

## `infra/.env` server produksi
Kontrak variabel runtime yang dibaca oleh `infra/docker-compose.yaml` (`env_file: .env`):
- `GHCR_OWNER` dan `IMAGE_TAG`: pemilik repo GHCR (`farrelghozy`) serta tag image (`latest` secara default, atau tag rilis `vX.Y.Z`/`sha-...` bila ingin disematkan).
- `WEB_BIND_HOST` & `WEB_PORT` (`127.0.0.1:3350` untuk FE Nginx) serta `API_BIND_HOST` & `API_PORT` (`127.0.0.1:3360` menuju internal `3001` BE Elysia).
- `PUBLIC_ORIGIN`: URL HTTPS domain Frontend aktif (wajib non-localhost di produksi).
- `API_PUBLIC_ORIGIN`: URL HTTPS subdomain Backend terpisah opsional jika Cloudflare Tunnel membelokkan subdomain API tersendiri ke `localhost:3360` (kosongkan bila FE & BE berada pada satu origin lewat `localhost:3350`).
- `TRUST_PROXY`: `true` bila di belakang Cloudflare Tunnel / reverse proxy.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (atau fallback `DATABASE_URL`): kredensial MySQL aplikasi khusus (`prisma.config.ts` fail-fast di produksi jika kosong).
- `SESSION_SECRET` dan `COOKIE_SECRET`: rahasia acak kuat (>= 32 karakter, bukan placeholder).
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE=true`: service account RustFS dan bucket privat (wajib di produksi, tanpa fallback disk lokal).
- `SUPER_ADMIN_BOOTSTRAP_EMAIL` dan `SUPER_ADMIN_BOOTSTRAP_PASSWORD`: email pengenal login dan kata sandi (8–128 karakter) untuk membuat akun Super Admin awal saat menjalankan `bun backend/prisma/seed.ts` (tidak menimpa jika `super_admin` sudah ada; hapus/putar rahasia setelah login pertama).
- `SMTP_*`: opsional saat startup produksi (server tetap berjalan dengan warning log jika kosong/placeholder); bila belum valid atau gagal saat dipakai pemulihan kata sandi, request mencatat error log dan gagal tertutup `503` (`K-13`).
- `LOG_LEVEL`, `UPLOAD_MAX_BYTES`, `TIMEZONE_DISPLAY=Asia/Jakarta`.
- Parameter DDoS, kuota, & anti-bloat (`K-25`): `DB_POOL_LIMIT` (`15`), `USER_STORAGE_QUOTA_MB` (`100`), `MAX_REVISIONS_PER_ACHIEVEMENT` (`5`), `MAX_ACHIEVEMENTS_PER_PERIOD` (`30`), `MAX_SESSIONS_PER_USER` (`10`), `AUDIT_RETENTION_DAYS` (`365`; `0`=selamanya), `STORAGE_RETENTION_INACTIVE_DAYS` (`90`; `0`=nonaktif), `MAINTENANCE_INTERVAL_MINUTES` (`360`), `BACKUP_RETENTION_DAYS` (`14`).

`.env.example` di root hanya berisi placeholder dengan default `NODE_ENV=development` untuk kenyamanan lokal (`infra/docker-compose.yaml` memaksa `NODE_ENV=production` di kontainer). `.env` produksi **wajib diset** di `infra/.env` (permission `0600`), tidak pernah di-commit, dan tidak masuk image Docker.

## Bentuk Compose (khusus Production)
Docker tidak digunakan untuk development lokal. Satu-satunya file Compose berada di `infra/docker-compose.yaml`, berisi `migrate` (job satu kali), `api` (non-root `USER bun`, healthcheck `/health/ready`, terhubung ke network `default` + eksternal `homelab-net`), dan `web` (Nginx proxy dengan `security-headers.conf`, `proxy-api.conf`, & skrip runtime `40-usc-runtime.sh`), menggunakan `ghcr.io/${GHCR_OWNER:-farrelghozy}/talenta-frontend:${IMAGE_TAG:-latest}` dan `talenta-backend:${IMAGE_TAG:-latest}` (tanpa bagian `build:` lokal). Setiap layanan menerapkan rotasi log `json-file` (`10m × 5`), limit `mem_limit`/`cpus`/`pids_limit`, `init: true`, dan `no-new-privileges:true`. MySQL/RustFS existing tidak dibuat ulang oleh Compose produksi (`migrate` dan `api` terhubung ke container MySQL melalui network eksternal `homelab-net` maupun `host.docker.internal`). Frontend bind ke `127.0.0.1:${WEB_PORT:-3350}` dan Backend API bind ke `127.0.0.1:${API_PORT:-3360}` untuk target Cloudflare Tunnel; DB dan storage tidak membuka port publik. Tidak ada data persisten pada filesystem image.

Operator menjalankan dari direktori `infra/` setelah menyetel `infra/.env`:
~~~bash
cd infra
docker compose pull
docker compose up -d
docker compose ps
~~~
Default menarik tag `:latest`; untuk mengganti tag tertentu cukup ubah `IMAGE_TAG` di `infra/.env` (atau kirim `IMAGE_TAG=vX.Y.Z` lewat environment) sebelum `docker compose pull && docker compose up -d`. Rilis yang mengubah schema membutuhkan backup dan tinjau migrasi sebelum up.

## GitHub Actions (`.github/workflows/ci-publish.yml`)
- **Pull request ke `main`**: menjalankan **Job 1 (`test-and-build`, `timeout-minutes: 20`)** saja (Bun 1.4.4 frozen lockfile, audit dependensi advisory `bun audit --audit-level=high`, MySQL 8.4 service, `prisma migrate deploy`, `typecheck`, `lint`, 33 unit + 11 integration suites beserta laporan **coverage**, Playwright E2E, production build, cek kebocoran bundle/`.env`, `bash -n`, `nginx -t`, dan validasi `infra/docker-compose.yaml`) tanpa push ke GHCR.
- **Push/merge ke `main` atau push Git tag rilis (`v*`)**: langsung menjalankan **2 job berurutan**:
  1. **Job 1 (`test-and-build`)**: seluruh rangkaian tes + coverage + E2E + validasi Nginx/skrip/Compose di atas.
  2. **Job 2 (`publish`, `timeout-minutes: 15`)**: membangun image Docker production `talenta-frontend` & `talenta-backend` lalu push ke GHCR dengan tag `latest` (khusus `main`), `<tag>` (khusus tag `v*`), dan `sha-<commit>`, serta mencatat digest image di ringkasan workflow.

Workflow lama `.github/workflows/deploy.yml` (demo GitHub Pages) dinonaktifkan dari trigger `push` `main` dan hanya tersisa untuk eksekusi manual `workflow_dispatch`. Pin action ke versi yang ditinjau, batasi permissions, dan jangan berikan secret server ke build. Simpan digest sebagai artefak rilis; rollback memakai tag/digest sebelumnya. Rujukan: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images

## Kompatibilitas
Dokumentasi Prisma terbaru menandai MySQL pada ORM 8 sebagai early preview dan ORM 7 sebagai jalur stabil; Stage 2 mengunci versi 7 kompatibel Bun/MySQL dan perintah migrasinya. Jangan campur prosedur versi 7/8. Rujukan: https://www.prisma.io/docs/orm/supported-databases
RustFS mendukung API S3 compatible dengan endpoint dan path-style; uji PUT, GET, presigned URL, delete, dan izin service account pada instalasi nyata. Rujukan: https://docs.rustfs.com/en/administration/protocols/s3
