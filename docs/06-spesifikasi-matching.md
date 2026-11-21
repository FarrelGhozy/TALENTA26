# 06 — Matching, undangan, dan tim

## Tujuan
Membantu mahasiswa menemukan rekan yang sesuai untuk satu edisi lomba beregu. Rekomendasi adalah saran yang dapat dijelaskan, bukan ukuran kemampuan atau keputusan penerimaan.

## Input dan kelayakan
Kandidat harus aktif pada institusi dan edisi lomba yang sama, belum berada pada tim terkunci, tidak mengundang dirinya, dan memiliki profil yang boleh ditampilkan. Aturan format individu/beregu, jumlah minimum/maksimum, peran wajib, serta tenggat undangan berasal dari versi kompetisi yang diterbitkan validator.

## Skor awal yang dapat diuji
Rumus demo lama boleh menjadi baseline eksperimen: kecocokan target, peran yang melengkapi tim, skill yang dibutuhkan, overlap waktu, dan minat. Saat backend dibangun, bobot, definisi overlap, data hilang, serta fairness diuji dengan contoh nyata; hasil tidak ditampilkan sebagai persentase probabilitas jika tidak terkalibrasi. UI menampilkan label seperti Kesesuaian tinggi dan alasan konkret. Hindari leaderboard kandidat.

Aturan global default rilis pertama (disahkan melalui `K-19` di `docs/14-keputusan-terbuka.md`): maksimum **5 undangan aktif** per tim, masa berlaku undangan **14 hari**, status tim `terbentuk` di backend ditentukan oleh pemenuhan rentang jumlah anggota (`minTeamMembers`–`maxTeamMembers`), serta pengarsipan tim secara atomik saat target berganti atau periode baru diaktifkan. Peran wajib (`requiredRoles`) dan keberagaman lintas program studi ditampilkan sebagai indikator/saran pada antarmuka agar tidak memblokir lomba yang mengizinkan satu program studi.

## Transaksi
- Kirim undangan: cek kepemilikan tim, status target, institusi yang sama, status akun penerima aktif, kapasitas, duplikat, batas 5 undangan aktif, dan tenggat dalam satu transaksi.
- Terima undangan: cek penerima, status undangan belum kedaluwarsa, status tim masih aktif (`mencari`/`terbentuk`, bukan `terkunci_seleksi`/`arsip`), slot tim (`FOR UPDATE`), dan konflik keanggotaan. Dua penerimaan bersamaan tidak boleh melewati maksimum. Bila anggota pernah keluar (`left`) lalu diundang lagi, keanggotaan diaktifkan kembali (upsert/update) tanpa melanggar constraint unik. Bila kapasitas sudah penuh, status undangan diperbarui menjadi `kedaluwarsa` di luar transaksi yang di-rollback.
- Tolak/batalkan: penerima dapat menolak (`ditolak`); pengirim dapat membatalkan undangan aktif (`dibatalkan`) melalui endpoint khusus pembatalan. Semua perubahan dicatat di audit tanpa membeberkan alasan pribadi penolak.
- Keluar tim: sebelum tim terkunci seleksi, mahasiswa dapat keluar dengan konfirmasi; setelah `terkunci_seleksi`, keluar mandiri diblokir dan status kunci tampil jelas di UI.
- Ganti target: tampilkan dialog konfirmasi dampak, lalu arsipkan target dan keluar/arsipkan tim lama secara atomik (memblokir bila tim sudah `terkunci_seleksi`), jangan hapus riwayat.
- Lomba individu & kandidat kosong: bila target mahasiswa adalah lomba `individu`, arahkan langsung ke ruang persiapan tanpa meminta cari partner. Bila lomba beregu dan tidak ada kandidat, jelaskan alasannya, sediakan ubah filter, dan jalur hubungi validator resmi (tanpa nomor WA dummy atau emoji).

## Privasi
Kartu kandidat cukup nama tampilan, prodi, minat/skill yang dibagikan, label kesesuaian + alasan konkret (bukan skor persentase mentah), dan ketersediaan ringkas. NIM, email, nomor WA, `passwordHash`, serta bukti prestasi tidak boleh dikirim API atau ditampilkan. Akses detail anggota tim terbatas pada tim aktif yang diikuti.

## Uji wajib
Kapasitas tepat batas, undangan kedaluwarsa, penerimaan serentak, satu mahasiswa dua tim aktif, target berubah, lomba individu, kandidat kosong, serta akun yang mencoba membaca undangan orang lain.
