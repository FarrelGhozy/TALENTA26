# 17 — Runbook home server dan rilis

Konfigurasi Compose produksi (`infra/docker-compose.yaml`), `frontend/Dockerfile`, `backend/Dockerfile`, proxy `infra/nginx/default.conf`, serta workflow CI/GHCR (`.github/workflows/ci-publish.yml`) telah tersedia di repo. Home server mempunyai MySQL, RustFS, Cloudflare Tunnel, dan domain pribadi. **Docker hanya dipakai untuk runtime production**; `infra/docker-compose.yaml` menarik image siap pakai dari GHCR (default `latest`, bisa diganti `IMAGE_TAG` tertentu) dan menjalankan aplikasi `web`, `api`, serta `migrate` job satu kali tanpa membuat MySQL/RustFS baru. Hostname/port privat tidak disimpan di repo publik.

## Persiapan sekali
1. Pastikan network eksternal Docker `homelab-net` sudah tersedia di server dan container MySQL existing sudah terpasang ke `homelab-net`. Buat database dan user MySQL dengan izin minimum; pisahkan akun DDL migrasi bila perlu. Batasi jaringan.
2. Buat bucket privat RustFS dan service account aplikasi. Uji path-style endpoint, PUT/GET/delete.
3. Atur HTTPS via Cloudflare Tunnel ke target localhost di server:
   - **Frontend (`web`)**: `http://127.0.0.1:${WEB_PORT:-3350}` (atau `http://localhost:3350`).
   - **Backend (`api`)**: `http://127.0.0.1:${API_PORT:-3360}` (atau `http://localhost:3360`). Untuk domain produksi aktif `https://talenta.utc.web.id` & `https://api-talenta.utc.web.id` (atau domain kampus baru nanti), cukup atur `PUBLIC_ORIGIN` & `API_PUBLIC_ORIGIN` di `infra/.env` lalu jalankan `docker compose up -d` — seluruh URL SEO/Open Graph/Sitemap/CORS otomatis mengikuti `.env` tanpa rebuild image (disarankan keduanya memakai subdomain dari root domain yang sama agar cookie pihak pertama tetap optimal di Safari/Chrome). DB/storage tidak dibuka publik.
4. Masuk ke `infra/` dan **wajib siapkan `infra/.env`** dari `../.env.example` dengan `chmod 600 .env` (isi `GHCR_OWNER=farrelghozy`, `IMAGE_TAG=latest`, `WEB_BIND_HOST=127.0.0.1`, `WEB_PORT=3350`, `API_BIND_HOST=127.0.0.1`, `API_PORT=3360`, `TRUST_PROXY=true`, `PUBLIC_ORIGIN`, `API_PUBLIC_ORIGIN` bila dual-subdomain, `DB_HOST=<nama-container-mysql-di-homelab-net>`, kredensial MySQL/RustFS, SMTP *(opsional saat startup — gagal tertutup `503` + log error bila dipanggil saat belum valid)*, `SESSION_SECRET`/`COOKIE_SECRET` acak >= 32 karakter, serta parameter kuota/retensi `K-25` sesuai kapasitas server). Rotasi log container (`json-file` 10 MB × 5) serta `mem_limit`/`cpus`/`pids_limit` sudah terpasang di `infra/docker-compose.yaml`.
5. Bootstrap super admin sekali memakai email login & kata sandi awal di `infra/.env` (`SUPER_ADMIN_BOOTSTRAP_EMAIL` dan `SUPER_ADMIN_BOOTSTRAP_PASSWORD`, 8–128 karakter) melalui `docker compose run --rm api bun backend/prisma/seed.ts`. Setelah berhasil masuk di `/masuk`, putar/hapus rahasia bootstrap tersebut dari `infra/.env` (seed bersifat idempotent dan tidak menimpa akun `super_admin` yang sudah ada bila dijalankan ulang).

## Setiap rilis
1. Pastikan tag/digest GHCR (`latest`, `vX.Y.Z`, atau `sha-<commit>`) berasal dari commit yang lulus `.github/workflows/ci-publish.yml` (dapat dipantau via `gh run list --workflow ci-publish.yml` / `gh run watch`); catat `IMAGE_TAG` lama.
2. Tinjau schema dan kompatibilitas rollback. Jalankan backup MySQL (`./infra/scripts/backup-db.sh --env-file infra/.env --keep-days 14`) serta RustFS (`bun infra/scripts/backup-storage.ts backup --env-file infra/.env --output storage-backups/<waktu> --keep-days 14`); pastikan backup dapat dibaca.
3. Masuk ke `infra/`. Secara default `infra/docker-compose.yaml` menarik `:latest`; untuk merilis tag tertentu, ubah `IMAGE_TAG` di `infra/.env` (atau kirim `IMAGE_TAG=<tag>`). Lalu jalankan:
   ```bash
   cd infra
   docker compose pull
   docker compose up -d
   docker compose ps
   ```
