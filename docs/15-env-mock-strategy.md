# 15 — Konfigurasi, mock, CI dan image

Nama file dipertahankan agar tautan lama tidak putus. Rancangan ini menggantikan matriks DEPLOYMENT/PRODUCTION + VITE_USE_MOCK lama untuk rilis produksi.

Stage 1 telah memisahkan adapter melalui alias `@talenta/services`: `dev` dan `build:demo` memakai `factory.mock.ts` (bila mode demo/mock diaktifkan), sedangkan `build` mode production **wajib fail-safe** memakai `factory.api.ts` tanpa terpengaruh `VITE_USE_MOCK=true` di `.env` lokal dan tanpa mengikutsertakan `RoleCardLogin` maupun preset berkas PDF demo pada bundle produksi. Default `APP_ENV` produksi tidak boleh jatuh ke mode `DEPLOYMENT`. Backend telah tersedia dan masih dalam proses perbaikan audit (Fase 1–3) sebelum tahap kontainerisasi Stage 6. Status dan kekurangannya ada di `TODO.md` dan `docs/24`.

## Lingkungan
| Lingkungan | Frontend | Data | Operasi |
|---|---|---|---|
| development | Vite lokal | mock atau MySQL/RustFS dev | Bun |
| CI | build dan tes | database/storage test terisolasi | GitHub Actions |
| staging | image GHCR | MySQL dan bucket staging | Compose seperti produksi |
| production | image GHCR | MySQL dan RustFS existing | root .env + Compose |

Mock hanya untuk demo/tes, tidak ada toggle mock pada image produksi. Vite mengganti VITE_* saat build; alamat server dan rahasia tidak boleh bergantung pada variabel itu. Browser meminta /api pada origin yang sama sehingga domain dapat berubah tanpa rebuild. Rujukan: https://vite.dev/guide/env-and-mode

## `infra/.env` server produksi
Kontrak variabel runtime yang dibaca oleh `infra/docker-compose.yaml` (`env_file: .env`):
- `GHCR_OWNER` dan `IMAGE_TAG`: pemilik repo GHCR (`farrelghozy`) serta tag image (`latest` secara default, atau tag rilis/`sha-...` bila ingin disematkan).
- `WEB_PORT`: port host untuk reverse proxy Nginx (`8080`).
- `PUBLIC_ORIGIN`: URL HTTPS domain aktif.
- `TRUST_PROXY`: `true` bila di belakang Cloudflare Tunnel / reverse proxy.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (atau fallback `DATABASE_URL`): kredensial MySQL aplikasi khusus.
- `SESSION_SECRET` dan `COOKIE_SECRET`: rahasia acak kuat (>= 32 karakter).
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE=true`: service account RustFS dan bucket privat.
- `SUPER_ADMIN_BOOTSTRAP_*`: hanya untuk bootstrap satu kali; dihapus/diputar setelahnya.
- `SMTP_*`: wajib terkonfigurasi untuk pemulihan kata sandi di produksi.
- `LOG_LEVEL`, `UPLOAD_MAX_BYTES`, `TIMEZONE_DISPLAY=Asia/Jakarta`.

`.env.example` di root hanya berisi placeholder. `.env` produksi **wajib diset** di `infra/.env` (permission `0600`), tidak pernah di-commit, dan tidak masuk image Docker.

## Bentuk Compose (khusus Production)
Docker tidak digunakan untuk development lokal. Satu-satunya file Compose berada di `infra/docker-compose.yaml`, berisi `migrate` (job satu kali), `api`, dan `web`, menggunakan `ghcr.io/${GHCR_OWNER:-farrelghozy}/talenta-frontend:${IMAGE_TAG:-latest}` dan `talenta-backend:${IMAGE_TAG:-latest}` (tanpa bagian `build:` lokal). MySQL/RustFS existing tidak dibuat ulang oleh Compose produksi. Web/proxy menuju Cloudflare Tunnel; api, DB, storage tidak membuka port publik. Health check dan restart policy membedakan layanan panjang dengan migration job. Tidak ada data persisten pada filesystem image.

Operator menjalankan dari direktori `infra/` setelah menyetel `infra/.env`:
~~~bash
cd infra
docker compose pull
docker compose up -d
docker compose ps
~~~
Default menarik tag `:latest`; untuk mengganti tag tertentu cukup ubah `IMAGE_TAG` di `infra/.env` (atau kirim `IMAGE_TAG=vX.Y.Z` lewat environment) sebelum `docker compose pull && docker compose up -d`. Rilis yang mengubah schema membutuhkan backup dan tinjau migrasi sebelum up.

## GitHub Actions (`.github/workflows/ci-publish.yml`)
- **Pull request ke `main`**: menjalankan **Job 1 (`test-and-build`)** saja (Bun frozen lockfile, MySQL 8.4 service, `prisma migrate deploy`, `typecheck`, `lint`, unit + seluruh integration test beserta laporan **coverage**, Playwright E2E, production build, dan cek kebocoran bundle/`.env`/validasi Compose) tanpa push ke GHCR.
- **Push/merge ke `main` atau push Git tag (`*`)**: langsung menjalankan **2 job berurutan**:
  1. **Job 1 (`test-and-build`)**: seluruh rangkaian tes + coverage + E2E + build check di atas.
  2. **Job 2 (`publish`)**: membangun image Docker production `talenta-frontend` & `talenta-backend` lalu push ke GHCR dengan tag `latest` (khusus `main`), `<tag>` (khusus tag push), dan `sha-<commit>`.

Workflow lama `.github/workflows/deploy.yml` (demo GitHub Pages) dinonaktifkan dari trigger `push` `main` dan hanya tersisa untuk eksekusi manual `workflow_dispatch`. Pin action ke versi yang ditinjau, batasi permissions, dan jangan berikan secret server ke build. Simpan digest sebagai artefak rilis; rollback memakai tag/digest sebelumnya. Rujukan: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images

## Kompatibilitas
Dokumentasi Prisma terbaru menandai MySQL pada ORM 8 sebagai early preview dan ORM 7 sebagai jalur stabil; Stage 2 mengunci versi 7 kompatibel Bun/MySQL dan perintah migrasinya. Jangan campur prosedur versi 7/8. Rujukan: https://www.prisma.io/docs/orm/supported-databases
RustFS mendukung API S3 compatible dengan endpoint dan path-style; uji PUT, GET, presigned URL, delete, dan izin service account pada instalasi nyata. Rujukan: https://docs.rustfs.com/en/administration/protocols/s3
