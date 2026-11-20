# 01 — Lingkup dan prioritas

## Rilis pertama: harus lengkap secara operasional
| Area | Wajib siap | Di luar rilis |
|---|---|---|
| Publik | landing, kompetisi terbit, ranking prestasi lomba sah | statistik nasional, klaim kebijakan kampus yang belum disahkan |
| Mahasiswa | akun manual, profil, target, tim, roadmap, pengajuan/revisi prestasi | Google login, SSO, AI |
| Validator | kelola konten lomba/seleksi/konsultan, verifikasi prestasi | konfigurasi teknis/rahasia |
| Super admin | akun staf, peran, periode, aturan poin, audit, operasi | multi-kampus |
| Platform | MySQL, RustFS, API, CI GHCR, Compose, backup/restore | otomatisasi deploy langsung ke server tanpa gate |

Katalog, roadmap, tim, dan prestasi harus mendukung periode baru. Data lama diarsip, dapat dibaca sesuai akses, dan tidak direset. Prestasi di luar lomba tetap diterima namun tidak mendapat poin ranking.

## Prioritas implementasi
P0 = jalur produksi aman untuk empat peran akses (pengunjung, mahasiswa, validator, super admin) dan operasi. P1 = pengingat/notifikasi, analitik lanjutan, ekspor formal, peningkatan matching. P2 = SSO, multi-kampus, AI, integrasi resmi lain jika disetujui. Prioritas ini tidak sama dengan status selesai.

## Batas keputusan
Rincian bobot poin awal, identitas publik, retensi, domain, dan target pemulihan adalah gate go-live di docs/14. Implementasi boleh menyiapkan mekanismenya, tetapi tidak boleh menetapkan angka/kebijakan kampus tanpa keputusan. Stage lengkap di docs/13.