4. Migration job berjalan otomatis sebelum `api` via `depends_on: service_completed_successfully` (atau dapat dijalankan eksplisit lebih dulu lewat `docker compose run --rm migrate`). Container `api` lulus health check `/health/ready` sebelum `web` dinyalakan.
5. Cek `GET /health/live`, `GET /health/ready`, login, katalog, pengajuan, ranking, dan upload bukti.
6. Pantau error, latensi, disk, koneksi dan log. Catat operator, waktu, digest, migration ID dan hasil smoke test.

Jalur normal tetap pull lalu up; backup/tinjau migrasi adalah langkah keselamatan di sekitarnya.

## Pemeliharaan Anti-Bloat MySQL & RustFS (`K-25`)
Server backend otomatis menjalankan siklus pemeliharaan latar belakang setiap `MAINTENANCE_INTERVAL_MINUTES` (default 360 menit / 6 jam) dengan single-flight lock (batched MySQL TTL pruning `LIMIT 500`, retensi berkas bukti tak aktif/ditolak, dan Orphan GC RustFS `> 24 jam`). Operator juga dapat menjalankan pratinjau atau pembersihan manual secara aman:
```bash
# Pratinjau tanpa menghapus data/objek apapun
bun --env-file=infra/.env backend/src/scripts/maintenance.ts --dry-run

# Eksekusi nyata satu siklus pemeliharaan (atau dari container: docker compose run --rm api bun backend/src/scripts/maintenance.ts)
bun --env-file=infra/.env backend/src/scripts/maintenance.ts
```

## Rollback
Jika schema kompatibel, set `IMAGE_TAG` lama, `docker compose pull`, `docker compose up -d`, lalu smoke test. Jika schema/data tidak kompatibel, jangan sekadar rollback image; jalankan forward fix atau restore yang disetujui setelah menilai kehilangan data. Simpan digest lama dan catatan migrasi.

## Backup dan restore
Backup MySQL secara konsisten menggunakan `--defaults-extra-file` (`0600`), dump atomik + `gzip -t` + `--hex-blob` + SHA-256, dan retensi otomatis `--keep-days` (`BACKUP_RETENTION_DAYS`, default 14 hari):
```bash
./infra/scripts/backup-db.sh --env-file infra/.env --test-restore talenta_restore_check
```
*(Database uji `talenta_restore_check` otomatis dihapus kembali setelah jumlah tabel terverifikasi agar tidak memenuhi disk MySQL; tambahkan `--keep-test-db` hanya jika ingin inspeksi manual).*

Cadangan objek RustFS memakai streaming + SHA-256 inkremental + staging atomik (`0700`/`0600`) dan toleran terhadap penghapusan objek serentak (`NoSuchKey`):
```bash
bun infra/scripts/backup-storage.ts backup --env-file infra/.env --output storage-backups/<waktu> --keep-days 14
```
Uji pemulihan wajib memakai bucket terisolasi yang sudah dibuat operator:
```bash
bun infra/scripts/backup-storage.ts restore --env-file infra/.env --input storage-backups/<waktu> --target-bucket talenta-restore-test
```
Skrip menolak bucket sumber sebagai target dan memverifikasi checksum sebelum mengunggah. Setelah restore, operator membandingkan jumlah objek, membuka sampel bukti melalui API berotorisasi, lalu menghapus bucket uji sesuai retensi yang disahkan (`O-03`). Jangan menjalankan prosedur ini pada RustFS produksi tanpa jendela operasi dan persetujuan operator.

## Insiden dan pindah server
Jika API gagal, cek health, log requestId, DB/storage dan ruang disk. Jika diduga bocor, batasi akses, simpan bukti, rotasi kunci, pulihkan, serta ikuti prosedur pemberitahuan yang disahkan. Jangan menempelkan .env/data pribadi di issue publik. Migrasi ke server kampus memakai backup/restore teruji; SSO adalah proyek terpisah dengan pemadanan identitas.
