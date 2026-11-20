# 13 — Peta jalan stage dan gate

Tidak ada tanggal janji rilis. Setiap stage berakhir dengan bukti yang dapat diperiksa; jika gagal, ulangi stage tersebut. TODO.md menyimpan checklist operasional.

| Stage | Hasil | Dependensi | Gate |
|---|---|---|---|
| D0 Dokumentasi | PRD, keputusan, kontrak, operasi dan QA selaras | jawaban pemilik produk | review silang tanpa kontradiksi |
| 1 Repo + desain | frontend/ dipindah aman, kerangka backend/, design system dan prototipe | D0 | build demo tetap jalan, UI prototipe diuji |
| 2 Fondasi | Elysia/Prisma/MySQL, akun manual, RBAC, seed, health | 1 | migrasi, auth, IDOR, reset, audit lulus |
| 3 Pembinaan | konten validator, target, matching, tim, roadmap, seleksi, kontak WA | 2 | J1 dan J3 lintas perangkat/periode lulus |
| 4 Prestasi | RustFS, submission/revisi, verifikasi, ledger poin, ranking | 3 | J2 dan J4 serta kasus serentak lulus |
| 5 Kematangan | dashboard, aksesibilitas, keamanan, observabilitas, backup | 4 | docs/18 dan gate kebijakan terpenuhi |
| 6 Distribusi | GHCR, Compose, staging, runbook, rollback | 5 | deploy dari root .env/pull/up berhasil |
| 7 Pilot | uji kampus, isi data resmi, alih operasi | 6 | pemilik produk menerima pilot, insiden/backup siap |

## Ketergantungan rinci
Skema periode dan edisi harus ada sebelum kompetisi berulang. Auth dan RBAC harus ada sebelum validator mengubah konten atau melihat bukti. Storage privat dan metadata upload harus ada sebelum prestasi nyata. Ledger poin dibuat setelah transisi verifikasi stabil. Ranking tidak boleh diaktifkan dengan data mock. CI images tidak menggantikan pengujian restore.

## Strategi perubahan
Stage 1 telah memindahkan frontend, memisahkan adapter mock/API, dan membentuk prototipe role final; bukti penutup ada di docs/19-validasi-stage-1.md. Stage 2 membuat backend dan kontrak API vertikal dari auth/profil; fitur berikutnya dipindah satu modul per kali dari mock ke API. Mock tetap hanya untuk demo/test. Staging memakai database dan bucket terpisah dari produksi.

## Exit menuju server kampus
Setelah pilot home server, audit data, perizinan brand/publikasi, kapasitas, backup, domain, serta sumber SSO. Migrasi host tidak mengubah definisi domain. Multi-kampus memerlukan rancangan isolasi dan persetujuan baru, bukan sekadar membuka filter institusi.
