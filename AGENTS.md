# AGENTS — Panduan kerja TALENTA

## Status dan sumber keputusan
- Produk yang dituju: sistem pembinaan lomba dan pengelolaan prestasi mahasiswa UNIDA Gontor, rilis pertama satu kampus.
- Implementasi saat ini adalah frontend React/Vite di frontend/ dengan mock dan localStorage. Backend, database, storage, container, serta autentikasi produksi belum ada.
- Urutan acuan: keputusan pemilik produk di docs/14-keputusan-terbuka.md, PRD_TALENTA.md, spesifikasi docs/, lalu perilaku kode saat ini sebagai bukti implementasi. Bila bertentangan, catat selisih dan minta keputusan; jangan menganggap mock sebagai aturan bisnis final.
- TODO.md adalah rencana kerja dan gate. README.md menjelaskan kondisi yang benar-benar bisa dijalankan sekarang.
- Keputusan produk yang belum disahkan tidak boleh ditulis sebagai fitur aktif atau klaim resmi kampus.

## Batas perubahan per tugas
- Kerjakan satu stage dan kriteria terimanya; jangan melompat ke stage berikutnya tanpa menutup gate stage berjalan.
- Sebelum mengubah kode, baca PRD, docs/README.md, TODO.md, dan spesifikasi modul terkait. Perbarui kontrak serta keputusan ketika implementasi menyimpang dengan persetujuan pemilik produk.
- Ikuti cakupan stage yang diminta; perubahan kode, konfigurasi, workflow, dan struktur folder harus sesuai kebutuhan stage tersebut.
- Jangan melakukan migrasi data nyata, deploy, atau mengubah layanan home server tanpa instruksi tugas terpisah.
- Jangan menaruh rahasia, kredensial, nomor pribadi, NIM, atau data mahasiswa nyata di repo, fixture, log, dan screenshot.

## Arsitektur tujuan
- Monorepo: frontend/ (React, Vite, TypeScript), backend/ (Bun, Elysia, Prisma), infra/ (Compose, proxy dan contoh konfigurasi), docs/, compose.yaml, .env.example, bun.lock. Pisahkan domain, aplikasi HTTP, akses data, dan integrasi storage di backend.
- MySQL yang sudah ada di home server adalah database rilis pertama; RustFS yang sudah ada adalah storage S3 compatible. Aplikasi tidak menjalankan MySQL/RustFS baru secara otomatis di Compose produksi.
- Semua permintaan browser menuju satu origin: frontend di / dan API di /api. Konfigurasi runtime di root .env; jangan menggantungkan alamat API produksi pada VITE_* saat build.
- GitHub Actions: pemeriksaan kualitas, build image frontend dan backend, push ke GHCR public dengan tag commit SHA dan rilis. Server melakukan docker compose pull lalu docker compose up -d. Migrations, health check, backup, rollback, dan observabilitas wajib sesuai docs/15 dan docs/17.
- Gunakan versi dependensi terkunci. Pilih versi Prisma yang dukungan MySQL-nya stabil ketika implementasi; verifikasi Elysia + Bun + Prisma + MySQL dalam stage fondasi sebelum mengunci prosedur migrasi.

## Produk dan akses
- Peran rilis pertama: mahasiswa, validator, super_admin. Dosen/konsultan adalah data kontak terkurasi, bukan akun atau peran aplikasi.
- Mahasiswa mendaftar dan login manual. Tidak ada Google login atau pemeriksaan identitas eksternal saat rilis awal. NIM unik dan data diisi sendiri; statusnya belum terverifikasi kampus. SSO adalah integrasi masa depan.
- Validator mengelola kompetisi, jadwal, aturan tim, roadmap, kontak konsultasi, seleksi, serta verifikasi pengajuan. Super admin mengelola semua itu ditambah akun staf, peran, konfigurasi, aturan poin, dan audit operasional.
- Otorisasi wajib di backend pada tiap aksi dan objek. Frontend guard hanya membantu navigasi.
- Dashboard publik hanya menghitung prestasi lomba yang disetujui validator. Jangan tampilkan NIM, email, nomor WhatsApp pribadi mahasiswa, atau bukti prestasi di halaman publik.
- AI, beasiswa, kredit SKPI, dan klaim verifikasi resmi BAAK bukan fitur/kebijakan rilis awal. Jangan menampilkannya sebagai janji produk.

