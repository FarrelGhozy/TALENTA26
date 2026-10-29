# 02 — Pengguna, Persona & Matriks Akses

## 1. Persona Ringkas

### A. Mahasiswa Baru (Maba pencari arah)
- Butuh: tahu lomba apa yang cocok, bahasa sederhana.
- Takut: salah pilih, tidak punya tim.
- Kebutuhan FE: onboarding 3 langkah, rekomendasi dijelaskan, CTA jelas.

### B. Mahasiswa Pejuang Lomba (sudah ada target)
- Butuh: partner komplementer, roadmap + tenggat, kontak dosen cepat.
- Kebutuhan FE: filter skill/peran, checklist roadmap, tombol WA verified.

### C. Mahasiswa Berprestasi Mandiri (jalur luar binaan)
- Tidak ikut binaan TALENTA, hanya mau catat prestasi (mis. Best Delegate MUN, juara olahraga).
- Kebutuhan FE: form prestasi bisa diakses tanpa pilih kompetisi, upload mudah, status transparan.

### D. Admin Program
- Kelola kompetisi, jadwal, roadmap, aturan matching, info seleksi.
- Kebutuhan FE: 1 halaman kelola sederhana di Tahap 1 (tabel + drawer edit, simpan in-memory).

### E. Verifikator
- Periksa bukti, minta perbaikan / setujui / tolak + alasan.
- Kebutuhan FE: antrian + panel detail + tombol aksi + textarea alasan wajib saat tolak/minta perbaikan.

### F. Dosen/Konsultan
- Konsultasi sesuai kapasitas. Tampil hanya jika `assignmentApproved=true`.
- Tahap 1: read-only card, tidak ada login dosen penuh (mock).

### G. Admin Institusi
- Lihat ringkasan sesuai institusi sendiri. Multi-kampus read-only di P2.

## 2. Matriks Akses Usulan Final (untuk dikunci di Gate)
| Kemampuan | Mhs | Dosen | Admin Program | Verifikator | Admin Institusi |
|---|---|---|---|---|---|
| Kelola profil sendiri | Ya | Lihat publik terbatas | Tidak edit | Tidak edit | Tidak edit |
| Pilih target kompetisi | Ya | — | Kelola daftar | — | Lihat |
| Kirim/terima undangan | Ya | — | Lihat aturan | — | — |
| Lihat roadmap | Ya (tim-nya) | Lihat | Kelola template | — | Lihat agregat |
| Lihat kontak WA | Ya jika verified | — | Kelola | — | — |
| Kelola kompetisi/jadwal | Tidak | Tidak | Ya | Tidak | Scope institusi |
| Verifikasi prestasi | Tidak | Tidak | Tidak | Ya | Lihat hasil sah |
| Dashboard | Milik sendiri | — | Operasional | Antrian | Institusi |
| Data lintas institusi | Tidak | Tidak | Tidak (P2) | Tidak | P2 + izin |

Aturan:
- Semua entity punya `institutionId`. Tahap 1: `inst-01` saja, tapi kode filter sudah siap.
- Mahasiswa hanya lihat profil publik terbatas partner (nama, prodi, skill, peran, ketersediaan) — bukan NIM/kontak penuh sebelum tim terbentuk.
- Verifikator tidak bisa edit isi pengajuan, hanya status + catatan.

## 3. Implikasi ke React Router Guard (Tahap 1 mock-role)
- `role` disimpan di `localStorage talenta-role` (pilih di halaman `/masuk` mock).
- `RequireRole`: mahasiswa → `/app/*`, admin → `/admin/*`, verifikator → `/verifikasi/*`.
- Tahap 2: ganti dengan JWT + guard BE.
