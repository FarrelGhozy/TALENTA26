# 23 — Bukti validasi Stage 5

**Catatan audit 21 November 2026:** Dokumen ini menyimpan laporan historis. Klaim pemenuhan seluruh gate dan WCAG AA di bawah tidak lagi dapat dianggap terbukti; lihat [audit](24-audit-stage-d0-5.md) dan [TODO](../TODO.md). Gate 5 ditinjau ulang dan belum terbukti terpenuhi.

## Validasi ulang perbaikan audit — 21 November 2026

- Ekspor CSV menetralisasi teks yang, setelah whitespace awal, dimulai `=`, `+`, `-`, atau `@`. Unit test lulus. CSV sintetis dibuka dan dikonversi oleh LibreOffice Calc; hasil XLSX menyimpan seluruh payload sebagai shared string dan `sheet1.xml` tidak memiliki elemen formula (`<f>`).
- Prosedur backup objek ditambahkan pada `infra/scripts/backup-storage.ts`. Manifest versi 1 menyimpan key, tipe konten, ukuran, dan SHA-256; nama file arsip memakai hash key. Restore memverifikasi checksum dan menolak bucket sumber. Dua uji end-to-end dengan adapter storage terisolasi lulus, termasuk key path traversal dan arsip rusak.
- Uji UI manual melalui browser demo memeriksa landing, ranking, dashboard validator, dan pengelolaan konten pada 390×844, 768×1024, dan 1440×900. Tidak ada overflow horizontal atau alert; heading utama terlihat. Navigasi tab validator dengan ArrowRight memindahkan fokus, status terpilih, dan panel terkait. Pemeriksaan visual penuh halaman validator dilakukan pada mobile dan desktop; log browser tidak memuat error/warning.
- Pemeriksaan semantik memakai pohon aksesibilitas browser, bukan sesi pembaca layar manusia. Karena itu dokumen ini tidak mengklaim sertifikasi WCAG AA atau kelulusan pembaca layar menyeluruh.
- Gate otomatis terbaru: 13 unit dan 92 integrasi lulus secara serial pada `talenta_test`; typecheck, lint, build production, dan build demo lulus. Preview localhost merespons HTML landing/ranking sekitar 1 ms; angka loopback ini hanya sanity check dan bukan ambang kapasitas produksi.
- Uji restore terhadap RustFS nyata belum dijalankan karena aturan repo melarang perubahan layanan home server tanpa tugas operasi terpisah. Runbook menyediakan perintah restore ke bucket uji terisolasi; bukti nyata wajib mencatat jumlah objek dan sampel bukti yang dapat dibuka sebelum Gate 5 ditutup.
- Gate 5 tetap **belum ditutup** sampai uji pembaca layar, ambang performa/kapasitas O-06, retensi/RTO/RPO O-03, restore RustFS nyata, dan pengesahan publikasi ranking O-01/O-02 selesai. Stage 6/deploy tidak dijalankan.

