# 16 — Kontrak API

Endpoint produksi berada di `/api/v1` pada origin yang sama. JSON UTF-8; timestamp ISO 8601 UTC (validasi/tampilan tanggal `Asia/Jakarta`); ID opaque; pagination dan filter konsisten. Kontrak ini diselaraskan dengan Keputusan `K-15`–`K-23` (23 November 2026); seluruh rute legacy yang bertentangan atau rawan IDOR (`/users/:userId/target`, `/matching/invites`, `POST /competitions`) dicabut.

## Konvensi
Sukses: HTTP sesuai aksi dan body `{data, meta?}`. Gagal: `{error:{code,message,fieldErrors?,requestId}}` tanpa stack/SQL/rahasia. `401` belum login, `403` tak berwenang, `404` tak ditemukan/tak boleh diketahui, `409` konflik/versi, `422` validasi, `429` rate limit. Mutasi berbasis cookie memakai CSRF (`Origin`). Operasi rentan klik ganda memakai `idempotencyKey` dan/atau `version`. Respons tidak pernah memuat `passwordHash`, URL permanen bucket RustFS, atau PII lintas pengguna.

## Auth, profil, dan avatar
| Metode/rute | Aktor | Fungsi |
|---|---|---|
| `POST /auth/register` | publik | daftar mahasiswa manual (langsung `active`, NIM/email unik, `enrollmentYear` opsional) |
| `POST /auth/login` | publik | sesi cookie HttpOnly (token di-hash SHA-256 di DB) |
| `POST /auth/logout` | login | cabut sesi & hapus cookie |
| `GET /auth/me` | login | user (`id`, `email`, `fullName`, `role`, `status`, `institutionId`, `studentProfile`), dan `activePeriod` |
| `POST /auth/forgot-password` | publik | reset via SMTP tanpa enumerasi (production gagal tertutup tanpa SMTP) |
| `POST /auth/reset-password` | token | ganti password & cabut sesi lama |
| `GET / PATCH /me/profile` | mahasiswa | profil sendiri (`fullName`, `studyProgram`, `faculty`, `enrollmentYear`, `bio`, `skills`, `interests`, `availability`, `rolesCapable`, `experience`) |
| `POST /me/profile/avatar` | mahasiswa | unggah avatar multipart (JPEG/PNG/WebP maks 2 MB) ke RustFS privat |
| `GET /users/:id/avatar` | login | alirkan avatar privat melalui API terotorisasi (tidak tersedia di ranking publik) |
| `GET / POST /me/target` | mahasiswa | baca/atur target aktif periode berjalan (ganti target mengarsipkan target & tim lama secara atomik; memblokir bila tim terkunci seleksi) |
| `GET /me/targets/history` | mahasiswa | riwayat target lintas periode akademik |
| `GET /me/dashboard` | mahasiswa | ringkasan diri, progres roadmap, poin periode aktif, status pengajuan, dan `actionableSteps` dengan rute `/app/*` valid |

## Kompetisi, jenis/sub-lomba, aturan poin, dan pembinaan
Prefix `/admin` pada API adalah ruang kelola konten untuk `validator` dan `super_admin`; prefix `/system` khusus `super_admin`.

- **Publik (hanya konten `published`)**:
  - `GET /competitions` (filter `q`, `category`, `level`, `format`, `periodId`), `GET /competitions/:slug` (termasuk sub-lomba & ringkasan aturan poin), `GET /competitions/:slug/point-rules`, `GET /periods/current`, `GET /competition-categories` (jenis & sub-lomba aktif).
