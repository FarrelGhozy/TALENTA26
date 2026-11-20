# 12 — Kualitas, keamanan, privasi dan operasi

## Identitas dan sesi
Password di-hash dengan algoritme password modern dan parameter yang ditinjau; tidak pernah log plaintext. Login manual memakai sesi server atau cookie HttpOnly, Secure, SameSite dengan rotasi/pencabutan; CSRF untuk mutasi berbasis cookie. Rate limit login, daftar, reset dan upload. Email ownership verification disarankan sebelum akses penuh; ini membuktikan kontrol email, bukan status mahasiswa. Jika fasilitas email belum siap, penundaan ini harus diputuskan sebagai risiko go-live di docs/14. Google login tidak ada.

## Otorisasi
Setiap endpoint memeriksa role dan kepemilikan objek di backend. Filter institusi wajib walau rilis awal satu kampus. ID dari browser tidak boleh menentukan owner. Uji IDOR untuk profil, tim, undangan, pengajuan, bukti, audit, dan pengaturan. Super admin dapat bertindak luas tetapi semua tindakan sensitif dicatat.

## Data pribadi dan publikasi
Kumpulkan hanya data yang diperlukan. NIM, email, nomor pribadi, password hash, bukti, dan audit privat. Ranking mempublikasikan nama tampilan dan poin sesuai keputusan pemilik produk; tujuan serta aktivitas publikasi harus diberitahukan kepada mahasiswa, dan dasar pemrosesan serta mekanisme hak subjek harus ditinjau sebelum pilot nyata. Rujukan resmi: UU No. 27 Tahun 2022, Pasal 16 dan 20 (https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022). Retensi, penghapusan, koreksi, dan akses data perlu disahkan kampus.

## Upload dan storage
RustFS bucket privat, service account dengan izin minimum, object key acak, batas 1–3 file dan ukuran awal maksimum 5 MiB per file, validasi MIME/isi, scanning jika fasilitas tersedia, dan upload/unduh melalui API terotorisasi. Batas final ditetapkan setelah uji file kampus. Jangan memakai kredensial root RustFS. Batasi pengeluaran data melalui API dan jangan cache bukti sensitif secara publik.

## API dan web
Validasi skema input/output, CORS hanya origin resmi, header keamanan, CSP sesuai aset, proteksi XSS, sanitasi URL sumber/WA, query terparameter melalui Prisma, pagination, batas body, timeout, dan error tanpa stack/rahasia. Log terstruktur dengan requestId dan redaksi PII. Dependency scan dan image scan menjadi gate CI.

## Keandalan
Health endpoint liveness dan readiness; readiness mengecek ketergantungan kritis. Backup MySQL dan RustFS terjadwal, terenkripsi, dipisah dari host utama bila memungkinkan; restore diuji. Migrasi database hanya satu proses dan dibuat kompatibel dengan rollback aplikasi atau forward fix. Observabilitas minimum: uptime, error rate, latensi, koneksi DB/storage, ruang disk, umur backup, dan antrean verifikasi. RTO/RPO numerik menunggu keputusan operasional.

## Performa dan aksesibilitas
Target awal uji staging: halaman publik interaktif pada jaringan seluler wajar, API daftar dengan pagination stabil pada data pilot, dan unggah 5 MiB tanpa timeout. Ambang numerik final ditetapkan dari baseline pengukuran, bukan klaim. UI diuji pada mobile dan keyboard sesuai docs/11.

## Kriteria rilis
Tidak ada rahasia di repo/image; HTTPS tersedia; uji otorisasi lulus; backup/restore dan rollback teruji; kebijakan privasi/publikasi disahkan; data mock tidak masuk produksi; daftar temuan keamanan kritis ditutup.
