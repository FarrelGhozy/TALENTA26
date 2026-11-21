# 14 — Catatan keputusan produk dan operasi

Versi 2.1, 21 November 2026. Dokumen lama berjudul FIX v1.0 tidak lagi dianggap final seluruhnya. Keputusan di bawah berasal dari arahan pemilik produk dalam percakapan; hal yang belum diputuskan ditandai terbuka. Jangan menganggap usulan teknis sebagai persetujuan kebijakan kampus.

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
| K-19 | Aturan pembentukan tim & undangan rilis pertama memakai batas 5 undangan aktif dan masa berlaku 14 hari sebagai default global; peran wajib dan lintas prodi adalah indikator/saran di UI | status `terbentuk` di backend ditentukan oleh jumlah anggota (`minTeamMembers`–`maxTeamMembers`); pengirim dapat membatalkan undangan aktif (`dibatalkan`) |
| K-20 | Avatar mahasiswa disimpan privat di RustFS dan tidak tampil di ranking publik; akun staf menyimpan nama asli (`fullName`) | unggah foto profil memakai multipart tervalidasi ke RustFS (bukan Base64 di MySQL); staf tampil dengan nama asli di UI dan jejak audit, bukan label generik peran |
| K-21 | Manajemen pergantian periode akademik diatur eksplisit di panel super admin dengan pengarsipan atomik target & tim periode lama; verifikasi email (`pending_verification`) ditunda | aktivasi periode baru menampilkan pratinjau dampak + konfirmasi dan mengarsipkan target/tim lama tanpa menghapus riwayat; registrasi manual langsung `active` di rilis awal dan verifikasi email diletakkan di bagian paling bawah `TODO.md` |
| K-22 | Pertahankan struktur tab ringkas UI (`/validator/konten`, `/super-admin`, `/app/partner`) dengan `?tab=...` serta path API aktual, dan hapus rute legacy rawan IDOR | `docs/04` dan `docs/16` diselaraskan ke struktur ringkas; rute legacy seperti `/users/:userId/target`, alias `/matching/invites`, dan `POST /competitions` dihapus |

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
Status FIX pada dokumen sebelumnya, termasuk jumlah akun mock, bobot matching lama, susunan role lama, dan tahap 2 tunggal, adalah contoh prototipe atau bahan uji. Khusus batas 5 undangan aktif dan masa berlaku 14 hari kini telah disahkan sebagai default global rilis pertama melalui K-19. Implementasi tetap mengikuti gate di `docs/13` dan `TODO.md`.
