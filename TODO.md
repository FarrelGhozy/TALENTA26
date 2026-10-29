# TODO — TALENTA (FIX, siap eksekusi)

> Rancangan fix v1.0 (2026-10-29). ENV kapital: `DEPLOYMENT` | `PRODUCTION`. Mock switch: `VITE_USE_MOCK=true|false`. Runtime: **Bun saja** (`bun install` / `bun run` / `bunx`), tanpa npm.

## Tahap 0 — Init (Selesai ✓)
- [x] Init Vite react-ts
- [x] Install: `react-router-dom`, `@tailwindcss/vite`, `tailwindcss`, `lucide-react`
- [x] Setup `.env.example` & `.env` (`VITE_APP_ENV=DEPLOYMENT`, `VITE_USE_MOCK=true`)
- [x] Buat struktur rapi `src/app, features/*, components/ui, lib, mocks, config, services` (file ≤150 baris)
- [x] Copy `/mocks/*.json` → `src/mocks/` + buat `src/config/env.ts` + `services/factory.ts`
- [x] Verifikasi: `bun run build` sukses (DEPLOYMENT & PRODUCTION)

## Tahap 1 — FE + Mock (`DEPLOYMENT + true`) (Selesai ✓)
- [x] Sprint 1 Kerangka+Publik: router, layouts, UI kit, `/`, `/kompetisi`, `/kompetisi/:slug`, login card 4 akun peran demo (DEPLOYMENT), form login (PRODUCTION), DemoBanner tanpa switcher peran di navbar
- [x] Sprint 2 Mahasiswa inti: `/app/profil` (stepper 3 langkah), `/app/partner` (skor matching, popover alasan transparan, undang/terima), `/app/tim` + `lib/matchScore.ts` + `teamRules.ts` + keluar tim modal
- [x] Sprint 3 Persiapan+Prestasi: `/app/kompetisi/:slug/persiapan` (roadmap checklist mandiri, tenggat waktu, konsultan WA verified only, `AiBoxMock` badge simulasi), `/app/prestasi` & `/baru` (form prestasi mandiri & seleksi internal, simulasi bukti)
- [x] Sprint 4 Admin+Verifikasi+Dashboard: `/admin` (dashboard indikator institusi, ScopeBanner, distribusi kompetisi), `/verifikasi` & `/verifikasi/:id` (antrean tab, DecisionPanel alasan wajib jika tolak/perbaikan)
- [x] Sprint 5 Polish: EmptyState terpadu, guard RequireRole & RequireTarget, disclaimer kejujuran sistem, build produksi 100% lulus tanpa error

## Gate Fix
- [ ] Demo J1 (profil→partner→tim→roadmap) + J2 (prestasi mandiri) + J3 (verifikasi) <10 mnt
- [ ] Kunci `docs/14` (sudah FIX, tinggal tandatangan) + freeze docs → tag `v0-mock-fix`

## Tahap 2 — Final (`PRODUCTION + false`, setelah Gate)
- [ ] Ganti `services/mock` → `services/api` real (interface sama, tanpa ubah hooks)
- [ ] Auth real (form login → JWT), RBAC BE, upload storage, audit verifikasi
- [ ] Reminder + progres BE (P1), multi-kampus + analitik (P2) terpisah
- [ ] Build: `VITE_APP_ENV=PRODUCTION VITE_USE_MOCK=false bun run build`
- [ ] Cek: `bun run typecheck` + `bun run lint` harus bersih sebelum commit

## File Acuan
- ENV: `docs/15-env-mock-strategy.md`, `.env.example`
- Keputusan fix: `docs/14-keputusan-terbuka.md`
- Aturan agen: `.opencode/AGENTS.md`
- Dummy: `/mocks/*.json` (8 user, 4 kompetisi, 3 tim, 4 prestasi)