## Kualitas dan Definition of Done
- Setiap alur punya keadaan loading, kosong, gagal, sukses, serta pemulihan yang jelas. Gunakan bahasa Indonesia konsisten, navigasi keyboard, kontras, ukuran sentuh, dan layout responsif.
- Perubahan domain harus menyertakan uji aturan bisnis; perubahan API harus menyertakan uji otorisasi, validasi, dan skenario gagal; migrasi harus diuji terhadap data yang sudah ada. Hindari test yang hanya menyalin implementasi.
- Gate: typecheck, lint, test relevan, build, migrasi staging, uji alur nyata dengan peran, dan pemeriksaan keamanan/backup sebelum rilis. Detailnya di docs/18.
- Dokumentasikan apa yang selesai, bukti verifikasi, serta sisa risiko. Jangan menandai TODO selesai hanya karena UI tampak jadi.
- Segera perbarui TODO.md setiap kali satu butir pekerjaan selesai dan diverifikasi, tanpa menunggu seluruh stage selesai. Tandai [x] hanya jika kriteria butir terpenuhi; catat bukti pemeriksaan dan bagian yang masih terbuka atau terhalang. Jika baru sebagian, biarkan [ ] dan jelaskan progresnya.

## Commit Git lokal pada setiap perubahan (Stage besar maupun stage kecil/tugas mandiri)
- Setiap kali menyelesaikan pekerjaan, perbaikan bug, penambahan fitur, pembaruan konfigurasi, atau penyelesaian butir pekerjaan (baik stage besar maupun stage kecil/tugas mandiri), **langsung buat commit Git lokal**. Jangan menumpuk perubahan tanpa commit.
- Sebelum melakukan commit:
  1. Jalankan `git status` dan `git diff` untuk meninjau perubahan secara teliti.
  2. Pastikan pemeriksaan mutu yang relevan (seperti `bun run typecheck`, `bun run lint`, dan tes terkait) telah lulus tanpa kesalahan.
  3. Lakukan staging secara presisi (`git add <file>`) hanya untuk file-file yang berkaitan dengan perubahan tersebut. Hindari `git add -A` jika terdapat file atau eksperimen lain yang belum diperiksa.
- Selaraskan `TODO.md` dan dokumentasi terkait dalam commit yang sama jika ada kriteria atau progres yang diselesaikan.
- Gunakan format pesan commit Conventional Commits yang deskriptif dan mencerminkan perubahan nyata, misalnya:
  - `feat(auth): login kartu instan pada mode development`
  - `fix(e2e): perbaiki selektor antrean verifikasi validator`
  - `docs(env): lengkapi panduan parameter .env.example untuk pemula`
  - `docs(agents): wajibkan commit lokal pada setiap perubahan kecil`
- Jika perubahan merupakan bagian penutup suatu stage besar di TODO.md, commit penutup menandai gate stage tersebut.
- **PENTING**: Semua commit hanya dilakukan di repositori **lokal** (`git commit`). Jangan pernah melakukan `git push`, membuat tag rilis remote, atau melakukan deploy ke remote/server produksi tanpa instruksi tertulis terpisah dari pengguna.

## Operasi dan penamaan
- Bahasa UI dan dokumen Indonesia; identifier kode Inggris. Paket dikelola dengan Bun dan lockfile terkunci.
- Gunakan ikon dari paket Lucide React untuk aksi, navigasi, status, dan ilustrasi antarmuka. Jangan membuat ikon SVG manual, memakai emoji sebagai ikon produk, atau menambah pustaka ikon lain tanpa keputusan proyek. Ikon dekoratif memakai aria-hidden; tombol yang hanya berisi ikon wajib memiliki nama aksesibel.
- Utamakan UI/UX yang mudah dipahami: hierarki informasi jelas, istilah konsisten, target sentuh memadai, fokus keyboard terlihat, form memberi validasi dan pemulihan, serta setiap halaman menangani loading, kosong, gagal, dan sukses. Uji tampilan mobile, tablet, dan desktop sebelum menutup stage.
- Waktu domain disimpan UTC dan ditampilkan Asia/Jakarta. Tahun akademik serta periode lomba adalah entitas data, bukan string hardcode 2026.
- URL dan identifier publik stabil; jangan mendasarkan relasi database pada slug yang bisa diubah.
- .opencode/AGENTS.md menunjuk ke file ini agar semua agen mendapat aturan yang sama.
