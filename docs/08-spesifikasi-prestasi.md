# 08 — Prestasi, bukti, dan verifikasi

## Data pengajuan
Mahasiswa dapat mengajukan tanpa target lomba. Form mencakup judul kegiatan, penyelenggara, tanggal capaian, kategori, tingkat, hasil, deskripsi ringkas, apakah terkait kompetisi/seleksi internal, peserta tim bila relevan, dan 1–3 bukti. Kategori lomba dipisahkan dari konferensi, olahraga, seni, dan lain-lain untuk aturan ranking. Kategori dan hasil yang dapat dipilih dikelola sebagai data referensi dengan kode stabil.

## Bukti di RustFS
Browser mengunggah multipart ke API pada origin aplikasi. Backend memeriksa sesi dan kepemilikan pengajuan, membuat object key acak dengan prefix privat, membatasi tipe PDF/JPEG/PNG dan ukuran, lalu meneruskan stream ke RustFS. Nama asli hanya metadata tampilan, tidak menjadi path. Bucket privat dan endpoint RustFS tetap internal; unduh melalui API yang memeriksa izin dan meneruskan file. Jika pengajuan dibatalkan/ditolak, kebijakan retensi menentukan penghapusan nanti. Pemindaian malware dan sanitasi metadata gambar menjadi gate produksi sesuai risiko deployment.

## Status dan aturan transisi
| Dari | Aksi | Ke | Syarat |
|---|---|---|---|
| draft | kirim | menunggu | field dan bukti valid |
| menunggu | minta perbaikan | perlu_perbaikan | alasan wajib |
| perlu_perbaikan | kirim revisi | menunggu | versi baru, bukti lama tetap tercatat |
| menunggu | setujui | disetujui | validator berwenang, cek duplikat |
| menunggu | tolak | ditolak | alasan wajib |
| draft/menunggu | batalkan | dibatalkan | pemilik, sebelum keputusan final |
| disetujui | koreksi | status koreksi sesuai aksi | super admin/validator berwenang, alasan, jejak dan pembalikan poin |

Keputusan tidak mengubah klaim/bukti versi sebelumnya. Satu tindakan verifikasi menghasilkan satu audit event. Prestasi disetujui dapat muncul pada dashboard; hanya lomba sah memengaruhi ranking. Seleksi internal bukan otomatis prestasi.

## Antrean validator
Filter status, periode, kategori, tingkat; cari nama dan kegiatan; urut prioritas dan umur antrean. Detail memperlihatkan data, versi, bukti, kemungkinan duplikat, riwayat, dan panel keputusan. Kesalahan jaringan tidak boleh menampilkan keputusan sukses. Dua validator yang membuka data sama harus mendapat konflik versi, bukan saling menimpa.

Validator mencocokkan nama pada klaim dan bukti sebatas pemeriksaan prestasi, tanpa menyatakan identitas mahasiswa telah diverifikasi oleh kampus. Sengketa identitas atau klaim palsu harus dapat ditandai, disembunyikan sementara dari ranking, lalu diselesaikan melalui koreksi yang diaudit.

## Uji penerimaan
Pengajuan tanpa target, revisi berkali-kali, bukti gagal unggah, bukti milik orang lain, file palsu, keputusan serentak, koreksi setelah disetujui, statistik dan poin setelah pembalikan, serta kebocoran URL bukti.
