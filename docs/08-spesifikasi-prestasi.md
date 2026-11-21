# 08 — Prestasi, bukti, dan verifikasi

## Data pengajuan
Mahasiswa dapat mengajukan tanpa target lomba. Form mencakup judul kegiatan, penyelenggara, tanggal capaian (divalidasi terhadap zona waktu `Asia/Jakarta`), kategori utama (`kompetisi`, `konferensi`, `olahraga`, `seni`, `nominasi`, `lain`, `seleksi_internal`), **jenis lomba & sub-lomba/cabang** (dipilih dari master jenis/sub-lomba atau keterkaitan kompetisi, menampilkan keterangan poin secara transparan), tingkat (`lokal`, `nasional`, `internasional`), hasil (`partisipasi`, `finalis`, `juara_3`, `juara_2`, `juara_1`, `penghargaan_khusus`), deskripsi ringkas, **tipe kepesertaan (`individu` atau `kelompok`)**, daftar peserta tim bila kelompok (bisa ditarik dari tim pembinaan aktif atau memilih rekan mahasiswa satu institusi), penanda seleksi internal, dan 1–3 bukti privat. Kategori lomba dipisahkan dari non-lomba untuk aturan ranking.

## Bukti di RustFS
Browser mengunggah multipart ke API pada origin aplikasi (tidak ada berkas contoh sintetis demo di build produksi). Backend memeriksa sesi dan kepemilikan pengajuan, membuat object key acak dengan prefix privat, membatasi tipe PDF/JPEG/PNG (validasi MIME, ekstensi, magic byte isi berkas, dan ukuran nyata buffer maksimal **8 MB** per berkas), lalu meneruskan stream ke RustFS. Nama asli hanya metadata tampilan, tidak menjadi path. Bucket privat dan endpoint RustFS tetap internal; unduh melalui API yang memeriksa izin (pemilik, anggota kelompok terkait, validator, atau super admin) dan meneruskan file. Saat revisi, mahasiswa dapat mengganti berkas bukti lama (`isActive: false`, `supersededByRevisionId`) agar tetap berada dalam batas 1–3 berkas aktif tanpa menghapus jejak bukti lama untuk audit. Jika pengajuan dibatalkan/ditolak, kebijakan retensi menentukan penghapusan nanti. Pemindaian malware dan sanitasi metadata gambar menjadi gate produksi sesuai risiko deployment (`O-06`).

## Status dan aturan transisi
| Dari | Aksi | Ke | Syarat |
|---|---|---|---|
| *(pengajuan baru)* | kirim langsung | menunggu | field, enum, tanggal Asia/Jakarta, dan 1–3 bukti valid *(simpan draft ditunda ke pasca-rilis awal per K-17)* |
| menunggu | minta perbaikan | perlu_perbaikan | validator berwenang, `version` cocok, alasan wajib |
| perlu_perbaikan | kirim revisi penuh | menunggu | pemilik; dapat mengubah semua field + mengganti bukti aktif; snapshot versi lama & bukti lama tetap tercatat |
| menunggu | setujui | disetujui | validator berwenang, `version` cocok, `idempotencyKey`; gunakan poin rekomendasi sistem atau **override poin oleh validator dengan alasan wajib**; cek duplikat |
| menunggu | tolak | ditolak | validator berwenang, `version` cocok, alasan wajib |
| menunggu | batalkan | dibatalkan | pemilik, hanya sebelum diputuskan validator |
| disetujui | koreksi | ditolak / perlu_perbaikan | validator/super admin berwenang, `version` cocok, alasan wajib, jejak audit, dan pembalikan poin atomik untuk **seluruh anggota** |

Keputusan hanya sah pada status `menunggu` (menolak aksi `/decisions` terhadap status selain `menunggu`). Keputusan tidak mengubah klaim/bukti versi sebelumnya. Setiap transisi menghasilkan `AchievementDecision` dan satu `AuditEvent` dengan nama asli aktor. Pada prestasi kelompok (`K-16`), persetujuan langsung mencatat entri `PointLedger` bernilai poin penuh untuk seluruh anggota terdaftar secara atomik, dan koreksi membalik seluruh award aktif anggota tanpa double-reversal. Seleksi internal bukan otomatis prestasi.

## Antrean validator
Filter status, periode, kategori/jenis, tingkat; cari nama mahasiswa, NIM, dan kegiatan; urut prioritas dan umur antrean. Detail (`/validator/prestasi/:id`) memperlihatkan data lengkap (termasuk jenis & sub-lomba, anggota kelompok, deskripsi), versi, bukti privat, peringatan kemungkinan duplikat (termasuk tumpang tindih anggota tim), riwayat revisi, riwayat keputusan, **kalkulasi poin rekomendasi beserta sumber aturan/template & keterangannya**, serta panel keputusan (hanya muncul saat status `menunggu`) dengan input opsional **override poin + alasan wajib**. Kesalahan jaringan tidak boleh menampilkan keputusan sukses. Dua validator yang membuka data sama harus mendapat konflik versi (`409 Conflict`) melalui penguncian atomik, bukan saling menimpa.

Validator mencocokkan nama pada klaim dan bukti sebatas pemeriksaan prestasi, tanpa menyatakan identitas mahasiswa telah diverifikasi oleh kampus. Sengketa identitas atau klaim palsu harus dapat ditandai, dikoreksi agar poin seluruh anggota terkait dibalikkan dari ranking, lalu diselesaikan melalui audit.

## Uji penerimaan
Pengajuan individu & kelompok (poin penuh ke semua anggota), pengajuan dengan jenis & sub-lomba, override poin validator beralasan & audit, pembatalan oleh mahasiswa, revisi penuh + penggantian berkas saat sudah 3 file, bukti gagal unggah + cleanup orphan, bukti milik orang lain, file palsu, keputusan serentak, re-approval & koreksi ganda tanpa double-reversal/double-count, serta kebocoran URL bukti.
