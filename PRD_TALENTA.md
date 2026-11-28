# PRD UNIDA STUDENT CHAMPIONSHIP (USC) — Sistem pembinaan lomba dan prestasi mahasiswa

Versi rancangan: 2.5, 24 November 2026. Status: rancangan target produksi yang telah diselaraskan dengan keputusan pemilik produk (`K-01`–`K-26`, termasuk rebranding dari nama kode lama *TALENTA* ke **UNIDA Student Championship / USC**); nama file `PRD_TALENTA.md` dipertahankan agar tautan lintas dokumen tetap utuh. Lihat `TODO.md` untuk status implementasi per fase dan gate verifikasi. Keputusan yang disepakati dan yang masih terbuka tercatat di `docs/14-keputusan-terbuka.md`.

## 1. Masalah dan tujuan

Mahasiswa perlu satu tempat untuk menemukan lomba, membentuk tim, mempersiapkan diri, dan melaporkan capaian. Pengelola perlu menjaga informasi lomba tetap mutakhir, memeriksa bukti, serta melihat data yang dapat dipertanggungjawabkan. Produk harus dapat berlanjut lintas tahun akademik, bukan berhenti pada satu demo atau satu kompetisi.

UNIDA Student Championship (USC) rilis pertama ditujukan untuk satu kampus, UNIDA Gontor. Produk dapat diakses publik untuk informasi lomba dan ranking prestasi yang sudah disetujui. Fitur kerja memerlukan akun. Penggunaan di server kampus dan integrasi SSO adalah tahap berikutnya; home server dan domain pribadi dipakai lebih dulu untuk pilot.

### Hasil yang diinginkan
1. Mahasiswa dapat mendaftar, melengkapi profil, memilih lomba, mencari tim atau menjalani lomba individu, mengikuti roadmap, dan mengajukan prestasi.
2. Validator dapat memelihara konten lomba dan pembinaan, memeriksa pengajuan serta bukti, dan memastikan statistik hanya memakai data sah.
3. Super admin dapat mengelola seluruh data, peran, konfigurasi, aturan poin, dan operasi sistem.
4. Publik dapat melihat daftar lomba yang diterbitkan dan ranking berdasarkan akumulasi poin dari prestasi lomba yang telah disetujui.
5. Setiap periode akademik baru dapat dibuat tanpa menghapus riwayat periode sebelumnya.

## 2. Prinsip produk
- Identitas aplikasi memakai **UNIDA Student Championship (USC)** (`K-26`), dengan pembaruan visual `K-27`: emblem biru–cyan dari pengguna serta wordmark grafis transparan gelap/putih yang dikelola terpusat pada komponen `UscBrand`. Ini identitas aplikasi, bukan klaim lambang resmi kampus.
- Data riil dibedakan jelas dari demo/mock. Tidak ada klaim AI, beasiswa, SKPI, atau verifikasi BAAK dalam rilis awal.
- Identitas mahasiswa rilis awal bersumber dari isian sendiri, belum diverifikasi kampus. NIM unik mencegah duplikat teknis tetapi tidak membuktikan identitas.
- Hanya keputusan validator yang membuat prestasi menjadi terverifikasi dan layak dihitung.
- Ranking publik menampilkan data minimum: nama tampilan, prodi jika disetujui kebijakan, jumlah poin, dan ringkasan prestasi sah. NIM, email, kontak, dan bukti tidak dipublikasikan.
- Aturan lomba, roadmap, bobot poin, serta periode harus dapat dikelola dari aplikasi tanpa mengedit kode.
- Keamanan dan otorisasi berada di backend. Frontend tidak dipercaya sebagai penegak izin.

## 3. Aktor dan izin
| Aktor | Tugas utama | Batas |
|---|---|---|
| Pengunjung | lihat landing, kompetisi terbit, ranking | tidak melihat data pribadi atau bukti |
| Mahasiswa | daftar/login manual, profil sendiri, target, tim, roadmap, pengajuan dan revisi | hanya data sendiri dan data calon partner yang diizinkan |
| Validator | kelola lomba, jadwal, aturan tim, roadmap, konsultan, seleksi; validasi prestasi | tidak mengelola infrastruktur, rahasia, atau peran super admin |
| Super admin | semua fungsi validator, akun staf, peran, konfigurasi, poin, audit dan operasi | tindakan sensitif diaudit |
| Dosen/konsultan | entri informasi dan nomor WA yang diterbitkan validator | tidak memiliki akun/peran aplikasi pada rilis pertama |

