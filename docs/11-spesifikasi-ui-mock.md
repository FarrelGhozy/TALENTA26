# 11 — Spesifikasi UI Mock (Tahap 1, Vite Pecah Komponen)

## 1. Prinsip FE
- 1 route = 1 folder page ≤150 baris; komponen kecil di `features/*/components/`.
- UI kit di `components/ui/`: Button, Card, Badge, Input, Select, Modal, Tooltip, EmptyState, Tabs, Timeline.
- Semua teks Indonesia, santai-formal. Setiap mock/simulasikan ada badge `Mock`.
- Mobile-first, max-width 1120px, sidebar collapse di ≤768px.

## 2. Spec Per Halaman (ringkas tapi siap bangun)

### `/` Landing mock
Hero: nama + tagline + 3 masalah → CTA Lihat kompetisi + Masuk. Section: cara kerja 4 langkah, daftar kompetisi preview (3 kartu), footer jujur `Demo mock`.

### `/kompetisi` + `/kompetisi/:slug`
Filter: search, kategori, tingkat. Card: nama, deadline badge, tombol Detail. Detail: Tabs (Info/Syarat&Tim/Jadwal/Roadmap preview/Konsultan). CTA `Pilih sebagai target` (jika belum login mock → ke /masuk).

### `/app/profil`
Stepper 3: 1) Identitas+Prodi 2) Minat/Skill/Pengalaman 3) Waktu+Target. Tiap step validasi inline. Komponen: `StepMinat` (chip select max5), `StepSkill` (add skill+level), `StepTarget` (radio kompetisi). Tombol Simpan draft + Selesai → ke partner.

### `/app/partner`
Header filter (peran, skill). List `PartnerCard`: avatar initial, nama, prodi, skor + `Kenapa cocok?` tooltip, tombol Undang. Tab Undangan masuk/keluar dengan badge count. EmptyState jika target individu (ON-MIPA): `Kompetisi individu — tidak perlu partner`.

### `/app/tim`
`TeamStatusBanner` (Mencari/Menunggu/Terbentuk). `MemberList` + tombol Keluar (modal konfirmasi) + CTA ke Persiapan (disabled sampai terbentuk + tooltip alasan).

### `/app/kompetisi/:slug/persiapan`
Atas: info ringkas + countdown deadline. Tengah: `RoadmapChecklist` (fase accordion + checkbox). Samping: `DeadlineList` + `ConsultantCard` (WA button verified only) + `AiBoxMock` (badge Rencana).

### `/app/prestasi` + `/baru`
Tabel riwayat: tanggal, kegiatan, jenis badge warna (partisipasi abu, nominasi kuning, penghargaan biru, juara hijau, ditolak merah), status badge, aksi Lihat/Perbaiki. Form: 2 kolom desktop, 1 kolom mobile, `FileMockInput` (input file tapi hanya simpan nama, ada label mock).

### `/admin`, `/verifikasi`
Admin: `StatCards` (6 kartu) + tabel recent + tab Kelola (kompetisi/roadmap/konsultan/seleksi) pakai Drawer form sederhana. Verifikasi: tabel antrean + detail split (kiri data, kanan bukti) + `DecisionPanel` (3 tombol + textarea catatan, validasi wajib).

## 3. State & Feedback
- Loading: skeleton 300ms. Error: EmptyState + tombol Coba lagi (mock tidak pernah 500, tapi siapkan).
- Toast untuk undang/keputusan/simpan. Modal konfirmasi untuk ganti target/keluar tim/tolak.
- Warna status: menunggu kuning, perlu_perbaikan oranye, disetujui hijau, ditolak merah, terbentuk hijau, mencari abu.

## 4. Checklist Pecah Kode (contoh Partner)
```
features/matching/
  PartnerPage.tsx (≤120 baris: layout + hooks saja)
  components/PartnerCard.tsx (≤100)
  components/MatchReasons.tsx (≤60)
  components/InviteActions.tsx (≤80)
  hooks/useMatches.ts  hooks/useInvites.ts
```
Lint: eslint + prettier; dilarang import antar-features langsung, lewat `lib/` atau props.
