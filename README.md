# TALENTA UNIDA Gontor — Platform Pembinaan & Prestasi Mahasiswa

Aplikasi web untuk perjalanan mahasiswa: isi profil → pilih target kompetisi →
cari partner tim → persiapan roadmap → ajukan prestasi → verifikasi → dashboard admin.

> Status saat ini: **Tahap 1 — Frontend + Mock selesai.** Backend belum ada,
> semua data berasal dari `src/mocks/*.json` + `localStorage`.

## Teknologi

- React 19 + TypeScript + Vite 8
- React Router DOM 7, Tailwind CSS 4, Lucide React
- Runtime package manager: **Bun** (jangan pakai npm/yarn untuk proyek ini)

## Prasyarat

- **Bun ≥ 1.x** — cek dengan `bun --version`
  - Install: https://bun.sh (`curl -fsSL https://bun.sh/install | bash`)
- Git

Tidak perlu database / backend untuk menjalankan mode default (mock).

## Cara Menjalankan (5 menit)

```bash
# 1. Clone
git clone https://github.com/FarrelGhozy/TALENTA26.git
cd TALENTA26

# 2. Install dependensi
bun install

# 3. Siapkan env (wajib, sekali saja)
cp .env.example .env

# 4. Jalankan dev server
bun run dev

# 5. Buka di browser
# http://localhost:5173
```

Berhentikan server dengan `Ctrl + C`.

## Konfigurasi `.env`

File `.env` tidak di-commit (lihat `.gitignore`). Template yang di-commit adalah `.env.example`.

| Variabel | Nilai default | Arti |
|---|---|---|
| `VITE_APP_ENV` | `DEPLOYMENT` | `DEPLOYMENT` = mode demo (login 1-klik). `PRODUCTION` = mode form email+password |
| `VITE_USE_MOCK` | `true` | `true` = data dari `src/mocks/*.json`. `false` = data dari backend (Tahap 2, belum tersedia) |
| `VITE_API_BASE_URL` | `http://localhost:3000/api` | Hanya dipakai kalau `VITE_USE_MOCK=false` |

Kombinasi resmi:

| Kombinasi | Dipakai untuk |
|---|---|
| `DEPLOYMENT` + `true` | **Default.** Demo ke dosen / eksplorasi fitur |
| `PRODUCTION` + `true` | Uji tampilan production, data tetap mock (login form, password `demo123`) |
| `PRODUCTION` + `false` | Tahap 2 (backend real). Belum bisa dipakai sekarang |

> `DEPLOYMENT` + `false` tidak dipakai / dilarang.

## Akun Demo (mode mock)

Buka `http://localhost:5173/masuk`.

**Mode `DEPLOYMENT`** — klik salah satu kartu peran (tanpa password):

| Peran | Nama | User ID |
|---|---|---|
| Mahasiswa (Riset/PKM) | Andi Pratama | `u-01` |
| Mahasiswa (Desain/GEMASTIK) | Rina Kartika | `u-02` |
| Admin Program | Budi Santoso | `u-10` |
| Verifikator | Dr. Sari Verifikator | `u-11` |

**Mode form login** (tab "Login Akun Kampus" / `PRODUCTION` + `true`):

| Email | Password | Peran |
|---|---|---|
| `andi@mock.ac.id` | `demo123` (bebas, dicek lokal) | mahasiswa |
| `rina@mock.ac.id` | `demo123` | mahasiswa |
| `admin@mock.ac.id` | `demo123` | admin_program |
| `verif@mock.ac.id` | `demo123` | verifikator |

Daftar lengkap 8 user mock ada di `src/mocks/users.json`.

## Script yang Tersedia

| Perintah | Fungsi |
|---|---|
| `bun run dev` | Dev server + hot reload |
| `bun run build` | Typecheck (`tsc`) + build produksi ke `dist/` |
| `bun run preview` | Pratinjau hasil `dist/` secara lokal |
| `bun run typecheck` | Cek tipe saja (`tsc --noEmit`) |
| `bun run lint` | Lint dengan `oxlint` |

