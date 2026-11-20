# 03 — Alur pengguna dan status

## J1 Daftar, profil, target, tim, persiapan
Pengunjung melihat lomba → mahasiswa daftar/login manual → mengisi profil → memilih target kompetisi aktif pada periode → lomba individu langsung menuju persiapan; lomba beregu menuju rekomendasi/undangan/tim → roadmap dan progres. Jika tidak ada kandidat, tampilkan filter yang dapat dilonggarkan, jalur hubungi validator, dan penjelasan; tidak membuat tim palsu. Jika target diganti, simpan riwayat target dan arsipkan tim lama setelah konfirmasi.

## J2 Pengajuan dan validasi
Mahasiswa mengisi draft → unggah bukti → kirim → status menunggu. Validator membuka antrean dan bukti privat → setujui, minta perbaikan dengan alasan, atau tolak dengan alasan. Perbaikan membuat revisi baru dan kembali menunggu. Setelah disetujui, data masuk statistik; jika prestasi lomba, peristiwa poin dibuat. Koreksi keputusan tidak menimpa jejak lama.

## J3 Konten
Validator membuat draft kompetisi, syarat, jadwal, aturan tim, roadmap, konsultan/WA, seleksi → pratinjau → terbitkan. Publik hanya menerima konten terbit. Perubahan jadwal mencatat tanggal dan sumber. Konten bisa diarsip tanpa memutus referensi pengajuan lama.

## J4 Tahun akademik baru
Super admin membuat periode berikutnya dan aturan poin berversi → validator mengisi kompetisi/roadmap baru atau menyalin draft terkurasi → periode diaktifkan → target dan ranking periode baru dimulai; riwayat periode lama tetap dapat dibaca. Satu periode aktif untuk satu institusi.

## State inti
| Objek | Status | Perubahan sah |
|---|---|---|
| Konten kompetisi | draft, terbit, arsip | draft→terbit→arsip; revisi terbit memerlukan jejak |
| Undangan | menunggu, diterima, ditolak, kedaluwarsa, dibatalkan | hanya penerima menjawab; sistem mengakhiri saat tenggat |
| Tim | mencari, terbentuk, terkunci_seleksi, arsip | perubahan anggota validasi ulang aturan |
| Pengajuan | draft, menunggu, perlu_perbaikan, disetujui, ditolak, dibatalkan | setiap transisi diaudit |
| Akun | aktif, nonaktif | penonaktifan memutus sesi baru tanpa menghapus riwayat |

Setiap alur harus mengatur ulang percobaan setelah jaringan gagal, mencegah klik ganda, menampilkan pesan validasi per field, dan mempertahankan input yang aman saat error.