- **Kelola Konten Validator & Super Admin (`/admin/*`)**:
  - `GET / POST /admin/competitions` (daftar menyertakan `_count` untuk aturan poin khusus, tim, target mahasiswa, konsultan, seleksi, roadmap, serta ringkasan jumlah fase roadmap terbaru), `GET /admin/competitions/:id` (detail 1 kompetisi beserta relasi & ringkasan `_count` terisolasi per institusi), `PATCH /admin/competitions/:id` (lengkap dengan `requirements`, `scheduleTimeline`, `requiredRoles`, `level`, `format`, `min/maxTeamMembers`, `registrationStatus` `buka|tutup`, `internalSelectionDeadline`, `requireRoles`, `requireCrossStudyProgram`, `singleTeamPerCompetition`, `sourceUrl`, `pointDescription`), `POST /admin/competitions/:id/publish`, `POST /admin/competitions/:id/archive`, `GET /admin/competitions/:id/delete-preview` (ringkasan jumlah target, tim, roadmap, konsultan, seleksi, aturan poin khusus yang akan terhapus + jumlah input prestasi mahasiswa yang tetap dipertahankan), `DELETE /admin/competitions/:id` (hapus permanen lomba beserta seluruh data terkait lomba secara atomik kecuali `Achievement`/bukti/keputusan/`PointLedger` mahasiswa yang hanya dilepas tautan katalog/timnya, tercatat di `AuditEvent` `COMPETITION_DELETED`).
  - `GET / PUT /admin/competitions/:id/point-rules` (pilih template poin atau atur bobot custom per perlombaan/sub-lomba beserta keterangan poin).
  - `GET / POST / PATCH /admin/competition-categories` & `POST / PATCH /admin/competition-subcategories` (kelola jenis lomba & sub-lomba/cabang beserta keterangan poin default).
  - `GET / POST /admin/roadmaps/:slug` (simpan multi-fase & multi-tugas secara non-destruktif tanpa menghapus progres mahasiswa).
  - `GET / POST /admin/consultants`, `PATCH / DELETE /admin/consultants/:id` (kelola kontak WA, `capacityNote`, persetujuan publikasi, dan arsip).
  - `GET /admin/competitions/:id/participants` (daftar tim beregu & mahasiswa target individu untuk dropdown seleksi), `GET / POST /admin/selections` (mendukung `teamId` atau `userId`, `stage`, `result`, `organizerVerified`, `notes`; menyimpan `confirmedAt` & `validatorId`; lolos terkonfirmasi mengunci tim beregu).
- **Mahasiswa (rekrutmen tim, kode undangan & persiapan)**:
  - `GET /teams/my` (tim aktif lengkap dengan profil aman anggota, `leaderId`, evaluasi kesiapan 3 lapis `readiness`, status seleksi internal, serta — khusus ketua tim — `inviteCode` & daftar `joinRequests` berstatus `menunggu`).
  - `GET /teams/directory?competitionSlug=...&q=...&role=...` (direktori tim `terbuka` yang sedang merekrut pada kompetisi sama + `myRequestStatus`, nol PII).
  - `GET /me/join-requests` (riwayat pengajuan gabung milik mahasiswa saat ini).
  - `POST /teams` (buat ruang tim baru sebagai ketua: `competitionSlug`, `teamName`, `description?`, `neededRoles?`, `recruitmentType?`, `targetMaxMembers?`, `roleInTeam?`; menghasilkan `inviteCode` acak aman).
  - `PATCH /teams/:id` (khusus ketua: ubah nama, deskripsi, kebutuhan peran, `recruitmentType`, `isRecruiting`, `targetMaxMembers`) & `POST /teams/:id/invite-code/rotate` (khusus ketua: putar ulang kode undangan).
  - `POST /teams/:id/join-requests` (ajukan bergabung ke tim terbuka: `preferredRole?`, `note?`), `POST /join-requests/:id/cancel` (pelamar batalkan), `POST /join-requests/:id/decide` (khusus ketua: `{ action: 'disetujui' | 'ditolak' }` dengan row lock `FOR UPDATE`).
  - `POST /teams/join-by-code` (gabung langsung via `{ inviteCode }` dengan row lock `FOR UPDATE` & cek konflik target/tim).
  - `POST /teams/:id/members/:userId/remove` (khusus ketua: keluarkan anggota sebelum `terkunci_seleksi`), `POST /teams/:id/leave` (keluar tim; bila ketua keluar otomatis transfer ke anggota terlama atau arsipkan bila sendirian), `POST /teams/:id/register-selection` (khusus ketua saat `readiness.isSelectionReady`: buat entri `InternalSelection` status `menunggu`).
  - `GET /students/directory` (pencarian rekan mahasiswa satu institusi minimal nama+prodi untuk memilih anggota kelompok prestasi). *(Endpoint lama `/matching/candidates`, `/teams/:id/invites`, `/me/invites`, `/invites/:id/*` dipertahankan sementara untuk kompatibilitas riwayat/tes tetapi tidak dipakai sebagai alur utama UI mahasiswa).*
  - `GET /roadmaps/:slug` (hanya bila kompetisi `published`), `GET /roadmaps/:slug/checklist` (milik user sesi, tanpa `?userId=`), `PUT /me/roadmap-progress/:taskId`.
  - `GET /consultants?slug=...` (hanya kontak `published` & `isApproved` milik kompetisi `published`).

