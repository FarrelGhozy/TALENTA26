# 06 — Matching, undangan, dan tim

## Tujuan
Membantu mahasiswa menemukan rekan yang sesuai untuk satu edisi lomba beregu. Rekomendasi adalah saran yang dapat dijelaskan, bukan ukuran kemampuan atau keputusan penerimaan.

## Input dan kelayakan
Kandidat harus aktif pada institusi dan edisi lomba yang sama, belum berada pada tim terkunci, tidak mengundang dirinya, dan memiliki profil yang boleh ditampilkan. Aturan format individu/beregu, jumlah minimum/maksimum, peran wajib, serta tenggat undangan berasal dari versi kompetisi yang diterbitkan validator.

## Skor awal yang dapat diuji
Rumus demo lama boleh menjadi baseline eksperimen: kecocokan target, peran yang melengkapi tim, skill yang dibutuhkan, overlap waktu, dan minat. Saat backend dibangun, bobot, definisi overlap, data hilang, serta fairness diuji dengan contoh nyata; hasil tidak ditampilkan sebagai persentase probabilitas jika tidak terkalibrasi. UI menampilkan label seperti Kesesuaian tinggi dan alasan konkret. Hindari leaderboard kandidat.

Aturan awal yang diwarisi dari demo untuk ditinjau, bukan kebijakan final: maksimum 5 undangan aktif, masa berlaku 14 hari, pembentukan tim mengikuti min/max kompetisi, serta pengarsipan tim saat target berganti. Validator/super admin dapat mengubah aturan untuk edisi mendatang; perubahan tidak merusak tim lama.

## Transaksi
- Kirim undangan: cek kepemilikan tim, status target, kapasitas, duplikat, jumlah aktif, dan tenggat dalam satu transaksi.
- Terima undangan: cek penerima, status belum kedaluwarsa, slot tim, peran dan konflik keanggotaan. Dua penerimaan bersamaan tidak boleh melewati maksimum.
- Tolak/batalkan: ubah status dan catat peristiwa; tidak membeberkan alasan pribadi penolak.
- Keluar tim: sebelum tim terkunci seleksi, mahasiswa dapat keluar dengan konfirmasi; setelahnya memerlukan tindakan validator yang diaudit.
- Ganti target: arsipkan target/tim lama secara atomik, jangan hapus riwayat.
- Tidak ada kandidat: jelaskan alasannya, sediakan ubah filter, permintaan bantuan validator, dan alur individu hanya jika aturan lomba mengizinkan.

## Privasi
Kartu kandidat cukup nama tampilan, prodi, minat/skill yang dibagikan, dan ketersediaan ringkas. NIM, email, nomor WA, serta bukti prestasi tidak ditampilkan. Akses detail hanya sesuai keanggotaan tim dan kebijakan data.

## Uji wajib
Kapasitas tepat batas, undangan kedaluwarsa, penerimaan serentak, satu mahasiswa dua tim aktif, target berubah, lomba individu, kandidat kosong, serta akun yang mencoba membaca undangan orang lain.
