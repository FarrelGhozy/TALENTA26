# Infrastruktur & Deployment (Stage 6)

Direktori ini menyimpan konfigurasi infrastruktur produksi dan skrip operasional TALENTA:

- `compose.yaml` (di root): Orkestrasi container aplikasi (`migrate` one-shot Prisma job, `api` Bun/Elysia, dan `web` Nginx same-origin proxy). Database MySQL dan object storage RustFS sudah tersedia di server dan dikonfigurasi melalui root `.env`.
- `frontend/Dockerfile`: Multi-stage production build (`oven/bun:1.4.4-alpine` -> `nginx:1.27-alpine`) tanpa menyematkan variabel `.env` atau `VITE_*` rahasia.
- `backend/Dockerfile`: Image API & migration Prisma terkunci (`oven/bun:1.4.4-alpine`).
- `infra/nginx/default.conf`: Reverse proxy satu origin (`/` menuju SPA static files, `/api/` & `/health` menuju `api:3001`) dengan header keamanan dan batas unggah `30m`.
- `infra/scripts/backup-db.sh`: Backup MySQL + SHA-256 checksum + uji restore database terisolasi.
- `infra/scripts/backup-storage.ts`: Backup & restore objek RustFS S3-compatible terverifikasi checksum.

Lihat [docs/17-runbook-operasi.md](../docs/17-runbook-operasi.md) untuk langkah rilis, migrasi, backup/restore, dan rollback.
