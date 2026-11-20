# 05 — Spesifikasi fungsional dan penerimaan

Semua item di bawah adalah target, bukan status implementasi. ID kebutuhan stabil untuk backlog dan uji docs/18.

| ID | Kebutuhan | Aturan penerimaan |
|---|---|---|
| AUTH-01 | Registrasi mahasiswa manual | nama, NIM, email, password; NIM dan email unik; akun publik hanya mahasiswa; pesan duplikat aman |
| AUTH-02 | Login, logout, pemulihan | sesi aman, logout memutus sesi, reset satu kali dan kedaluwarsa; rate limit; tidak ada Google login |
| AUTH-03 | Bootstrap staf | seed awal super admin lewat secret dan prosedur satu kali; validator dibuat/dinonaktifkan super admin; seed tidak berisi password tetap |
| PROF-01 | Profil mahasiswa | prodi, angkatan, minat, skill, pengalaman, waktu tersedia; simpan draft; perubahan terlihat lintas perangkat |
| PROF-02 | Identitas | NIM tidak tampil publik; status identitas belum diverifikasi kampus; NIM tidak otomatis dipercaya untuk fasilitas resmi |
| COMP-01 | Katalog | pengunjung hanya melihat konten terbit; cari/filter tahun, bidang, tingkat, format tim, status |
| COMP-02 | Konten validator | draft, pratinjau, terbit, arsip; syarat, sumber, jadwal, aturan tim, pembaruan tanggal |
| COMP-03 | Periode | kompetisi dapat diadakan ulang; edisi berbeda punya ID sendiri dan relasi ke tahun akademik |
| TARG-01 | Target | satu aktif per mahasiswa/periode; ganti target dengan konfirmasi dan arsip tim lama |
| MATCH-01 | Rekomendasi | hanya kandidat yang memilih kompetisi/edisi sama dan memenuhi syarat; alasan dan batas data jelas |
| TEAM-01 | Undangan | pengirim dan penerima terotorisasi; kapasitas, duplikat, kedaluwarsa dan transaksi serentak aman |
| TEAM-02 | Tim | status dibentuk dari anggota diterima dan komposisi; lomba individu tidak memerlukan tim |
| ROAD-01 | Roadmap | validator membuat fase, tugas, sumber, tenggat; mahasiswa melihat versi terbit dan menandai progres sendiri |
| ROAD-02 | Konsultasi | validator mengisi kontak WA, status persetujuan dan konteks kapasitas; tombol hanya untuk kontak yang diterbitkan |
| SEL-01 | Seleksi internal | jadwal, peserta/tim, hasil dan status konfirmasi; hasil tidak otomatis menjadi prestasi sah |
| ACH-01 | Pengajuan | individu/tim, kategori, tingkat, hasil, tanggal, penyelenggara, bukti 1–3 file; dapat dibuat tanpa target |
| ACH-02 | Revisi | mahasiswa hanya memperbaiki saat perlu_perbaikan; versi sebelumnya tetap tersedia untuk audit |
| VER-01 | Keputusan | validator/super admin setuju, minta perbaikan, tolak; alasan wajib untuk dua tindakan terakhir; jejak aktor/waktu |
| VER-02 | Koreksi | keputusan sah yang salah dibatalkan/dikoreksi melalui aksi khusus beralasan dan audit; poin serta statistik dihitung ulang |
| RANK-01 | Poin | hanya prestasi lomba disetujui; aturan tingkat×hasil berversi; satu pengajuan satu pemberian poin aktif |
| RANK-02 | Ranking | tahun akademik default; total sepanjang waktu terpisah; tie break stabil; hanya identitas publik minimum |
| DASH-01 | Dashboard | mahasiswa/validator/super admin sesuai scope, setiap angka punya definisi, periode dan sumber |
| ADMIN-01 | Pengelolaan | super admin mengatur periode, poin, staf, role, audit dan status sistem; semua perubahan sensitif diaudit |
| OPS-01 | Deploy | dua image GHCR, Compose server, root .env, migrasi terkontrol, health, backup dan rollback |

## Validasi umum
Semua input divalidasi di backend. Tanggal tidak boleh keliru karena zona waktu; lampiran diperiksa tipe MIME nyata, ekstensi, ukuran, dan jumlah. Teks bebas dibatasi panjang, di-escape saat tampil, dan tidak menerima HTML aktif. Pagination, sort, dan filter memiliki batas agar query tidak menghabiskan server. Operasi mutasi yang rentan klik ganda memakai idempotensi/constraint database.

## Keadaan antarmuka
Setiap daftar punya empty state yang menjelaskan langkah lanjut. Form mempertahankan data saat gagal, menunjukkan error di field, mencegah submit ganda, dan memberi konfirmasi sebelum tindakan yang mengubah riwayat. Layar tidak menampilkan keberhasilan palsu saat API gagal.

## Perubahan dari demo
Rute /daftar, admin konten, revisi pengajuan, bukti nyata, ranking, dan banyak alur di atas belum ada di repo. Adapter API saat ini adalah kerangka, bukan kontrak akhir. Migrasi implementasi mengikuti docs/13.
