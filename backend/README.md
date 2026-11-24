# Backend UNIDA Student Championship (USC)

Backend Bun/Elysia, Prisma 7 (`@prisma/adapter-mariadb` / MySQL), migrasi database, integrasi S3 compatible (RustFS/MinIO) dengan streaming + `ETag`/`304`, proteksi DDoS berlapis (rate limiter bounded LRU, Argon2id concurrency semaphore, validasi payload ketat), serta worker & CLI pemeliharaan anti-bloat MySQL/RustFS (`src/scripts/maintenance.ts`) berada di direktori ini.

- **Pengujian**: jalankan `bun run test` dari root (33 unit test + 11 suite integration test) dan `bun run test:coverage`.
- **Pemeliharaan manual**: `bun backend/src/scripts/maintenance.ts --dry-run` (pratinjau TTL pruning MySQL & Orphan GC RustFS tanpa menghapus) atau tanpa `--dry-run` untuk eksekusi nyata.
- **Acuan kontrak & operasi**: `../docs/16-kontrak-api.md`, `../docs/12-nfr-keamanan.md`, `../docs/15-env-mock-strategy.md`, `../docs/17-runbook-operasi.md`, serta `../TODO.md`. Pengesahan kebijakan kampus (`O-01`–`O-06`) dan deployment produksi tetap dilakukan pada tahap operasional terpisah.
