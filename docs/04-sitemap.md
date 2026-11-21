# 04 — Sitemap dan struktur repo tujuan

Status: diselaraskan dengan Keputusan K-22 (21 November 2026). Rute operasional memakai struktur tab ringkas dengan sinkronisasi query parameter `?tab=...` agar navigasi antar-area tetap jelas, dapat di-bookmark, dan konsisten antara desktop serta mobile.

## Rute publik
- `/` landing; `/kompetisi` katalog (pencarian, kategori/jenis, tingkat, format, periode); `/kompetisi/:slug` detail (termasuk sub-lomba & keterangan aturan poin); `/ranking` leaderboard (periode aktif & lifetime); `/masuk` login manual (kartu peran instan hanya ada di mode dev/demo, tidak masuk bundle produksi); `/daftar` registrasi manual mahasiswa; `/lupa-password` & `/reset-password` pemulihan sandi SMTP; `/403` dan `/404`.

## Rute mahasiswa (`/app/*`, role `mahasiswa`)
- `/app/beranda`: ringkasan progres, target aktif, tim, roadmap, pengajuan, poin periode berjalan, dan rekomendasi aksi nyata (`GET /me/dashboard`).
- `/app/profil`: identitas (termasuk upload avatar privat RustFS, NIM status belum terverifikasi kampus), minat/keahlian/pengalaman, dan pengaturan target kompetisi (dengan konfirmasi arsip tim lama bila mengganti target).
- `/app/partner`: tab `?tab=rekomendasi` (rekomendasi calon partner untuk lomba beregu, bukan lomba individu) dan `?tab=undangan` (undangan masuk/keluar termasuk pembatalan undangan keluar).
- `/app/tim`: buat tim, daftar anggota, status tim (`mencari`, `terbentuk`, `terkunci_seleksi`), indikator saran peran/lintas prodi, dan keluar tim (terblokir bila terkunci seleksi).
- `/app/kompetisi/:slug/persiapan`: ruang persiapan mandiri (roadmap terbit, progres checklist, jadwal, dan kontak konsultasi WA terverifikasi).
- `/app/prestasi`: daftar pengajuan prestasi mahasiswa, filter status, dan akses cepat ajukan/revisi/batalkan.
- `/app/prestasi/baru`: form pengajuan prestasi individu/kelompok dengan pilihan jenis & sub-lomba, peserta tim, keterangan poin, dan unggah 1–3 bukti privat.
- `/app/prestasi/:id`: detail pengajuan prestasi milik mahasiswa (bukti privat, keterangan poin/override, riwayat revisi & keputusan, tombol revisi penuh saat `perlu_perbaikan`, dan tombol batalkan saat `menunggu`).

## Rute validator (`/validator/*`, role `validator` dan `super_admin`)
- `/validator`: ringkasan operasional, antrean verifikasi, filter periode, dan kartu pintasan yang terhubung langsung ke tab konten terkait (`?tab=...`).
- `/validator/konten`: ruang pengelolaan konten terpadu berbasis tab tersinkronisasi URL:
  - `?tab=kompetisi`: daftar, buat, edit penuh (termasuk jenis/sub-lomba, aturan tim, syarat, jadwal, sumber, aturan poin template/custom + keterangan), pratinjau, terbitkan, dan arsipkan.
  - `?tab=roadmap`: editor multi-fase & multi-tugas non-destruktif (mempertahankan progres mahasiswa).
  - `?tab=konsultan`: daftar, tambah, edit, persetujuan publikasi, dan arsip kontak konsultasi WA.
  - `?tab=seleksi`: catat & perbarui hasil seleksi internal untuk tim beregu maupun peserta individu (dropdown peserta, bukan input ID mentah).
- `/validator/prestasi`: antrean pengajuan dengan filter status, periode, kategori/jenis, tingkat, pencarian nama/NIM/kegiatan, serta ekspor CSV terfilter.
- `/validator/prestasi/:id`: detail pemeriksaan bukti privat, jenis/sub-lomba, anggota kelompok, potensi duplikat, riwayat revisi/keputusan, kalkulasi poin rekomendasi + keterangan, panel keputusan (dengan input override poin + alasan wajib saat approve), dan modal koreksi keputusan pasca-persetujuan.

## Rute super admin (`/super-admin/*`, role `super_admin`, plus akses penuh `/validator/*`)
- `/super-admin`: pusat kendali berbasis tab tersinkronisasi URL:
  - `?tab=staf`: manajemen pengguna & staf (tambah staf wajib nama asli `fullName`, ubah peran, suspend/aktifkan dengan konfirmasi dan pencabutan sesi instan).
  - `?tab=periode`: manajemen pergantian periode akademik (buat periode dengan tanggal mulai/akhir, pratinjau dampak aktivasi, konfirmasi, dan aktivasi atomik dengan pengarsipan target & tim lama).
  - `?tab=poin`: manajemen template poin berversi, master jenis & sub-lomba, serta pengaturan bobot poin default/keterangan.
  - `?tab=audit`: penelusuran jejak audit berpaginasi & terfilter (aksi, aktor bernamakan asli, tipe target).
  - `?tab=sistem`: telemetri kesehatan API, MySQL, RustFS, dan status antrean tanpa kebocoran kredensial.
- `/super-admin/analitik`: ringkasan analitik peserta per kompetisi, delegasi terkonfirmasi, sebaran prestasi, dan ekspor CSV terfilter.
- `/super-admin/design-system`: rujukan komponen antarmuka (hanya jalur internal/pengembangan).

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
infra/                     skrip backup/restore, konfigurasi reverse proxy (Stage 6)
docs/                      spesifikasi, keputusan, bukti validasi, audit
tests/e2e/                 pengujian Playwright lintas peran
compose.yaml               (target Stage 6)
.env.example
AGENTS.md
TODO.md
~~~

Backend memisahkan handler HTTP (`index.ts`) dan aturan bisnis (`service.ts`). Kontrak HTTP terbaru terdokumentasi di `docs/16-kontrak-api.md`.
