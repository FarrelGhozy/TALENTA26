# 10 — Model data target dan transisi mock

Dokumen lama berisi JSON demo; model di bawah adalah rancangan relasional target. Prisma schema sebenarnya dibuat pada Stage 2 setelah versi yang mendukung MySQL secara stabil dipilih. Semua tabel domain memakai ID internal stabil, institutionId, createdAt, updatedAt; data sensitif dibatasi aksesnya.

## Entitas dan relasi
- Institution 1—N User, AcademicPeriod, CompetitionEdition.
- User 1—1 StudentProfile (untuk mahasiswa), 1—N AuthSession, Target, TeamMembership, Achievement, AuditEvent.
- RoleAssignment N—1 User; role mahasiswa/validator/super_admin. Dosen/konsultan memakai ConsultantContact, bukan User role.
- CompetitionSeries 1—N CompetitionEdition; edition N—1 AcademicPeriod. Edition menyimpan aturan individu/beregu, min/max, tenggat dan status publikasi.
- CompetitionEdition 1—N ScheduleEvent, TeamRuleVersion, RoadmapVersion, Selection, ConsultantAssignment.
- StudentTarget N—1 User dan Edition; unique aktif per user/periode memakai constraint atau transaksi teruji.
- Team 1—N TeamMembership dan Invite; team N—1 Edition. TeamEvent menyimpan histori perubahan.
- RoadmapVersion 1—N RoadmapPhase 1—N RoadmapTask/Source. TaskProgress N—1 User dan Task.
- Achievement 1—N AchievementRevision, EvidenceObject, VerificationEvent; Achievement N—1 User/Edition opsional.
- PointRuleVersion 1—N PointRule; PointLedger N—1 Achievement dan User/Period. Poin tidak disimpan hanya sebagai angka turunan tanpa provenance.
- AuditEvent menyimpan actor, object, action, before/after redacted, timestamp dan requestId.

## Constraint dan indeks minimum
Email dan NIM dinormalisasi serta unik per institusi; username staf tidak berbagi jalur registrasi publik. Slug kompetisi unik per edisi atau seri, tetapi foreign key memakai ID. Invite memiliki pasangan tim/penerima aktif unik sesuai aturan. Achievement memiliki status dan version untuk optimistic concurrency. EvidenceObject memiliki objectKey unik dan status upload/scan. PointLedger punya idempotency key unik untuk mencegah poin ganda. Indeks pada institutionId + periodId + status + createdAt untuk antrean dan dashboard; foreign key mencegah orphan. Soft delete/arsip dipakai untuk domain yang memiliki riwayat.

## Data dan migrasi
JSON saat ini berada di mocks/ dan src/mocks/, dengan 8 user, 4 kompetisi, 3 tim, 4 prestasi, 2 roadmap. Data ini hanya fixture demo, bukan data mahasiswa produksi. Jangan otomatis memasukkan identitas mock ke MySQL produksi. Seed produksi hanya referensi minimal dan bootstrap super admin satu kali, memakai rahasia dari environment/operasi. Migrasi SQL wajib committed, diuji pada staging dengan data lintas periode, dan punya rencana rollback atau forward fix.

## Zona waktu dan data historis
Simpan timestamp UTC, tanggal kalender dan tahun akademik sebagai field eksplisit; tampilkan Asia/Jakarta. Aturan poin, komposisi tim, roadmap, dan publikasi konten memiliki versi agar perubahan masa depan tidak mengubah hasil lama. Retensi bukti, audit, dan akun diputuskan sebelum go-live.
