# 15 — Strategi ENV & Data Source (FIX: DEPLOYMENT vs PRODUCTION + Mock true/false)

> Dokumen ini FIX untuk menjawab permintaanmu: app env + mock switch. Wajib diikuti sejak init Vite.
> Nilai ENV kapital: `DEPLOYMENT` | `PRODUCTION`.

## 1. Dua ENV yang dipakai (Vite)

```bash
# .env.example (wajib ada di repo FE nanti)
VITE_APP_ENV=DEPLOYMENT       # DEPLOYMENT | PRODUCTION
VITE_USE_MOCK=true           # true | false
VITE_API_BASE_URL=http://localhost:3000/api  # dipakai hanya jika USE_MOCK=false
```

| ENV | Nilai | Arti |
|---|---|---|
| `VITE_APP_ENV` | `DEPLOYMENT` | Mode demo: login + ganti role pakai **Card** (klik peran). Tanpa password real. Ada badge `Demo` di navbar |
| `VITE_APP_ENV` | `PRODUCTION` | Mode real: login pakai **form email+password** (nanti JWT). Tidak ada card ganti role sembarangan |
| `VITE_USE_MOCK` | `true` | FE ambil data dari `src/mocks/*.json` + localStorage via `mockAdapter`. Tanpa delay buatan (langsung instan) |
| `VITE_USE_MOCK` | `false` | FE ambil data dari BE via `apiAdapter` (`VITE_API_BASE_URL`). Wajib ada token jika PRODUCTION |

## 2. Matriks Kombinasi Resmi

| Kombinasi | Kapan dipakai | Login UI | Data dari |
|---|---|---|---|
| `DEPLOYMENT` + `true` | **Default Tahap 1.** Demo ke kamu/dosen | Card peran (Mahasiswa/Admin/Verifikator) di `/masuk` | Mock JSON |
| `PRODUCTION` + `true` | Uji UI production tapi BE belum siap | Form login mock (email bebas + password `demo123`, cek lokal) | Mock JSON |
| `PRODUCTION` + `false` | **Tahap 2 Final.** BE sudah ada | Form login real → JWT | BE real |
| `DEPLOYMENT` + `false` | Dilarang (tidak dipakai) | — | — |

Aturan: jika `USE_MOCK=false` tapi BE tidak reachable → tampilkan `EmptyState error BE` + tombol `Kembali ke mock` (hanya di DEPLOYMENT).

## 3. Arsitektur Kode (pecah, rapi)

```
src/
  config/env.ts              # baca import.meta.env, export APP_ENV, USE_MOCK, API_URL, isMock()
  services/
    types.ts                 # interface CompetitionService, PartnerService, dst (kontrak BE)
    factory.ts               # if USE_MOCK → mockAdapter else apiAdapter
    mock/
      competitionMock.ts     # baca mocks/*.json
      partnerMock.ts         # pakai lib/matchScore.ts
      achievementMock.ts     # localStorage
    api/
      competitionApi.ts      # fetch VITE_API_BASE_URL (stub Tahap 1, real Tahap 2)
      authApi.ts
  features/*/hooks/          # hanya panggil factory, tidak tahu mock/api
  mocks/*.json               # copy dari /mocks di root repo ini
```

Contoh `config/env.ts`:
```ts
export const APP_ENV: 'DEPLOYMENT' | 'PRODUCTION' =
  (import.meta.env.VITE_APP_ENV as string) ?? 'DEPLOYMENT';
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';
export const API_URL = import.meta.env.VITE_API_BASE_URL ?? '';
export const isDemoLogin = APP_ENV === 'DEPLOYMENT';
// Normalisasi: jika ada yang isi lowercase, paksa ke kapital saat validasi awal
// if (!['DEPLOYMENT','PRODUCTION'].includes(APP_ENV)) throw new Error('VITE_APP_ENV harus DEPLOYMENT|PRODUCTION');
```

Contoh `services/factory.ts`:
```ts
import * as mock from './mock/competitionMock';
import * as api from './api/competitionApi';
import { USE_MOCK } from '../config/env';
export const competitionService = USE_MOCK ? mock : api; // keduanya penuhi interface sama
```

## 4. Login & Ganti Role

### Mode `DEPLOYMENT` (card)
- `/masuk` tampilkan 3 card: Mahasiswa (Rina mock), Admin Program (Budi), Verifikator (Sari). Klik → set `localStorage talenta-role + talenta-user-id` → redirect.
- Navbar tidak ada ganti peran cepat. Ganti peran = logout (tombol Keluar) → pilih card lain di `/masuk`. Ada badge kuning `Demo — data mock`.
- Tidak ada password. Dilarang pakai di PRODUCTION build.

### Mode `PRODUCTION`
- `/masuk` tampilkan form email + password + tombol Masuk. Tahap 1 (mock true): terima `demo@kampus.ac.id / demo123` untuk tiap peran (pilih peran via dropdown, cek lokal). Tahap 2 (mock false): POST ke BE, simpan JWT httpOnly (cookie) / memory.
- Tidak ada ganti peran cepat di navbar. Ganti peran = logout + login ulang via `/masuk`.
- Guard `RequireRole` baca dari auth context (mock: localStorage, real: JWT payload).

## 5. Checklist Implementasi
- [ ] `.env.example` + `.env` (`DEPLOYMENT+true`) + `.env.production` (`PRODUCTION+false`).
- [ ] `src/config/env.ts` + banner Demo jika DEPLOYMENT + validasi kapital (tolak lowercase).
- [ ] Semua hooks pakai factory, tidak import `mocks/` langsung dari page.
- [ ] `api/` stub dengan TODO + error jelas jika dipanggil saat mock true.
- [ ] Build demo: `VITE_APP_ENV=DEPLOYMENT VITE_USE_MOCK=true bun run build`. Build prod: `VITE_APP_ENV=PRODUCTION VITE_USE_MOCK=false bun run build`.
