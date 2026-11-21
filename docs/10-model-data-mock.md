# 10 — Model data target dan transisi mock

Dokumen lama berisi JSON demo; model di bawah adalah rancangan relasional target yang diselaraskan dengan skema Prisma 7 (MySQL) serta keputusan `K-15`–`K-22` (21 November 2026). Semua tabel domain memakai ID internal stabil, `institutionId` pada entitas utama, `createdAt`, `updatedAt`; data sensitif dibatasi aksesnya dengan explicit `select`.

## Entitas dan relasi
- `Institution` 1—N `User`, `AcademicPeriod`, `CompetitionCategory`, `Competition`, `PointTemplate`, `PointRule`, `Achievement`, `InternalSelection`, `PointLedger`, `AuditEvent`.
- `AcademicPeriod`: menyimpan `name`, `year`, `semester`, `startDate`, `endDate`, `isActive`, `archivedAt` untuk mendukung manajemen pergantian periode eksplisit di panel super admin.
- `User`: menyimpan `email`, `passwordHash`, `fullName` (**nama asli staf/pengguna per K-20**, tidak pernah dikembalikan bersama `passwordHash`), `role` (`mahasiswa`, `validator`, `super_admin`), `status` (`active`, `suspended`; `pending_verification` ditunda per K-21). `User` 1—1 `StudentProfile` (untuk mahasiswa), 1—N `AuthSession` (menyimpan hash token SHA-256), `PasswordResetToken`, `StudentTarget`, `TeamMember`, `Achievement`, `AchievementParticipant`, `PointLedger`, `AuditEvent`.
- `StudentProfile`: menyimpan `nim`, `fullName`, `studyProgram`, `faculty`, `enrollmentYear?`, **`avatarObjectKey?`** (kunci objek privat di RustFS, menggantikan penyimpanan Base64 pada `avatarUrl`), `phone?`, `bio?`, `skills`, `interests`, `availability`, `rolesCapable`, `experience`.
- `CompetitionCategory` (Jenis Lomba) 1—N `CompetitionSubCategory` (Sub-Lomba/Cabang): menyimpan kode stabil, nama, keterangan, dan relasi opsional ke aturan/template poin.
- `Competition`: terhubung ke `Institution`, `AcademicPeriod`, `CompetitionCategory?`, dan `PointTemplate?`. Menyimpan `slug`, `name`, `organizer`, `category`, `level`, `format` (`individu` | `beregu`), `minTeamMembers`, `maxTeamMembers`, `requiredRoles`, `registrationDeadline`, `competitionDate`, `description`, `requirements`, `scheduleTimeline`, `sourceUrl?`, `sourceUpdatedAt?`, `pointDescription?` (keterangan aturan poin), `status` (`draft` | `published` | `archived`), `version`.
- `PointTemplate` 1—N `PointRule` (berversi): matriks bobot standar `level × result` + nama & keterangan template.
- `CompetitionPointRule`: aturan poin khusus (custom override) per `Competition` dan/atau `CompetitionSubCategory` untuk kombinasi `level × result`, lengkap dengan `points` dan `description` (keterangan poin).
- `StudentTarget`: N—1 `User`, `Competition`, dan **`AcademicPeriod`** (`academicPeriodId`) agar pergantian periode mengarsipkan target lama secara bersih tanpa menghapus riwayat.
- `Team` 1—N `TeamMember` dan `TeamInvite`; `Team` N—1 `Competition`. Status tim: `mencari`, `terbentuk`, `terkunci_seleksi`, `arsip`.
- `InternalSelection`: N—1 `Institution`, `Competition`, `teamId?` (opsional untuk beregu), **`userId?`** (opsional untuk individu per K-18), `stage`, `result` (`menunggu` | `lolos` | `tidak`), `organizerVerified`, `notes?`, `confirmedAt?`, `validatorId?`.
- `Roadmap` 1—N `RoadmapPhase` 1—N `RoadmapTask` 1—N `RoadmapProgress`. Pembaruan roadmap memakai strategi non-destruktif (upsert/soft-archive atau versi baru) agar progres mahasiswa tidak terhapus.
- `ConsultantContact`: N—1 `Competition`; menyimpan `name`, `field`, `whatsappNumber`, `capacityNote?`, `isApproved`, `status`.
- `Achievement`: N—1 `Institution`, `User` (pengaju), `AcademicPeriod`, `Competition?`, `CompetitionCategory?`, `CompetitionSubCategory?`, `Team?`. Menyimpan `participationType` (`individu` | `kelompok`), `subCompetitionName?`, `name`, `organizer`, `category`, `level`, `result`, `eventDate`, `description?`, `isFromInternalSelection`, `potentialDuplicateOfId?`, `status` (`menunggu`, `perlu_perbaikan`, `disetujui`, `ditolak`, `dibatalkan`; `draft` ditunda), `version`, `reviewNote?`.
- `AchievementParticipant`: N—1 `Achievement` dan `User` (`roleInTeam?`, `isSubmitter`) untuk mencatat seluruh anggota penerima poin pada prestasi kelompok (`K-16`).
- `AchievementEvidence`: N—1 `Achievement` dan `User` (`uploaderId`); menyimpan `objectKey @unique`, `fileName`, `fileSize`, `mimeType`, `isActive` (default `true`), `supersededByRevisionId?` untuk penggantian berkas saat revisi tanpa menghapus jejak audit.
- `AchievementRevision` & `AchievementDecision`: `AchievementDecision` menyimpan `action`, `previousStatus`, `newStatus`, `reason?`, `version`, `calculatedPoints?`, `awardedPoints?`, `pointSource?`, `overrideReason?`, `decidedById`.
- `PointLedger`: N—1 `Institution`, `User`, `Achievement`, `AcademicPeriod?`; menyimpan `ruleVersion`, `points` (positif untuk `award`, negatif untuk `reversal`), `type` (`award` | `reversal`), `pointSource`, `calculatedPoints?`, `overrideReason?`, `idempotencyKey @unique`, `reversedByLedgerId?` (mencegah double-reversal).
- `AuditEvent`: menyimpan `institutionId`, `actorId?`, `action`, `targetType`, `targetId?`, `metadata` (redacted), `requestId?`, `ipAddress?`, `userAgent?`, `createdAt`.

