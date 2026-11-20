# PRD TALENTA — Sistem pembinaan lomba dan prestasi mahasiswa

Versi rancangan: 2.0, 20 November 2026. Status: rancangan target produksi, belum diimplementasikan. Keputusan yang disepakati dan yang masih terbuka tercatat di docs/14-keputusan-terbuka.md.

## 1. Masalah dan tujuan

Mahasiswa perlu satu tempat untuk menemukan lomba, membentuk tim, mempersiapkan diri, dan melaporkan capaian. Pengelola perlu menjaga informasi lomba tetap mutakhir, memeriksa bukti, serta melihat data yang dapat dipertanggungjawabkan. Produk harus dapat berlanjut lintas tahun akademik, bukan berhenti pada satu demo atau satu kompetisi.

TALENTA rilis pertama ditujukan untuk satu kampus, UNIDA Gontor. Produk dapat diakses publik untuk informasi lomba dan ranking prestasi yang sudah disetujui. Fitur kerja memerlukan akun. Penggunaan di server kampus dan integrasi SSO adalah tahap berikutnya; home server dan domain pribadi dipakai lebih dulu untuk pilot.

### Hasil yang diinginkan
1. Mahasiswa dapat mendaftar, melengkapi profil, memilih lomba, mencari tim atau menjalani lomba individu, mengikuti roadmap, dan mengajukan prestasi.
2. Validator dapat memelihara konten lomba dan pembinaan, memeriksa pengajuan serta bukti, dan memastikan statistik hanya memakai data sah.
3. Super admin dapat mengelola seluruh data, peran, konfigurasi, aturan poin, dan operasi sistem.
4. Publik dapat melihat daftar lomba yang diterbitkan dan ranking berdasarkan akumulasi poin dari prestasi lomba yang telah disetujui.
5. Setiap periode akademik baru dapat dibuat tanpa menghapus riwayat periode sebelumnya.

## 2. Prinsip produk
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
- Daftar/login email dan password; nama dan NIM unik; pemulihan akun; profil minat, keahlian, pengalaman, waktu tersedia; pilih target aktif.
- Rekomendasi calon partner yang dapat dijelaskan, undangan dan tim. Lomba individu tidak memaksa alur tim.
- Persiapan: roadmap berisi fase, materi, tugas, tenggat, progres, dan kontak WA konsultan yang telah diterbitkan validator.
- Pengajuan prestasi lomba dan prestasi mandiri lain dengan bukti; lihat antrean/status, catatan, revisi, dan riwayat.
- Tampilan kontribusi poin pribadi berdasarkan keputusan sah dan aturan poin yang berlaku.

### Validator
- CRUD dan publikasi kompetisi, periode, syarat, kuota/aturan tim, jadwal, roadmap, sumber, kontak konsultan, dan seleksi internal.
- Antrean pengajuan dengan filter, bukti privat, keputusan setuju/minta perbaikan/tolak, alasan, audit, serta mekanisme koreksi yang tercatat.
- Ringkasan operasional dan kualitas data.

### Super admin
- Hak validator, pengelolaan staf/peran, akun, konfigurasi institusi, periode aktif, bobot poin berversi, audit log, dan status sistem.
- Konfigurasi yang memengaruhi data historis harus punya jejak versi dan tanggal berlaku.

## 5. Alur inti dan kriteria penerimaan
### J1 Mahasiswa menuju persiapan
Daftar → login → lengkapi profil → pilih lomba → jika beregu, lihat rekomendasi dan bentuk tim → baca roadmap → tandai progres. Berhasil jika data tetap ada setelah refresh dan login di perangkat lain, aturan komposisi dipenuhi, dan transisi target/periode tidak menghapus riwayat.

### J2 Prestasi
Mahasiswa mengajukan prestasi dengan bukti → validator melihat data/bukti → setuju, meminta revisi, atau menolak → mahasiswa melihat alasan dan dapat revisi jika diminta → hanya yang disetujui masuk statistik. Berhasil jika keputusan dan perubahan bukti memiliki riwayat, file privat, dan tidak ada penghitungan ganda.

### J3 Konten validator
Validator membuat draft lomba, jadwal, roadmap, aturan tim, dan kontak konsultasi → meninjau → menerbitkan → publik melihat versi yang diterbitkan. Berhasil jika draft tidak bocor ke publik, tanggal dan sumber terlihat, serta konten dapat diperbarui untuk tahun berikutnya.

