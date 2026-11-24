# 11 — Rancangan UI/UX produksi

Nama file dipertahankan agar tautan lama tidak putus; isi ini menggantikan spesifikasi UI mock. Desain akhir dapat merombak tampilan saat Stage 1 selama kebutuhan dan akses tetap terpenuhi.

## Baseline Stage 1
Fondasi UI telah diterapkan dan diuji pada 390×844, 768×1024, dan viewport desktop (token & komponen antarmuka dasar bersama berada di `frontend/src/components/` dan `frontend/src/index.css`). Ini baseline yang dikembangkan menjadi antarmuka produksi penuh.

Semua ikon produk berasal dari Lucide React. Emoji, SVG ikon buatan tangan, dan pustaka ikon kedua tidak dipakai tanpa keputusan proyek. Ikon dekoratif memakai `aria-hidden`; kontrol icon-only wajib memiliki nama aksesibel. Token dasar warna, radius, bayangan, tipografi, dan focus ring berada di `frontend/src/index.css`.

## Arah visual
Identitas aplikasi yang disetujui pemilik produk adalah **UNIDA Student Championship (USC)** (`K-26`): Emblem 3D Navy & Gold (`#142432`, `#1F3442`, `#B89669`, `#EACA97`) dan Wordmark grafis transparan (`UNIDA` dengan mata pena sebagai huruf `I` + `STUDENT CHAMPIONSHIP`). Kedua master berada di `docs/design/logo-usc-2026-11/sources/` dan seluruh turunan optimal (WebP/PNG/ICO/Apple Touch/PWA Manifest/OG Card) digenerasi melalui `bun run brand:generate`. Komponen `UscBrand` memasang identitas merek secara adaptif (Emblem + Wordmark grafis pada navbar desktop/footer/auth, Emblem + `USC` pada mobile & sidebar admin, dengan medalion terang tipis untuk emblem di atas latar gelap); tautan merek minimal 44 px dan menyertakan teks aksesibel `sr-only`. Aset raster khusus hanya untuk identitas merek yang disetujui ini; seluruh ikon aksi, navigasi, dan status tetap memakai Lucide React.

Identitas UNIDA yang sudah ada menjadi bahan awal, bukan persetujuan brand resmi. Gunakan palet biru utama, aksen seperlunya, tipografi terbaca, ruang putih cukup, dan komponen konsisten. Hindari klaim pemasaran seperti jaminan beasiswa/SKPI/BAAK. Landing harus menjelaskan manfaat dan alur, lalu menampilkan lomba terbit serta ranking terverifikasi dengan sumber/periode.

## Struktur navigasi
- Publik: Beranda, Katalog Lomba, Ranking, Masuk/Daftar. CTA utama Jelajahi Lomba atau Masuk Portal.
- Mahasiswa: Top bar dengan Beranda, Ruang Persiapan, Tim, Katalog Lomba, Prestasi, Ranking (paling belakang); profil/target di dropdown akun. Pada mobile gunakan menu ringkas dengan posisi jelas.
- Admin (`/admin/*`, peran validator & super admin): Sidebar Kiri Accordion (desktop tetap kiri dengan opsi collapse + top breadcrumb bar; mobile/tablet memakai slide-over sidebar drawer dari kiri) berisi Dashboard, Validasi Prestasi (sub-status + badge angka live), Kelola Lomba (hub kartu lomba → ruang kelola 5 tab: Profil & Aturan, Roadmap, Aturan Poin, Konsultan, Seleksi), dan khusus **`super_admin`**: Pengaturan Sistem (`/admin/sistem`: Akun, Periode, Template Poin, Audit, Kesehatan). Menu Pengaturan Sistem disembunyikan dari `validator` dan dijaga ketat oleh guard `/403` + backend `403`.
- Breadcrumb pada top utility bar admin serta halaman detail/edit; peran dan institusi terlihat di area akun. Tidak ada role switcher pada akun produksi.

## Pola halaman
### Landing dan ranking
Hero satu pesan utama dan dua CTA; di bawahnya langkah proses nyata, kompetisi terbaru, ranking per tahun akademik, capaian terverifikasi, penjelasan asal data, footer bantuan/kebijakan. Ranking tidak menampilkan NIM, kontak, atau foto default. Jika data kosong, jelaskan belum ada prestasi terverifikasi.
Tampilkan sorotan tiga mahasiswa teratas berupa nama tampilan, poin, posisi, dan ringkasan capaian lomba sah, dengan tautan ke ranking lengkap. Jangan memakai foto dari akun pribadi secara otomatis.

### Katalog dan detail kompetisi
Filter yang mudah dibersihkan, jumlah hasil, kartu dengan tahun, tingkat, format individu/beregu, tenggat dan status sumber. Detail punya info, syarat, jadwal, komposisi tim, roadmap terbit, dan kontak. Bedakan jadwal resmi dengan internal.

### Onboarding mahasiswa
Form bertahap: akun, identitas/profil dasar, minat/skill, target. NIM/email dicek unik; beri pemberitahuan bahwa identitas belum terverifikasi kampus. Simpan draft dan tampilkan progres. Alur prestasi mandiri tidak diblokir oleh target lomba.

### Rekrutmen tim dan persiapan
Halaman `/app/tim` menyajikan 3 jalur lomba beregu (*Buat Tim Baru*, *Cari Tim Terbuka*, *Sudah Punya Tim* via kode undangan acak), tab *Pengajuan Saya*, dan *Ruang Tim Saya* lengkap dengan kesiapan 3 lapis (`dibuat`, `anggota_cukup`, `siap_seleksi`), panel pelamar tertunda serta manajemen kode undangan khusus ketua (`leaderId`). Perubahan target/tim memakai dialog yang menyebut dampak. Lomba individu mengarah langsung ke ruang persiapan. Roadmap menunjukkan fase, progres, tenggat, dan kontak konsultan WA terbit tanpa menyalahkan pengguna.

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
