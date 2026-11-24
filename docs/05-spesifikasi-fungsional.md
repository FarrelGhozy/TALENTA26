# 05 — Spesifikasi fungsional dan penerimaan

Semua item di bawah adalah target, bukan status implementasi. ID kebutuhan stabil untuk backlog dan uji docs/18.

| ID | Kebutuhan | Aturan penerimaan |
|---|---|---|
| AUTH-01 | Registrasi mahasiswa manual | nama, NIM, email, password, prodi, fakultas, angkatan opsional; NIM dan email unik; akun publik hanya mahasiswa dan langsung aktif (verifikasi email ditunda per K-21); pemberitahuan publikasi ranking jelas; pesan duplikat aman |
| AUTH-02 | Login, logout, pemulihan | sesi HttpOnly dengan hash token di DB, logout memutus sesi secara await, reset via SMTP satu kali dan kedaluwarsa (production gagal tertutup tanpa SMTP); rate limit per IP nyata; tidak ada Google login |
| AUTH-03 | Bootstrap & akun staf | seed produksi hanya institusi + bootstrap super admin dari env tanpa password fallback dan tanpa konten demo; staf (validator/super admin) dibuat/dikelola super admin dengan nama asli (`fullName`) |
| PROF-01 | Profil mahasiswa & avatar | prodi, fakultas, angkatan, minat, skill, pengalaman, waktu tersedia, serta avatar privat yang diunggah via multipart ke RustFS (bukan Base64 di MySQL); perubahan langsung tersinkron lintas perangkat dan AuthContext |
| PROF-02 | Identitas | NIM tidak tampil publik; status identitas belum diverifikasi kampus ditampilkan jelas; NIM tidak otomatis dipercaya untuk fasilitas resmi; avatar tidak tampil di ranking publik |
| COMP-01 | Katalog | pengunjung hanya melihat konten `published`; cari/filter periode, jenis/kategori, tingkat, format tim (individu/beregu), serta menampilkan sub-lomba dan keterangan aturan poin |
| COMP-02 | Konten validator | buat, edit penuh, pratinjau, terbit, arsip; jenis/sub-lomba, aturan poin per perlombaan (template/custom + keterangan), syarat, sumber, jadwal, aturan tim, pembaruan tanggal |
| COMP-03 | Periode & edisi | kompetisi terikat ke periode akademik dan dapat diadakan ulang lintas tahun akademik tanpa merusak referensi pengajuan lama |
| TARG-01 | Target | satu target aktif per mahasiswa per periode (`StudentTarget.academicPeriodId`); ganti target menampilkan konfirmasi dampak dan mengarsipkan tim lama secara atomik |
| TEAM-01 | Rekrutmen tim & kode undangan | hanya untuk lomba beregu; 3 jalur (*Buat Tim Baru*, *Cari Tim Terbuka* + pengajuan `TeamJoinRequest`, *Sudah Punya Tim* via kode undangan acak `TLN-XXXX-XXXX`); persetujuan anggota khusus ketua (`leaderId`); kapasitas & anti-tim-ganda dikunci `FOR UPDATE` deterministik (`users → teams`); ketua dapat memutar kode & mengeluarkan anggota; tanpa PII (`K-19` revisi) |
| TEAM-02 | Kesiapan tim 3 lapis | status `terbentuk` saat anggota memenuhi `minTeamMembers`–`maxAllowed`; kesiapan seleksi mengevaluasi `registrationStatus`, `internalSelectionDeadline`, `requireRoles` (bipartite 1-ke-1), dan `requireCrossStudyProgram`; batas 1 tim aktif per lomba dikunci di v1; status `terkunci_seleksi` memblokir keluar mandiri; lomba individu langsung menuju persiapan (`K-23`) |
| ROAD-01 | Roadmap | validator membuat/mengedit multi-fase, multi-tugas, sumber, tenggat secara non-destruktif (tidak menghapus progres mahasiswa); mahasiswa melihat versi terbit dan menandai progres per ID tugas unik |
| ROAD-02 | Konsultasi | validator mengelola daftar, tambah, edit, arsip kontak WA lengkap dengan status persetujuan publikasi dan keterangan kapasitas (`capacityNote`); tombol WA hanya tampil untuk kontak terbit & disetujui |
| SEL-01 | Seleksi internal | jadwal/tahap, dropdown peserta (tim beregu atau mahasiswa individu per K-18), hasil, catatan, waktu konfirmasi, dan validator pengonfirmasi; lolos terkonfirmasi mengunci tim beregu dan tidak otomatis menjadi prestasi sah |
| ACH-01 | Pengajuan | individu atau kelompok (pilih tim pembinaan atau rekan mahasiswa satu institusi), jenis lomba, sub-lomba/cabang, tingkat, hasil, tanggal (zona Asia/Jakarta), penyelenggara, deskripsi, 1–3 bukti privat; dapat dibuat tanpa target; tampilkan keterangan poin otomatis |
| ACH-02 | Revisi & pembatalan | mahasiswa dapat melihat detail pengajuan (`/app/prestasi/:id`), membatalkan saat `menunggu` (`→ dibatalkan`), dan merevisi seluruh field serta mengganti berkas bukti saat `perlu_perbaikan` tanpa menghapus riwayat audit; simpan draft ditunda ke pasca-rilis awal |
| VER-01 | Keputusan & override poin | validator/super admin hanya dapat memutus status `menunggu` (setuju, minta perbaikan, tolak); alasan wajib untuk perbaikan/tolak; saat setuju validator melihat detail lomba, anggota, poin rekomendasi + keterangan, dan dapat mengubah (override) poin final dengan alasan wajib; semua tercatat di audit dan `PointLedger` dengan `version` & `idempotencyKey` |
| VER-02 | Koreksi | keputusan `disetujui` yang salah dikoreksi melalui aksi khusus beralasan dan diaudit; seluruh award poin milik pengaju/semua anggota kelompok dibalik secara atomik tanpa double-reversal |
| RANK-01 | Poin 3 lapis | hanya prestasi lomba disetujui; sumber poin berjenjang dari aturan perlombaan/sub-lomba atau template poin berversi (bukan hardcoded v1), atau override poin validator; pada prestasi kelompok semua anggota terdaftar mendapat poin penuh; satu siklus persetujuan satu entri ledger per anggota |
| RANK-02 | Ranking | tahun akademik aktif default (kosong bila tidak ada periode aktif); lifetime terpisah; tie break stabil (poin → Juara 1 → prestasi sah unik → nama → ID stabil); identitas publik minimum tanpa avatar/NIM/email/WA |
| DASH-01 | Dashboard | mahasiswa (`/me/dashboard`), validator, super admin sesuai scope; angka akurat tanpa pemotongan dan tanpa salah pemetaan kategori/kompetisi; ekspor CSV aman dari formula injection dan terfilter |
| ADMIN-01 | Pengelolaan & pergantian periode | super admin mengatur staf bernamakan asli, peran, manajemen pergantian periode akademik (pratinjau dampak + konfirmasi + arsip atomik target/tim lama), template poin berversi, master jenis/sub-lomba, audit, dan kesehatan sistem |
| OPS-01 | Deploy, DDoS & Anti-Bloat | dua image GHCR public (non-root), Compose server (`web`, `api`, `migrate`) dengan limit sumber daya & rotasi log, `infra/.env`, Nginx edge rate limit + CSP + anti-Slowloris, build produksi fail-safe tanpa mock/demo, health `/health/ready`, kuota/TTL/Orphan GC (`K-25`), backup/restore MySQL & RustFS ber-retensi, dan rollback teruji |

