# 03 — Alur pengguna dan status

## J1 Daftar, profil, target, tim, persiapan
Pengunjung melihat lomba → mahasiswa daftar/login manual (langsung aktif pada rilis awal) → mengisi profil (termasuk avatar privat opsional di RustFS) → memilih target kompetisi aktif pada periode → lomba individu langsung menuju persiapan; lomba beregu menuju rekomendasi/undangan/tim → roadmap dan progres. Jika tidak ada kandidat, tampilkan filter yang dapat dilonggarkan, jalur hubungi validator, dan penjelasan; tidak membuat tim palsu. Jika target diganti, tampilkan konfirmasi dampak, simpan riwayat target, dan arsipkan tim lama secara atomik. Pengirim dapat membatalkan undangan aktif (`dibatalkan`).

## J2 Pengajuan dan validasi
Mahasiswa mengisi pengajuan (individu atau kelompok dengan daftar anggota, jenis lomba, sub-lomba/cabang, serta melihat keterangan aturan poin) → unggah 1–3 bukti privat → kirim langsung → status `menunggu` (dapat dibatalkan pemilik menjadi `dibatalkan` sebelum diputuskan; simpan draft ditunda ke pasca-rilis awal). Validator membuka antrean dan melihat detail lomba, sub-lomba, anggota kelompok, bukti privat, potensi duplikat, riwayat revisi/keputusan, serta kalkulasi poin rekomendasi + keterangan sumber aturannya → pilih setujui (pakai poin rekomendasi atau override poin dengan alasan wajib), minta perbaikan dengan alasan, atau tolak dengan alasan. Perbaikan mengizinkan revisi seluruh field serta penggantian berkas bukti (bukti lama tetap tercatat untuk audit) lalu kembali ke `menunggu`. Setelah disetujui, data masuk statistik; jika prestasi lomba, peristiwa poin dibuat di ledger untuk pengaju (atau seluruh anggota aktif secara atomik bila kelompok). Koreksi keputusan membalik poin seluruh anggota terkait tanpa menimpa jejak lama.

## J3 Konten
Validator membuat/mengedit draft kompetisi, jenis/sub-lomba, aturan poin perlombaan (pilih template poin atau custom + keterangan), syarat, jadwal, aturan tim, roadmap multi-fase (tanpa menghapus progres mahasiswa yang sudah ada), konsultan/WA, dan seleksi internal (mendukung tim beregu maupun peserta individu) → pratinjau → terbitkan. Publik hanya menerima konten terbit. Perubahan jadwal mencatat tanggal dan sumber. Konten bisa diarsip tanpa memutus referensi pengajuan lama.

## J4 Tahun akademik baru (Manajemen Pergantian Periode)
Super admin membuka bagian Manajemen Pergantian Periode di `/super-admin`, membuat periode berikutnya (nama, tahun, semester, tanggal mulai/akhir) serta template/aturan poin berversi → validator menyiapkan kompetisi/sub-lomba/roadmap baru → super admin meninjau pratinjau dampak aktivasi (target aktif & tim aktif periode berjalan) → mengonfirmasi aktivasi periode baru → sistem menonaktifkan periode lama, mengaktifkan periode baru, dan mengarsipkan target serta tim periode lama secara atomik tanpa menghapus riwayat; ranking periode baru dimulai dari nol sedangkan histori periode lama dan lifetime tetap utuh. Satu periode aktif untuk satu institusi.

## State inti
| Objek | Status | Perubahan sah |
|---|---|---|
| Konten kompetisi | draft, published, archived | draft→published→archived; revisi terbit memerlukan jejak |
| Undangan | diajukan, diterima, ditolak, kedaluwarsa, dibatalkan | penerima menjawab (diterima/ditolak); pengirim dapat membatalkan (`dibatalkan`); sistem mengakhiri saat tenggat (default 14 hari, maks 5 aktif) |
| Tim | mencari, terbentuk, terkunci_seleksi, arsip | `terbentuk` berdasarkan rentang min–max anggota; perubahan anggota memvalidasi ulang status; terkunci saat lolos seleksi terkonfirmasi |
| Pengajuan | menunggu, perlu_perbaikan, disetujui, ditolak, dibatalkan *(draft ditunda)* | `menunggu→perlu_perbaikan/disetujui/ditolak/dibatalkan`; `perlu_perbaikan→menunggu` via revisi; `disetujui→ditolak/perlu_perbaikan` hanya via koreksi beralasan & pembalikan poin |
| Akun | active, suspended *(pending_verification ditunda)* | penonaktifan (`suspended`) langsung mencabut semua sesi aktif tanpa menghapus riwayat |

Setiap alur harus mengatur ulang percobaan setelah jaringan gagal, mencegah klik ganda, menampilkan pesan validasi per field, dan mempertahankan input yang aman saat error.