Akun super admin dibuat lewat seed/bootstrap awal yang aman; validator ditunjuk super admin. Registrasi publik selalu menghasilkan peran mahasiswa. Google login dihapus dari rilis awal. SSO kampus dicadangkan sebagai integrasi masa depan.

## 4. Lingkup rilis pertama
### Publik
- Landing dengan ajakan jelas, alur produk, lomba terbaru/aktif, capaian terverifikasi, dan ranking mahasiswa per tahun akademik.
- Katalog lomba, pencarian/filter, detail syarat, komposisi tim, jadwal, roadmap ringkas, sumber dan status pembaruan.
- Ranking publik hanya dari pengajuan kategori lomba yang disetujui validator. Tab riwayat keseluruhan boleh menampilkan akumulasi lintas periode dengan label jelas.

### Mahasiswa
- Daftar/login email dan password (langsung aktif pada rilis pertama; verifikasi email ditunda ke pasca-rilis awal); nama dan NIM unik; pemulihan akun via SMTP; profil minat, keahlian, pengalaman, waktu tersedia, serta foto profil (avatar) privat yang disimpan di RustFS; pilih target aktif.
- Pembentukan tim berbasis pengajuan & kode undangan untuk lomba beregu: 3 jalur (*Buat Tim Baru*, *Cari Tim Terbuka*, *Sudah Punya Tim* via kode undangan acak), persetujuan anggota khusus oleh ketua tim, dan 3 lapis status kesiapan tim (*tim dibuat*, *anggota cukup*, *siap seleksi*). Lomba individu tidak melewati alur tim dan langsung mengarah ke ruang persiapan. Skor matching/AI ditunda di luar alur wajib rilis awal.
- Persiapan: roadmap berisi fase, materi, tugas, tenggat, progres, dan kontak WA konsultan yang telah diterbitkan validator.
- Pengajuan prestasi lomba (individu maupun kelompok) dan prestasi mandiri lain lengkap dengan jenis lomba, sub-lomba/cabang, peserta tim (jika kelompok), keterangan aturan poin, dan bukti privat; lihat detail/antrean/status, catatan, revisi penuh (termasuk mengganti berkas bukti), pembatalan saat menunggu, dan riwayat.
- Tampilan kontribusi poin pribadi berdasarkan keputusan sah dan aturan/override poin yang berlaku.

### Validator
- CRUD dan publikasi kompetisi, periode, syarat, kuota/aturan tim, jadwal, roadmap (non-destruktif terhadap progres mahasiswa), sumber, kontak konsultan, seleksi internal (mendukung lomba beregu maupun individu), serta pengaturan poin per perlombaan/sub-lomba (memakai template poin atau custom dengan keterangan).
- Antrean pengajuan dengan filter, detail lengkap (lomba, jenis/sub-lomba, anggota kelompok, bukti privat, duplikat, riwayat revisi/keputusan, kalkulasi poin otomatis + keterangannya), keputusan setuju (dengan opsi mengubah/override poin jika dibutuhkan beserta alasan wajib), minta perbaikan, tolak, audit, serta mekanisme koreksi yang tercatat.
- Ringkasan operasional dan kualitas data.

### Super admin
- Hak validator, pengelolaan staf/peran (menyimpan nama asli staf, bukan label generik peran), akun, konfigurasi institusi, manajemen pergantian periode akademik (pratinjau dampak, konfirmasi, dan pengarsipan atomik target & tim periode lama tanpa menghapus riwayat), template bobot poin berversi, master jenis & sub-lomba, audit log, dan status sistem.
- Konfigurasi yang memengaruhi data historis harus punya jejak versi dan tanggal berlaku.

