# AGENTS.md — Aturan Agen TALENTA

> Lokasi: `.opencode/AGENTS.md` (sesuai permintaan: di dalam `.opencode`). Stack: Vite + React Router. Docs: Indonesia di `docs/`.

## 1. Sumber Kebenaran
1. `PRD_TALENTA.md` = acuan produk. Jangan tambah teknologi/target/kebijakan di luar PRD sebagai keputusan final.
2. `docs/` = rancangan detail. Jika konflik, tanya user, jangan diam-diam ubah PRD.
3. Tahap berjalan: **Tahap 1 FE + Mock** sampai ada tag `v0-mock-fix`. Dilarang bangun BE/auth real sebelum Gate.

## 2. Struktur FE Wajib (Vite + React Router)
```
src/app/router.tsx  src/app/guards.tsx  src/app/layouts/
src/features/{profil,kompetisi,matching,roadmap,prestasi,dashboard,konsultasi}/
  components/  hooks/  services-mock.ts  types.ts
src/components/ui/  src/mocks/*.json  src/lib/  src/styles/
```
- 1 file ≤150 baris. 1 komponen 1 tugas.
- Halaman hanya layout + hooks; logika di hooks/services; skor/aturan di `lib/matchScore.ts`, `lib/teamRules.ts`.
- Dilarang import antar-features langsung. Pakai `lib/` atau props.
- Router: `createBrowserRouter` + `lazy()` per page. Guard: `RequireRole`, `RequireTarget`.

## 3. Aturan ENV & Mock (FIX)
- ENV wajib: `VITE_APP_ENV` (DEPLOYMENT|PRODUCTION, kapital) + `VITE_USE_MOCK` (true|false). Lihat `docs/15-env-mock-strategy.md` + `.env.example`.
- `DEPLOYMENT` = login card peran tanpa password. Tanpa RoleSwitcher di navbar — ganti peran via logout lalu pilih card di `/masuk`. Ada badge `Demo` di navbar. `PRODUCTION` = form email+password (mock terima demo123 saat USE_MOCK=true, JWT saat false).
- `USE_MOCK=true` → via `services/mock/*` baca `src/mocks/*.json` (copy dari `/mocks/` root). `false` → via `services/api/*` ke `VITE_API_BASE_URL`. Page/hooks hanya panggil `services/factory.ts`, dilarang import mock langsung.
- Semua entity wajib `institutionId` (default `inst-01`).
- Label wajib: `Mock` untuk data lokal, `Simulasi` untuk matching periodik, `Rencana` untuk AI.
- Dilarang klaim AI aktif, statistik nasional, WA belum verified, upload real.
- Fungsi agregat dashboard pure agar mudah pindah ke BE. Komentari `Tahap 2: ganti dengan GET /api/...`.

## 4. Gaya Kode & Docs
- Bahasa UI + docs Indonesia. Kode Inggris untuk identifiers.
- Validasi inline bahasa jelas. Setiap list kosong → `EmptyState` + CTA.
- Status prestasi hanya: `menunggu, perlu_perbaikan, disetujui, ditolak`. Hanya `disetujui` dihitung.
- Skor matching tampil + alasan, plus footer `Bukan peringkat kemampuan`.
- Commit kecil per fitur. Sebelum selesai: `bun run build` + `bun run typecheck` harus sukses. Runtime wajib Bun (`bun install`, `bun run`, `bunx`); dilarang pakai npm/npx.

## 5. Workflow
- Tahap 1 default: `DEPLOYMENT + USE_MOCK=true`. Bangun sesuai `docs/04,10,11,15`. `/mocks/` root adalah kontrak; FE copy ke `src/mocks/`.
- Jangan mulai `PRODUCTION + USE_MOCK=false` (BE real) tanpa instruksi eksplisit user setelah Gate.
- Saat ragu antara kecepatan vs kerapian: pilih rapi + pecah file (permintaan user).

## 6. Larangan
- Jangan buat file di luar `docs/`, `src/`, `.opencode/` tanpa izin.
- Jangan tambah dependensi berat tanpa izin (cukup react-router-dom + css ringan + vitest).
- Jangan tampilkan data sensitif mock sebagai real (NIM/kontak penuh hanya setelah tim terbentuk).