## Prestasi, bukti privat, verifikasi, dan override poin
- **Mahasiswa**:
  - `GET /me/achievements` (filter `status`), `GET /me/achievements/:id` (termasuk anggota kelompok, bukti aktif, riwayat revisi/keputusan, keterangan poin & override).
  - `POST /me/achievements` (multipart: `nama`, `penyelenggara`, `kategori`, `competitionSlug?`, `categoryId?`, `subCategoryId?`, `subCompetitionName?`, `tingkat`, `jenisCapaian`, `tanggal`, `deskripsi?`, `participationType` `individu|kelompok`, `teamId?`, `participantUserIds[]?`, `dariSeleksiInternal`, dan 1–3 berkas `evidence` maks 8 MB). Status awal `menunggu` *(endpoint draft ditunda per K-17)*.
  - `POST /me/achievements/:id/revisions` (revisi penuh semua field + opsi `replaceEvidenceIds[]` & unggah berkas baru; bukti lama ditandai non-aktif namun tetap tercatat untuk audit).
  - `POST /me/achievements/:id/cancel` (pemilik membatalkan pengajuan berstatus `menunggu` menjadi `dibatalkan`).
  - `GET /evidence/:id/download` (streaming privat melalui API setelah cek otorisasi pemilik/anggota kelompok/validator/super admin).
- **Validator & Super Admin**:
  - `GET /admin/achievements` (filter `status`, `periodId`, `category`, `level`, `q` termasuk nama/NIM mahasiswa), `GET /admin/achievements/:id` (detail lengkap + potensi duplikat + anggota kelompok + kalkulasi poin rekomendasi & sumber aturan/keterangannya + riwayat revisi & keputusan).
  - `POST /admin/achievements/:id/decisions` (hanya sah untuk status `menunggu`; body: `action: approve | request_changes | reject`, `reason?`, `version` wajib, `idempotencyKey?`, `overridePoints?`, `overrideReason?`). Bila `overridePoints` diisi saat `approve`, `overrideReason` wajib diisi. Persetujuan mencatat poin penuh di `PointLedger` untuk pengaju atau seluruh anggota kelompok secara atomik.
  - `POST /admin/achievements/:id/corrections` (hanya untuk status `disetujui`; body: `reason` wajib, `version` wajib, `targetStatus: ditolak | perlu_perbaikan`; membalik seluruh award aktif anggota terkait secara atomik).
  - `GET /admin/dashboard` (statistik terfilter `periodId`, termasuk peserta per kompetisi & delegasi seleksi terkonfirmasi) dan `GET /admin/export` (CSV UTF-8 BOM aman formula injection dengan filter `status`, `academicPeriodId`, `category`).

## Ranking dan sistem super admin
- **Publik & Civitas Terotorisasi**:
  - `GET /ranking?periodId=...` (nama tampilan, prodi, poin, posisi, jumlah Juara 1 unik, prestasi sah unik, metadata periode; tanpa `periodId` dan tanpa periode aktif wajib kosong; pada akses publik tanpa sesi tidak mengirim `avatarUrl`/NIM/email/WA; pada sesi terautentikasi satu institusi menyertakan `avatarUrl` privat `/api/v1/users/:id/avatar?v=...` dengan header `Vary: Cookie, Authorization` dan `Cache-Control: private, no-store`).
  - `GET /ranking/lifetime` (akumulasi sepanjang waktu terpisah dengan aturan visibilitas avatar yang sama).
- **Super Admin (`/system/*`)**:
  - `GET /system/users` (paginasi + filter `role`, `status`, `q`), `POST /system/users/staff` (wajib `fullName`, `email`, `password`, `role`), `PATCH /system/users/:id/role` (mencabut sesi target & melarang downgrade super admin terakhir), `PATCH /system/users/:id/status` (suspend langsung cabut sesi & melarang suspend diri sendiri).
  - `GET / POST /system/academic-periods`, `GET /system/academic-periods/:id/activation-preview` (jumlah target & tim aktif periode lama yang akan diarsipkan), `POST /system/academic-periods/:id/activate` (aktivasi & arsip atomik periode lama).
  - `GET / POST /system/point-templates` & `GET /system/point-rules`, `POST /system/point-rules/version` (template & versi bobot poin dengan nama/keterangan).
  - `GET /system/audit-logs` (paginasi + filter `action`, `actorId`, `targetType`; menampilkan nama asli aktor).
  - `GET /system/health` (status nyata MySQL, tipe & ketersediaan storage, memori, uptime, antrean tanpa kredensial).
- **Internal**: `GET /health/live` dan `GET /health/ready` (mengecek konektivitas MySQL & storage pada produksi tanpa data sensitif).

## Batas data
Achievement response tidak berisi URL bukti permanen maupun `passwordHash`. Objek mutable mempunyai `version`/`updatedAt`. Setiap list publik/admin punya `limit` dan `page`/`cursor` yang jelas. Otorisasi objek dan filter `institutionId` dijalankan sebelum serialisasi.
