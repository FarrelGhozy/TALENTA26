# 19 — Bukti validasi Stage 1

Tanggal pemeriksaan: 20 November 2026. Cakupan: fondasi repo dan frontend prototipe; tidak mencakup backend, autentikasi produksi, MySQL/RustFS nyata, container, atau deployment server.

## Hasil gate

Stage 1 dinyatakan selesai karena:

1. frontend berada di `frontend/`; `backend/` dan `infra/` tersedia sebagai placeholder yang menjelaskan batas stage;
2. konfigurasi root mengarahkan script Bun ke frontend tanpa mengubah package manager;
3. mode demo dan production memakai adapter berbeda;
4. role prototipe sesuai keputusan: mahasiswa, validator, super admin;
5. ranking publik hanya memakai pengajuan lomba simulasi berstatus disetujui dan tidak menampilkan NIM, email, kontak, atau bukti;
6. fondasi design system, state UI, route guard, lazy route, dan prototipe workspace tersedia;
7. dokumentasi, TODO, dan perilaku yang dapat dijalankan telah diselaraskan.

## Pemeriksaan otomatis

Perintah yang lulus dari root repo:

~~~bash
bun run typecheck
bun run lint
bun run build
bun run build:demo
git diff --check
~~~

`bun run build` memakai mode production dan adapter API. Entry JavaScript sekitar 340 kB setelah route lazy-loading; tidak ada peringatan chunk di atas 500 kB. Pencarian berikut tidak menemukan fixture penting pada `frontend/dist` production:

~~~bash
rg -n "andi@mock\.ac\.id|achievementMock|competitionMock|talenta-users" frontend/dist
~~~

Build demo tetap memakai fixture sintetis dan ditujukan untuk pengembangan/GitHub Pages, bukan data nyata.

## Pemeriksaan browser lokal

| Area | Skenario | Hasil |
|---|---|---|
| Publik | landing, katalog, ranking | halaman terbaca; ranking menampilkan data minimum |
| Login | email tidak terdaftar | pesan pemulihan `Email tidak terdaftar` tampil |
| Mahasiswa | login manual fixture → `/app/beranda` | berhasil; navigasi dan ringkasan termuat |
| Validator | role card → `/validator` → antrean → detail | berhasil |
| Super admin | role card → `/super-admin` → design system | berhasil |
| Otorisasi navigasi | redirect halaman super admin lalu login validator | dialihkan aman ke `/validator`, bukan tertahan/masuk rute salah |
| State UI | valid/invalid form, informasi, sukses, peringatan, loading, kosong | tersedia pada referensi design system |
| Keyboard | Tab pada CTA utama | focus ring terlihat dan target teridentifikasi |
| Mobile | 390×844 | header ringkas, menu dapat buka/tutup, konten reflow tanpa overflow horizontal yang terlihat |
| Tablet | 768×1024 | menu ringkas dan kartu reflow; CTA tetap dapat dipakai |
| Desktop | viewport default browser | navigasi lengkap dan dua kolom terbaca |
| Console | reload setelah fallback hidrasi ditambahkan | tidak ada error atau peringatan baru |

Browser menguji data sintetis lokal. Tidak ada data pengguna nyata, kredensial server, atau layanan eksternal yang digunakan.

## Keputusan UI Stage 1

- Lucide React adalah satu-satunya sumber ikon produk; simbol teks/emoji yang sebelumnya berfungsi sebagai ikon telah diganti.
- Ukuran kontrol form minimum 44px, focus ring terlihat, label dan pesan error terhubung secara semantik pada komponen dasar.
- Halaman role memakai bahasa dan navigasi berbeda sesuai tugas, sementara super admin dapat masuk ke ruang validator.
- Loading awal route lazy memiliki fallback eksplisit sehingga pengguna tidak mendapat layar kosong.
- Mock tidak boleh diaktifkan dari toggle pada image production.

## Risiko yang sengaja diteruskan

- Form login demo belum melakukan autentikasi password; auth nyata adalah gate Stage 2.
- Workspace validator/super admin dan ranking masih prototipe UI, bukan CRUD/data produksi.
- Bobot poin ranking belum disahkan; angka fixture tidak boleh dipakai untuk keputusan kampus.
- Uji WCAG penuh, jaringan lambat, upload, keamanan, concurrency, dan uji pengguna nyata berada pada stage berikutnya.
- `.env.example` hanya kontrak placeholder. Pemilik server mengisi koneksi MySQL/RustFS di root `.env` saat backend tersedia; rahasia tidak masuk repo.