### J4 Ranking
Prestasi lomba disetujui → sistem memberi poin berdasarkan tingkat dan hasil serta versi aturan → ranking tahun akademik diperbarui → pembatalan/koreksi keputusan memperbarui ranking melalui peristiwa yang diaudit. Berhasil jika hasil dapat dihitung ulang dan tie break deterministik.

### J5 Operasi
Super admin mengundang/menonaktifkan validator, mengubah konfigurasi dan periode, meninjau audit. Operator melakukan deploy/rollback dan restore teruji tanpa kehilangan data yang tidak tercakup rencana pemulihan.

## 6. Aturan domain utama
- Satu target lomba aktif per mahasiswa per periode; target lama dan timnya diarsipkan secara logis, bukan dihapus.
- Peraturan tim berasal dari versi lomba yang berlaku. Undangan tidak boleh melewati kapasitas dan kedaluwarsa sesuai kebijakan yang terdokumentasi.
- Mahasiswa bebas mengajukan prestasi di luar target lombanya. Hanya prestasi berjenis lomba yang masuk ranking; kategori lain tetap tercatat dan dapat masuk statistik sesuai definisi.
- Status pengajuan: draft, menunggu, perlu_perbaikan, disetujui, ditolak, dibatalkan. Transisi, alasan, aktor, dan waktu dicatat. Pengajuan yang disetujui tidak diedit langsung; koreksi memakai tindakan khusus.
- Bukti adalah objek privat RustFS; database menyimpan metadata dan kunci objek, bukan URL publik permanen.
- Poin dihitung dari tingkat dan hasil, dengan tabel bobot berversi yang ditetapkan super admin. Nilai awal adalah usulan produk di docs/09 dan harus diuji terhadap contoh capaian kampus sebelum go-live.
- Tahun akademik mempunyai tanggal mulai/akhir dan status aktif/arsip; satu periode aktif pada satu waktu.

## 7. Nonfungsional dan kesiapan produksi
- API memakai Elysia di Bun, Prisma/MySQL, serta storage S3 compatible RustFS. Frontend React/Vite terpisah.
- Sesi aman, password di-hash, rate limit, validasi input, kontrol akses objek, audit, dan pencegahan upload berbahaya adalah syarat go-live.
- Aplikasi melayani satu origin HTTPS melalui proxy/tunnel; koneksi backend ke MySQL/RustFS tidak diekspos publik.
- GitHub Actions menghasilkan image frontend dan backend GHCR public. Kode dan image tidak mengandung rahasia. Root .env di server mengisi koneksi, domain, kunci sesi, dan tag image.
- Backup MySQL dan RustFS, pemantauan, prosedur rollback dan restore diuji sebelum data nyata dipakai.
- Antarmuka responsif, dapat dipakai dengan keyboard dan pembaca layar dasar, serta jelas untuk loading, kosong, error, dan keberhasilan.
- Uji performa dan kapasitas memakai target terukur pada staging; angka SLA dan retensi final masih perlu disahkan operasional kampus.

## 8. Batas rilis dan tahap lanjut
AI, login Google, SSO, multi-kampus, beasiswa, SKPI, klaim BAAK, pertemuan dosen terjadwal, dan statistik nasional berada di luar rilis pertama. SSO dipertimbangkan saat integrasi kampus; identitas yang semula diisi sendiri perlu dipadankan melalui proses migrasi yang diaudit. Fitur-fitur ini tidak boleh muncul sebagai aktif sebelum benar-benar ada dan disahkan.

## 9. Ukuran keberhasilan dan keputusan tertunda
Keberhasilan pilot dinilai lewat penyelesaian J1–J5 dengan pengguna nyata, akurasi data, dan kemampuan operasi lintas periode. Target numerik adopsi/performa tidak dikarang. Keputusan yang masih membutuhkan pemilik produk atau kampus: dasar publikasi nama di ranking, kebijakan retensi, domain resmi, RTO/RPO, sumber data SSO, dan bobot poin final. Lihat docs/14.

## 10. Dokumen turunan
Sitemap, akses, model data, API, desain UI, keamanan, roadmap, deployment, pengujian, dan bukti stage ada di docs/00–19. README root menyatakan status implementasi saat ini; TODO.md menyatakan urutan kerja.
