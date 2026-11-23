# 14 — Catatan keputusan produk dan operasi

Versi 2.2, 23 November 2026. Dokumen lama berjudul FIX v1.0 tidak lagi dianggap final seluruhnya. Keputusan di bawah berasal dari arahan pemilik produk dalam percakapan; hal yang belum diputuskan ditandai terbuka. Jangan menganggap usulan teknis sebagai persetujuan kebijakan kampus.

## Disepakati pemilik produk
| ID | Keputusan | Dampak |
|---|---|---|
| K-01 | Rilis pertama satu kampus, UNIDA Gontor | institutionId tetap ada; akses lintas kampus tidak dibuka |
| K-02 | Super admin mengatur sistem, peran dan seluruh fungsi | seed awal aman; dashboard/operasi tersendiri |
| K-03 | Validator mengelola data lomba, aturan tim, jadwal, roadmap, kontak WA, seleksi, serta memvalidasi pengajuan | peran admin program/verifikator lama digabung menjadi validator |
| K-04 | Dosen/konsultan tidak login; konsultasi diarahkan ke nomor WA yang dikelola validator | tidak ada role dosen rilis awal |
| K-05 | Daftar/login mahasiswa manual; Google login dibatalkan; SSO kampus sesudah produk final | tidak ada Google OAuth di scope rilis |
| K-06 | Identitas mahasiswa rilis awal diisi sendiri; tidak diperiksa admin/validator atau SSO | jangan klaim identitas resmi; NIM unik hanya pencegahan duplikat teknis |
| K-07 | MySQL dan RustFS S3 compatible sudah tersedia di home server | Compose produksi menghubungkan layanan existing |
| K-08 | GitHub Actions build image, simpan di GHCR public; server pakai root .env, docker compose pull, docker compose up -d | tidak memakai GitHub Pages untuk rilis produksi |
| K-09 | Akses awal lewat Cloudflare Tunnel dan domain pribadi; domain kampus kemudian | konfigurasi domain fleksibel tanpa rebuild |
| K-10 | AI dan beasiswa dikeluarkan dari rilis awal | tidak ada klaim aktif |
| K-11 | Landing menampilkan ranking mahasiswa dari akumulasi poin lomba, tanpa filter bidang dan tanpa persetujuan tampil terpisah | data publik minimum; kebijakan privasi wajib ditinjau sebelum go-live |
| K-12 | Aplikasi harus matang dan berkelanjutan lintas tahun, bukan satu demo | periode akademik, edisi lomba dan histori wajib |
| K-13 | Pemulihan kata sandi produksi dikirim melalui SMTP yang dikonfigurasi operator | tanpa konfigurasi SMTP, production gagal tertutup; token tidak ditulis ke log |
| K-14 | Rilis pertama menjalankan satu instance API di belakang proxy/tunnel privat | rate limit in-memory tidak diklaim aman untuk multi-instance; `TRUST_PROXY` hanya diaktifkan bila API tidak dapat diakses langsung |
| K-15 | Sistem poin 3 lapis: template poin berversi, master jenis & sub-lomba dengan poin khusus per perlombaan/sub-lomba beserta keterangannya, dan hak override poin oleh validator saat approve | super admin/validator dapat mengatur bobot per lomba/sub-lomba atau memakai template; saat approve validator melihat detail lomba, poin rekomendasi & keterangannya, serta dapat mengubah poin final dengan alasan wajib yang tercatat di ledger dan audit |
| K-16 | Pengajuan prestasi kelompok (tim) langsung memberi poin penuh ke seluruh anggota terdaftar | prestasi mendukung tipe `individu` dan `kelompok` (`teamId` atau daftar anggota satu institusi); persetujuan mencatat `PointLedger` untuk semua anggota secara atomik dan koreksi membalik seluruh anggota bersama |
| K-17 | Alur prestasi rilis pertama memakai submit langsung, revisi penuh (semua field + penggantian berkas bukti), dan pembatalan oleh pemilik (`menunggu → dibatalkan`); simpan draft ditunda | mahasiswa dapat memperbaiki seluruh field dan mengganti bukti lama tanpa menghapus riwayat audit; alur draft dicatat pada tahap setelah rilis awal di `TODO.md` |
| K-18 | Seleksi internal mendukung lomba beregu maupun individu | `InternalSelection` mendukung `teamId` (beregu) atau `userId` (individu seperti ONMIPA) serta menyimpan catatan, waktu konfirmasi, dan validator pengonfirmasi |
| K-19 | Pembentukan tim rilis pertama memakai sistem **rekrutmen berbasis pengajuan & kode undangan** (bukan *automatic matchmaking*): 3 jalur untuk lomba beregu (*Buat Tim Baru*, *Cari Tim Terbuka*, *Sudah Punya Tim* via kode undangan acak) dan langsung persiapan untuk lomba individu; persetujuan anggota hanya dilakukan **ketua tim (`leaderId`)** | `Team` menyimpan `leaderId`, `description`, `recruitmentType` (`terbuka`/`privat`), `isRecruiting`, `neededRoles`, `targetMaxMembers`, dan `inviteCode` acak yang dapat diputar ulang ketua; pelamar mengajukan gabung (`TeamJoinRequest`) ke tim terbuka dan ketua menyetujui/menolak; kode undangan bersifat *direct join* aman (`FOR UPDATE`) dengan hak ketua memutar kode & mengeluarkan anggota sebelum terkunci seleksi; ketua keluar otomatis mentransfer kepemimpinan ke anggota terlama atau mengarsipkan tim bila sendirian; skor matching lama dikeluarkan dari alur utama mahasiswa |
| K-20 | Avatar mahasiswa disimpan privat di RustFS dan tidak tampil pada akses ranking publik (belum login), tetapi ditampilkan pada ranking saat pengguna satu kampus sudah login; akun staf menyimpan nama asli (`fullName`) | unggah foto profil memakai multipart tervalidasi ke RustFS (bukan Base64 di MySQL); `GET /ranking` & `/ranking/lifetime` hanya menyertakan `avatarUrl` terotorisasi untuk sesi login satu kampus dan menghilangkan `avatarUrl` pada akses publik; staf tampil dengan nama asli di UI dan jejak audit, bukan label generik peran |
| K-21 | Manajemen pergantian periode akademik diatur eksplisit di panel super admin dengan pengarsipan atomik target & tim periode lama; verifikasi email (`pending_verification`) ditunda | aktivasi periode baru menampilkan pratinjau dampak + konfirmasi dan mengarsipkan target/tim lama tanpa menghapus riwayat; registrasi manual langsung `active` di rilis awal dan verifikasi email diletakkan di bagian paling bawah `TODO.md` |
| K-22 | Pertahankan struktur tab ringkas UI (`/admin/konten`, `/admin/sistem`, `/app/tim`) dengan `?tab=...` serta path API aktual, gabungkan peran pengelola menjadi portal terpadu `/admin`, dan hapus rute legacy rawan IDOR | `docs/04` dan `docs/16` diselaraskan ke struktur ringkas; rute `/app/partner` & `/app/tim/cari` diarahkan ke `/app/tim?tab=cari`; `/validator/*` & `/super-admin/*` diarahkan ke `/admin/*` dengan hak akses setara (`ADMIN_ROLES = ['validator', 'super_admin']`); rute legacy seperti `/users/:userId/target`, alias `/matching/invites`, dan `POST /competitions` dihapus |
| K-23 | Setiap kompetisi mengatur aturan dinamis sendiri (`registrationStatus`, `internalSelectionDeadline`, toggle syarat peran & lintas prodi opsional/wajib, batas satu tim per cabang); kesiapan tim dipisahkan menjadi 3 lapis (*tim dibuat*, *anggota cukup*, *siap seleksi*) dan ketua dapat mendaftarkan kesiapan seleksi internal | roadmap boleh dibuka sejak tim dibuat (belum harus lengkap); status `terbentuk` menandai anggota cukup, tetapi tombol *Daftar Seleksi Internal* (`InternalSelection` status `menunggu`) hanya aktif saat seluruh syarat wajib kompetisi terpenuhi; pengelola lomba mengatur aturan di `/admin/konten?tab=kompetisi`, validasi prestasi berada di `/admin/prestasi` |

