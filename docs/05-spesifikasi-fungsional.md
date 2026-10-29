# 05 — Spesifikasi Fungsional Per Modul (FR-001 s/d FR-044)

> Format per FR: Kebutuhan → Input → Validasi → Edge → Kriteria terima Tahap 1.

## Modul A — Akun & Profil (FR-001 s/d FR-004, P0)
- **FR-001 Buat akun (mock):** input nama, email kampus, password(min 8), prodi, angkatan. Validasi email unik (cek mock). Edge: email duplikat → error inline. Terima: bisa masuk `/app/beranda` dengan role mahasiswa.
- **FR-002 Isi profil:** field wajib: displayName, prodi, angkatan, minat[](max 5), skill[](dengan level 1-3), pengalaman(text ≤280), ketersediaan(jam/minggu + hari), targetKompetisiId. Optional: portofolio link, peran preferensi.
- **FR-003 Sederhana:** tiap step ≤7 field, ada progress bar, tombol Simpan draft (localStorage). Dilarang minta: NIK, alamat lengkap, data ortu.
- **FR-004 Dasar rekomendasi:** profil tersimpan → tombol `Lihat rekomendasi` aktif. Skor tampil sebagai `Cocok 82% — karena ...` bukan ranking absolut. Tooltip wajib.

## Modul B — Kompetisi & Jadwal (FR-005 s/d FR-008)
- **FR-005 Daftar awal:** dari `competitions.json` min 5 Belmawa (PKM-RE, PKM-K, GEMASTIK, ON-MIPA, KMI). Kartu: nama, kategori, tingkat, deadline, badge `Pendaftaran/Seleksi/Selesai`.
- **FR-006 Kelola admin:** field: namaResmi, deskripsi, tujuan, syaratPeserta[], komposisiTim{min,max,peranWajib[]}, tahapan[], jadwalResmi[], jadwalSeleksiInternal. Admin edit in-memory + tombol Reset mock.
- **FR-007 Pilih target:** 1 mahasiswa 1 target aktif (ganti boleh, tapi tim lama jadi `arsip`). Konfirmasi modal jika sudah punya tim.
- **FR-008 Halaman kompetisi:** tab Info | Syarat & Tim | Jadwal | Roadmap | Konsultan. Jika data kosong → EmptyState + CTA hubungi admin.

## Modul C — Matching & Tim (FR-009 s/d FR-015)
Detail algoritma di `06-spesifikasi-matching.md`. Di sini kontrak UI:
- **FR-009 Kelompokkan:** filter: target sama, peran dibutuhkan, ketersediaan overlap ≥ 4 jam/minggu (mock).
- **FR-010 Rekomendasi:** list + skor + 3 alasan teratas. Sort default skor, bisa sort prodi/angkatan.
- **FR-011 Transparan:** tiap kartu ada `Kenapa cocok?` → popover alasan. Footer: `Skor adalah saran, bukan peringkat kemampuan.`
- **FR-012 Undangan:** kirim (max 5 aktif), terima/tolak. Toast + update badge. Tolak wajib tawarkan 3 alternatif.
- **FR-013 Status tim:** banner `Mencari / Menunggu X lagi / Terbentuk ✓`. Tombol ke persiapan disabled sampai terbentuk.
- **FR-014 Jadwal:** Tahap 1: realtime mock (tombol `Simulasikan matching 15-harian` untuk demo). Keputusan final di `14`.
- **FR-015 Aturan tim:** ikut `teamRules.ts` per kompetisi. Keluar tim → konfirmasi + tim kembali Mencari.

## Modul D — Roadmap (FR-016 s/d FR-021)
Detail konten di `07`. Kontrak:
- **FR-016 Template:** per kompetisi 6–10 minggu, 4–6 fase.
- **FR-017 Isi:** materi/topik, skill dilatih, latihan/tugas, target mingguan, indikator, persiapan seleksi, tenggat.
- **FR-018 Urutan:** fase terkunci berurutan (bisa lihat, tapi checklist sarankan urut). Progress bar lokal.
- **FR-019 Sumber:** link belajar dikelola admin, tiap item ada label `Wajib/Pelengkap`.
- **FR-020/021 AI:** Tahap 1 DILARANG klaim AI. Komponen `AiSuggestionBox` hanya tampil dengan badge `Rencana — belum aktif` + isi statis contoh.

## Modul E — Halaman Kompetisi & Konsultasi (FR-022 s/d FR-027)
- **FR-022 Ringkas terpusat:** satu halaman persiapan gabungkan info+jadwal+roadmap+konsultan.
- **FR-023/024 Dosen:** card foto/nama/bidang + tombol WA hanya jika verified. Jika belum → `Segera diumumkan`.
- **FR-025 Kapasitas:** teks `Konsultasi sesuai kapasitas. Harap buat janji.` Dilarang tampilkan `Selalu online`.
- **FR-026 Daring bulanan:** tidak ada di Tahap 1 (tunda, perlu persetujuan).
- **FR-027 Progres/pengingat:** Tahap 1: checklist lokal + daftar tenggat. Reminder otomatis = P1.

## Modul F — Seleksi Internal (FR-028 s/d FR-030)
- **FR-028 Info:** timeline seleksi per kompetisi (berkas → presentasi → pengumuman).
- **FR-029 Hasil:** tabel delegasi mock dengan badge `Terverifikasi panitia / Menunggu`.
- **FR-030 Hubungan prestasi:** juara 1/2/3 seleksi TETAP ajukan via form prestasi (kategori `Seleksi Internal`), agar tidak campur dengan prestasi eksternal. Ada checkbox `Berasal dari seleksi internal TALENTA`.

## Modul G — Prestasi Mandiri (FR-031 s/d FR-037)
Detail di `08`. Ringkas: terbuka semua mahasiswa, field: nama, penyelenggara, kategori, tanggal, tingkat (lokal/nasional/internasional), jenis capaian (partisipasi/nominasi/penghargaan/juara 1/2/3), bukti (mock file), deskripsi. Status awal `menunggu`. Hanya `disetujui` masuk dashboard.

## Modul H — Dashboard (FR-038 s/d FR-041)
Detail di `09`. Ringkas: kartu (terdaftar, peserta per kompetisi, tim terbentuk, pengajuan vs status, terverifikasi per kategori/tingkat, delegasi). Wajib tampilkan `Cakupan: Inst-01 • Periode: mock 2026 • Sumber: data mock`.

## Modul I — Multi-kampus (FR-042 s/d FR-044, P2)
- Semua mock sudah ada `institutionId`.
- Filter institusi tampil disabled di Tahap 1 dengan tooltip `P2`.
- Tidak ada klaim lintas kampus, tidak ada integrasi di Tahap 1.
