# 09 — Dashboard dan ranking

## Prinsip angka
Setiap metrik menyebut definisi, rentang waktu, institusi, status data, dan waktu pembaruan. Statistik tidak menyamakan pengajuan dengan prestasi sah. Tidak ada klaim nasional atau peringkat kemampuan.

## Dashboard mahasiswa
Target aktif, status tim, progres roadmap, tenggat, pengajuan menurut status, prestasi disetujui, dan poin lomba tahun akademik. Tampilkan langkah berikutnya berdasarkan keadaan, termasuk saat profil kosong atau pengajuan perlu perbaikan.

## Dashboard validator
Konten draft/usang, jadwal mendekat, antrean pengajuan, perbaikan yang kembali, jumlah keputusan, data yang perlu tindakan, dan hasil seleksi. Filter periode; setiap tabel dapat menuju item sumber.

## Dashboard super admin
Jumlah akun dan staf aktif, aktivitas konten, tren pengajuan dan prestasi sah, ringkasan ranking, audit tindakan sensitif, status API/database/storage/backup, dan pengingat operasional. Status infrastruktur tidak boleh mengungkap rahasia.

## Ranking publik
Default: tahun akademik aktif (bila tidak ada periode aktif, respons periode berjalan wajib kosong tanpa mencampur seluruh periode). Riwayat sepanjang waktu (`lifetime`) ditampilkan sebagai tampilan terpisah. Hanya prestasi kategori lomba berstatus disetujui yang memberi poin. Tidak ada filter bidang pada rilis awal. Nama tampilan dan poin dipublikasikan; NIM, email, kontak, berkas dan detail internal tetap privat. **Foto profil/avatar mahasiswa yang tersimpan privat di RustFS tidak dipublikasikan di halaman ranking publik** (K-20).

### Sistem Poin 3 Lapis (`K-15` & `K-16`)
1. **Lapis 1 — Template Poin Berversi (`PointTemplate`)**: Super admin mengelola template bobot standar berversi berdasarkan `level × result` lengkap dengan nama template dan keterangan. Tabel berikut adalah bobot awal usulan untuk template v1:

| Tingkat \ Hasil | Partisipasi | Finalis/nominasi | Juara 3 | Juara 2 | Juara 1 |
|---|---:|---:|---:|---:|---:|
| Kampus/lokal | 1 | 2 | 4 | 6 | 8 |
| Nasional | 2 | 5 | 10 | 14 | 18 |
| Internasional | 3 | 8 | 16 | 22 | 30 |

2. **Lapis 2 — Poin per Jenis/Sub-Lomba & per Perlombaan (`CompetitionPointRule`)**: Admin/validator dapat mengatur bobot poin khusus untuk setiap **perlombaan** maupun **jenis & sub-lomba** (atau memilih memakai salah satu Template Poin berversi) disertai **keterangan aturan poin** yang ditampilkan kepada mahasiswa saat mengajukan dan kepada validator saat meninjau.
3. **Lapis 3 — Override Poin oleh Validator saat Approve**: Saat menyetujui pengajuan, validator melihat detail lomba/sub-lomba, anggota, kalkulasi poin otomatis, serta keterangan sumber aturannya, dan dapat mengubah (override) poin final bila dibutuhkan (termasuk untuk `penghargaan_khusus` atau kasus khusus panitia) dengan **alasan wajib** yang dicatat di `AchievementDecision`, `PointLedger`, dan `AuditEvent`.

Ini bobot awal rekomendasi, bukan kebijakan kampus final (`O-01`). Super admin dapat menyetujui/mengubah sebelum go-live. Perubahan template/bobot membuat versi baru tanpa mengubah riwayat award lama secara diam-diam.

### Aturan Buku Besar Poin & Tie-Break
- Setiap persetujuan prestasi lomba menyimpan `calculatedPoints`, `awardedPoints`, `pointSource` (`template` | `competition_rule` | `sub_competition_rule` | `validator_override`), `ruleVersion`, `overrideReason` (bila ada), dan `idempotencyKey` unik pada `PointLedger`.
- **Prestasi kelompok (`K-16`)**: Setiap anggota terdaftar menerima entri `award` bernilai poin penuh masing-masing dalam satu transaksi atomik.
- **Koreksi keputusan**: Reversal dicatat sebagai nilai negatif (`-award.points`) untuk seluruh anggota terkait pada siklus award yang masih aktif (tanpa double-reversal). Seluruh pembaca ledger (Ranking, Dashboard Mahasiswa, Ekspor CSV) menjumlahkan `sum += entry.points` secara konsisten (tidak pernah mengurangi nilai negatif).
- Skor mahasiswa = jumlah net `entry.points` pada periode terkait. Urutan tie-break deterministik: `poin DESC → jumlah Juara 1 unik DESC → jumlah prestasi sah unik DESC → nama ASC → userId ASC`. Mahasiswa bernilai ≤ 0 tidak tampil dalam ranking publik. Batas tampilan, pagination, dan waktu cache harus didokumentasikan.

## Perlindungan publikasi
Pemilik produk memilih publikasi tanpa persetujuan terpisah. Sebelum go-live, kebijakan privasi dan dasar publikasi nama perlu disahkan oleh pihak kampus/pengelola; mahasiswa diberi pemberitahuan jelas saat mendaftar. Ini adalah gate operasional, bukan perubahan diam-diam atas keputusan produk. Rujukan: UU 27/2022 tentang Pelindungan Data Pribadi, khususnya prinsip pemrosesan dan dasar pemrosesan (https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022).

## Uji
Poin dari kategori non-lomba tidak masuk; status belum disetujui tidak masuk; aturan poin versi baru (v2+) terpakai (bukan v1 hardcoded); custom poin perlombaan/sub-lomba mengalahkan template; override poin validator tercatat beserta alasan; prestasi kelompok memberi poin penuh ke semua anggota dan koreksi membalik semua anggota; re-approval pasca koreksi tidak menggandakan `approvedCount`/`juara1Count` dan tidak menyebabkan double-reversal; tie break 5 tingkat; periode aktif kosong; dashboard & CSV konsisten dengan ledger; identitas privat & avatar tidak muncul.
