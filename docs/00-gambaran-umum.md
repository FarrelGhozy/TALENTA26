# 00 — Gambaran umum

TALENTA adalah platform satu kampus untuk pembinaan lomba dan pencatatan prestasi mahasiswa. Rilis pertama menghubungkan katalog lomba, profil, tim, roadmap, pengajuan prestasi, validasi, dashboard, dan ranking publik. Tujuannya adalah operasi berulang lintas tahun akademik dengan riwayat tetap utuh.

## Pembedaan status
- Saat ini: implementasi full-stack (frontend React/Vite, backend Bun/Elysia + Prisma 7/MySQL + RustFS + proteksi DDoS & anti-bloat `K-25`, serta artefak Docker Compose/Nginx/backup/CI GHCR) telah selesai dan lulus seluruh gate teknis lokal (`TODO.md`).
- Target operasional: aktivasi staging/produksi di home server melalui Cloudflare Tunnel & `infra/.env`, serta pengesahan kebijakan kampus (`O-01`–`O-06`) sebagai tahap rilis terpisah.
- Berikutnya: verifikasi email saat daftar, simpan draft prestasi, SSO kampus, dan kemungkinan multi-kampus setelah pilot; AI dan beasiswa bukan bagian rilis awal.

## Prinsip
Informasi lomba punya sumber dan tanggal pembaruan. Pengajuan punya status serta riwayat. Statistik dan ranking hanya menghitung data sesuai definisi. Identitas rilis awal adalah klaim mahasiswa sendiri; jangan tampilkan seolah telah dicocokkan kampus. Dosen hanya kontak konsultasi yang dikelola validator.

## Istilah
- Periode akademik: rentang mulai/akhir untuk kompetisi, aktivitas, dan ranking.
- Kompetisi: program lomba terkelola; dapat individu atau beregu.
- Target: satu pilihan kompetisi aktif mahasiswa dalam periode.
- Validator: petugas domain konten dan verifikasi prestasi.
- Super admin: pengelola teknis, peran, konfigurasi, serta semua fungsi validator.
- Prestasi sah: pengajuan berstatus disetujui validator.
- Poin ranking: nilai dari prestasi lomba sah berdasarkan aturan berversi.
- Publikasi: konten yang lolos dari draft dan dapat dibaca pengunjung.

## Batas klaim
Jangan mencantumkan beasiswa, SKPI, BAAK, AI aktif, atau validasi identitas kampus tanpa keputusan/integrasi resmi. Logo dan aset visual saat ini adalah aset proyek; penggunaan identitas resmi perlu pemeriksaan pemilik produk/kampus sebelum rilis institusional.
