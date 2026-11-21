# 20 — Bukti validasi Stage 2

## Validasi ulang perbaikan audit — 21 November 2026

- Reset password produksi memakai Nodemailer/SMTP nyata. Production tanpa SMTP gagal tertutup, token dan alamat tidak dicetak ke log, dan kegagalan pengiriman membatalkan token yang baru dibuat. Unit test menyuntikkan transport SMTP dan membuktikan pesan dikirim ke alamat tujuan; integrasi tetap memakai preview token hanya pada lingkungan test.
- Frontend produksi hanya memakai cookie sesi `HttpOnly`; penyimpanan bearer token di `localStorage` dan token pada query unduhan dihapus. Backend tetap menerima bearer untuk klien/test kompatibel, tetapi UI tidak menyimpannya.
- Mutasi sesi cookie dibatasi ke `PUBLIC_ORIGIN`; origin lain dan cookie tanpa `Origin` ditolak. Header proxy hanya dipakai ketika `TRUST_PROXY=true` dan format alamat diperiksa.
- Keputusan O-04 ditutup melalui K-13. Rilis pertama dibatasi satu instance API sesuai K-14; rate limit terdistribusi wajib dirancang ulang sebelum skala multi-instance.
- Suite Stage 2 setelah perbaikan: 20 uji auth dan 4 uji RBAC lulus pada `talenta_test`; unit keamanan mencakup spoofing proxy, CSRF, SMTP, dan larangan fallback token production.

Tanggal pemeriksaan: 20 November 2026. Cakupan: fondasi backend Bun + Elysia, model data dan migrasi Prisma MySQL, sistem autentikasi manual, RBAC backend, sesi aman, token pemulihan password, health checks, audit log, serta integrasi frontend auth dan profil. Tidak mencakup RustFS, storage bukti prestasi, atau deployment container server (tahapan Stage 4 dan Stage 6).

---

## 1. Hasil Gate Stage 2

Stage 2 dinyatakan **selesai dan memenuhi kriteria Definition of Done (DoD)** karena:

1. **Backend Elysia & Bun**: Layanan backend aktif dengan modular architecture (`src/app/`, `src/lib/`, `src/modules/`, `prisma/`, `tests/`) dengan penanganan error terpusat sesuai standar `docs/16-kontrak-api.md`.
2. **Prisma & MySQL**: Skema terdefinisi di `backend/prisma/schema.prisma` dan migrasi awal SQL `20261120073457_init_auth_foundation` berhasil dieksekusi secara idempotent pada database `talenta_dev` dan `talenta_test`.
3. **Pencegahan Akun Duplikat**: Skema dan service menjamin keunikan `email` serta `nim` per institusi dengan menghasilkan status HTTP `409 Conflict`.
4. **Keamanan Autentikasi**:
   - Password di-hash menggunakan algoritme `argon2id` native via `Bun.password`.
   - Manajemen sesi aman dengan rotasi dan pencabutan token (`revokedAt`).
   - Rate limiting in-memory aktif pada rute registrasi, login, dan reset password.
   - Endpoint pemulihan kata sandi (`/forgot-password`) aman dari serangan *user enumeration*.
   - Anti-IDOR pada profil mahasiswa: identitas diperoleh dari sesi server, bukan dari parameter body atau query client.
5. **Otorisasi Berbasis Peran (RBAC)**: Backend menguji hak akses tiga peran (`mahasiswa`, `validator`, `super_admin`) secara ketat. Validator/admin yang mengakses profil mahasiswa mendapat `403 Forbidden`.
6. **Seed Bootstrap & Health Check**:
   - `prisma/seed.ts` membuat institusi default UNIDA Gontor dan bootstrap super admin secara idempotent dari variabel environment tanpa hardcode password atau fixture mahasiswa.
   - Endpoint `/health/live` (liveness) dan `/health/ready` (readiness dengan cek konektivitas MySQL) merespons status yang valid.
7. **Integrasi Frontend**:
   - Rute `/daftar`, `/lupa-password`, dan `/reset-password` tersedia dengan antarmuka yang terhubung ke API backend nyata.
   - Halaman `/masuk` mendukung login kredensial nyata dan penanganan sesi/token dinamis.
   - Jalur demo mock (`bun run dev` dan `bun run build:demo`) tetap 100% terjaga tanpa regresi.

---

## 2. Pemeriksaan Otomatis

Semua perintah pemeriksaan otomatis lulus dari root repo:

```bash
bun run test             # 21 uji integrasi & RBAC lulus (826ms)
bun run typecheck        # Lulus tanpa error untuk frontend & backend
bun run lint             # Lulus: 0 warning, 0 error pada 107 file
bun run build            # Build mode produksi (bundle bersih tanpa mock data)
bun run build:demo       # Build mode demo (untuk preview/pengembangan lokal)
```

### Rincian Suite Pengujian (`bun run test`):
- `GET /health/live`: status ok 200.
- `GET /health/ready`: status ready, database connected 200.
- `POST /api/v1/auth/register`: pendaftaran mahasiswa baru sukses.
- `POST /api/v1/auth/register` (duplikat email): 409 Conflict.
- `POST /api/v1/auth/register` (duplikat NIM): 409 Conflict.
- `POST /api/v1/auth/register` (password < 8 karakter): 422 Validation Error.
- `POST /api/v1/auth/login`: login kredensial valid berhasil mengembalikan session token.
- `POST /api/v1/auth/login` (password salah / email tidak terdaftar): 401 Unauthorized dengan pesan generik aman.
- `GET /api/v1/auth/me`: 401 jika tanpa token, 200 jika token valid.
- `GET /api/v1/me/profile`: mahasiswa dapat mengambil profil sendiri.
- `PATCH /api/v1/me/profile`: mahasiswa dapat memperbarui bio/kontak tanpa mengubah NIM.
- `POST /api/v1/auth/logout`: sesi dicabut, token lama tidak dapat dipakai kembali (401).
- `POST /api/v1/auth/forgot-password`: respons aman tanpa enumerasi pengguna.
- `POST /api/v1/auth/reset-password`: token palsu ditolak (400), token valid berhasil mengubah password dan mencabut sesi lama.
- RBAC: Validator & Super Admin terverifikasi; akses rute profil mahasiswa oleh validator/admin ditolak (403 Forbidden).

---

## 3. Verifikasi Bebas Kebocoran Mock pada Bundle Produksi

Pemindaian bundle produksi `frontend/dist` memastikan tidak ada fixture mock data yang bocor:

```bash
grep -rn "andi@mock\.ac\.id" frontend/dist
# Hasil: CLEAN (tidak ditemukan)
```

---

## 4. Risiko yang Sengaja Diteruskan ke Stage Berikutnya

- Fitur katalog kompetisi berulang, pengelolaan target lomba mahasiswa, pembentukan tim, dan roadmap persiapan adalah ruang lingkup **Stage 3**.
- Penyimpanan file bukti prestasi privat di RustFS dan ledger verifikasi adalah ruang lingkup **Stage 4**.
- Pengiriman email reset password di production memerlukan `SMTP_*`; tidak ada fallback log/token pada production.
