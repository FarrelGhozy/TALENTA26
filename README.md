# TALENTA — Pembinaan lomba dan prestasi mahasiswa

TALENTA ditujukan untuk membantu mahasiswa menemukan lomba, membentuk tim, mengikuti persiapan, mengajukan prestasi, dan melihat hasil yang telah divalidasi. Rancangan produksi pertama untuk satu kampus, UNIDA Gontor, ada di PRD_TALENTA.md dan docs/.

## Status repo saat ini

Repo memuat frontend React/Vite serta backend Bun/Elysia dengan Prisma/MySQL, autentikasi, domain pembinaan dan prestasi, integrasi storage S3 compatible, serta uji integrasi. Ini merupakan implementasi yang masih perlu perbaikan dan verifikasi, bukan rilis siap produksi. Audit dan tindak lanjutnya tercatat di `docs/24-audit-stage-d0-5.md` dan `TODO.md`; khususnya pemulihan password belum mengirim email dan sejumlah alur validator belum tersedia di UI. Gate yang terdampak sedang ditinjau ulang.

Mode demo memakai JSON/localStorage; build production memakai adapter API. Workflow yang ada menerbitkan build demo ke GitHub Pages, bukan deployment produksi. Image GHCR, Compose produksi dan deployment staging masih direncanakan.

Stack demo: React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 4, Lucide React, Bun. Gunakan Bun dan bun.lock; jangan mengganti package manager tanpa keputusan proyek.

## Menjalankan demo saat ini

~~~bash
bun install --frozen-lockfile
cp .env.example .env
bun run dev
~~~

Buka http://localhost:5173/. Mode development dan build:demo memakai data mock; build produksi hanya memuat adapter API. GitHub Pages memakai base /TALENTA26/ melalui konfigurasi workflow. Jangan memakai mode mock atau password demo untuk data mahasiswa nyata.

Script utama: `bun run dev`, `bun run typecheck`, `bun run lint`, `bun run build`, `bun run build:demo`, dan `bun run preview`. Bukti historis Stage 1–5 ada di docs/19–23; tinjauan ulang ada di docs/24.

## Akun demo

Halaman `/masuk` menyediakan kartu instan untuk role final `mahasiswa`, `validator`, dan `super_admin` pada mode demo. Form login manual juga hanya simulasi: ia mencari email fixture dan belum memverifikasi password. Semua identitas di fixture sintetis, tidak aman untuk autentikasi nyata. Hapus key `talenta-*` di localStorage untuk mereset sesi/perubahan demo lokal.

## Peta repo sekarang dan target

Sekarang: `frontend/` berisi aplikasi dan adapter mock/API; `backend/` berisi layanan, skema, migrasi dan tes; `infra/` memuat skrip backup database; `docs/` berisi kontrak dan bukti. `.github/workflows/deploy.yml` khusus build demo Pages.

Target saat stage implementasi: frontend/ aplikasi React; backend/ Bun/Elysia/Prisma; infra/ konfigurasi proxy; compose.yaml root; root .env.example; dua image GHCR public. MySQL dan RustFS existing tetap layanan luar Compose aplikasi. Struktur rinci docs/04-sitemap.md.

## Dokumen kerja

- PRD_TALENTA.md: keputusan produk, aktor, alur dan penerimaan.
- docs/README.md: indeks spesifikasi, bukti, dan audit.
- docs/14-keputusan-terbuka.md: keputusan pemilik produk, rekomendasi dan gate yang belum disahkan.
- TODO.md: stage, urutan dan status.
- AGENTS.md: aturan agen yang berlaku untuk pekerjaan berikutnya.
- docs/15-env-mock-strategy.md dan docs/17-runbook-operasi.md: rancangan image, .env, Compose, deploy dan rollback.

## Arah rilis

Mahasiswa mendaftar/login manual. Validator mengelola lomba, roadmap, kontak konsultasi, seleksi dan pengajuan prestasi. Super admin mengelola sistem/peran serta semua fungsi validator. Dosen bukan role login. Landing dan `/ranking` sudah memiliki prototipe ranking berbasis prestasi lomba berstatus disetujui; bobot saat ini hanya fixture UI dan belum boleh dipakai sebagai kebijakan kampus. Google login, AI, SSO, beasiswa, dan multi-kampus tidak masuk rilis pertama. SSO dipertimbangkan setelah integrasi kampus tersedia.

Home server memakai MySQL, RustFS, Cloudflare Tunnel dan domain pribadi yang sudah ada. GitHub Actions kelak membangun image dan push ke GHCR public; operator server menyiapkan root .env lalu menjalankan docker compose pull dan docker compose up -d. Rancangan ini belum bisa dijalankan dari repo sekarang.
