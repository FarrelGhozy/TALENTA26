# 12 — Kualitas, keamanan, privasi dan operasi

## Identitas dan sesi
Password di-hash dengan Argon2id; tidak pernah log plaintext dan **`passwordHash` tidak boleh pernah keluar pada respons API mana pun**. Login manual memakai cookie HttpOnly, Secure (produksi), SameSite dengan token sesi yang **disimpan dalam bentuk hash SHA-256** di database; `SESSION_SECRET` dan `COOKIE_SECRET` wajib terkonfigurasi kuat (fail-fast di produksi). Mutasi berbasis cookie dilindungi pengecekan CSRF (`Origin`). Rate limit login, daftar, reset, dan upload menggunakan resolusi IP soket nyata saat `TRUST_PROXY=false` (tidak boleh menggabungkan seluruh pengguna dalam satu bucket `'unknown'`). Verifikasi kepemilikan email saat registrasi ditunda ke pasca-rilis awal per `K-21` dan dicatat sebagai risiko operasional yang diketahui; reset password produksi wajib memakai SMTP (gagal tertutup bila tidak terkonfigurasi per `K-13`). Google login tidak ada.

## Otorisasi
Setiap endpoint memeriksa role, kepemilikan objek, dan `institutionId` di backend. ID dari browser tidak boleh menentukan owner; rute legacy rawan IDOR (`/users/:userId/target`, `?userId=` pada checklist) dihapus. Uji IDOR wajib lulus untuk profil, avatar, target, tim, undangan, checklist, pengajuan, bukti, audit, dan pengaturan. Super admin tidak boleh men-suspend atau menurunkan peran dirinya sendiri hingga menyisakan nol super admin aktif; perubahan peran mencabut sesi aktif target. Semua tindakan sensitif (termasuk override poin validator & pergantian periode) dicatat di audit.

## Data pribadi dan publikasi
Kumpulkan hanya data yang diperlukan. NIM, email, nomor pribadi, `passwordHash`, bukti prestasi, avatar mahasiswa, dan audit bersifat privat. Respons tim & undangan hanya menyertakan data profil minimal tanpa `passwordHash`, `email`, `nim`, atau `phone`. Ranking mempublikasikan nama tampilan, prodi (sesuai kebijakan), dan poin sesuai keputusan pemilik produk; tujuan serta aktivitas publikasi diberitahukan jelas saat mendaftar, dan dasar pemrosesan serta mekanisme hak subjek ditinjau sebelum pilot nyata (`O-02`). Rujukan resmi: UU No. 27 Tahun 2022, Pasal 16 dan 20 (https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022). Retensi, penghapusan, koreksi, dan akses data perlu disahkan kampus (`O-03`).

## Upload dan storage
RustFS bucket privat, service account dengan izin minimum, object key acak, tanpa fallback diam-diam ke filesystem lokal `.storage/` pada `NODE_ENV=production`.
- **Bukti prestasi**: 1–3 berkas aktif, ukuran nyata buffer maksimal **8 MB** per berkas, tipe PDF/JPEG/PNG tervalidasi ekstensi + MIME + magic byte, upload/unduh melalui API terotorisasi, pembersihan otomatis objek yatim bila transaksi gagal.
- **Avatar mahasiswa (`K-20`)**: diunggah via multipart ke RustFS (bukan Base64 ke MySQL), ukuran maksimal **2 MB**, tipe JPEG/PNG/WebP tervalidasi magic byte, diakses melalui endpoint stream terotorisasi, dan tidak ditampilkan pada halaman ranking publik.
Scanning malware dan sanitasi metadata gambar menjadi gate produksi sesuai risiko deployment (`O-06`). Jangan memakai kredensial root RustFS dan jangan cache berkas sensitif secara publik.

## API dan web
Validasi skema & enum input/output ketat di backend; CORS pada `NODE_ENV=production` **hanya** mengizinkan `PUBLIC_ORIGIN` (tidak mengizinkan `localhost`). Build produksi frontend wajib fail-safe ke mode `PRODUCTION` tanpa adapter mock, tanpa kartu login instan berkredensial hardcoded, dan tanpa preset berkas PDF palsu. Header keamanan, CSP sesuai aset, proteksi XSS, sanitasi URL sumber/WA, proteksi formula injection CSV, query terparameter melalui Prisma, pagination, batas body, timeout, dan error tanpa stack/rahasia. Log terstruktur dengan `requestId` dan redaksi PII. Jangan pernah menyimpan hostname privat atau password konkret di `.env.example` maupun repo publik. Dependency scan dan image scan menjadi gate CI.

## Keandalan
Health endpoint liveness dan readiness; readiness mengecek ketergantungan kritis. Backup MySQL dan RustFS terjadwal, terenkripsi, dipisah dari host utama bila memungkinkan; restore diuji. Migrasi database hanya satu proses dan dibuat kompatibel dengan rollback aplikasi atau forward fix. Observabilitas minimum: uptime, error rate, latensi, koneksi DB/storage, ruang disk, umur backup, dan antrean verifikasi. RTO/RPO numerik menunggu keputusan operasional.

## Performa dan aksesibilitas
Target awal uji staging: halaman publik interaktif pada jaringan seluler wajar, API daftar dengan pagination stabil pada data pilot, dan unggah 8 MB tanpa timeout. Ambang numerik final ditetapkan dari baseline pengukuran, bukan klaim. UI diuji pada mobile dan keyboard sesuai docs/11.

## Kriteria rilis
Tidak ada rahasia di repo/image; HTTPS tersedia; uji otorisasi lulus; backup/restore dan rollback teruji; kebijakan privasi/publikasi disahkan; data mock tidak masuk produksi; daftar temuan keamanan kritis ditutup.
