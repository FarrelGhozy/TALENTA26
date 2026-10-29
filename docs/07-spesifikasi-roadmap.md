# 07 — Spesifikasi Roadmap Persiapan (Template per Kompetisi)

## 1. Prinsip
Roadmap Tahap 1 = template statis per kompetisi, bisa jalan mandiri tanpa dosen. AI hanya label Rencana.

## 2. Struktur Template (skema `roadmaps.json`)
```json
{
  "competitionSlug": "pkm-re",
  "fase": [
    {
      "minggu": "1-2", "judul": "Pondasi & Ide",
      "materi": ["Panduan PKM resmi", "Cara gali masalah"],
      "skillDilati": ["riset awal", "menulis latar belakang"],
      "latihan": ["Bedah 3 proposal lolos", "Draft 500 kata masalah"],
      "target": "Punya 3 calon ide + dosen pembimbing sementara",
      "indikator": ["Dok 500 kata ada", "Matriks ide terisi"],
      "tenggat": ["2026-11-15 draf ide"],
      "sumber": [{"judul":"Panduan PKM 2026","url":"#","wajib":true}]
    }
  ]
}
```

## 3. Contoh Isi Minimal per Kompetisi Belmawa
- **PKM-RE (8 minggu):** ide → proposal → metodologi → luaran → review internal → submit.
- **GEMASTIK (6 minggu):** format lomba → stack → mini-project → uji → seleksi internal → final polish.
- **ON-MIPA (individu, 8 minggu):** silabus → latihan soal → tryout → evaluasi.
- **KMI Expo:** ide bisnis → BMC → prototype → pitch deck.
- **PIMNAS turunan PKM:** gladi presentasi + poster.

Tiap kompetisi min 4 fase, tiap fase min 1 latihan + 1 target + 1 tenggat. Penanggung jawab konten: Admin Program (mock sudah diisi 2 kompetisi lengkap, sisanya placeholder agar FE tangani EmptyState).

## 4. Aturan Tampil di FE
- `RoadmapChecklist`: checkbox lokal (localStorage per user+kompetisi), progress bar `%`.
- Urutan disarankan, tidak dikunci keras (boleh loncat, tapi ada label `Disarankan urut`).
- `DeadlineList`: urut tanggal, yang ≤7 hari ada badge merah `Segera`.
- `SumberBelajar`: badge Wajib/Pelengkap, link mock `#`.
- `AiSuggestionBox`: tampil di bawah dengan badge `Rencana AI — contoh statis`, isi 2-3 saran generik berdasar sisa waktu (hitung mundur ke deadline mock).

## 5. File & Komponen
```
features/roadmap/
  types.ts  services-mock.ts  hooks/useRoadmap.ts  hooks/useChecklist.ts
  components/RoadmapChecklist.tsx  DeadlineList.tsx  SourceList.tsx  AiBoxMock.tsx
mocks/roadmaps.json
```
