# 15 — Konfigurasi, mock, CI dan image

Nama file dipertahankan agar tautan lama tidak putus. Rancangan ini menggantikan matriks DEPLOYMENT/PRODUCTION + VITE_USE_MOCK lama untuk rilis produksi.

Stage 1 telah memisahkan adapter melalui alias `@talenta/services`: `dev` dan `build:demo` memakai `factory.mock.ts`, sedangkan `build` mode production memakai `factory.api.ts`. Pemeriksaan bundle production tidak menemukan fixture/data mock yang diuji. Backend telah tersedia sebagian; konfigurasi runtime dan deployment produksi belum terverifikasi. Status dan kekurangannya ada di TODO.md dan docs/24.

## Lingkungan
| Lingkungan | Frontend | Data | Operasi |
|---|---|---|---|
| development | Vite lokal | mock atau MySQL/RustFS dev | Bun |
| CI | build dan tes | database/storage test terisolasi | GitHub Actions |
| staging | image GHCR | MySQL dan bucket staging | Compose seperti produksi |
| production | image GHCR | MySQL dan RustFS existing | root .env + Compose |

Mock hanya untuk demo/tes, tidak ada toggle mock pada image produksi. Vite mengganti VITE_* saat build; alamat server dan rahasia tidak boleh bergantung pada variabel itu. Browser meminta /api pada origin yang sama sehingga domain dapat berubah tanpa rebuild. Rujukan: https://vite.dev/guide/env-and-mode

## Root .env server
Kontrak variabel yang direncanakan:
- IMAGE_TAG: commit SHA atau tag rilis immutable, dipakai kedua image.
- PUBLIC_ORIGIN: URL HTTPS domain aktif.
- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (atau fallback DATABASE_URL): kredensial MySQL aplikasi khusus.
- SESSION_SECRET dan COOKIE_SECRET: rahasia acak kuat.
- S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_FORCE_PATH_STYLE=true: service account RustFS dan bucket privat.
- SUPER_ADMIN_BOOTSTRAP_*: hanya untuk bootstrap satu kali; dihapus/diputar setelahnya.
- SMTP_*: untuk verifikasi email/reset jika tersedia.
- LOG_LEVEL, UPLOAD_MAX_BYTES, TIMEZONE_DISPLAY=Asia/Jakarta.

.env.example hanya placeholder. .env di server permission 0600, tidak di-commit dan tidak masuk image. Compose meneruskan variabel eksplisit ke container; .env Compose sendiri terutama untuk interpolasi. Rujukan: https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/

## Bentuk Compose
compose.yaml root berisi web, api, dan migration job satu kali, menggunakan ghcr.io/<owner>/<repo>-frontend:<IMAGE_TAG> dan -backend:<IMAGE_TAG>. MySQL/RustFS existing tidak dibuat ulang oleh Compose produksi. Web/proxy menuju Cloudflare Tunnel; api, DB, storage tidak membuka port publik. Health check dan restart policy membedakan layanan panjang dengan migration job. Tidak ada data persisten pada filesystem image.

Operator dari root checkout dengan .env:
~~~
docker compose pull
docker compose up -d
docker compose ps
~~~
Rilis yang mengubah schema membutuhkan backup dan tinjau migrasi sebelum up. Migration job harus idempotent, hanya satu instance, dan selesai sebelum API ready.

## GitHub Actions
Pull request: Bun frozen lockfile, typecheck, lint, unit/integration, build frontend/backend, scan dependency/image, dan cek rahasia. Push main membangun image SHA untuk staging. Tag rilis hanya setelah gate, memakai digest yang sudah diuji. Job publish memakai GITHUB_TOKEN dengan packages:write terbatas; metadata OCI menautkan repo. Pastikan package GHCR disetel public. Publish tidak otomatis deploy server. Rujukan: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images

Pin action ke versi/digest yang ditinjau, batasi permissions, dan jangan berikan secret server ke build. Simpan digest sebagai artefak rilis; rollback memakai tag/digest sebelumnya.

## Kompatibilitas
Dokumentasi Prisma terbaru menandai MySQL pada ORM 8 sebagai early preview dan ORM 7 sebagai jalur stabil; Stage 2 mengunci versi 7 kompatibel Bun/MySQL dan perintah migrasinya. Jangan campur prosedur versi 7/8. Rujukan: https://www.prisma.io/docs/orm/supported-databases
RustFS mendukung API S3 compatible dengan endpoint dan path-style; uji PUT, GET, presigned URL, delete, dan izin service account pada instalasi nyata. Rujukan: https://docs.rustfs.com/en/administration/protocols/s3
