# 17 — Runbook home server dan rilis

Rancangan, belum dijalankan. Home server mempunyai MySQL, RustFS, Cloudflare Tunnel dan domain pribadi. Compose produksi hanya aplikasi web, API dan migration job; hostname/port privat tidak disimpan di repo publik.

## Persiapan sekali
1. Buat database dan user MySQL dengan izin minimum; pisahkan akun DDL migrasi bila perlu. Batasi jaringan.
2. Buat bucket privat RustFS dan service account aplikasi. Uji path-style endpoint, PUT/GET/delete/presigned URL.
3. Atur HTTPS via Cloudflare Tunnel ke web/proxy internal; /api menuju API. DB/storage tidak dibuka publik.
4. Siapkan checkout repo, .env dari .env.example dengan chmod 600, ruang disk, rotasi log, monitoring dan backup terpisah.
5. Bootstrap super admin sekali memakai rahasia sementara, lalu putar/hapus rahasia.

## Setiap rilis
1. Pastikan tag/digest GHCR berasal dari commit lulus CI dan gate staging; catat versi lama.
2. Tinjau schema dan kompatibilitas rollback. Backup MySQL serta RustFS; pastikan backup dapat dibaca.
3. Ubah IMAGE_TAG di root .env. Jalankan docker compose pull.
4. Jalankan migration job versi Prisma terkunci sebelum API baru siap menerima trafik. Job hanya satu instance dan idempotent.
5. Jalankan docker compose up -d dan docker compose ps. Cek readiness, login, katalog, pengajuan, ranking dan upload jika terkait.
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