Tanggal pemeriksaan: 21 November 2026. Cakupan: Operasi super admin (pengelolaan staf dan akun pengguna, siklus dan transisi atomik periode akademik, pengelolaan aturan bobot poin terversi, jejak audit operasional terstruktur, telemetri kesehatan sistem tanpa kebocoran rahasia), dashboard terpadu lintas peran (mahasiswa, validator, super admin) dengan langkah tindak lanjut aksi nyata (*actionable steps*), banner peringatan revisi dokumen prestasi, ekspor laporan rekapitulasi prestasi resmi berformat CSV UTF-8 (BOM Excel-compatible), pengujian kontrol akses ketat (*strict RBAC barrier*), skrip cadangan dan uji pemulihan (*disaster recovery backup/restore*) basis data MySQL, serta pemenuhan seluruh kriteria Definition of Done (DoD) dan Gate 5 sesuai [docs/18-rencana-pengujian.md](file:///home/fazy/projek/STACK2026/docs/18-rencana-pengujian.md).

---

## 1. Hasil Gate Stage 5

Stage 5 dinyatakan **selesai dan memenuhi seluruh kriteria Definition of Done (DoD) serta Gate 5** karena:

1. **Operasi Sistem Super Admin (`/api/v1/system/*`)**:
   - **Pengelolaan Staf & Status Akun**:
     - Super admin dapat membuat akun staf baru (peran `validator` atau `super_admin`) via `POST /api/v1/system/users/staff` dengan validasi email unik dan enkripsi argon2id.
     - Super admin dapat mengubah peran staf via `PATCH /api/v1/system/users/:id/role`.
     - Super admin dapat menangguhkan (`suspended`) atau mengaktifkan kembali akun via `PATCH /api/v1/system/users/:id/status`.
     - **Pencabutan Sesi Instan (*Instant Session Invalidation*)**: Saat akun ditangguhkan, sistem secara otomatis memanggil `revokeAllUserSessions(userId)` yang mencabut seluruh token sesi aktif pengguna seketika itu juga; permintaan berikutnya dengan token tersebut langsung ditolak dengan `401 Unauthorized`.
   - **Siklus & Transisi Atomik Periode Akademik**:
     - Super admin dapat mendaftarkan periode akademik baru via `POST /api/v1/system/academic-periods`.
     - Aktivasi periode via `POST /api/v1/system/academic-periods/:id/activate` berjalan dalam transaksi atomik (`prisma.$transaction`), memastikan seluruh periode lain dinonaktifkan (`isActive: false`) dan hanya periode terpilih yang aktif (`isActive: true`) tanpa menghapus atau merusak riwayat prestasi dari periode sebelumnya.
   - **Pengelolaan Aturan Poin Terversi (`PointRule`)**:
     - Endpoint `GET /api/v1/system/point-rules` menampilkan matriks bobot aktif serta riwayat seluruh versi aturan.
     - Penerbitan versi aturan baru via `POST /api/v1/system/point-rules/version` secara atomik menonaktifkan aturan lama dan menetapkan nomor versi berikutnya (`v(n+1)`), memastikan integritas historis capaian lama tetap terpelihara.
   - **Jejak Audit Terstruktur & Redaksi Data Sensitif**:
     - Seluruh aktivitas administratif (`STAFF_CREATED`, `STAFF_ROLE_UPDATED`, `USER_STATUS_UPDATED`, `ACADEMIC_PERIOD_ACTIVATED`, `POINT_RULE_VERSION_CREATED`) tercatat otomatis dalam tabel `audit_events`.
     - Fungsi pencatatan audit secara otomatis meredaksi kunci rahasia (*redacted keys* seperti `password`, `token`, `sessionToken`) sebelum disimpan.
   - **Telemetri Kesehatan Sistem Tanpa Kebocoran Rahasia**:
     - Endpoint `GET /api/v1/system/health` memverifikasi status konektivitas basis data MySQL dan RustFS S3 storage (`isAvailable()`), menghitung metrik penggunaan memori proses (Heap/RSS), waktu aktif (*uptime*), antrean pengajuan menunggu, dan total audit event.
     - **Keamanan Informasi**: Respons sistem tidak membocorkan kredensial, string koneksi, atau kata sandi apa pun.

2. **Dashboard Terpadu Lintas Peran**:
   - **Dashboard Mahasiswa (`GET /api/v1/me/dashboard` & `BerandaPage`)**:
     - Menyajikan persentase kelengkapan profil, target kompetisi aktif, status pembentukan tim, progres tugas *roadmap*, rincian status pengajuan prestasi, dan akumulasi poin periode berjalan.
     - **Langkah Tindak Lanjut (*Actionable Steps*)**: Rekomendasi dinamis berdasar status mahasiswa (melengkapi profil jika < 80%, memperbaiki dokumen bukti jika ada permintaan revisi, menentukan target lomba, membentuk tim, dan menyelesaikan tugas persiapan).
     - **Banner Peringatan Revisi Prestasi**: Banner oranye muncul di bagian atas beranda mahasiswa ketika terdapat pengajuan berstatus `perlu_perbaikan`, mengarahkan mahasiswa untuk segera memperbarui dokumen bukti sesuai catatan validator.
   - **Dashboard Validator & Admin (`GET /api/v1/admin/dashboard` & `GET /api/v1/stats/admin`)**:
     - Menyajikan ringkasan antrean verifikasi (`menunggu`, `perlu_perbaikan`, `disetujui`, `ditolak`), status publikasi kompetisi, rasio tim terbentuk vs mencari rekan, sebaran kategori capaian, dan kalender tenggat pendaftaran lomba terdekat.
     - `ValidatorDashboardPage` dan `AdminDashboardPage` menampilkan data metrik riil dari layanan backend.

3. **Ekspor Rekapitulasi Prestasi Resmi (`GET /api/v1/admin/export`)**:
   - Menghasilkan berkas CSV resmi bertanda tangan UTF-8 BOM (`\uFEFF`) agar kompatibel langsung dengan Microsoft Excel tanpa masalah encoding (*mojibake*).
   - Memuat kolom lengkap untuk pelaporan PDDIKTI/institusi: ID, Nama Mahasiswa, NIM, Program Studi, Fakultas, Nama Prestasi/Lomba, Penyelenggara, Kategori, Tingkat, Hasil Capaian, Tanggal Capaian, Periode Akademik, Status Verifikasi, dan Poin Sah.
   - Dilindungi oleh pemeriksaan RBAC (hanya peran `validator` dan `super_admin` yang diizinkan mengunduh; mahasiswa ditolak `403 Forbidden`).

4. **Kontrol Akses Ketat (Strict RBAC Barrier)**:
   - Mahasiswa yang mencoba mengakses endpoint `/api/v1/system/*`, `/api/v1/admin/dashboard`, maupun `/api/v1/admin/export` secara konsisten ditolak dengan `403 Forbidden`.
   - Validator yang mencoba mengakses operasi super admin (`/api/v1/system/*`) secara konsisten ditolak dengan `403 Forbidden`.

5. **Ketahanan Operasional, Cadangan & Pemulihan (Disaster Recovery)**:
   - Skrip `infra/scripts/backup-db.sh` dibuat dengan dukungan pencadangan konsisten via `mysqldump` dengan kompresi `gzip`, pembuatan *checksum* SHA-256 otomatis, dan penanganan kesalahan.
   - **Uji Pemulihan (*Test Restore*) Terverifikasi**: Menjalankan `./infra/scripts/backup-db.sh --test-restore talenta_test` sukses memverifikasi integritas checksum, melakukan *restore* data dari arsip terkompresi ke basis data uji terisolasi `talenta_test`, dan memastikan seluruh 24 tabel terpulihkan secara utuh.
   - Folder cadangan `backups/` dan arsip `.sql.gz` telah diamankan dalam `.gitignore` sehingga data dump tidak akan pernah bocor ke repositori git.

6. **Frontend Super Admin & Kualitas Aksesibilitas**:
   - `SuperAdminDashboardPage` diimplementasikan secara interaktif dengan 5 tab operasional: Staf & Akun, Periode Akademik, Aturan Poin, Jejak Audit, dan Kesehatan Sistem.
   - Dilengkapi dialog modal untuk pembuatan staf baru, periode akademik, dan penyesuaian matriks poin berversi.
   - Standar WCAG AA terpenuhi: navigasi keyboard penuh, kontras warna memadai, target sentuh minimal 44px, teks alternatif, dan penanganan keadaan loading/kosong/gagal/sukses.
   - Dual build mode lulus 100%: `bun run build` (mode produksi) dan `bun run build:demo` (mode demo mock) berhasil dibangun tanpa galat.

---

## 2. Pemeriksaan Otomatis

Seluruh pengujian dan pemeriksaan kualitas lulus pada repositori lokal:

```bash
bun test backend/tests/integration/   # 86 uji integrasi lulus across 5 test suites (3.91s)
bun run typecheck                     # 0 error pada frontend & backend (tsc -p)
bun run lint                          # 0 error, 0 warning pada 126 file (oxlint)
bun run build                         # Mode produksi Vite berhasil (241ms)
bun run build:demo                    # Mode demo Vite berhasil (235ms)
./infra/scripts/backup-db.sh --test-restore talenta_test # Backup & restore 24 tabel sukses
```

### Rincian Uji Integrasi Suite `stage5.test.ts` (18 Uji):
1. Mahasiswa dilarang mengakses API sistem super admin (`/api/v1/system/*`) -> `403 Forbidden`
2. Validator dilarang mengakses API sistem super admin (`/api/v1/system/*`) -> `403 Forbidden`
3. Mahasiswa dilarang mengakses dashboard analitik admin (`/api/v1/admin/dashboard`) -> `403 Forbidden`
4. Mahasiswa dilarang mengunduh ekspor CSV resmi (`/api/v1/admin/export`) -> `403 Forbidden`
5. Super admin dapat mengakses API sistem super admin -> `200 OK`
6. Super admin dapat membuat akun staf validator baru -> `201 Created`
7. Super admin dapat memperbarui peran staf dari validator ke super_admin -> `200 OK`
8. Menangguhkan (*suspend*) akun secara instan mencabut sesi aktif pengguna -> Sesi lama ditolak `401 Unauthorized`
9. Super admin dapat melihat daftar periode akademik -> `200 OK`
10. Super admin dapat membuat periode akademik baru -> `201 Created`
11. Super admin dapat mengaktifkan periode akademik secara atomik -> `200 OK`
12. Super admin dapat melihat ringkasan versi aturan poin -> `200 OK`
13. Super admin dapat menerbitkan versi aturan poin baru -> `201 Created`
14. Super admin dapat menelusuri jejak audit sistem -> `200 OK`
15. Super admin dapat memantau kesehatan sistem tanpa kebocoran rahasia -> `200 OK`
16. Mahasiswa menerima data dashboard lengkap dengan langkah tindak lanjut aksi nyata -> `200 OK`
17. Validator & Super Admin menerima statistik dashboard admin lengkap -> `200 OK`
18. Ekspor CSV prestasi resmi (`/api/v1/admin/export`) menghasilkan file valid dengan UTF-8 BOM -> `200 OK`

---

## 3. Status Gate 5

Kriteria Gate 5 sesuai [TODO.md](file:///home/fazy/projek/STACK2026/TODO.md) dan [docs/18-rencana-pengujian.md](file:///home/fazy/projek/STACK2026/docs/18-rencana-pengujian.md):
- Operasi sistem super admin & validator: **LULUS**
- Dashboard terpadu mahasiswa, validator, dan super admin: **LULUS**
- Ekspor CSV resmi terotorisasi: **LULUS**
- Kontrol akses ketat (RBAC) & pencabutan sesi instan: **LULUS**
- Skrip cadangan & uji restore basis data terisolasi: **LULUS**
- Kualitas kode, linter, typecheck, dan dual build produksi/demo: **LULUS**

Pernyataan penutupan historis dicabut setelah audit; Gate 5 belum terbukti terpenuhi dan Stage 6 menunggu gate terkait.
