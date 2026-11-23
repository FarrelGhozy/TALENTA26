# 04 — Sitemap dan struktur repo tujuan

Status: diselaraskan dengan Keputusan `K-19` (revisi), `K-22`, dan `K-23` (23 November 2026). Rute operasional memakai struktur tab ringkas dengan sinkronisasi query parameter `?tab=...` agar navigasi antar-area tetap jelas, dapat di-bookmark, dan konsisten antara desktop serta mobile.

## Rute publik
- `/` landing; `/kompetisi` katalog (pencarian, kategori/jenis, tingkat, format, periode); `/kompetisi/:slug` detail (termasuk sub-lomba & keterangan aturan poin); `/ranking` leaderboard (periode aktif & lifetime); `/masuk` login manual (kartu peran instan hanya ada di mode dev/demo, tidak masuk bundle produksi); `/daftar` registrasi manual mahasiswa; `/lupa-password` & `/reset-password` pemulihan sandi SMTP; `/403` dan `/404`.

## Rute mahasiswa (`/app/*`, role `mahasiswa`)
Urutan menu utama Navbar mahasiswa: **Beranda** (`/app/beranda`) → **Ruang Persiapan** (`/app/persiapan`) → **Tim** (`/app/tim`) → **Katalog Lomba** (`/kompetisi`) → **Prestasi** (`/app/prestasi`) → **Ranking** (`/ranking`, paling belakang).
- `/app/beranda`: ringkasan progres, target aktif, tim, roadmap, pengajuan, poin periode berjalan, dan rekomendasi aksi nyata (`GET /me/dashboard`).
- `/app/persiapan`: **Ruang Persiapan** (menu utama Navbar mahasiswa) menampilkan lomba aktif yang sedang diikuti, riwayat target lomba sebelumnya, serta pilihan lomba lain untuk masuk langsung ke ruang persiapan masing-masing.
- `/app/profil`: diakses dari dropdown menu akun pojok kanan atas (**Pengaturan Profil & Target** bersama **Keluar**); berisi identitas (termasuk upload avatar privat RustFS, NIM status belum terverifikasi kampus), minat/keahlian/pengalaman, dan pengaturan target kompetisi (dengan konfirmasi arsip/keluar tim lama bila mengganti target).
- `/app/tim`: halaman **Tim** terpadu (satu menu `Tim` di Navbar mahasiswa) berbasis tab tersinkronisasi query parameter `?tab=...`:
  - Jika belum memiliki tim (lomba beregu): tab `?tab=mulai` (*Cara Bergabung* — 3 jalur: *Buat Tim Baru* `?mode=buat`, *Cari Tim Terbuka*, *Sudah Punya Tim* `?mode=kode` via modal kode undangan), tab `?tab=cari` (*Cari Tim Terbuka* — pencarian, filter peran, pengajuan gabung, penanganan daftar kosong), dan tab `?tab=pengajuan` (*Pengajuan Saya* — status pengajuan gabung & pembatalan). Jika lomba individu, menampilkan arahan langsung menuju Ruang Persiapan.
  - Jika sudah memiliki tim: tab `?tab=tim-saya` (**Ruang Tim Saya** — 3 metrik ringkas, daftar anggota dengan penanda `Ketua` berdasarkan `leaderId`, kotak Kesiapan Tim 3 lapis + akses roadmap lebih awal + tombol *Daftar Seleksi Internal*, panel *Permintaan Bergabung* khusus ketua, serta kotak *Kode Undangan Tim* dengan salin & putar ulang kode), tab `?tab=cari` (*Direktori Tim Terbuka* sebagai referensi & pratinjau), serta tab `?tab=pengajuan` bila ada riwayat pengajuan.
  - Rute lama `/app/tim/cari` dan `/app/partner` diarahkan otomatis (*redirect*) ke `/app/tim?tab=cari`.
- `/app/kompetisi/:slug/persiapan`: ruang persiapan mandiri (roadmap terbit, progres checklist, jadwal, dan kontak konsultasi WA terverifikasi).
- `/app/prestasi`: daftar pengajuan prestasi mahasiswa, filter status, dan akses cepat ajukan/revisi/batalkan.
- `/app/prestasi/baru`: form pengajuan prestasi individu/kelompok dengan pilihan jenis & sub-lomba, peserta tim, keterangan poin, dan unggah 1–3 bukti privat.
- `/app/prestasi/:id`: detail pengajuan prestasi milik mahasiswa (bukti privat, keterangan poin/override, riwayat revisi & keputusan, tombol revisi penuh saat `perlu_perbaikan`, dan tombol batalkan saat `menunggu`).

