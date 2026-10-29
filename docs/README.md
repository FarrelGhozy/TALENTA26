# TALENTA — Dokumentasi Rancangan Detail

> Sumber: `PRD_TALENTA.md` v1.0. Bahasa: Indonesia. Stack Tahap 1: Vite + React Router (FE + Mock). Runtime: Bun (`bun install` / `bun run` / `bunx`).

## Daftar Dokumen

| No | File | Isi |
|----|------|-----|
| 00 | `00-gambaran-umum.md` | Visi, tujuan, prinsip, glosarium, batasan jujur |
| 01 | `01-lingkup-tahapan.md` | Scope P0/P1/P2, In/Out, definisi MVP fix |
| 02 | `02-pengguna-akses.md` | Persona, 5 peran, matriks akses final usulan |
| 03 | `03-alur-pengguna.md` | User journey + state machine tiap alur |
| 04 | `04-sitemap.md` | Sitemap, rute React Router, guard per peran |
| 05 | `05-spesifikasi-fungsional.md` | Bedah FR-001 s/d FR-044 per modul |
| 06 | `06-spesifikasi-matching.md` | Algoritma matching transparan v1 (mock) |
| 07 | `07-spesifikasi-roadmap.md` | Template roadmap per kompetisi Belmawa |
| 08 | `08-spesifikasi-prestasi.md` | Formulir + workflow verifikasi |
| 09 | `09-spesifikasi-dashboard.md` | Indikator, definisi, query mock |
| 10 | `10-model-data-mock.md` | ERD + skema JSON mock + contoh |
| 11 | `11-spesifikasi-ui-mock.md` | Spec UI per halaman Tahap 1 (FE pecah komponen) |
| 12 | `12-nfr-keamanan.md` | NFR-001 s/d NFR-009 operasionalisasi |
| 13 | `13-peta-jalan.md` | Tahap 1 FE+Mock → Gate Fix → Tahap 2 Final |
| 14 | `14-keputusan-terbuka.md` | FIX FINAL v1.0 — semua Q terjawab, siap bangun |
| 15 | `15-env-mock-strategy.md` | FIX ENV: DEPLOYMENT vs PRODUCTION + USE_MOCK true/false + factory |
| Mock | `/mocks/*.json` + `/.env.example` | Dummy 8 user, 4 kompetisi, 3 tim, 4 prestasi + env demo/prod |

## Cara Baca

1. Baru mulai: baca `00` → `01` → `02` → `03`.
2. Mau bangun FE mock: baca `04` → `10` → `11` → `13` bagian Tahap 1.
3. Mau final BE: baca `05` → `06` → `08` → `09` → `13` bagian Tahap 2.

## Aturan Agen

Lihat `.opencode/AGENTS.md` di repo ini untuk aturan kerja agen (wajib dibaca sebelum coding).
