# 09 — Dashboard dan ranking

## Prinsip angka
Setiap metrik menyebut definisi, rentang waktu, institusi, status data, dan waktu pembaruan. Statistik tidak menyamakan pengajuan dengan prestasi sah. Tidak ada klaim nasional atau peringkat kemampuan.

## Dashboard mahasiswa
Target aktif, status tim, progres roadmap, tenggat, pengajuan menurut status, prestasi disetujui, dan poin lomba tahun akademik. Tampilkan langkah berikutnya berdasarkan keadaan, termasuk saat profil kosong atau pengajuan perlu perbaikan.

## Dashboard validator
Konten draft/usang, jadwal mendekat, antrean pengajuan, perbaikan yang kembali, jumlah keputusan, data yang perlu tindakan, dan hasil seleksi. Filter periode; setiap tabel dapat menuju item sumber.

## Dashboard super admin
Jumlah akun dan staf aktif, aktivitas konten, tren pengajuan dan prestasi sah, ringkasan ranking, audit tindakan sensitif, status API/database/storage/backup, dan pengingat operasional. Status infrastruktur tidak boleh mengungkap rahasia.

## Ranking publik
Default: tahun akademik aktif. Riwayat sepanjang waktu ditampilkan sebagai tampilan terpisah. Hanya prestasi kategori lomba berstatus disetujui yang memberi poin. Tidak ada filter bidang pada rilis awal. Nama tampilan dan poin dipublikasikan; NIM, email, kontak, berkas dan detail internal tetap privat. Foto default tidak dipublikasikan sampai kebijakan aset/profil resmi disahkan.

### Usulan bobot awal untuk uji produk
| Tingkat \ Hasil | Partisipasi | Finalis/nominasi | Juara 3 | Juara 2 | Juara 1 |
|---|---:|---:|---:|---:|---:|
| Kampus/lokal | 1 | 2 | 4 | 6 | 8 |
| Nasional | 2 | 5 | 10 | 14 | 18 |
| Internasional | 3 | 8 | 16 | 22 | 30 |

Ini bobot awal rekomendasi, bukan kebijakan kampus final. Super admin dapat menyetujui/mengubah sebelum go-live. Hasil khusus (best delegate, penghargaan lain) dipetakan secara eksplisit oleh validator/super admin ke kelas poin; tidak boleh mengarang nilai saat pengajuan masuk. Perubahan bobot membuat versi baru untuk periode berikutnya. Setiap award menyimpan ruleVersion dan poin yang diberikan; jangan menghitung ulang riwayat diam-diam.

Skor mahasiswa = jumlah poin award aktif pada periode. Pengajuan yang dibatalkan/koreksi membalik award lewat ledger, bukan menghapusnya. Urutan: poin menurun, jumlah Juara 1 menurun, jumlah prestasi sah menurun, lalu nama dan ID stabil. Mahasiswa bernilai 0 tidak tampil dalam ranking publik. Batas tampilan, pagination, dan waktu cache harus didokumentasikan.

## Perlindungan publikasi
Pemilik produk memilih publikasi tanpa persetujuan terpisah. Sebelum go-live, kebijakan privasi dan dasar publikasi nama perlu disahkan oleh pihak kampus/pengelola; mahasiswa diberi pemberitahuan jelas saat mendaftar. Ini adalah gate operasional, bukan perubahan diam-diam atas keputusan produk. Rujukan: UU 27/2022 tentang Pelindungan Data Pribadi, khususnya prinsip pemrosesan dan dasar pemrosesan (https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022).

## Uji
Poin dari kategori non-lomba tidak masuk; status belum disetujui tidak masuk; tie break; koreksi; tahun akademik baru; perubahan bobot; agregasi tanpa data; cache kedaluwarsa; identitas privat tidak muncul.
