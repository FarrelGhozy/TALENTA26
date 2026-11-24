import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { createServer } from '../../src/app/server';
import { prisma, closeDatabase } from '../../src/lib/prisma';
import { hashPassword } from '../../src/lib/password';
import { createSession } from '../../src/lib/session';

// Gunakan koneksi database test
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = '';
process.env.DB_NAME = 'talenta_test';
process.env.NODE_ENV = 'test';

describe('Stage 5 — Operasi Admin, Dashboard Terpadu & Ekspor CSV Integration Suite', () => {
  const app = createServer();
  const timeId = Date.now().toString().slice(-6);

  let institutionId = '';
  let period1Id = '';
  let studentToken = '';
  let studentId = '';
  let validatorToken = '';
  let validatorId = '';
  let superAdminToken = '';
  let superAdminId = '';

  let createdStaffId = '';
  let createdPeriodId = '';

  beforeAll(async () => {
    // 1. Institusi
    const inst = await prisma.institution.upsert({
      where: { code: 'unida-gontor' },
      update: {},
      create: {
        code: 'unida-gontor',
        name: 'Universitas Darussalam Gontor',
      },
    });
    institutionId = inst.id;

    // 2. Periode Akademik Awal
    const period = await prisma.academicPeriod.upsert({
      where: { id: `period-stage5-1-${timeId}` },
      update: {},
      create: {
        id: `period-stage5-1-${timeId}`,
        institutionId,
        name: `Tahun Akademik 2026/2027 Ganjil ${timeId}`,
        year: 2026,
        semester: 'ganjil',
        isActive: true,
      },
    });
    period1Id = period.id;

    // 3. User Mahasiswa
    const pwHash = await hashPassword('password123');
    const studentUser = await prisma.user.create({
      data: {
        institutionId,
        email: `student.stage5.${timeId}@unida.gontor.ac.id`,
        passwordHash: pwHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `4320265${timeId}`,
            fullName: `Mahasiswa Stage 5 ${timeId}`,
            studyProgram: 'Teknik Informatika',
            faculty: 'Sains dan Teknologi',
            phone: '08123456789',
            bio: 'Mahasiswa pembinaan lomba sistem cerdas',
            skills: ['AI', 'Python', 'Web'],
            interests: ['Lomba Nasional'],
            availability: 'Tersedia',
            experience: 'Pernah ikut GEMASTIK',
          },
        },
      },
    });
    studentId = studentUser.id;
    const studentSession = await createSession(studentId);
    studentToken = studentSession.token;

    // 4. User Validator
    const valUser = await prisma.user.create({
      data: {
        institutionId,
        email: `validator.stage5.${timeId}@unida.gontor.ac.id`,
        passwordHash: pwHash,
        role: 'validator',
        status: 'active',
      },
    });
    validatorId = valUser.id;
    const valSession = await createSession(validatorId);
    validatorToken = valSession.token;

    // 5. User Super Admin
    const adminUser = await prisma.user.create({
      data: {
        institutionId,
        email: `superadmin.stage5.${timeId}@unida.gontor.ac.id`,
        passwordHash: pwHash,
        role: 'super_admin',
        status: 'active',
      },
    });
    superAdminId = adminUser.id;
    const adminSession = await createSession(superAdminId);
    superAdminToken = adminSession.token;

    // 6. Buat contoh data prestasi disetujui & PointLedger untuk data dashboard
    const comp = await prisma.competition.create({
      data: {
        institutionId,
        academicPeriodId: period1Id,
        slug: `gemastik-stage5-${timeId}`,
        name: `GEMASTIK 2026 ${timeId}`,
        organizer: 'Puspresnas Kemdikbudristek',
        category: 'kompetisi',
        level: 'nasional',
        format: 'beregu',
        status: 'published',
        registrationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        description: 'Lomba divisi pemrograman dan sistem cerdas.',
      },
    });

    // Student target
    await prisma.studentTarget.create({
      data: {
        userId: studentId,
        competitionId: comp.id,
        status: 'active',
      },
    });

    const ach = await prisma.achievement.create({
      data: {
        institutionId,
        userId: studentId,
        academicPeriodId: period1Id,
        competitionId: comp.id,
        name: `Juara 1 GEMASTIK ${timeId}`,
        organizer: 'Puspresnas',
        category: 'kompetisi',
        level: 'nasional',
        result: 'juara_1',
        eventDate: new Date('2026-04-15'),
        status: 'disetujui',
      },
    });

    await prisma.pointLedger.create({
      data: {
        institutionId,
        userId: studentId,
        achievementId: ach.id,
        academicPeriodId: period1Id,
        ruleVersion: 1,
        points: 18,
        type: 'award',
      },
    });
  });

  afterAll(async () => {
    await prisma.pointRule.deleteMany({ where: { institutionId, version: { gt: 1 } } });
    await prisma.pointRule.updateMany({ where: { institutionId, version: 1 }, data: { isActive: true } });
    await closeDatabase();
  });

  // ============================================================================
  // Bagian 1: Barrier Keamanan & RBAC Sistem
  // ============================================================================
  describe('1. Kontrol Akses & Pembatasan Peran (RBAC Barrier)', () => {
    it('Mahasiswa dilarang mengakses API sistem super admin (/api/v1/system/*) -> 403', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/system/users', {
          headers: { Authorization: `Bearer ${studentToken}` },
        })
      );
      expect(res.status).toBe(403);
    });

    it('Validator dilarang mengakses API sistem super admin (/api/v1/system/health & /system/users) -> 403', async () => {
      const resHealth = await app.handle(
        new Request('http://localhost/api/v1/system/health', {
          headers: { Authorization: `Bearer ${validatorToken}` },
        })
      );
      expect(resHealth.status).toBe(403);

      const resUsers = await app.handle(
        new Request('http://localhost/api/v1/system/users', {
          headers: { Authorization: `Bearer ${validatorToken}` },
        })
      );
      expect(resUsers.status).toBe(403);
    });

    it('Mahasiswa dilarang mengakses dashboard analitik admin (/api/v1/admin/dashboard) -> 403', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/admin/dashboard', {
          headers: { Authorization: `Bearer ${studentToken}` },
        })
      );
      expect(res.status).toBe(403);
    });

    it('Mahasiswa dilarang mengunduh ekspor CSV resmi (/api/v1/admin/export) -> 403', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/admin/export', {
          headers: { Authorization: `Bearer ${studentToken}` },
        })
      );
      expect(res.status).toBe(403);
    });

    it('Super admin dapat mengakses API sistem super admin -> 200', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/system/users', {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.users)).toBe(true);
    });
  });

  // ============================================================================
  // Bagian 2: Pengelolaan Staf & Pengguna (Super Admin)
  // ============================================================================
  describe('2. Pengelolaan Staf & Status Pengguna', () => {
    it('Filter ?role=admin mengembalikan seluruh pengelola (validator & super_admin) tanpa mahasiswa', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/system/users?role=admin&limit=50', {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(Array.isArray(body.data.users)).toBe(true);
      expect(body.data.users.length).toBeGreaterThan(0);
      expect(body.data.users.every((u: any) => u.role === 'validator' || u.role === 'super_admin')).toBe(true);
    });

    it('Super admin dapat membuat akun staf validator baru', async () => {
      const payload = {
        email: `staff.new.${timeId}@unida.gontor.ac.id`,
        password: 'password123SuperSafe',
        role: 'validator',
      };

      const res = await app.handle(
        new Request('http://localhost/api/v1/system/users/staff', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${superAdminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.data.email).toBe(payload.email);
      expect(body.data.role).toBe('validator');
      expect(body.data.passwordHash).toBeUndefined(); // Password hash tidak boleh bocor
      createdStaffId = body.data.id;
    });

    it('Super admin dapat memperbarui peran staf dari validator ke super_admin', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/system/users/${createdStaffId}/role`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${superAdminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: 'super_admin' }),
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.role).toBe('super_admin');
    });

    it('Menangguhkan (suspend) akun secara instan mencabut sesi aktif pengguna', async () => {
      // 1. Buat sesi sementara untuk staff yang baru dibuat
      const staffSession = await createSession(createdStaffId);
      const staffToken = staffSession.token;

      // 2. Sebelum suspend: verifikasi sesi dapat mengakses API
      const preCheck = await app.handle(
        new Request('http://localhost/api/v1/admin/dashboard', {
          headers: { Authorization: `Bearer ${staffToken}` },
        })
      );
      expect(preCheck.status).toBe(200);

      // 3. Super admin menangguhkan akun staf
      const suspendRes = await app.handle(
        new Request(`http://localhost/api/v1/system/users/${createdStaffId}/status`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${superAdminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'suspended' }),
        })
      );
      expect(suspendRes.status).toBe(200);

      // 4. Setelah suspend: sesi aktif lama harus DITOLAK (401 Unauthorized)
      const postCheck = await app.handle(
        new Request('http://localhost/api/v1/admin/dashboard', {
          headers: { Authorization: `Bearer ${staffToken}` },
        })
      );
      expect(postCheck.status).toBe(401);

      // 5. Kembalikan status ke active
      const activateRes = await app.handle(
        new Request(`http://localhost/api/v1/system/users/${createdStaffId}/status`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${superAdminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'active' }),
        })
      );
      expect(activateRes.status).toBe(200);
    });
  });

  // ============================================================================
  // Bagian 3: Siklus & Transisi Periode Akademik
  // ============================================================================
  describe('3. Siklus Periode Akademik', () => {
    it('Super admin dapat melihat daftar periode akademik', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/system/academic-periods', {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('Super admin dapat membuat periode akademik baru', async () => {
      const payload = {
        name: `Tahun Akademik 2026/2027 Genap ${timeId}`,
        year: 2026,
        semester: 'genap',
      };

      const res = await app.handle(
        new Request('http://localhost/api/v1/system/academic-periods', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${superAdminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.data.name).toBe(payload.name);
      expect(body.data.isActive).toBe(false); // default belum aktif
      createdPeriodId = body.data.id;
    });

    it('Super admin dapat mengaktifkan periode akademik secara atomik', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/system/academic-periods/${createdPeriodId}/activate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${superAdminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ archiveOldTargets: false }),
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.id).toBe(createdPeriodId);
      expect(body.data.isActive).toBe(true);

      // Verifikasi bahwa periode lama (period1Id) otomatis dinonaktifkan
      const oldPeriod = await prisma.academicPeriod.findUnique({
        where: { id: period1Id },
      });
      expect(oldPeriod?.isActive).toBe(false);
    });
  });

  // ============================================================================
  // Bagian 4: Pengelolaan Aturan Poin Terversi (Point Rules)
  // ============================================================================
  describe('4. Versi Aturan Poin', () => {
    it('Super admin dapat melihat ringkasan versi aturan poin', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/system/point-rules', {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.versions).toBeDefined();
      expect(Array.isArray(body.data.versions)).toBe(true);
    });

    it('Super admin dapat menerbitkan versi aturan poin baru', async () => {
      const payload = {
        rules: [
          { level: 'lokal', result: 'juara_1', points: 10 },
          { level: 'nasional', result: 'juara_1', points: 20 },
          { level: 'internasional', result: 'juara_1', points: 35 },
        ],
      };

      const res = await app.handle(
        new Request('http://localhost/api/v1/system/point-rules/version', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${superAdminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.data.version).toBeGreaterThan(1);
      expect(body.data.rules.length).toBe(3);

      // Verifikasi aturan versi baru aktif
      const activeRules = await prisma.pointRule.findMany({
        where: { institutionId, isActive: true },
      });
      expect(activeRules.every((r) => r.version === body.data.version)).toBe(true);
    });
  });

  // ============================================================================
  // Bagian 5: Jejak Audit & Telemetri Kesehatan Sistem
  // ============================================================================
  describe('5. Jejak Audit & Telemetri Kesehatan', () => {
    it('Super admin dapat menelusuri jejak audit sistem', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/system/audit-logs?limit=10', {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.logs).toBeDefined();
      expect(Array.isArray(body.data.logs)).toBe(true);
      expect(body.data.logs.length).toBeGreaterThan(0);

      // Pastikan aksi-aksi sebelumnya tercatat dalam audit event
      const actions = body.data.logs.map((l: any) => l.action);
      expect(
        actions.includes('STAFF_CREATED') ||
        actions.includes('USER_STATUS_UPDATED') ||
        actions.includes('ACADEMIC_PERIOD_ACTIVATED') ||
        actions.includes('POINT_RULE_VERSION_CREATED')
      ).toBe(true);
    });

    it('Super admin dapat memantau kesehatan sistem tanpa kebocoran rahasia', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/system/health', {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.status).toBeDefined();
      expect(body.data.database.status).toBe('connected');
      expect(body.data.system.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(body.data.metrics.totalUsers).toBeGreaterThan(0);

      // Pastikan tidak ada kebocoran credential
      const jsonStr = JSON.stringify(body);
      expect(jsonStr).not.toContain('password');
      expect(jsonStr).not.toContain('secret');
      expect(jsonStr).not.toContain('mysql://');
    });
  });

  // ============================================================================
  // Bagian 6: Dashboard Terpadu Mahasiswa (GET /api/v1/me/dashboard)
  // ============================================================================
  describe('6. Dashboard Terpadu Mahasiswa', () => {
    it('Mahasiswa menerima data dashboard lengkap dengan langkah tindak lanjut yang dapat dilakukan', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/me/dashboard', {
          headers: { Authorization: `Bearer ${studentToken}` },
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      const data = body.data;

      // 1. Profil mahasiswa
      expect(data.profile.fullName).toContain('Mahasiswa Stage 5');
      expect(data.profile.completionPercentage).toBeGreaterThanOrEqual(80);

      // 2. Target kompetisi (termasuk detail komposisi untuk single-fetch Beranda)
      expect(data.targetCompetition).toBeDefined();
      expect(data.targetCompetition.name).toContain('GEMASTIK');
      expect(typeof data.targetCompetition.minTeamMembers).toBe('number');
      expect(typeof data.targetCompetition.maxTeamMembers).toBe('number');

      // 3. Submissions breakdown, recentAchievements & pengajuan gabung tim
      expect(data.submissions.disetujui).toBeGreaterThanOrEqual(1);
      expect(typeof data.submissions.dibatalkan).toBe('number');
      expect(Array.isArray(data.recentAchievements)).toBe(true);
      expect(data.recentAchievements.length).toBeGreaterThanOrEqual(1);
      expect(data.recentAchievements[0].id).toBeTruthy();
      expect(Array.isArray(data.myPendingJoinRequests)).toBe(true);
      expect('firstRevisionAchievementId' in data).toBe(true);

      // 4. Points
      expect(data.points).toBeDefined();

      // 5. Actionable Steps
      expect(Array.isArray(data.actionableSteps)).toBe(true);
      expect(data.actionableSteps.length).toBeGreaterThan(0);
      expect(data.actionableSteps.some((step: any) => step.id === 'complete-profile')).toBe(true);
    });
  });

  // ============================================================================
  // Bagian 7: Dashboard Admin & Ekspor CSV Resmi
  // ============================================================================
  describe('7. Dashboard Admin & Ekspor CSV Resmi', () => {
    it('Validator & Super Admin menerima statistik dashboard admin lengkap', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/admin/dashboard', {
          headers: { Authorization: `Bearer ${validatorToken}` },
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      const data = body.data;

      expect(data.queue).toBeDefined();
      expect(data.competitions.published).toBeGreaterThanOrEqual(1);
      expect(data.users.totalStudents).toBeGreaterThanOrEqual(1);
      expect(data.distribution.byCategory).toBeDefined();
      expect(data.distribution.byLevel).toBeDefined();
      expect(Array.isArray(data.upcomingDeadlines)).toBe(true);
    });

    it('Ekspor CSV prestasi resmi (/api/v1/admin/export) menghasilkan file valid dengan UTF-8 BOM', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/admin/export', {
          headers: { Authorization: `Bearer ${validatorToken}` },
        })
      );

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/csv');
      expect(res.headers.get('content-disposition')).toContain('attachment');

      const arrayBuf = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      // Pastikan ada 3 byte UTF-8 BOM pada awal payload biner (0xEF, 0xBB, 0xBF)
      expect(bytes[0]).toBe(0xef);
      expect(bytes[1]).toBe(0xbb);
      expect(bytes[2]).toBe(0xbf);

      const csvText = new TextDecoder('utf-8').decode(bytes);

      // Pastikan header kolom resmi hadir
      expect(csvText).toContain('Nama Mahasiswa');
      expect(csvText).toContain('NIM');
      expect(csvText).toContain('Program Studi');
      expect(csvText).toContain('Nama Capaian / Lomba');
      expect(csvText).toContain('Poin');

      // Pastikan data mahasiswa yang disetujui tercantum
      expect(csvText).toContain('Mahasiswa Stage 5');
      expect(csvText).toContain('GEMASTIK');
    });
  });
});
