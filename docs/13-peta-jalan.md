# 13 — Peta Jalan: Tahap 1 FE+Mock → Gate Fix → Tahap 2 Final

## Tahap 0 — Siap (0.5–1 hari)
- [ ] Kunci `14-keputusan-terbuka.md` versi sementara untuk mock.
- [ ] Init Vite: `bun create vite@latest talenta-web -- --template react-ts`, tambah `react-router-dom`, tailwind opsional, vitest.
- [ ] Terapkan struktur folder `04-sitemap.md` + copy `10-model-data-mock.md` jadi JSON awal.

## Tahap 1 — FE + Mock (fokus, tanpa BE)
**Sprint 1 — Kerangka + Publik:** router, layouts, ui kit, `/`, `/kompetisi`, `/kompetisi/:slug`, mocks kompetisi+konsultan.
**Sprint 2 — Mahasiswa inti:** `/app/profil`, `/app/partner`, `/app/tim` + `matchScore.ts` + `teamRules.ts` + invites localStorage.
**Sprint 3 — Persiapan + Prestasi:** roadmap checklist + konsultan WA + form prestasi + riwayat.
**Sprint 4 — Admin + Verifikasi + Dashboard:** `/admin/*`, `/verifikasi/*`, agregat dashboard, scope banner, label Mock/Rencana.
**Sprint 5 — Polish demo:** skeleton, toast, empty state, `bun run build` bersih, skenario demo 5 menit.

Aturan Tahap 1: dilarang fetch BE real, dilarang klaim AI aktif, 1 file ≤150 baris, tiap fitur ada EmptyState.

## Gate Fix (bersama kamu)
Demo klik-penuh J1+J2+J3. Checklist lolos:
- [ ] Alur dipahami tanpa penjelasan panjang.
- [ ] Keputusan `14` sudah final (aturan tim, status prestasi, konsultasi masuk P0?).
- [ ] Daftar revisi UI ditutup.
Hasil: tag `v0-mock-fix` + freeze `docs/`.

## Tahap 2 — Final (baru setelah Gate)
1. BE + DB ikut skema `10` (ganti services-mock → fetch real, simpan interface).
2. Auth real + RBAC + upload storage.
3. Verifikasi + audit + notifikasi.
4. Reminder + lacak progres (P1) jika disetujui.
5. Multi-kampus + analitik (P2) terpisah.
Dilarang mulai Tahap 2 sebelum Gate Fix ditandatangani.

## Estimasi Kasar (fleksibel)
Tahap 1: 2–3 minggu 1 dev (mock). Gate: 1 sesi. Tahap 2: 4–8 minggu tergantung BE pilihan (belum diputuskan di PRD).