## Rute admin terpadu (`/admin/*`, role `validator` dan `super_admin`)
Validator dan Super Admin digabung menjadi satu peran dan portal **Admin** dengan tata letak **Sidebar Kiri Accordion** (desktop tetap kiri dengan opsi collapse + top breadcrumb bar; mobile/tablet menggunakan slide-over drawer dari kiri) berisi 4 menu utama + sub-menu ber-lencana angka live:
- `/admin` (**Dashboard**): gabungan analitik peserta/prestasi institusi, filter & ekspor CSV terpadu, serta 6 kartu pintasan modul menuju tab pengelolaan lomba dan antrean validasi prestasi.
- `/admin/prestasi` (**Validasi Prestasi**) & `/admin/prestasi/:id`: sub-menu accordion di sidebar tersinkronisasi URL (`?status=menunggu|perlu_perbaikan|disetujui|ditolak|semua`) lengkap dengan badge angka live per status, pencarian nama/NIM/kegiatan, detail pemeriksaan bukti privat, jenis/sub-lomba, anggota kelompok, potensi duplikat, riwayat revisi/keputusan, kalkulasi poin rekomendasi + keterangan, panel keputusan (dengan input override poin + alasan wajib saat approve), dan modal koreksi keputusan pasca-persetujuan.
- `/admin/konten` (**Kelola Lomba**): sub-menu accordion di sidebar tersinkronisasi URL (`?tab=kompetisi|poin|roadmap|konsultan|seleksi`):
  - `?tab=kompetisi`: daftar, buat, edit penuh (termasuk jenis/sub-lomba, format individu/beregu, min/max anggota, status pendaftaran buka/tutup, tenggat seleksi internal, syarat peran & lintas prodi wajib/opsional, batas satu tim per cabang, jadwal, sumber/pedoman, aturan poin template/custom + keterangan), pratinjau, terbitkan, dan arsipkan.
  - `?tab=poin`: master jenis & sub-lomba serta pengaturan bobot poin khusus per perlombaan/sub-lomba.
  - `?tab=roadmap`: editor multi-fase & multi-tugas non-destruktif (mempertahankan progres mahasiswa).
  - `?tab=konsultan`: daftar, tambah, edit, persetujuan publikasi, dan arsip kontak konsultasi WA.
  - `?tab=seleksi`: catat & perbarui hasil seleksi internal untuk tim beregu maupun peserta individu (dropdown peserta, bukan input ID mentah).
- `/admin/sistem` (**Pengaturan Sistem**): sub-menu accordion di sidebar tersinkronisasi URL (`?tab=users|periods|points|audit|health`):
  - `?tab=users`: manajemen akun Admin & mahasiswa (tambah admin wajib nama asli `fullName`, ubah nama, suspend/aktifkan dengan konfirmasi dan pencabutan sesi instan).
  - `?tab=periods`: manajemen pergantian periode akademik (buat periode dengan tanggal mulai/akhir, pratinjau dampak aktivasi, konfirmasi, dan aktivasi atomik dengan pengarsipan target & tim lama).
  - `?tab=points`: manajemen template poin berversi dan matriks bobot standar default kampus.
  - `?tab=audit`: penelusuran jejak audit berpaginasi & terfilter (aksi, aktor bernamakan asli, tipe target).
  - `?tab=health`: telemetri kesehatan API, MySQL, RustFS, dan status antrean tanpa kebocoran kredensial.
- **Redirect kompatibilitas rute lama**: `/validator` → `/admin`, `/validator/konten` → `/admin/konten`, `/validator/prestasi` & `/verifikasi` → `/admin/prestasi`, `/validator/prestasi/:id` → `/admin/prestasi/:id`, `/super-admin` → `/admin/sistem`, dan `/super-admin/analitik` → `/admin`.

## Perilaku guard & build
- Pengunjung belum login yang mengakses rute terproteksi diarahkan ke `/masuk?redirect=...`.
- Pengguna yang **sudah login** tetapi tidak memiliki role yang diizinkan diarahkan ke `/403` (bukan `/masuk`).
- `RequireTarget` memeriksa kecocokan `:slug` terhadap target aktif mahasiswa.
- Build production memakai root `/` dan selalu mengunci adapter API tanpa mock/kartu demo; `build:demo` hanya untuk pratinjau demo (GitHub Pages menerima subpath dari `VITE_BASE_PATH`).

## Struktur repo aktual dan target Stage 6
~~~
frontend/
  src/app/                 router, provider, layouts, guards
  src/features/            modul domain per halaman
  src/components/          design system bersama
  src/services/            adapter API produksi dan adapter mock khusus dev/demo
  public/
  Dockerfile               (target Stage 6)
backend/
  src/app/                 bootstrap Elysia, middleware, route registration
  src/modules/             auth, profile, competitions, targets, matching, teams,
                           roadmaps, selections, achievements, dashboard, system, health
  src/lib/                 prisma, storage, storage-archive, audit, session, password, mailer, config
  prisma/                  schema dan migrations Prisma 7 + MariaDB adapter
  tests/                   unit & integration tests
  Dockerfile               (target Stage 6)
infra/                     skrip backup/restore, nginx proxy, docker-compose.yaml produksi (GHCR)
docs/                      spesifikasi, keputusan, bukti validasi, audit
tests/e2e/                 pengujian Playwright lintas peran
.env.example
AGENTS.md
TODO.md
~~~

Backend memisahkan handler HTTP (`index.ts`) dan aturan bisnis (`service.ts`). Kontrak HTTP terbaru terdokumentasi di `docs/16-kontrak-api.md`.
