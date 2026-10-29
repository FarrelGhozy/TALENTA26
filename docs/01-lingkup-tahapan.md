# 01 — Lingkup & Tahapan (P0 / P1 / P2)

## 1. Ringkasan Prioritas (dari PRD §10)
| Prioritas | Cakupan | Tujuan |
|---|---|---|
| **P0 Inti demo** | Profil, daftar kompetisi awal, halaman kompetisi+jadwal, undangan partner sederhana, roadmap template, form prestasi mandiri, dashboard admin dasar | Satu journey utuh bisa didemokan |
| **P1 Berikutnya** | Matching lebih baik, personalisasi AI, lacak progres, pengingat, verifikasi lengkap | Kualitas + pemantauan |
| **P2 Skala** | Multi-kampus, dashboard lintas institusi, analitik lanjut, integrasi | Tata kelola |

## 2. In-Scope Tahap 1 (FE + Mock) — Definisi Fix
Tahap 1 = P0 **versi mock**. Semua data dari `src/mocks/*.json`, tanpa BE/DB/auth real.

| Modul | Fix Tahap 1 | Yang DITUNDA ke Tahap 2 |
|---|---|---|
| Akun/profil | Form profil + pilih target, simpan ke localStorage/mock | Registrasi real, NIM unik real, upload foto |
| Kompetisi | List + detail + pilih target | CMS admin penuh (cukup 1 halaman admin edit JSON-in-memory) |
| Matching | List rekomendasi statis + kirim/terima undangan (state lokal) | Matching realtime/periodik real, notifikasi |
| Roadmap | Tampil template per kompetisi + checklist lokal | Progress BE, reminder, AI personalisasi |
| Konsultasi | Kartu dosen + tombol WA (hanya jika verified) | Booking, jadwal rutin |
| Seleksi internal | Tampil jadwal + label delegasi (mock) | Input nilai seleksi |
| Prestasi | Form + upload (simulasi) + status Menunggu | Verifikasi BE, storage file real |
| Dashboard | Kartu angka + tabel dari mock | Filter periode kompleks, export, lintas kampus |

## 3. Out-of-Scope Tegas (dilarang diklaim selesai di Tahap 1)
- AI penyusun materi otomatis.
- Pelatihan langsung wajib / pertemuan bulanan wajib.
- Peringkat kemampuan absolut.
- Statistik nasional (hanya statistik institusi mock).
- Integrasi SIAKAD / SSO / storage eksternal.

## 4. Definisi Selesai (Definition of Done) Tahap 1
- [ ] Semua rute di `04-sitemap.md` bisa dibuka tanpa error.
- [ ] Satu journey klik-penuh jalan: daftar(mock) → profil → pilih kompetisi → rekomendasi → undang → tim terbentuk → roadmap → ajukan prestasi → dashboard berubah.
- [ ] Setiap skor/rekomendasi ada tooltip alasan.
- [ ] Setiap fitur simulasi berlabel `Mock`/`Simulasi`.
- [ ] `bun run build` sukses, tidak ada fetch ke BE sungguhan.

## 5. Definisi Selesai Tahap 2 (Final, setelah Gate Fix)
Gate Fix = kamu setuju UI + alur + keputusan di `14-keputusan-terbuka.md` sudah final.
Baru boleh mulai: auth, BE, DB (skema ikut `10-model-data-mock.md`), upload real, role guard real, audit verifikasi.
