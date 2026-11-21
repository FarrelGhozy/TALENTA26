# 02 — Pengguna dan akses

## Peran rilis pertama
Pengunjung tanpa akun; mahasiswa mendaftar sendiri dengan email, password, nama dan NIM (langsung aktif pada rilis pertama karena verifikasi email ditunda per K-21); validator diangkat super admin dengan nama asli staf (`fullName`); super admin dibuat saat bootstrap dengan nama asli staf. Dosen/konsultan adalah kontak, bukan role. Registrasi Google tidak ada. Identitas mahasiswa belum terverifikasi kampus; SSO ditunda.

## Matriks izin target
| Kemampuan | Publik | Mahasiswa | Validator | Super admin |
|---|---|---|---|---|
| Lihat lomba terbit, keterangan poin, dan ranking | ya | ya | ya | ya |
| Profil diri (termasuk avatar privat), target, undangan, tim | tidak | milik sendiri dan anggota tim terbatas | baca sesuai kebutuhan operasional | semua, diaudit |
| Ajukan, revisi penuh, atau batalkan prestasi (individu/kelompok) | tidak | milik sendiri (atau kelompok yang diikuti) | tidak mengubah isi klaim | tindakan koreksi khusus, diaudit |
| Lihat bukti privat | tidak | milik sendiri / kelompoknya | antrean verifikasi | semua dengan alasan audit |
| Putuskan verifikasi & override poin (beralasan + audit) | tidak | tidak | ya | ya |
| Kelola kompetisi, sub-lomba, poin per lomba, roadmap, seleksi (individu/beregu), kontak WA | tidak | tidak | ya | ya |
| Kelola akun/peran staf (dengan nama asli) | tidak | tidak | tidak | ya |
| Atur template poin berversi, master jenis/sub-lomba, pergantian periode, sistem | tidak | tidak | tidak | ya |
| Lihat audit dan kesehatan sistem | tidak | tidak | terbatas domain sendiri | ya |

## Aturan objek
Backend mengambil user ID dan role dari sesi, bukan parameter body/query. Query mahasiswa selalu dibatasi ke dirinya, data calon partner yang sudah disetujui untuk tampil, atau tim yang dia ikuti. Validator hanya melihat data satu institusi; rilis pertama tetap memakai institutionId agar perluasan nanti tidak mencampur data. Akses bukti prestasi dan avatar mahasiswa memakai streaming/proxy terotorisasi melalui API, tidak pernah bucket publik dan tidak pernah mengembalikan `passwordHash` atau PII lintas pengguna. Perubahan role, keputusan, override poin, publikasi konten, pergantian periode, dan koreksi poin dicatat actor (dengan nama asli staf), waktu, objek, sebelum/sesudah.

## Akun dan transisi
Daftar → akun langsung `active` pada rilis pertama (verifikasi kepemilikan email ditunda ke pasca-rilis awal per K-21); autentikasi tidak berarti identitas kampus telah sah. NIM/email unik di database. Akun staf tidak bisa didaftarkan dari halaman publik dan wajib memiliki `fullName` agar tidak tampil sebagai label peran generik. Staf dinonaktifkan tanpa menghapus riwayat aksinya, dan penonaktifan langsung mencabut sesi aktif. Reset password tidak mengungkap apakah email terdaftar. SSO kelak perlu prosedur pemadanan akun agar NIM lama tidak otomatis dianggap benar.
