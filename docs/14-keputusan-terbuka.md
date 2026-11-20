# 14 — Catatan keputusan produk dan operasi

Versi 2.0, 20 November 2026. Dokumen lama berjudul FIX v1.0 tidak lagi dianggap final seluruhnya. Keputusan di bawah berasal dari arahan pemilik produk dalam percakapan; hal yang belum diputuskan ditandai terbuka. Jangan menganggap usulan teknis sebagai persetujuan kebijakan kampus.

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

## Rekomendasi rancangan yang belum menjadi kebijakan kampus
| ID | Usulan | Alasan/gate |
|---|---|---|
| R-01 | Ranking default per tahun akademik dan riwayat sepanjang waktu | menjaga perbandingan adil antar angkatan; uji dengan contoh nyata |
| R-02 | Hanya prestasi lomba disetujui validator mendapat poin | mencegah klaim belum sah; rincian kategori diuji |
| R-03 | Bobot menurut tingkat dan hasil, disimpan per versi; tabel awal docs/09 | super admin sahkan sebelum go-live, riwayat tidak berubah |
| R-04 | Cookie sesi aman, verifikasi kepemilikan email, reset password | uji kemampuan email operasional; bukan validasi identitas kampus |
| R-05 | API same-origin /api, image frontend/backend terpisah, tag immutable | root .env cukup untuk domain/server, tanpa rebuild Vite |
| R-06 | Bukti privat di RustFS, URL sementara, service account | lindungi dokumen mahasiswa |

## Terbuka dan pemilik keputusan
| ID | Pertanyaan | Pemilik | Batas waktu keputusan |
|---|---|---|---|
| O-01 | Bobot poin final, kelas hasil khusus, dan definisi tingkat kampus/nasional/internasional? | pemilik produk + kampus | sebelum ranking data nyata |
| O-02 | Dasar publikasi nama tanpa opt-in, isi pemberitahuan privasi, mekanisme koreksi/keberatan, serta identitas yang boleh tampil? | kampus/pengelola data | sebelum pilot mahasiswa nyata |
| O-03 | Retensi bukti, audit dan akun; RTO/RPO dan lokasi backup terpisah? | operator + kampus | sebelum produksi |
| O-04 | Mekanisme email verifikasi/reset dan layanan pengirim email? | pemilik produk + operator | Stage 2 |
| O-05 | Domain resmi, brand, klaim resmi BAAK/SKPI, sumber data SSO dan pemadanan akun? | kampus | sebelum integrasi institusional |
| O-06 | Ambang performa dan kapasitas, keamanan tambahan file, kebijakan kontak WA? | operator + validator | Stage 5 |

## Keputusan lama yang dicabut sebagai final
Status FIX pada dokumen sebelumnya, termasuk jumlah akun mock, batas 14 hari undangan, 5 undangan, bobot matching, susunan role lama, dan tahap 2 tunggal, adalah contoh prototipe atau bahan uji. Implementasi baru harus menguji dan mengesahkan aturan nyata. Tidak ada larangan memulai backend berdasarkan tag v0-mock-fix lama; gate baru mengikuti docs/13.