## Constraint dan indeks minimum
Email dan NIM dinormalisasi serta unik per institusi; username staf tidak berbagi jalur registrasi publik. Foreign key memakai ID stabil. `TeamMember` mendukung reaktivasi keanggotaan bila mahasiswa keluar lalu bergabung ulang. `Achievement` memakai `version` + locking atomik (`FOR UPDATE`/conditional update) untuk mencegah race condition verifikasi. `AchievementEvidence.objectKey` unik; `PointLedger.idempotencyKey` unik untuk mencegah poin ganda. Indeks pada `institutionId + academicPeriodId + status + createdAt` untuk antrean dan dashboard.

## Data dan migrasi
JSON demo berada di `mocks/` dan `frontend/src/mocks/`. Data ini hanya fixture demo, bukan data produksi. Seed produksi (`NODE_ENV=production`) **hanya** membuat entitas institusi minimal, template poin v1 awal (bila kosong), dan bootstrap super admin satu kali dari environment tanpa fallback password dan tanpa konten lomba/kontak dummy 2026. Migrasi SQL wajib committed, diuji pada staging dengan data lintas periode, dan punya rencana rollback atau forward fix.

## Zona waktu dan data historis
Simpan timestamp UTC, tanggal kalender dan tahun akademik sebagai field eksplisit; validasi dan tampilkan dalam zona waktu `Asia/Jakarta`. Aturan poin, template, komposisi tim, roadmap, dan publikasi konten mempertahankan riwayat agar perubahan masa depan tidak merusak hasil lama. Retensi bukti, audit, dan akun diputuskan sebelum go-live (`O-03`).