## Rekomendasi rancangan yang belum menjadi kebijakan kampus
| ID | Usulan | Alasan/gate |
|---|---|---|
| R-01 | Ranking default per tahun akademik dan riwayat sepanjang waktu | menjaga perbandingan adil antar angkatan; uji dengan contoh nyata |
| R-02 | Hanya prestasi lomba disetujui validator mendapat poin | mencegah klaim belum sah; rincian kategori diuji |
| R-03 | Bobot awal template menurut tingkat dan hasil, disimpan per versi; tabel awal docs/09 | super admin sahkan sebelum go-live, riwayat tidak berubah; tetap mendukung custom poin per perlombaan/sub-lomba dan override validator (K-15) |
| R-04 | Cookie sesi aman HttpOnly dengan hash token di DB dan reset password SMTP (verifikasi email ditunda per K-21) | uji kemampuan email operasional untuk reset password; bukan validasi identitas kampus |
| R-05 | API same-origin /api, image frontend/backend terpisah, tag immutable, build produksi fail-safe tanpa mock/demo | root .env cukup untuk domain/server, tanpa rebuild Vite dan tanpa toggle mock di produksi |
| R-06 | Bukti prestasi dan avatar mahasiswa privat di RustFS, akses melalui API terotorisasi, service account terbatas | lindungi dokumen & aset pribadi mahasiswa |

## Terbuka dan pemilik keputusan
| ID | Pertanyaan | Pemilik | Batas waktu keputusan |
|---|---|---|---|
| O-01 | Bobot poin final, kelas hasil khusus, dan definisi tingkat kampus/nasional/internasional? | pemilik produk + kampus | sebelum ranking data nyata |
| O-02 | Dasar publikasi nama tanpa opt-in, isi pemberitahuan privasi, mekanisme koreksi/keberatan, serta identitas yang boleh tampil? | kampus/pengelola data | sebelum pilot mahasiswa nyata |
| O-03 | Retensi bukti, audit dan akun; RTO/RPO dan lokasi backup terpisah? | operator + kampus | sebelum produksi |
| O-05 | Domain resmi, brand, klaim resmi BAAK/SKPI, sumber data SSO dan pemadanan akun? | kampus | sebelum integrasi institusional |
| O-06 | Ambang performa dan kapasitas, keamanan tambahan file, kebijakan kontak WA? | operator + validator | Stage 5 |

## Keputusan lama yang dicabut sebagai final
Status FIX pada dokumen sebelumnya, termasuk jumlah akun mock, bobot matching lama, susunan role lama, dan tahap 2 tunggal, adalah contoh prototipe atau bahan uji. Per 23 November 2026 (`K-19` revisi & `K-23`), sistem pembentukan tim beralih dari matching otomatis + undangan calon partner menjadi rekrutmen tim berbasis pengajuan (`TeamJoinRequest`), kode undangan acak yang dapat diputar ulang, persetujuan khusus ketua tim, serta 3 lapis status kesiapan tim berdasarkan aturan dinamis per kompetisi. Implementasi tetap mengikuti gate di `docs/13` dan `TODO.md`.
