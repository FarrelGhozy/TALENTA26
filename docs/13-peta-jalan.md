# 13 — Peta jalan stage dan gate

Tidak ada tanggal janji rilis. Setiap stage berakhir dengan bukti yang dapat diperiksa; jika gagal, ulangi stage tersebut. TODO.md menyimpan checklist operasional.

| Stage | Hasil | Dependensi | Gate |
|---|---|---|---|
| D0 Dokumentasi | PRD, keputusan (`K-01`–`K-22`), kontrak API, model data, operasi, QA, dan TODO selaras | jawaban pemilik produk | review silang tanpa kontradiksi |
| 1 Repo + desain | frontend/ dipindah aman, kerangka backend/, design system dan prototipe | D0 | build demo tetap jalan, UI prototipe diuji |
| 2 Fondasi | Elysia/Prisma/MySQL, akun manual, RBAC, seed, health | 1 | migrasi, auth, IDOR, reset, audit lulus |
| 3 Pembinaan | konten validator, target, matching, tim, roadmap, seleksi, kontak WA | 2 | J1 dan J3 lintas perangkat/periode lulus |
| 4 Prestasi | RustFS, submission/revisi, verifikasi, ledger poin, ranking | 3 | J2 dan J4 serta kasus serentak lulus |
| 5 Kematangan & Penutupan Audit (Fase 1–3) | patch kritis keamanan/poin/crash, fitur `K-15`–`K-22` (poin 3 lapis, sub-lomba, override validator, tim, avatar RustFS, nama staf, pergantian periode), UI bersih & aksesibilitas, backup/restore | 4 + D0 v2.1 | seluruh kriteria docs/18 lulus; nol temuan kritis terbuka |
| 6 Distribusi (Fase 4) | GHCR public, Compose (`web`/`api`/`migrate`), proxy same-origin, staging, runbook, rollback | 5 | deploy dari root `.env` + `docker compose pull` + `up -d` berhasil; rollback teruji |
| 7 Pilot | uji kampus, isi data resmi, alih operasi | 6 | pemilik produk menerima pilot, insiden/backup siap |

## Ketergantungan rinci
Skema periode dan edisi harus ada sebelum kompetisi berulang. Auth dan RBAC harus ada sebelum validator mengubah konten atau melihat bukti. Storage privat dan metadata upload harus ada sebelum prestasi dan avatar nyata. Seluruh dokumentasi keputusan `K-15`–`K-22` (Fase 0) diselaraskan sebelum perubahan kode sistem pada Fase 1–4. Patch kritis keamanan/poin/crash (Fase 1) wajib ditutup sebelum membangun fitur baru (Fase 2) dan sebelum image GHCR/Compose (Stage 6). Ranking tidak boleh diaktifkan dengan data mock. CI images tidak menggantikan pengujian restore.

## Strategi perubahan
Stage 1 telah memindahkan frontend, memisahkan adapter mock/API, dan membentuk prototipe role final; bukti penutup ada di docs/19-validasi-stage-1.md. Stage 2 membuat backend dan kontrak API vertikal dari auth/profil; fitur berikutnya dipindah satu modul per kali dari mock ke API. Mock tetap hanya untuk demo/test. Staging memakai database dan bucket terpisah dari produksi.

## Exit menuju server kampus
Setelah pilot home server, audit data, perizinan brand/publikasi, kapasitas, backup, domain, serta sumber SSO. Migrasi host tidak mengubah definisi domain. Multi-kampus memerlukan rancangan isolasi dan persetujuan baru, bukan sekadar membuka filter institusi.
