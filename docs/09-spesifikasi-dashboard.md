# 09 — Spesifikasi Dashboard

## 1. Aturan Jujur (wajib di semua dashboard)
Header tiap dashboard tampilkan: `Cakupan: [Nama Institusi mock] • Periode: [2026-Ganjil mock] • Sumber: data mock lokal`. Dilarang klaim nasional.

## 2. Dashboard Mahasiswa (`/app/beranda`)
- Kartu: target kompetisi, status tim, progres roadmap %, prestasi menunggu/disetujui.
- Daftar tenggat ≤14 hari.
- CTA kontekstual: jika belum target → ke profil; jika tim belum terbentuk → ke partner.

## 3. Dashboard Admin Program (`/admin`)
| Indikator | Definisi mock | Sumber mock |
|---|---|---|
| Mahasiswa terdaftar | count users institutionId=inst-01 | users.json |
| Peserta per kompetisi | count profiles groupBy target | profiles.json |
| Tim terbentuk | count teams isFormed=true | teams.json |
| Pengajuan vs status | count achievements groupBy status | achievements.json |
| Terverifikasi per kategori/tingkat | count disetujui groupBy kategori, tingkat | achievements.json |
| Delegasi seleksi | count selections lolos | selections.json |
| Progres agregat | rata-rata checklist roadmap per kompetisi | localStorage mock agregat statis |

Tampilkan tabel recent: 5 pengajuan terbaru + 5 tim terbaru. Filter periode mock (dropdown statis 2026-Ganjil/Genap).

## 4. Dashboard Verifikator (`/verifikasi`)
- Angka: antrean menunggu, perlu_perbaikan, disetujui minggu ini, ditolak.
- Tidak tampilkan statistik institusi penuh (cukup antrean).

## 5. Komponen FE
```
features/dashboard/
  services-mock.ts (fungsi agregat pure)
  hooks/useStats.ts
  components/StatCards.tsx  RecentTables.tsx  ScopeBanner.tsx
```
Semua agregat fungsi pure agar mudah pindah ke BE Tahap 2. Query didokumentasikan di kode sebagai komentar `Tahap 2: ganti dengan GET /api/stats?...`.