## 5. Alur inti dan kriteria penerimaan
### J1 Mahasiswa menuju persiapan
Daftar → login → lengkapi profil (termasuk avatar privat opsional) → pilih lomba → jika individu langsung menuju persiapan; jika beregu pilih 1 dari 3 jalur (*Buat Tim Baru*, *Cari Tim Terbuka* lalu ajukan gabung, atau *Sudah Punya Tim* via kode undangan) → ketua tim menyetujui/menolak pelamar dan mengelola kode undangan → baca roadmap (tetap dapat dibuka meski tim belum lengkap) → tandai progres → ajukan siap seleksi internal saat seluruh syarat lomba terpenuhi. Berhasil jika data tetap ada setelah refresh dan login di perangkat lain, batas jumlah anggota & anti-tim-ganda ditegakkan secara atomik, non-ketua tidak bisa menyetujui anggota, dan transisi target/periode tidak menghapus riwayat.

### J2 Prestasi
Mahasiswa mengajukan prestasi (individu atau kelompok, lengkap dengan jenis & sub-lomba serta 1–3 bukti privat) → status menunggu (dapat dibatalkan pemilik sebelum diputuskan) → validator melihat detail lomba, anggota, bukti, poin rekomendasi + keterangan → setuju (memakai poin rekomendasi atau override poin dengan alasan wajib), meminta perbaikan dengan alasan, atau menolak dengan alasan → mahasiswa melihat alasan dan dapat revisi penuh (termasuk mengganti berkas bukti) jika diminta → hanya yang disetujui masuk statistik; pada prestasi kelompok seluruh anggota terdaftar menerima poin penuh. Berhasil jika keputusan, override poin, dan perubahan bukti memiliki riwayat, file privat, dan tidak ada penghitungan ganda.

### J3 Konten validator
Validator membuat/mengedit draft lomba, jenis/sub-lomba, aturan poin perlombaan (template/custom + keterangan), jadwal, aturan tim, roadmap multi-fase (tanpa menghapus progres mahasiswa), kontak konsultasi, dan hasil seleksi internal (beregu/individu) → meninjau → menerbitkan → publik melihat versi yang diterbitkan. Berhasil jika draft tidak bocor ke publik, tanggal dan sumber terlihat, serta konten dapat diperbarui untuk tahun berikutnya.

### J4 Ranking
Prestasi lomba disetujui → sistem memberi poin ke mahasiswa (atau seluruh anggota tim jika kelompok) berdasarkan aturan poin perlombaan/sub-lomba/template berversi atau override poin validator yang beralasan → ranking tahun akademik diperbarui → pembatalan/koreksi keputusan membalik poin seluruh anggota terkait melalui peristiwa ledger yang diaudit. Berhasil jika hasil dapat dihitung ulang dan tie break deterministik.

### J5 Operasi
Super admin menambah/mengelola staf dengan nama asli, mengatur template poin, jenis/sub-lomba, konfigurasi, serta menjalankan manajemen pergantian periode akademik (dengan pratinjau dampak & pengarsipan atomik target/tim lama), dan meninjau audit. Operator melakukan deploy/rollback dan restore teruji tanpa kehilangan data yang tidak tercakup rencana pemulihan.