Sebelum commit, pastikan keduanya bersih:

```bash
bun run typecheck
bun run lint
```

## Alur Coba Cepat (< 10 menit)

1. Login sebagai **Andi (mahasiswa)** → `/app/profil` isi 3 langkah → pilih target kompetisi.
2. Buka `/app/partner` → lihat skor matching + alasan transparan → kirim/terima undangan.
3. Buka `/app/tim` → cek status tim terbentuk.
4. Buka `/app/kompetisi/:slug/persiapan` → checklist roadmap + tenggat + konsultan WA terverifikasi.
5. Buka `/app/prestasi/baru` → ajukan prestasi mandiri.
6. Logout → login sebagai **Verifikator** → `/verifikasi` → setujui / minta perbaikan (alasan wajib).
7. Logout → login sebagai **Admin** → `/admin` → lihat dashboard institusi.

Rute publik (tanpa login): `/` (landing), `/kompetisi`, `/kompetisi/:slug`, `/masuk`.

## Struktur Proyek

```
src/
  app/            # router, guards, layouts, error pages
  features/       # landing, auth, kompetisi, profil, matching, tim,
                  # roadmap, prestasi, verifikasi, dashboard, mahasiswa
  components/     # ui (Button, Card, Modal, ...) + common (Navbar, Footer, ...)
  services/       # types + factory (mock vs api) + mock/ + api/
  mocks/          # data JSON demo (users, competitions, teams, ...)
  lib/            # matchScore, teamRules, storage, format
  config/env.ts   # baca VITE_APP_ENV / VITE_USE_MOCK
docs/             # spesifikasi (00–15), keputusan terbuka, strategi env/mock
mocks/            # salinan mentah JSON mock
PRD_TALENTA.md    # product requirements
TODO.md           # status tahapan pengerjaan
```

Aturan main: halaman/fitur hanya memanggil `services/factory.ts`, tidak import
`mocks/` langsung. Ganti mock → API real cukup di layer `services/` (Tahap 2).

## Build Produksi

```bash
# Demo (saat ini)
VITE_APP_ENV=DEPLOYMENT VITE_USE_MOCK=true bun run build

# Uji tampilan production dengan data mock
VITE_APP_ENV=PRODUCTION VITE_USE_MOCK=true bun run build

# Backend real (Tahap 2, setelah API siap)
VITE_APP_ENV=PRODUCTION VITE_USE_MOCK=false bun run build
```

Hasil ada di `dist/` (di-ignore git). Jalankan lokal dengan `bun run preview`.

## Troubleshooting

| Gejala | Solusi |
|---|---|
| `bun: command not found` | Install Bun dulu, restart terminal |
| Port `5173` sudah dipakai | `bun run dev -- --port 5174` |
| Halaman putih / env tidak kebaca | Pastikan file `.env` ada (hasil `cp .env.example .env`), lalu restart `bun run dev` |
| `VITE_APP_ENV` lowercase (`deployment`) | Wajib kapital: `DEPLOYMENT` atau `PRODUCTION` |
| Login gagal "Email tidak terdaftar" | Pakai email dari tabel demo di atas, cek `src/mocks/users.json` |
| Redirect ke `/masuk` terus | Logout lalu login ulang dengan peran yang sesuai (guard `RequireRole`) |
| `bun install` error / lockfile aneh | Hapus `node_modules`, lalu `bun install` ulang. Jangan commit `node_modules/` |
| Perlu reset data mock lokal | Hapus key `talenta-*` di DevTools → Application → Local Storage, lalu refresh |

## Dokumen Lanjutan

- `PRD_TALENTA.md` — kebutuhan produk lengkap
- `TODO.md` — status sprint & gate Tahap 2
- `docs/15-env-mock-strategy.md` — strategi ENV + mock (wajib baca sebelum ubah `services/`)
- `docs/14-keputusan-terbuka.md` — keputusan yang belum final (matching, AI, verifikasi, dashboard)
