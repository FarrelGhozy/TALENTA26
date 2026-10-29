# 03 — Alur Pengguna (Journey + State)

## Journey Utama J1: Mahasiswa Binaan (P0)
```
Daftar(mock) → Profil (minat/skill/pengalaman/waktu/target)
 → Rekomendasi partner → Undang/Terima → Tim Terbentuk?
   Ya → Halaman Kompetisi (info+jadwal+roadmap+konsultan)
     → Checklist persiapan → Seleksi internal (lihat jadwal)
     → Ajukan prestasi → Menunggu → Dashboard
   Tidak → fallback: ganti target / cari mandiri / hubungi admin
```

## Journey J2: Prestasi Mandiri (tanpa binaan)
```
Buka /prestasi/baru → isi (nama, penyelenggara, kategori, tanggal, tingkat, jenis capaian, bukti)
 → submit → Menunggu verifikasi → (Perlu perbaikan | Disetujui | Ditolak)
 → jika Disetujui → masuk profil + dashboard
```

## Journey J3: Verifikator
```
Antrian → Detail (data + bukti mock) → [Minta perbaikan | Setujui | Tolak + alasan wajib]
 → status berubah → mahasiswa lihat status + alasan
```

## Journey J4: Admin Program
```
Kelola kompetisi (CRUD in-memory) → kelola roadmap template → kelola konsultan verified
 → lihat dashboard operasional
```

## State Machine Penting

### Undangan partner
```
diajukan → [diterima | ditolak | kedaluwarsa(14 hari, usulan)]
- ditolak → slot bebas, boleh undang lain, tampilkan saran alternatif
- diterima + cek komposisi → tim Terbentuk / Menunggu anggota lagi
```
Aturan turunan `isTeamFormed`: `acceptedCount+1 >= minAnggota && <= maxAnggota && semua peran wajib terisi`.

### Tim
```
mencari → sebagian → terbentuk → (keluar/ganti: kembali ke mencari, log-like dicatat mock)
```

### Prestasi
```
draft(lokal) → menunggu → [perlu_perbaikan → menunggu(revisi) | disetujui | ditolak]
- hanya `disetujui` dihitung di dashboard.
- `perlu_perbaikan` dan `ditolak` wajib ada `catatan`.
```

### Validasi yang harus ada di FE Tahap 1
- Tidak bisa buka roadmap sebelum `targetKompetisi` dipilih.
- Tidak bisa klaim tim terbentuk sebelum aturan komposisi lolos (tombol disabled + tooltip).
- Form prestasi: tanggal tidak boleh masa depan jauh, bukti wajib (mock: nama file), kategori & jenis capaian wajib (bedakan partisipasi/nominasi/penghargaan/juara).
- WA dosen: tombol disabled + label `Belum terverifikasi` jika `isVerifiedContact=false`.