## Validasi umum
Semua input divalidasi di backend (termasuk validasi enum ketat agar tidak crash Prisma). Tanggal dievaluasi dengan zona waktu `Asia/Jakarta`; lampiran diperiksa tipe MIME nyata, magic byte, ekstensi, ukuran nyata buffer, dan jumlah. Teks bebas dibatasi panjang, di-escape saat tampil, dan tidak menerima HTML aktif. Pagination, sort, dan filter memiliki batas agar query tidak menghabiskan server. Operasi mutasi yang rentan klik ganda memakai `idempotencyKey` dan/atau optimistic locking `version`.

## Keadaan antarmuka
Setiap daftar punya empty state yang menjelaskan langkah lanjut. Form mempertahankan data saat gagal, menunjukkan error di field, mencegah submit ganda, dan memberi konfirmasi sebelum tindakan yang mengubah riwayat (ganti target, keluar tim, suspend staf, ubah peran, aktifkan periode baru, koreksi keputusan). Layar tidak menampilkan keberhasilan palsu atau infinite loading saat API gagal.

## Status penyelarasan
Kebutuhan di atas menjadi acuan resmi penutupan audit dan implementasi Fase 1–4 pada `TODO.md` serta `docs/13-peta-jalan.md`. Fitur di luar rilis awal (verifikasi email, simpan draft prestasi, SSO, AI, multi-kampus, beasiswa) dicatat di bagian *Setelah rilis awal* pada `TODO.md`.
