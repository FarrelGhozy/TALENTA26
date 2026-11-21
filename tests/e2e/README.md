# TALENTA — Dokumentasi Pengujian Otomatis End-to-End (Playwright)

Direktori ini berisi rangkaian pengujian end-to-end (E2E) otomatis menggunakan Playwright dan Bun. Pengujian memvalidasi integrasi nyata antara Frontend React dan Backend Elysia/Bun/MySQL tanpa mock.

## Struktur Direktori

```
tests/e2e/
├── fixtures/
│   └── sertifikat-lomba.pdf    # Berkas bukti nyata (PDF valid) untuk uji pengajuan prestasi
├── screenshots/                # Tangkapan layar otomatis jika terjadi kegagalan (git-ignored)
├── specs/
│   ├── 01-public-flows.ts      # Alur publik: Landing page, Katalog lomba, Leaderboard & Non-AI check
│   ├── 02-mahasiswa-flows.ts   # Alur mahasiswa: Registrasi akun baru, Beranda, Roadmap, Unggah prestasi
│   ├── 03-validator-flows.ts   # Alur validator: Login, Antrean telaah berkas, Persetujuan, Update ranking
│   └── 04-superadmin-flows.ts  # Alur admin: Login, Tab tata kelola, Analitik operasional, Ekspor CSV
├── helpers.ts                  # Konfigurasi, helper browser context, pembuat data uji, dan logger
└── runner.ts                   # Master runner eksekusi pengujian sekuensial
```

## Prasyarat

Pastikan kedua server pengembangan sedang berjalan sebelum menjalankan pengujian:
1. **Frontend**: `bun run dev` (berjalan di `http://localhost:5173`)
2. **Backend**: `bun run dev:backend` (berjalan di `http://localhost:3001`)
3. **Database & Storage**: MySQL (`localhost:3306`) dan MinIO/RustFS (`localhost:9000`) aktif

## Cara Menjalankan Pengujian

### Menggunakan Shell Script Shortcut (Rekomendasi)
```bash
./run-e2e.sh
```

### Menggunakan Bun Script
```bash
bun run test:e2e
```

### Opsi Variabel Lingkungan
- `HEADLESS=false`: Menjalankan browser dalam mode GUI (terlihat di layar) untuk observasi visual langsung.
- `E2E_BASE_URL`: Mengubah URL target frontend (default: `http://localhost:5173`).
- `E2E_API_URL`: Mengubah URL target backend (default: `http://localhost:3001`).

Contoh menjalankan dengan browser GUI:
```bash
HEADLESS=false ./run-e2e.sh
```

## Cakupan Validasi

1. **Integritas Antarmuka & Kepatuhan Non-AI**:
   - Memastikan tidak ada icon kecerdasan buatan (`Sparkles`, `Bot`, `Wand`, dll.) di seluruh antarmuka.
   - Peringkat puncak menggunakan icon `Trophy` standar.
2. **Siklus Hidup Mahasiswa**:
   - Pendaftaran akun mahasiswa baru dengan NIM dinamis unik.
   - Akses beranda, modul persiapan kompetisi, interaksi checklist roadmap.
   - Pengajuan prestasi baru dengan lampiran PDF asli bertanda tangan digital.
3. **Siklus Verifikasi Validator**:
   - Login validator institusi (`validator@unida.gontor.ac.id`).
   - Penemuan pengajuan pada antrean telaah verifikasi.
   - Keputusan sah (*Approve*), pencatatan poin prestasi.
   - Verifikasi pembaruan nilai pada papan peringkat institusi.
4. **Siklus Tata Kelola Super Admin**:
   - Login administrator (`superadmin@unida.gontor.ac.id`).
   - Navigasi tab tata kelola (Pengguna, Aturan Poin, Audit, Kesehatan Sistem).
   - Pemantauan metrik pada dashboard analitik tanpa kegagalan objek/null.
   - Ekspor rekapitulasi data prestasi ke format CSV.
