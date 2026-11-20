# 04 — Sitemap dan struktur repo tujuan

Status: fondasi struktur dan rute prototipe selesai pada Stage 1. Rute bertanda **target** baru diimplementasikan setelah backend tersedia.

## Rute publik
Sudah ada: `/` landing; `/kompetisi` katalog; `/kompetisi/:slug` detail; `/ranking` leaderboard; `/masuk` login demo/manual prototype; `/403` dan `/404`.

Target Stage 2+: `/daftar`, `/lupa-password`, dan `/reset-password`.

## Rute mahasiswa
Sudah ada: `/app/beranda`, `/app/profil`, `/app/partner`, `/app/tim`, `/app/kompetisi/:slug/persiapan`, `/app/prestasi`, dan `/app/prestasi/baru`.

Target Stage 3–4: `/app/target`, `/app/undangan`, `/app/prestasi/:id`, `/app/prestasi/:id/perbaiki`, dan `/app/pengaturan`.

## Rute validator
Sudah ada sebagai prototipe: `/validator`, `/validator/prestasi`, dan `/validator/prestasi/:id`.

Target Stage 3–5: `/validator/kompetisi` beserta buat/edit, `/validator/roadmap`, `/validator/konsultan`, `/validator/seleksi`, dan `/validator/laporan`.

## Rute super admin
Sudah ada sebagai prototipe: `/super-admin`, `/super-admin/analitik`, `/super-admin/design-system`, serta akses ke rute validator.

Target Stage 5: `/super-admin/pengguna`, `/super-admin/staf`, `/super-admin/role`, `/super-admin/periode`, `/super-admin/poin`, `/super-admin/audit`, dan `/super-admin/sistem`.

Route guard role dan fallback loading/error sudah ada untuk prototipe. Penanganan sesi kedaluwarsa dan batas API nyata menunggu Stage 2. Build production memakai root `/`; build demo Pages menerima subpath dari `VITE_BASE_PATH`.

## Struktur setelah Stage 1 dan target Stage 2
~~~
frontend/
  src/app/                 router, provider, layouts, guards
  src/features/            modul domain per halaman
  src/components/          design system bersama
  src/services/            client API dan mock khusus pengembangan
  public/
backend/
  src/app/                 bootstrap Elysia, middleware, route registration
  src/modules/             auth, users, competitions, teams, roadmaps,
                           achievements, verification, ranking, admin
  src/lib/                 db, storage, audit, errors, config
  prisma/                  schema dan migrations sesuai versi terkunci
  tests/
infra/                     proxy, contoh Compose dan operasi
docs/
compose.yaml
.env.example
AGENTS.md
TODO.md
~~~

Bagian frontend dan placeholder direktori sudah diterapkan pada Stage 1. Isi backend, Prisma, Compose, proxy, dan pengujian backend masih target Stage 2+. Backend kelak memakai modul domain dengan service dan repository; handler HTTP tidak menaruh aturan bisnis. Kontrak HTTP terdokumentasi di docs/16.
