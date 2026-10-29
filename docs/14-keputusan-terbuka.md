# 14 — Keputusan Final FIX (v1.0, mengunci sebelum bangun)

> Status: **FIX / FINAL**. Tidak ada lagi pertanyaan terbuka untuk Tahap 1. Semua di bawah wajib diikuti FE mock. Perubahan setelah ini harus lewat revisi dokumen + persetujuan kamu.

Tanggal fix: 2026-10-29. Acuan: PRD §15.

## 15.1 Matching & Tim — FIX
| ID | Keputusan Final | Detail mengikat |
|---|---|---|
| Q1 | **Realtime (event-driven).** Siklus 15-harian hanya simulasi demo via tombol | Setiap undang/terima langsung hitung ulang. Tombol `Simulasikan siklus 15 hari` hanya untuk demo, berlabel `Simulasi` |
| Q2 | **Jumlah anggota ikut aturan resmi per kompetisi** di `competitions.json` | Contoh fix: PKM-RE 3–5, GEMASTIK-Berberegu 3–3, ON-MIPA 1 (individu, matching mati), KMI 3–5, PIMNAS ikut PKM. Admin bisa edit, tapi FE validasi min/max + peran wajib |
| Q3 | **Boleh ganti target, 1 aktif.** Tim lama otomatis `arsip` | Ganti target muncul modal konfirmasi: `Tim lama diarsip, tidak dihapus`. Riwayat arsip tampil di `/app/tim?arsip=1` |
| Q4 | **Tidak dapat partner → 3 aksi fix**: longgarkan filter, ajukan solo (jika kompetisi membolehkan), hubungi admin via halaman bantuan | EmptyState wajib ada 3 tombol itu. Tidak boleh halaman kosong |
| Q5 | **Undangan: kedaluwarsa 14 hari, max 5 aktif.** Ditolak → kasih 3 alternatif otomatis. Tak dijawab = kedaluwarsa, bisa undang ulang 1x | Penolak tidak wajib isi alasan rinci (cukup pilih `Belum cocok / Waktu / Skill`). Privasi dijaga |
| Q6 | **Keluar/ganti tim: boleh kapan saja sebelum seleksi internal final.** Setelah lolos seleksi → dikunci, harus via admin | Keluar → tim kembali `mencari`. Log `team_events` mock dicatat |

## 15.2 Halaman Kompetisi & Konsultasi — FIX
- **Wajib P0 (fix):** Info, Syarat & Tim, Jadwal (resmi + seleksi internal), Roadmap ringkas, Tenggat, Konsultan.
- **Konsultan WA masuk P0** dengan aturan: hanya tampil tombol WA jika `isVerifiedContact=true` DAN `assignmentApproved=true`. Selain itu tampil `Segera diumumkan` (disabled).
- **Pertemuan daring bulanan: TIDAK ada di P0.** Masuk P1, butuh persetujuan kapasitas. Dilarang buat UI jadwal rutin di Tahap 1.
- **Progres: P0 = checklist lokal.** Pengingat otomatis = P1. Daftar tenggat statis tetap ada di P0.

## 15.3 Roadmap & AI — FIX
- **Template awal fix (4 kompetisi):** PKM-RE (8 minggu penuh), GEMASTIK (6 minggu penuh), ON-MIPA (8 minggu individu), KMI Expo (6 minggu dasar). Kompetisi lain tampil placeholder + EmptyState.
- **Penyusun:** Admin Program. Sumber: panduan resmi Belmawa. Setiap sumber ada label `Wajib/Pelengkap` + tanggal update.
- **AI: FIX = tidak ada AI real di Tahap 1.** Komponen `AiBox` hanya contoh statis + badge `Rencana — belum aktif`. Dilarang tulis `AI merekomendasikan` seolah real.

## 15.4 Prestasi & Seleksi — FIX
- **Kategori fix:** `kompetisi, konferensi, olahraga, seni, nominasi, lain`.
- **Jenis capaian fix:** `partisipasi, nominasi, penghargaan, juara_1, juara_2, juara_3, best_delegate`.
- **Status fix (4 saja):** `menunggu, perlu_perbaikan, disetujui, ditolak`. Awal selalu `menunggu`. Hanya `disetujui` dihitung dashboard.
- **Verifikator fix:** peran khusus `verifikator`. Boleh rangkap admin di kampus kecil, tapi aksi dicatat `actedAs`.
- **Juara seleksi internal:** wajib ajukan via form prestasi + checkbox `dariSeleksiInternal=true` + pilih kompetisi. Kategori otomatis `seleksi_internal` agar tidak campur eksternal.
- **Bukti fix:** 1–3 file. Tahap 1 mock (nama saja). Tahap 2: PDF/JPG/PNG ≤5MB. Daftar diterima di `08 §4`.

## 15.5 Dashboard, Akses, Multi-kampus — FIX
- **Wajib admin dasar (7 fix):** terdaftar, peserta per kompetisi, tim terbentuk, pengajuan vs status, terverifikasi per kategori, terverifikasi per tingkat, delegasi terkonfirmasi.
- **Akses fix:** mahasiswa hanya milik sendiri + timnya. Verifikator hanya antrean + yang ditugaskan. Admin program operasional institusinya. Admin institusi ringkasan institusinya. Lihat matriks `02`.
- **Multi-kampus:** v1 satu institusi `inst-01`. Semua entity sudah ada `institutionId`. Filter lintas institusi disabled + tooltip `P2` di Tahap 1.

## 15.6 Validasi & Keberhasilan — FIX
- **Validasi:** demo ke 5 mhs + 1 admin + 1 verifikator. Lolos jika J1+J2 selesai <10 menit tanpa panduan.
- **Definisi cukup:** J1 (profil→tim→roadmap) + J2 (prestasi mandiri) + J3 (verifikasi) jalan end-to-end di mock.
- **Indikator:** tanpa target angka. Setiap angka wajib tooltip definisi+periode+sumber.
- **Target numerik:** tidak ditetapkan. Dilarang klaim di UI.

## Tabel Pengesahan
| ID | Keputusan | Tanggal | Oleh |
|---|---|---|---|
| ALL Q1–Q6 + 15.2–15.6 | FIX v1.0 di atas | 2026-10-29 | Pemilik produk (kamu) |
