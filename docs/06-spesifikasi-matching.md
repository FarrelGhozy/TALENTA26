# 06 — Spesifikasi Matching Partner (Transparan, Mock v1)

## 1. Tujuan
Rekomendasikan partner beregu yang relevan, bisa dijelaskan, tidak dianggap ranking mutlak.

## 2. Input (dari profil + kompetisi)
- `targetKompetisiId` harus sama (filter keras).
- `peranDibutuhkan` vs `peranBisa`: complement, bukan duplikat.
- `skill[]` + level, `minat[]`, `pengalaman`, `ketersediaan{hari[], jamPerMinggu}`.

## 3. Skor v1 Mock (0–100, bisa dijelaskan)
```
skor = 30*targetSama (0/1)
     + 25*komplemenPeran (0..1: 1 jika isi peran kosong tim)
     + 20*komplemenSkill (Jaccard komplemen: skill yg menutup gap)
     + 15*overlapWaktu (overlapJam / max(kebutuhan))
     + 10*kemiripanMinat (Jaccard minat)
```
- Bulatkan integer. Tampilkan sebagai `Cocok 82%`.
- Jika `targetSama=0` → tidak tampil sama sekali.
- Jika `overlapJam < 4` → penalti -15 + label `Waktu sempit`.

Contoh alasan generator (`lib/matchScore.ts`):
- `+peran: Kamu butuh Hustler, Rina bisa itu`
- `+skill: Menutup gap Figma/Analisis data`
- `+waktu: Overlap 8 jam/minggu (Senin, Rabu)`
- `!catatan: Angkatan beda 2 thn — pertimbangkan gaya kerja`

## 4. Aturan Tim (`lib/teamRules.ts`)
Contoh per kompetisi (final di admin mock):
| Kompetisi | min–max | Peran wajib |
|---|---|---|
| PKM-RE | 3–5 | ketua, penulis, riset |
| GEMASTIK (div tim) | 3–3 | programmer, desainer, presenter |
| ON-MIPA | 1–1 (individu) | — (matching nonaktif, tampilkan info individu) |

`isTeamFormed = accepted>=min-1 && total<=max && peranWajibTerpenuhi`.

## 5. Perilaku Undangan (keputusan usulan, kunci di Gate)
- Max 5 undangan aktif per pengirim.
- Kedaluwarsa 14 hari (mock: tombol `Simulasikan kedaluwarsa`).
- Ditolak → beri 3 alternatif + alasan tidak wajib diisi penolak (hormati privasi, hanya `Belum cocok`).
- Keluar tim → tim `mencari` lagi, riwayat mock disimpan.
- Ganti target → arsipkan tim lama, mulai baru.
- Tidak dapat partner → EmptyState: `Coba longgarkan filter / ganti peran / hubungi admin`.

## 6. Kejujuran UI (wajib)
- Footer list: `Rekomendasi adalah saran. Bukan peringkat kemampuan.`
- Tidak ada leaderboard skor global.
- Badge `Mock` pada tombol simulasi periodik.

## 7. Implementasi FE Pecah
```
features/matching/
  types.ts
  services-mock.ts   # fetch users.json + filter target
  hooks/useMatches.ts
  components/PartnerCard.tsx  MatchReasons.tsx  InviteActions.tsx
lib/matchScore.ts  lib/teamRules.ts
```
Fungsi `scoreMatch(me, candidate, competition)` pure + unit test ringan (vitest) di Tahap 1.
