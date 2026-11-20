# 11 — Rancangan UI/UX produksi

Nama file dipertahankan agar tautan lama tidak putus; isi ini menggantikan spesifikasi UI mock. Desain akhir dapat merombak tampilan saat Stage 1 selama kebutuhan dan akses tetap terpenuhi.

## Baseline Stage 1
Fondasi UI telah diterapkan dan diuji pada 390×844, 768×1024, dan viewport desktop. Halaman `/super-admin/design-system` memperlihatkan aksi, status, form valid/invalid, informasi, sukses, peringatan, loading, dan empty state. Ini baseline yang harus dikembangkan, bukan klaim bahwa semua komponen produksi telah selesai.

Semua ikon produk berasal dari Lucide React. Emoji, SVG ikon buatan tangan, dan pustaka ikon kedua tidak dipakai tanpa keputusan proyek. Ikon dekoratif memakai `aria-hidden`; kontrol icon-only wajib memiliki nama aksesibel. Token dasar warna, radius, bayangan, tipografi, dan focus ring berada di `frontend/src/index.css`.

## Arah visual
Identitas UNIDA yang sudah ada menjadi bahan awal, bukan persetujuan brand resmi. Gunakan palet biru utama, aksen seperlunya, tipografi terbaca, ruang putih cukup, dan komponen konsisten. Hindari klaim pemasaran seperti jaminan beasiswa/SKPI/BAAK. Landing harus menjelaskan manfaat dan alur, lalu menampilkan lomba terbit serta ranking terverifikasi dengan sumber/periode.

## Struktur navigasi
- Publik: Beranda, Kompetisi, Ranking, Masuk/Daftar. CTA utama Jelajahi lomba atau Mulai.
- Mahasiswa: Beranda, Profil, Target/Kompetisi, Partner/Tim, Persiapan, Prestasi. Pada mobile gunakan menu ringkas dengan posisi jelas.
- Validator: Ringkasan, Kompetisi, Roadmap, Konsultan, Seleksi, Verifikasi, Laporan.
- Super admin: Ringkasan, Pengguna/Staf, Periode, Poin, Audit, Sistem; akses fungsi validator tetap jelas.
- Breadcrumb pada halaman detail/edit; peran dan institusi terlihat di area akun. Tidak ada role switcher pada akun produksi.

## Pola halaman
### Landing dan ranking
Hero satu pesan utama dan dua CTA; di bawahnya langkah proses nyata, kompetisi terbaru, ranking per tahun akademik, capaian terverifikasi, penjelasan asal data, footer bantuan/kebijakan. Ranking tidak menampilkan NIM, kontak, atau foto default. Jika data kosong, jelaskan belum ada prestasi terverifikasi.
Tampilkan sorotan tiga mahasiswa teratas berupa nama tampilan, poin, posisi, dan ringkasan capaian lomba sah, dengan tautan ke ranking lengkap. Jangan memakai foto dari akun pribadi secara otomatis.

### Katalog dan detail kompetisi
Filter yang mudah dibersihkan, jumlah hasil, kartu dengan tahun, tingkat, format individu/beregu, tenggat dan status sumber. Detail punya info, syarat, jadwal, komposisi tim, roadmap terbit, dan kontak. Bedakan jadwal resmi dengan internal.

### Onboarding mahasiswa
Form bertahap: akun, identitas/profil dasar, minat/skill, target. NIM/email dicek unik; beri pemberitahuan bahwa identitas belum terverifikasi kampus. Simpan draft dan tampilkan progres. Alur prestasi mandiri tidak diblokir oleh target lomba.

### Partner, tim, persiapan
Kartu partner menampilkan alasan rekomendasi dan data minimum. Undangan masuk/keluar dan status tim terpisah. Perubahan target/tim memakai dialog yang menyebut dampak. Roadmap menunjukkan aksi pekan ini, keseluruhan fase, progres, dan keterlambatan tanpa menyalahkan pengguna.

### Pengajuan dan verifikasi
Form prestasi menyajikan ringkasan aturan, upload progres, pratinjau bukti, validasi inline, review sebelum kirim. Riwayat memakai timeline status dan alasan. Validator melihat antrean padat tetapi terbaca; detail membandingkan revisi, bukti, keputusan dan audit. Tombol keputusan tidak berdekatan tanpa pembeda visual.

### Admin
Pengelolaan konten memakai daftar, filter, draft, pratinjau dan publikasi. Super admin mendapat konfigurasi dengan penjelasan dampak, riwayat versi dan konfirmasi perubahan yang sensitif.

## Sistem komponen
Token warna, tipografi, spacing, radius, shadow, breakpoint, state; Button, Input, Select, Radio/Checkbox, FileUpload, Table, Pagination, FilterBar, Badge, Alert, Toast, Modal, Drawer, Tabs, Stepper, Timeline, EmptyState, Skeleton, ErrorState. Komponen mengekspresikan disabled, pending, valid, invalid, success; label dan pesan error terhubung secara semantik. Tabel panjang punya versi mobile yang tetap mempertahankan aksi utama.

## Standar interaksi
Target WCAG 2.2 AA sebagai kriteria desain yang diuji; fokus terlihat, urutan tab masuk akal, dialog mengunci fokus dan bisa ditutup, status dinarasikan untuk screen reader, target sentuh memadai, kontras teks jelas. Motion mengikuti prefers-reduced-motion. Jangan memakai warna saja untuk status. Form error menunjukkan lokasi dan cara memperbaiki; peringatan tindakan destruktif menyebut akibat yang sebenarnya.

## Uji desain sebelum implementasi penuh
Prototipe 360px, 768px, 1440px; uji pengguna untuk J1–J4; cek keyboard, zoom 200%, jaringan lambat, daftar kosong/panjang, nama panjang, tanggal tanpa jadwal, dua role staf, dan error unggah. Simpan keputusan desain sebagai hasil uji, bukan selera subjektif.

Stage 1 telah memeriksa reflow mobile/tablet/desktop, menu mobile, fokus keyboard, login salah/benar, redirect role, dan state dasar. Uji pengguna nyata, zoom 200%, jaringan lambat, upload, daftar panjang, serta WCAG lengkap tetap gate Stage 5 karena membutuhkan alur/backend produksi. Bukti ada di docs/19-validasi-stage-1.md.
