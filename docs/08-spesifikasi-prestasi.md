# 08 — Spesifikasi Prestasi Mandiri & Verifikasi

## 1. Akses
- Terbuka semua mahasiswa, tanpa syarat ikut binaan. Rute `/app/prestasi/baru`.
- Bisa ajukan individu atau atas nama tim (pilih anggota tim mock).

## 2. Field Formulir (validasi Tahap 1)
| Field | Wajib | Aturan |
|---|---|---|
| namaKegiatan | Ya | 5–120 char |
| penyelenggara | Ya | 3–80 char |
| kategori | Ya | select: kompetisi, konferensi, olahraga, seni, nominasi, lain |
| tanggal | Ya | date, tidak > hari ini +7 hari |
| tingkat | Ya | lokal, nasional, internasional |
| jenisCapaian | Ya | partisipasi, nominasi, penghargaan, juara_1, juara_2, juara_3, best_delegate |
| deskripsi | Tidak | ≤500 char |
| bukti | Ya (mock) | 1–3 file mock (nama+ukuran), Tahap 2 baru upload real. Tampilkan `Mode mock — file tidak benar-benar diunggah` |
| dariSeleksiInternal | Tidak | checkbox, jika Ya wajib pilih kompetisi + peringkat |
| anggotaTim | Jika beregu | multi-select dari tim mock |

Contoh yang harus lolos: `Konferensi Internasional X — Best Delegate — internasional — penghargaan`.

## 3. Status & Aksi
```
menunggu → perlu_perbaikan → menunggu (revisi ke-1,2...)
menunggu → disetujui | ditolak
```
- Baru submit → `menunggu`.
- Verifikator: `Minta perbaikan` (catatan wajib, min 10 char), `Setujui`, `Tolak` (alasan wajib + kategori alasan: bukti_kurang, data_tidak_valid, duplikat, lain).
- Mahasiswa: lihat timeline status + catatan + tombol `Perbaiki & kirim ulang` jika perlu_perbaikan.
- Hanya `disetujui` masuk profil + dashboard. Lainnya tidak dihitung (tampilkan strikethrough di riwayat dengan label).

## 4. Bukti Diterima (usulan, kunci Gate)
- Kompetisi: sertifikat/piagam atau surat resmi.
- Konferensi: sertifikat + (Best Delegate: bukti award).
- Olahraga: piagam + foto podium/dok resmi.
- Nominasi: surat/umumkan resmi (bukan klaim).
- Mock: cukup nama file; Tahap 2: PDF/JPG/PNG ≤5MB, cek manual verifikator.

## 5. Antrian Verifikator (FE)
- Tabel: tanggal, nama, kegiatan, tingkat, jenis, status badge, aksi Lihat.
- Filter: status, tingkat, kategori. Search nama/kegiatan.
- Detail: data kiri, bukti mock kanan (`EvidenceViewerMock` tampilkan nama file + tombol Unduh mock), panel keputusan bawah.
- Audit mock: siapa + kapan + catatan (localStorage).

## 6. Komponen FE
```
features/prestasi/
  types.ts  services-mock.ts
  hooks/useAchievementForm.ts  hooks/useVerification.ts
  components/AchievementForm.tsx  StatusTimeline.tsx  EvidenceMock.tsx
  components/DecisionPanel.tsx (verifikator)
```
