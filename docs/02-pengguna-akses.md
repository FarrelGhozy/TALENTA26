# 02 — Pengguna dan akses

## Peran rilis pertama
Pengunjung tanpa akun; mahasiswa mendaftar sendiri dengan email, password, nama dan NIM; validator diangkat super admin; super admin dibuat saat bootstrap. Dosen/konsultan adalah kontak, bukan role. Registrasi Google tidak ada. Identitas mahasiswa belum terverifikasi kampus; SSO ditunda.

## Matriks izin target
| Kemampuan | Publik | Mahasiswa | Validator | Super admin |
|---|---|---|---|---|
| Lihat lomba terbit/ranking | ya | ya | ya | ya |
| Profil diri, target, undangan, tim | tidak | milik sendiri dan anggota tim terbatas | baca sesuai kebutuhan operasional | semua, diaudit |
| Ajukan/revisi prestasi | tidak | milik sendiri | tidak mengubah isi klaim | tindakan koreksi khusus, diaudit |
| Lihat bukti privat | tidak | milik sendiri | antrean yang ditugaskan | semua dengan alasan audit |
| Putuskan verifikasi | tidak | tidak | ya | ya |
| Kelola kompetisi, roadmap, seleksi, kontak WA | tidak | tidak | ya | ya |
| Kelola akun/peran staf | tidak | tidak | tidak | ya |
| Atur bobot poin, periode, sistem | tidak | tidak | tidak | ya |
| Lihat audit dan kesehatan sistem | tidak | tidak | terbatas domain sendiri | ya |

## Aturan objek
Backend mengambil user ID dan role dari sesi, bukan parameter body/query. Query mahasiswa selalu dibatasi ke dirinya, data calon partner yang sudah disetujui untuk tampil, atau tim yang dia ikuti. Validator hanya melihat data satu institusi; rilis pertama tetap memakai institutionId agar perluasan nanti tidak mencampur data. Akses bukti memakai URL sementara atau proxy terotorisasi, tidak pernah bucket publik. Perubahan role, keputusan, publikasi konten, dan koreksi poin dicatat actor, waktu, objek, sebelum/sesudah.

## Akun dan transisi
Daftar → akun aktif setelah pemeriksaan email bila diaktifkan; autentikasi tidak berarti identitas kampus telah sah. NIM/email unik di database. Akun staf tidak bisa didaftarkan dari halaman publik. Staf dinonaktifkan tanpa menghapus riwayat aksinya. Reset password tidak mengungkap apakah email terdaftar. SSO kelak perlu prosedur pemadanan akun agar NIM lama tidak otomatis dianggap benar.