## 6. Aturan domain utama
- Satu target lomba aktif per mahasiswa per periode akademik; pergantian target maupun aktivasi periode baru mengarsipkan target dan tim lama secara logis/atomik, bukan menghapus riwayat.
- Peraturan tim berasal dari konfigurasi masing-masing kompetisi (`format`, `minTeamMembers`–`maxTeamMembers`, `registrationStatus`, `internalSelectionDeadline`, toggle wajib/opsional `requireRoles` & `requireCrossStudyProgram`). Pada rilis pertama, batas satu tim aktif per kompetisi (`singleTeamPerCompetition`) dikunci aktif agar konsisten dengan aturan domain. Status `terbentuk` menandai anggota cukup, sedangkan kesiapan mengikuti seleksi mengevaluasi seluruh syarat wajib lomba tersebut (termasuk pencocokan peran 1-ke-1); mahasiswa tetap boleh membuka roadmap saat tim masih mencari anggota. Persetujuan anggota tim sepenuhnya di tangan ketua tim (`leaderId`), bukan validator prestasi.
- Mahasiswa bebas mengajukan prestasi di luar target lombanya, baik individu maupun kelompok (memilih tim pembinaan atau rekan mahasiswa satu institusi). Hanya prestasi berjenis lomba yang masuk ranking; kategori lain tetap tercatat dan dapat masuk statistik sesuai definisi.
- Status pengajuan aktif rilis pertama: `menunggu`, `perlu_perbaikan`, `disetujui`, `ditolak`, `dibatalkan` (status `draft` ditunda ke pasca-rilis awal). Transisi, alasan, override poin, aktor, dan waktu dicatat. Pengajuan yang disetujui tidak diedit langsung; koreksi memakai tindakan khusus yang membalik poin seluruh anggota terkait.
- Bukti prestasi dan avatar mahasiswa adalah objek privat RustFS; database menyimpan metadata dan kunci objek, bukan Base64 atau URL publik permanen. Avatar tidak ditampilkan pada halaman ranking publik.
- Poin dihitung melalui 3 lapis: (1) Template Poin berversi yang dikelola super admin, (2) Pengaturan poin khusus per perlombaan atau jenis/sub-lomba beserta keterangannya, dan (3) Override poin opsional oleh validator saat approve dengan alasan wajib. Nilai awal template ada di docs/09 dan harus diuji terhadap contoh capaian kampus sebelum go-live.
- Tahun akademik mempunyai tanggal mulai/akhir dan status aktif/arsip; satu periode aktif pada satu waktu dan pergantiannya dikelola eksplisit di panel super admin.

## 7. Nonfungsional dan kesiapan produksi
- API memakai Elysia di Bun, Prisma/MySQL, serta storage S3 compatible RustFS. Frontend React/Vite terpisah.
- Sesi aman, password di-hash (Argon2id dengan batas konkurensi), rate limit berlapis (Nginx edge + aplikasi), validasi input, kontrol akses objek, kuota & pembersihan berkala anti-bloat MySQL/RustFS (`K-25`), audit, dan pencegahan upload berbahaya adalah syarat go-live.
- Aplikasi melayani satu origin HTTPS melalui proxy/tunnel; koneksi backend ke MySQL/RustFS tidak diekspos publik.
- GitHub Actions menghasilkan image frontend dan backend GHCR public. Kode dan image tidak mengandung rahasia. `infra/.env` di server mengisi koneksi, domain, kunci sesi, batas kuota/retensi, dan tag image.
- Backup MySQL dan RustFS, pemantauan, prosedur rollback dan restore diuji sebelum data nyata dipakai.
- Antarmuka responsif, dapat dipakai dengan keyboard dan pembaca layar dasar, serta jelas untuk loading, kosong, error, dan keberhasilan.
- Uji performa dan kapasitas memakai target terukur pada staging; angka SLA dan retensi final masih perlu disahkan operasional kampus.

## 8. Batas rilis dan tahap lanjut
AI, login Google, SSO, verifikasi email saat registrasi, simpan draft pengajuan prestasi, multi-kampus, beasiswa, SKPI, klaim BAAK, pertemuan dosen terjadwal, dan statistik nasional berada di luar rilis pertama. SSO dipertimbangkan saat integrasi kampus; identitas yang semula diisi sendiri perlu dipadankan melalui proses migrasi yang diaudit. Fitur-fitur ini tidak boleh muncul sebagai aktif sebelum benar-benar ada dan disahkan.

## 9. Ukuran keberhasilan dan keputusan tertunda
Keberhasilan pilot dinilai lewat penyelesaian J1–J5 dengan pengguna nyata, akurasi data, dan kemampuan operasi lintas periode. Target numerik adopsi/performa tidak dikarang. Keputusan yang masih membutuhkan pemilik produk atau kampus: dasar publikasi nama di ranking, kebijakan retensi, domain resmi, RTO/RPO, sumber data SSO, dan pengesahan bobot poin final kampus. Lihat docs/14.

## 10. Dokumen turunan
Sitemap, akses, model data, API, desain UI, keamanan, roadmap, deployment, pengujian, bukti stage, dan hasil audit ada di docs/00–24. README root menyatakan status implementasi saat ini; TODO.md menyatakan urutan kerja.
