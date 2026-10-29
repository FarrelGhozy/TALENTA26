# 00 — Gambaran Umum TALENTA

## 1. Identitas Produk
- **Nama:** TALENTA — Platform Pembinaan dan Prestasi Mahasiswa.
- **Tagline usulan:** Dari Kenali Potensi sampai Catat Prestasi.
- **Fokus awal:** Kompetisi nasional Belmawa yang dipilih tim (contoh: PKM, PIMNAS, ON-MIPA, GEMASTIK, KMI Expo, dll — daftar final di `07-spesifikasi-roadmap.md`).
- **Jalur kedua:** Prestasi mandiri — konferensi internasional, Best Delegate, kejuaraan olahraga, nominasi, kompetisi eksternal, capaian lain sesuai kebijakan kampus.

## 2. Masalah (PRB-01 s/d PRB-05, perlu validasi)
1. Mahasiswa tidak tahu kompetisi yang cocok → butuh katalog + panduan pilih target.
2. Sulit cari partner beregu yang cocok (target, skill, waktu) → butuh rekomendasi + undangan + status tim.
3. Persiapan butuh arahan materi/latihan/target/jadwal → butuh roadmap template.
4. Waktu/anggaran dosen terbatas → belajar mandiri default, konsultasi opsional sesuai kapasitas.
5. Prestasi luar jalur pembinaan tercecer → butuh formulir mandiri + verifikasi + dashboard terverifikasi.

> Status: rumusan awal blueprint, **belum tervalidasi**. Tahap 1 mock dipakai untuk uji validasi (lihat `13-peta-jalan.md`).

## 3. Tujuan Produk (dari PRD §1.1)
1. Bantu pilih kompetisi relevan (minat, skill, pengalaman, kesiapan, target).
2. Bantu temukan partner tim.
3. Beri panduan persiapan mandiri (materi, latihan, target, tenggat).
4. Sediakan konsultasi opsional tanpa menjadikan pelatihan langsung satu-satunya pembinaan.
5. Tampung prestasi binaan maupun mandiri.
6. Bantu pengelola pantau partisipasi, progres, seleksi internal, verifikasi.

## 4. Prinsip Produk (mengikat FE + Mock)
1. **Journey-first:** tiap halaman harus jelas langkah sebelum/sesudahnya (lihat `03-alur-pengguna.md`).
2. **Sederhana:** pilihan jelas, kolom singkat, petunjuk mudah. Maks 7 field wajib per form Tahap 1.
3. **Transparan:** tiap rekomendasi ada alasan; tiap status ada arti + aksi lanjutan.
4. **Mandiri-default:** roadmap bisa jalan tanpa dosen; kontak dosen hanya jika sudah konfirmasi.
5. **Adil & aman:** skor matching bukan ranking mutlak; data minim; akses per peran.
6. **Jujur kemampuan:** yang masih mock/simulasi wajib berlabel `Simulasi`/`Rencana`. Khusus AI: dilarang klaim aktif di Tahap 1.
7. **Siap multi-kampus:** `institutionId` ada di semua entity sejak mock (lihat `10-model-data-mock.md`), walau filter baru aktif penuh di P2.

## 5. Glosarium Operasional
| Istilah | Arti di TALENTA | Catatan FE |
|---|---|---|
| Matching partner | Saran rekan tim berdasar target+skill+peran+waktu | Tampilkan skor + alasan, bukan ranking |
| Roadmap | Urutan belajar/latihan per kompetisi | Template statis di Tahap 1 |
| Prestasi mandiri | Pengajuan capaian oleh mahasiswa sendiri | Status awal selalu `Menunggu verifikasi` |
| Verifikasi | Pemeriksaan bukti sebelum sah | Yang ditolak/belum lengkap tidak dihitung |
| Tim terbentuk | Undangan disetujui + komposisi penuhi aturan | Boolean turunan, bukan manual |
| MVP P0 | Inti demo satu journey utuh | Scope di `01-lingkup-tahapan.md` |

## 6. Batasan Jujur (wajib tampil di UI Mock)
- Tidak ada AI otomatis penuh di Tahap 1.
- Tidak ada pertemuan daring bulanan wajib.
- Tidak ada analitik lintas kampus / integrasi sistem di Tahap 1.
- Statistik hanya klaim sesuai data mock institusi sendiri.
- WhatsApp dosen hanya tampil jika `isVerifiedContact=true`.
