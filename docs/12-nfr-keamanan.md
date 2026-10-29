# 12 — NFR & Keamanan (Operasionalisasi NFR-001 s/d NFR-009)

## NFR-001 Kemudahan
- Form ≤7 field wajib/step, ada contoh placeholder Indonesia, error bahasa jelas (`Pilih minimal 1 minat`).
- Uji Tahap 1: 3 mahasiswa mock bisa selesaikan J1 tanpa panduan >5 menit.

## NFR-002 Transparansi rekomendasi
- Tiap skor ada alasan 2–3 butir + footer disclaimer. Tidak ada ranking global.

## NFR-003 Transparansi verifikasi
- Timeline status + catatan selalu terlihat mahasiswa. Tolak/perbaikan tanpa alasan = bug (validasi FE).

## NFR-004 Minimalisasi data
- Dilarang minta: NIK, KK, alamat rinci, data ortu, rekening. Profil publik partner hanya: nama, prodi, skill, minat, peran, ketersediaan.

## NFR-005 Hak akses
- Guard rute + sembunyikan tombol aksi yang tidak berhak (bukan cuma disabled). Mock-role di localStorage; Tahap 2 JWT + cek BE.

## NFR-006 Cakupan statistik
- Setiap angka dashboard ada tooltip `Definisi + periode + sumber`. Contoh: `Tim terbentuk = isFormed true di teams.json inst-01`.

## NFR-007 Kejujuran status
- Daftar label wajib: `Mock` (data lokal), `Simulasi` (matching periodik), `Rencana` (AI). Dilarang hapus label sebelum Tahap 2 real.

## NFR-008 Siap lintas kampus
- `institutionId` wajib di semua entity + filter siap. UI filter institusi disabled + tooltip P2 di Tahap 1.

## NFR-009 Batas konsultasi
- Tidak ada status `online` dosen. Hanya `Terverifikasi`/`Segera diumumkan`. Teks kapasitas selalu tampil.

## Keamanan Tahap 1 vs 2
- Tahap 1: tidak ada data real, XSS dicegah via React default, tidak simpan password real (mock `***`).
- Tahap 2 (checklist): hashing, JWT httpOnly, RBAC BE, validasi file (tipe+size), audit log verifikasi, rate-limit, backup. Belum ada target SLA numerik (sesuai PRD).
