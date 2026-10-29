# 10 — Model Data & Mock JSON

## 1. ERD Konseptual (teks)
```
Institution(1) — (N) User — (1) Profile — (1) Competition(target)
Competition(1) — (N) Roadmap(Fase) — (N) Source
User(N) — (M) Team via Membership; Team(N) — (1) Competition
User(1) — (N) Achievement; Achievement(N) — (1) VerificationLog
Competition(1) — (N) Selection; Consultant(N) — (M) Competition
```

## 2. Skema Mock (semua punya `institutionId`)
`src/mocks/`:
- `institutions.json`: [{id:inst-01, nama: Kampus Mock}]
- `users.json`: id, nama, prodi, angkatan, peran[], skill[{nama,level}], minat[], ketersediaan{hari[], jam}, peranBisa[]
- `competitions.json`: slug, namaResmi, kategori, tingkat, deskripsi, syarat[], komposisi{min,max,peranWajib[]}, tahapan[], jadwal[{label,tanggal}], seleksiInternal[{tahap,tanggal}]
- `teams.json`: id, competitionSlug, anggota[{userId,status}], isFormed (turunan, tapi disimpan mock agar mudah demo)
- `invites.json`: id, dari, ke, teamId, status[diajukan,diterima,ditolak,kedaluwarsa], createdAt
- `roadmaps.json`: lihat `07`
- `achievements.json`: id, userId, nama, penyelenggara, kategori, tanggal, tingkat, jenisCapaian, bukti[{nama,size}], status, catatan, dariSeleksiInternal?
- `consultants.json`: id, nama, foto(mock initial), bidang[], assignmentApproved, isVerifiedContact, waMock
- `selections.json`: id, competitionSlug, pesertaTeamId, tahap, hasil[lolos/tidak/menunggu], verifiedPanitia
- `profiles.json`: userId + targetKompetisiSlug + kelengkapan%

Contoh user (ringkas):
```json
{"id":"u-03","institutionId":"inst-01","nama":"Rina","prodi":"Informatika","angkatan":2023,"skill":[{"nama":"Figma","level":3}],"minat":["UI/UX","PKM"],"ketersediaan":{"hari":["Senin","Rabu"],"jam":8},"peranBisa":["desainer"]}
```

## 3. Aturan Mock
- Min 12 users, 5 competitions (2 roadmap penuh), 4 teams (2 terbentuk), 10 achievements (campur status), 4 consultants (2 verified).
- Tanggal konsisten 2026. ID stabil `u-01`, `pkm-re`, dll.
- Akses via `services-mock.ts` async pura-pura (delay 300ms) agar gampang ganti fetch real Tahap 2.
- localStorage keys: `talenta-role`, `talenta-profile`, `talenta-checklist:<user>:<slug>`, `talenta-achievements`, `talenta-invites`.
