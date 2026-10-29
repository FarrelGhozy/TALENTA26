# 04 — Sitemap & Rute React Router

## 1. Sitemap
```
/ (landing mock)
/masuk (pilih peran mock)
/daftar (form mini mock)
PUBLIK:
/kompetisi (list)
/kompetisi/:slug (detail + jadwal + CTA pilih target)
APP MAHASISWA (/app layout):
  /app/beranda
  /app/profil (form profil + target)
  /app/partner (rekomendasi + undangan masuk/keluar)
  /app/tim (status tim)
  /app/kompetisi/:slug/persiapan (roadmap + konsultan)
  /app/prestasi (riwayat + status)
  /app/prestasi/baru (form)
ADMIN (/admin):
  /admin (dashboard operasional)
  /admin/kompetisi (CRUD mock)
  /admin/roadmap (kelola template mock)
  /admin/konsultan (kelola verified)
  /admin/seleksi (jadwal + delegasi mock)
VERIFIKATOR (/verifikasi):
  /verifikasi (antrian)
  /verifikasi/:id (detail + aksi)
Fallback: * → /404
```

## 2. Tabel Rute → Komponen (prinsip pecah kode)
| Rute | Page | Pecahan komponen | Guard Tahap 1 |
|---|---|---|---|
| `/kompetisi` | `CompetitionListPage` | `CompetitionCard`, `CompetitionFilter` | publik |
| `/kompetisi/:slug` | `CompetitionDetailPage` | `InfoTabs`, `ScheduleTimeline`, `TeamRuleBox` | publik |
| `/app/profil` | `ProfilePage` | `ProfileForm/StepMinat`, `StepSkill`, `StepTarget` | mahasiswa |
| `/app/partner` | `PartnerPage` | `PartnerCard`, `MatchReasonTooltip`, `InviteButtons` | mahasiswa |
| `/app/tim` | `TeamPage` | `TeamStatusBanner`, `MemberList` | mahasiswa |
| `/app/kompetisi/:slug/persiapan` | `PreparationPage` | `RoadmapChecklist`, `ConsultantCard`, `DeadlineList` | mahasiswa + punya target |
| `/app/prestasi/baru` | `AchievementNewPage` | `AchievementForm`, `FileMockInput` | mahasiswa |
| `/admin` | `AdminDashboardPage` | `StatCards`, `RecentTables` | admin |
| `/verifikasi/:id` | `VerificationDetailPage` | `EvidenceViewerMock`, `DecisionPanel` | verifikator |

Aturan pecah: 1 file ≤ 150 baris, 1 komponen 1 tugas, logic fetch mock di `services/*.ts`, state form di `hooks/use*.ts`.

## 3. Struktur Folder FE (Vite, rapi)
```
src/
  app/
    router.tsx        # createBrowserRouter, lazy per page
    guards.tsx        # RequireRole, RequireTarget
    layouts/
      PublicLayout.tsx  AppLayout.tsx  AdminLayout.tsx
  features/
    profil/ components/ hooks/ services-mock.ts  types.ts
    kompetisi/ ...
    matching/ ...
    roadmap/ ...
    prestasi/ ...
    dashboard/ ...
    konsultasi/ ...
  components/ui/ (Button, Card, Badge, Modal, Tooltip, EmptyState)
  mocks/*.json (competitions, users, roadmaps, achievements, consultants, selections)
  lib/ (matchScore.ts, teamRules.ts, format.ts)
  styles/
```

## 4. Navigasi & Guard Detail
- Belum pilih target → akses `/app/partner` redirect ke `/app/profil?need=target`.
- Belum login mock → redirect `/masuk`.
- Role salah → `/403` mock dengan tombol ganti peran.
