# 17 — Runbook home server dan rilis

Konfigurasi Compose (`compose.yaml`), `frontend/Dockerfile`, `backend/Dockerfile`, proxy `infra/nginx/default.conf`, serta workflow CI/GHCR (`.github/workflows/ci-publish.yml`) telah tersedia di repo. Home server mempunyai MySQL, RustFS, Cloudflare Tunnel, dan domain pribadi. Compose produksi hanya menjalankan aplikasi `web`, `api`, serta `migrate` job satu kali; hostname/port privat tidak disimpan di repo publik.

## Persiapan sekali
1. Buat database dan user MySQL dengan izin minimum; pisahkan akun DDL migrasi bila perlu. Batasi jaringan.
2. Buat bucket privat RustFS dan service account aplikasi. Uji path-style endpoint, PUT/GET/delete.
3. Atur HTTPS via Cloudflare Tunnel ke `http://127.0.0.1:${WEB_PORT:-8080}` (layanan `web` Nginx proxy satu origin; `/api` dan `/health` diteruskan ke `api:3001`). DB/storage tidak dibuka publik.
4. Siapkan checkout repo, `.env` dari `.env.example` dengan `chmod 600` (isi `GHCR_OWNER`, `IMAGE_TAG`, `WEB_PORT=8080`, `TRUST_PROXY=true`, `PUBLIC_ORIGIN=https://domain-anda`, kredensial MySQL/RustFS, dan `SESSION_SECRET`/`COOKIE_SECRET` acak >= 32 karakter), ruang disk, rotasi log, monitoring dan backup terpisah.
5. Bootstrap super admin sekali memakai rahasia sementara (`bun run backend/prisma/seed.ts` atau variabel `SUPER_ADMIN_BOOTSTRAP_*`), lalu putar/hapus rahasia.

## Setiap rilis
1. Pastikan tag/digest GHCR (`sha-<commit>` atau `vX.Y.Z`) berasal dari commit yang lulus `.github/workflows/ci-publish.yml` dan gate staging; catat `IMAGE_TAG` lama.
2. Tinjau schema dan kompatibilitas rollback. Jalankan backup MySQL (`./infra/scripts/backup-db.sh`) serta RustFS (`bun infra/scripts/backup-storage.ts backup --output storage-backups/<waktu>`); pastikan backup dapat dibaca.
3. Ubah `IMAGE_TAG` di root `.env`. Jalankan `docker compose pull`.
4. Jalankan migration job sebelum atau bersamaan dengan up (`docker compose run --rm migrate` secara eksplisit jika ingin terpisah, atau via `depends_on: service_completed_successfully` pada `docker compose up -d`). Job memakai versi Prisma terkunci dan bersifat idempotent.
5. Jalankan `docker compose up -d` dan `docker compose ps`. Cek `GET /health/live`, `GET /health/ready`, login, katalog, pengajuan, ranking, dan upload bukti.
6. Pantau error, latensi, disk, koneksi dan log. Catat operator, waktu, digest, migration ID dan hasil smoke test.

Jalur normal tetap pull lalu up; backup/tinjau migrasi adalah langkah keselamatan di sekitarnya.

## Rollback
Jika schema kompatibel, set IMAGE_TAG lama, pull, up, lalu smoke test. Jika schema/data tidak kompatibel, jangan sekadar rollback image; jalankan forward fix atau restore yang disetujui setelah menilai kehilangan data. Simpan digest lama dan catatan migrasi.

## Backup dan restore
Backup MySQL secara konsisten, objek RustFS dan konfigurasi penting; enkripsi dan simpan salinan di luar host bila tersedia. Uji restore berkala di lingkungan terisolasi, cek jumlah objek/record dan kemampuan membuka bukti. Jangan campur staging/produksi. Retensi dan RTO/RPO final ada di docs/14.

Cadangan objek dapat dibuat dengan `bun infra/scripts/backup-storage.ts backup --output storage-backups/<waktu>`. Manifest menyimpan key, tipe konten, ukuran, dan checksum SHA-256; isi objek disimpan dengan nama hasil hash agar key tidak dapat melakukan path traversal. Simpan direktori hasil di media terenkripsi di luar host aplikasi.

Uji pemulihan wajib memakai bucket terisolasi yang sudah dibuat operator, misalnya `bun infra/scripts/backup-storage.ts restore --input storage-backups/<waktu> --target-bucket talenta-restore-test`. Skrip menolak bucket sumber sebagai target dan memverifikasi checksum sebelum mengunggah. Setelah restore, operator membandingkan jumlah objek, membuka sampel bukti melalui API berotorisasi, lalu menghapus bucket uji sesuai retensi yang disahkan. Jangan menjalankan prosedur ini pada RustFS produksi tanpa jendela operasi dan persetujuan operator.

## Insiden dan pindah server
Jika API gagal, cek health, log requestId, DB/storage dan ruang disk. Jika diduga bocor, batasi akses, simpan bukti, rotasi kunci, pulihkan, serta ikuti prosedur pemberitahuan yang disahkan. Jangan menempelkan .env/data pribadi di issue publik. Migrasi ke server kampus memakai backup/restore teruji; SSO adalah proyek terpisah dengan pemadanan identitas.
