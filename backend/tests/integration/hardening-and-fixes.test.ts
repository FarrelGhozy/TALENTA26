import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { createServer } from '../../src/app/server';
import { prisma, closeDatabase } from '../../src/lib/prisma';
import { hashPassword } from '../../src/lib/password';
import { createSession } from '../../src/lib/session';
import { getStorageService, LocalStorageService } from '../../src/lib/storage';
import { runMaintenance } from '../../src/lib/maintenance';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = '';
process.env.DB_NAME = 'talenta_test';
process.env.NODE_ENV = 'test';

const VALID_PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

describe('Wave 1 — Hardening Keamanan, Concurrency, Privasi, & Integritas Data', () => {
  const app = createServer();
  const timeId = Date.now().toString().slice(-6);

  let institutionId = '';
  let otherInstitutionId = '';
  let otherCompId = '';
  let periodId = '';
  let compId = '';
  let compSlug = '';
  let categoryId = '';
  let subCategoryId = '';

  let leader1Id = '';
  let leader1Token = '';
  let leader2Id = '';
  let leader2Token = '';
  let memberId = '';
  let memberToken = '';
  let validatorId = '';
  let validatorToken = '';
  let superAdminId = '';
  let superAdminToken = '';

  const createdTeamIds: string[] = [];
  const createdAchIds: string[] = [];

  beforeAll(async () => {
    const inst = await prisma.institution.upsert({
      where: { code: 'unida-gontor' },
      update: {},
      create: { code: 'unida-gontor', name: 'Universitas Darussalam Gontor' },
    });
    institutionId = inst.id;

    const otherInst = await prisma.institution.create({
      data: {
        code: `other-inst-${timeId}`,
        name: `Kampus Lain Uji ${timeId}`,
      },
    });
    otherInstitutionId = otherInst.id;

    const period = await prisma.academicPeriod.create({
      data: {
        institutionId,
        name: `Periode Wave1 ${timeId}`,
        year: 2026,
        semester: 'ganjil',
        isActive: true,
      },
    });
    periodId = period.id;
    await prisma.academicPeriod.updateMany({
      where: { institutionId, id: { not: periodId } },
      data: { isActive: false },
    });

    // Pastikan ada PointRule aktif v1 untuk nasional juara_1 = 18
    await prisma.pointRule.updateMany({ where: { institutionId }, data: { isActive: false } });
    const existingRule = await prisma.pointRule.findFirst({
      where: { institutionId, version: 1, level: 'nasional', result: 'juara_1' },
    });
    if (!existingRule) {
      await prisma.pointRule.create({
        data: {
          institutionId,
          version: 1,
          level: 'nasional',
          result: 'juara_1',
          points: 18,
          isActive: true,
        },
      });
    } else {
      await prisma.pointRule.updateMany({
        where: { institutionId, version: 1 },
        data: { isActive: true },
      });
    }

    const pwHash = await hashPassword('PasswordWave1!');

    const makeStudent = async (suffix: string, name: string, prodi: string) => {
      const u = await prisma.user.create({
        data: {
          institutionId,
          email: `w1_${suffix}_${timeId}@unida.gontor.ac.id`,
          fullName: name,
          passwordHash: pwHash,
          role: 'mahasiswa',
          status: 'active',
          studentProfile: {
            create: {
              nim: `W1${suffix.toUpperCase()}${timeId}`,
              fullName: name,
              studyProgram: prodi,
              faculty: 'Sains dan Teknologi',
            },
          },
        },
      });
      const sess = await createSession(u.id);
      return { id: u.id, token: sess.token };
    };

    const l1 = await makeStudent('l1', 'Ketua Satu Wave1', 'Teknik Informatika');
    leader1Id = l1.id;
    leader1Token = l1.token;

    const l2 = await makeStudent('l2', 'Ketua Dua Wave1', 'Sistem Informasi');
    leader2Id = l2.id;
    leader2Token = l2.token;

    const m1 = await makeStudent('m1', 'Anggota Pelamar Wave1', 'Manajemen');
    memberId = m1.id;
    memberToken = m1.token;

    const val = await prisma.user.create({
      data: {
        institutionId,
        email: `w1_val_${timeId}@unida.gontor.ac.id`,
        fullName: 'Validator Wave1',
        passwordHash: pwHash,
        role: 'validator',
        status: 'active',
      },
    });
    validatorId = val.id;
    validatorToken = (await createSession(val.id)).token;

    const sa = await prisma.user.create({
      data: {
        institutionId,
        email: `w1_sa_${timeId}@unida.gontor.ac.id`,
        fullName: 'Super Admin Wave1',
        passwordHash: pwHash,
        role: 'super_admin',
        status: 'active',
      },
    });
    superAdminId = sa.id;
    superAdminToken = (await createSession(sa.id)).token;

    const cat = await prisma.competitionCategory.create({
      data: {
        institutionId,
        code: `w1-cat-${timeId}`,
        name: 'Kategori Wave1',
      },
    });
    categoryId = cat.id;

    const sub = await prisma.competitionSubCategory.create({
      data: {
        categoryId,
        code: `w1-sub-${timeId}`,
        name: 'Sub Wave1',
      },
    });
    subCategoryId = sub.id;

    compSlug = `w1-comp-${timeId}`;
    const comp = await prisma.competition.create({
      data: {
        institutionId,
        academicPeriodId: periodId,
        competitionCategoryId: categoryId,
        slug: compSlug,
        name: `Kompetisi Wave1 ${timeId}`,
        organizer: 'Panitia Wave1',
        category: 'Teknologi',
        level: 'nasional',
        format: 'beregu',
        minTeamMembers: 2,
        maxTeamMembers: 3,
        description: 'Kompetisi uji Wave 1',
        status: 'published',
      },
    });
    compId = comp.id;

    const otherComp = await prisma.competition.create({
      data: {
        institutionId: otherInstitutionId,
        slug: `other-comp-${timeId}`,
        name: 'Kompetisi Kampus Lain',
        organizer: 'Eksternal',
        category: 'Teknologi',
        level: 'nasional',
        format: 'individu',
        minTeamMembers: 1,
        maxTeamMembers: 1,
        description: 'Draft rahasia kampus lain',
        status: 'draft',
      },
    });
    otherCompId = otherComp.id;
  });

  afterAll(async () => {
    const userIds = [leader1Id, leader2Id, memberId, validatorId, superAdminId].filter(Boolean);
    if (createdAchIds.length > 0) {
      await prisma.pointLedger.deleteMany({ where: { achievementId: { in: createdAchIds } } });
      await prisma.achievement.deleteMany({ where: { id: { in: createdAchIds } } });
    }
    if (createdTeamIds.length > 0) {
      await prisma.internalSelection.deleteMany({ where: { teamId: { in: createdTeamIds } } });
      await prisma.teamJoinRequest.deleteMany({ where: { teamId: { in: createdTeamIds } } });
      await prisma.teamMember.deleteMany({ where: { teamId: { in: createdTeamIds } } });
      await prisma.team.deleteMany({ where: { id: { in: createdTeamIds } } });
    }
    if (compId) await prisma.competition.deleteMany({ where: { id: compId } });
    if (otherCompId) await prisma.competition.deleteMany({ where: { id: otherCompId } });
    if (subCategoryId) await prisma.competitionSubCategory.deleteMany({ where: { id: subCategoryId } });
    if (categoryId) await prisma.competitionCategory.deleteMany({ where: { id: categoryId } });
    if (userIds.length > 0) {
      await prisma.studentTarget.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.auditEvent.deleteMany({ where: { actorId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (periodId) await prisma.academicPeriod.deleteMany({ where: { id: periodId } });
    if (otherInstitutionId) await prisma.institution.deleteMany({ where: { id: otherInstitutionId } });
    await closeDatabase();
  });

  it('1. Dashboard mahasiswa menyamarkan inviteCode & joinRequests untuk anggota non-ketua', async () => {
    const t1Res = await app.handle(
      new Request('http://localhost/api/v1/teams', {
        method: 'POST',
        headers: { Authorization: `Bearer ${leader1Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionSlug: compSlug,
          teamName: 'Tim Rahasia Kode',
          recruitmentType: 'terbuka',
        }),
      })
    );
    expect(t1Res.status).toBe(200);
    const t1 = ((await t1Res.json()) as any).data;
    createdTeamIds.push(t1.id);

    // Anggota bergabung via kode undangan
    const joinRes = await app.handle(
      new Request('http://localhost/api/v1/teams/join-by-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${memberToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: t1.inviteCode }),
      })
    );
    expect(joinRes.status).toBe(200);

    // Ketua melihat inviteCode pada /me/dashboard
    const leaderDashRes = await app.handle(
      new Request('http://localhost/api/v1/me/dashboard', {
        headers: { Authorization: `Bearer ${leader1Token}` },
      })
    );
    const leaderDash = ((await leaderDashRes.json()) as any).data;
    expect(leaderDash.activeTeam.isLeader).toBe(true);
    expect(leaderDash.activeTeam.inviteCode).toBe(t1.inviteCode);

    // Non-ketua TIDAK boleh menerima inviteCode maupun daftar mentah joinRequests
    const memberDashRes = await app.handle(
      new Request('http://localhost/api/v1/me/dashboard', {
        headers: { Authorization: `Bearer ${memberToken}` },
      })
    );
    const memberDash = ((await memberDashRes.json()) as any).data;
    expect(memberDash.activeTeam.isLeader).toBe(false);
    expect(memberDash.activeTeam.inviteCode).toBeNull();
    expect(memberDash.activeTeam.joinRequests).toBeUndefined();
  });

  it('2. Revisi multipart parsial TIDAK menghapus teamId, subCategoryId, dan anggota kelompok', async () => {
    const teamId = createdTeamIds[0];
    const fd = new FormData();
    fd.append('name', `Prestasi Kelompok W1 ${timeId}`);
    fd.append('organizer', 'BPTI');
    fd.append('category', 'kompetisi');
    fd.append('level', 'nasional');
    fd.append('result', 'juara_1');
    fd.append('eventDate', '2026-06-10');
    fd.append('competitionId', compId);
    fd.append('competitionCategoryId', categoryId);
    fd.append('subCategoryId', subCategoryId);
    fd.append('participationType', 'kelompok');
    fd.append('teamId', teamId);
    fd.append('evidence', new File([VALID_PDF_BYTES], 'awal.pdf', { type: 'application/pdf' }));

    const createRes = await app.handle(
      new Request('http://localhost/api/v1/me/achievements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${leader1Token}` },
        body: fd,
      })
    );
    expect(createRes.status).toBe(200);
    const created = ((await createRes.json()) as any).data;
    createdAchIds.push(created.id);
    expect(created.participants.length).toBe(2);
    expect(created.teamId).toBe(teamId);

    // Validator minta perbaikan
    const reqChangeRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/achievements/${created.id}/decisions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${validatorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_changes', reason: 'Lengkapi judul resmi', version: 1 }),
      })
    );
    expect(reqChangeRes.status).toBe(200);

    // Mahasiswa mengirim revisi multipart HANYA mengubah name & note (tidak mengirim teamId/subCategoryId)
    const revFd = new FormData();
    revFd.append('name', `Prestasi Kelompok W1 Revisi ${timeId}`);
    revFd.append('note', 'Judul sudah dilengkapi');

    const revRes = await app.handle(
      new Request(`http://localhost/api/v1/me/achievements/${created.id}/revisions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${leader1Token}` },
        body: revFd,
      })
    );
    expect(revRes.status).toBe(200);
    const revised = ((await revRes.json()) as any).data;
    expect(revised.teamId).toBe(teamId);
    expect(revised.competitionCategoryId).toBe(categoryId);
    expect(revised.subCategoryId).toBe(subCategoryId);
    expect(revised.participants.length).toBe(2);

    // Approve prestasi kelompok & verifikasi ekspor CSV = 1 baris per anggota dengan poin 18 (bukan 36!)
    const approveRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/achievements/${created.id}/decisions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${validatorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', version: revised.version }),
      })
    );
    expect(approveRes.status).toBe(200);

    const csvRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/export?academicPeriodId=${periodId}`, {
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    expect(csvRes.status).toBe(200);
    const csvText = await csvRes.text();
    const matchingRows = csvText
      .split(/\r?\n/)
      .filter((line) => line.includes(`Prestasi Kelompok W1 Revisi ${timeId}`));
    expect(matchingRows.length).toBe(2);
    expect(matchingRows.some((r) => r.includes('Ketua Satu Wave1') && r.includes(',"18",'))).toBe(true);
    expect(matchingRows.some((r) => r.includes('Anggota Pelamar Wave1') && r.includes(',"18",'))).toBe(true);
    expect(matchingRows.some((r) => r.includes(',"36",'))).toBe(false);

    // Filter status tidak valid di CSV mengembalikan 422 (bukan 500)
    const badCsvRes = await app.handle(
      new Request('http://localhost/api/v1/admin/export?status=INVALID_ENUM', {
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    expect(badCsvRes.status).toBe(422);
  });

  it('3. Pembatalan prestasi atomik menghapus berkas RustFS dan aman dari race dengan approve', async () => {
    const fd = new FormData();
    fd.append('name', `Prestasi Batal Storage ${timeId}`);
    fd.append('organizer', 'BPTI');
    fd.append('category', 'kompetisi');
    fd.append('level', 'nasional');
    fd.append('result', 'juara_1');
    fd.append('eventDate', '2026-06-11');
    fd.append('evidence', new File([VALID_PDF_BYTES], 'batal-clean.pdf', { type: 'application/pdf' }));

    const createRes = await app.handle(
      new Request('http://localhost/api/v1/me/achievements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${leader2Token}` },
        body: fd,
      })
    );
    expect(createRes.status).toBe(200);
    const ach = ((await createRes.json()) as any).data;
    createdAchIds.push(ach.id);

    const evRecord = await prisma.achievementEvidence.findFirstOrThrow({
      where: { achievementId: ach.id },
    });

    // Batalkan prestasi -> objek harus terhapus dari storage
    const cancelRes = await app.handle(
      new Request(`http://localhost/api/v1/me/achievements/${ach.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${leader2Token}` },
      })
    );
    expect(cancelRes.status).toBe(200);

    const storage = getStorageService();
    let fileStillExists = true;
    try {
      await storage.getFile(evRecord.objectKey);
    } catch {
      fileStillExists = false;
    }
    expect(fileStillExists).toBe(false);

    // Uji race: cancel vs approve serentak tidak boleh menghasilkan status 'dibatalkan' dengan PointLedger aktif
    const fdRace = new FormData();
    fdRace.append('name', `Prestasi Race Batal ${timeId}`);
    fdRace.append('organizer', 'BPTI');
    fdRace.append('category', 'kompetisi');
    fdRace.append('level', 'nasional');
    fdRace.append('result', 'juara_1');
    fdRace.append('eventDate', '2026-06-12');
    fdRace.append('evidence', new File([VALID_PDF_BYTES], 'race.pdf', { type: 'application/pdf' }));

    const createRaceRes = await app.handle(
      new Request('http://localhost/api/v1/me/achievements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${leader2Token}` },
        body: fdRace,
      })
    );
    const raceAch = ((await createRaceRes.json()) as any).data;
    createdAchIds.push(raceAch.id);

    const [cRes, aRes] = await Promise.all([
      app.handle(
        new Request(`http://localhost/api/v1/me/achievements/${raceAch.id}/cancel`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${leader2Token}` },
        })
      ),
      app.handle(
        new Request(`http://localhost/api/v1/admin/achievements/${raceAch.id}/decisions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${validatorToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve', version: 1 }),
        })
      ),
    ]);

    expect([cRes.status, aRes.status].sort()).toEqual([200, 409]);
    const finalRace = await prisma.achievement.findUniqueOrThrow({ where: { id: raceAch.id } });
    const raceLedgers = await prisma.pointLedger.findMany({ where: { achievementId: raceAch.id } });
    if (finalRace.status === 'dibatalkan') {
      expect(raceLedgers.length).toBe(0);
    } else {
      expect(finalRace.status).toBe('disetujui');
      expect(raceLedgers.length).toBe(1);
    }
  });

  it('4. RBAC /system/* khusus super_admin, tolak eskalasi mahasiswa, tolak IDOR point-rules, & validasi WA ketat', async () => {
    // Validator ditolak pada mutasi template poin & endpoint sistem, tetapi boleh GET point-templates
    const valGetTpl = await app.handle(
      new Request('http://localhost/api/v1/system/point-templates', {
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    expect(valGetTpl.status).toBe(200);

    const valPostTpl = await app.handle(
      new Request('http://localhost/api/v1/system/point-templates', {
        method: 'POST',
        headers: { Authorization: `Bearer ${validatorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Coba Bypass',
          rules: [{ level: 'lokal', result: 'juara_1', points: 99 }],
        }),
      })
    );
    expect(valPostTpl.status).toBe(403);

    // Super admin tidak boleh mengubah mahasiswa langsung menjadi super_admin
    const escalateRes = await app.handle(
      new Request(`http://localhost/api/v1/system/users/${leader1Id}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${superAdminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'super_admin' }),
      })
    );
    expect(escalateRes.status).toBe(403);

    // IDOR point-rules lintas institusi harus 404
    const idorPointRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${otherCompId}/point-rules`, {
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    expect(idorPointRes.status).toBe(404);

    // Nomor WA "0" atau terlalu pendek ditolak 422
    const badWaRes = await app.handle(
      new Request('http://localhost/api/v1/admin/consultants', {
        method: 'POST',
        headers: { Authorization: `Bearer ${validatorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionSlug: compSlug,
          name: 'Dosen Uji',
          field: 'AI',
          whatsappNumber: '0812',
        }),
      })
    );
    expect(badWaRes.status).toBe(422);
  });

  it('5. Multi-stage InternalSelection tidak membuka kunci tim yang sudah lolos tahap sebelumnya', async () => {
    const teamId = createdTeamIds[0];
    const s1 = await app.handle(
      new Request('http://localhost/api/v1/admin/selections', {
        method: 'POST',
        headers: { Authorization: `Bearer ${validatorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionId: compId,
          teamId,
          stage: 'Tahap 1 Kampus',
          result: 'lolos',
          organizerVerified: true,
        }),
      })
    );
    expect(s1.status).toBe(200);
    const lockedTeam = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });
    expect(lockedTeam.status).toBe('terkunci_seleksi');
    expect(lockedTeam.isRecruiting).toBe(false);

    // Tambahkan Tahap 2 status menunggu -> tim HARUS tetap terkunci_seleksi
    const s2 = await app.handle(
      new Request('http://localhost/api/v1/admin/selections', {
        method: 'POST',
        headers: { Authorization: `Bearer ${validatorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionId: compId,
          teamId,
          stage: 'Tahap 2 Final',
          result: 'menunggu',
          organizerVerified: false,
        }),
      })
    );
    expect(s2.status).toBe(200);
    const stillLocked = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });
    expect(stillLocked.status).toBe('terkunci_seleksi');
  });

  it('6. SMTP fail-closed K-13 mengembalikan 503 di production saat SMTP tidak dikonfigurasi', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevSmtpHost = process.env.SMTP_HOST;
    const prevSmtpUser = process.env.SMTP_USER;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;

      const res = await app.handle(
        new Request('http://localhost/api/v1/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: `w1_l1_${timeId}@unida.gontor.ac.id` }),
        })
      );
      expect(res.status).toBe(503);
      const json = (await res.json()) as any;
      expect(json.error?.code).toBe('MAILER_UNAVAILABLE');
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevSmtpHost !== undefined) process.env.SMTP_HOST = prevSmtpHost;
      if (prevSmtpUser !== undefined) process.env.SMTP_USER = prevSmtpUser;
    }
  });

  it('7. Wave 3: Streaming evidence + ETag/If-None-Match 304, pagination, dan quota/revisi', async () => {
    const achId = createdAchIds[0];
    expect(achId).toBeTruthy();

    const ev = await prisma.achievementEvidence.findFirstOrThrow({
      where: { achievementId: achId, isActive: true },
    });

    const firstDownload = await app.handle(
      new Request(`http://localhost/api/v1/evidence/${ev.id}/download`, {
        headers: { Authorization: `Bearer ${leader1Token}` },
      })
    );
    expect(firstDownload.status).toBe(200);
    const etag = firstDownload.headers.get('etag');
    expect(etag).toBeTruthy();
    expect(firstDownload.headers.get('cache-control')).toContain('private');
    expect(firstDownload.headers.get('x-content-type-options')).toBe('nosniff');
    const bodyBytes = await firstDownload.arrayBuffer();
    expect(bodyBytes.byteLength).toBeGreaterThan(0);

    // Permintaan kedua dengan If-None-Match harus mengembalikan 304 Not Modified
    const cachedDownload = await app.handle(
      new Request(`http://localhost/api/v1/evidence/${ev.id}/download`, {
        headers: {
          Authorization: `Bearer ${leader1Token}`,
          'If-None-Match': etag!,
        },
      })
    );
    expect(cachedDownload.status).toBe(304);

    // Pagination meta pada /api/v1/me/achievements
    const pageRes = await app.handle(
      new Request('http://localhost/api/v1/me/achievements?page=1&limit=1', {
        headers: { Authorization: `Bearer ${leader1Token}` },
      })
    );
    expect(pageRes.status).toBe(200);
    const pageJson = (await pageRes.json()) as any;
    expect(Array.isArray(pageJson.data)).toBe(true);
    expect(pageJson.data.length).toBeLessThanOrEqual(1);
    expect(pageJson.meta?.page).toBe(1);
    expect(pageJson.meta?.limit).toBe(1);
    expect(pageJson.meta?.total).toBeGreaterThanOrEqual(1);
  });

  it('8. Wave 3: Maintenance TTL pruning MySQL & Orphan GC RustFS (dry-run & live + grace window 24 jam)', async () => {
    const oldSessionId = `old_sess_${timeId}`;
    const oldResetId = `old_rst_${timeId}`;
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 hari lalu

    await prisma.authSession.create({
      data: {
        id: oldSessionId,
        userId: leader1Id,
        sessionToken: `expired_hash_${timeId}`,
        expiresAt: oldDate,
      },
    });
    await prisma.passwordResetToken.create({
      data: {
        id: oldResetId,
        userId: leader1Id,
        tokenHash: `expired_reset_${timeId}`,
        expiresAt: oldDate,
      },
    });

    const tempStorageDir = path.join(os.tmpdir(), `talenta-maint-int-${timeId}`);
    const isolatedStorage = new LocalStorageService(tempStorageDir);
    const agedOrphanKey = `institutions/${institutionId}/achievements/orphan-old/stale.pdf`;
    const freshOrphanKey = `institutions/${institutionId}/achievements/orphan-new/fresh.pdf`;

    try {
      await isolatedStorage.uploadFile(agedOrphanKey, Buffer.from('%PDF-1.4 old'), 'application/pdf');
      await isolatedStorage.uploadFile(freshOrphanKey, Buffer.from('%PDF-1.4 new'), 'application/pdf');
      // Mundurkan mtime agedOrphanKey 48 jam agar melewati grace window 24 jam
      const agedPath = path.join(tempStorageDir, agedOrphanKey);
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      await fsp.utimes(agedPath, twoDaysAgo, twoDaysAgo);

      // Dry-run menghitung tanpa menghapus
      const drySummary = await runMaintenance({
        dryRun: true,
        storage: isolatedStorage,
        auditRetentionDays: 0,
        storageRetentionInactiveDays: 0,
      });
      expect(drySummary.mysql.authSessionsPruned).toBeGreaterThanOrEqual(1);
      expect(drySummary.mysql.passwordResetTokensPruned).toBeGreaterThanOrEqual(1);
      expect(drySummary.storage.orphanObjectsDeleted).toBe(1);

      const stillThere = await prisma.authSession.findUnique({ where: { id: oldSessionId } });
      expect(stillThere).not.toBeNull();

      // Live run membersihkan baris kedaluwarsa & hanya orphan > 24 jam (fresh < 24 jam aman)
      const liveSummary = await runMaintenance({
        dryRun: false,
        storage: isolatedStorage,
        auditRetentionDays: 0,
        storageRetentionInactiveDays: 0,
      });
      expect(liveSummary.mysql.authSessionsPruned).toBeGreaterThanOrEqual(1);
      expect(liveSummary.mysql.passwordResetTokensPruned).toBeGreaterThanOrEqual(1);
      expect(liveSummary.storage.orphanObjectsDeleted).toBe(1);

      expect(await prisma.authSession.findUnique({ where: { id: oldSessionId } })).toBeNull();
      expect(await prisma.passwordResetToken.findUnique({ where: { id: oldResetId } })).toBeNull();
      await expect(isolatedStorage.getFile(agedOrphanKey)).rejects.toThrow();
      const freshStillThere = await isolatedStorage.getFile(freshOrphanKey);
      expect(freshStillThere.buffer.byteLength).toBeGreaterThan(0);
    } finally {
      await fsp.rm(tempStorageDir, { recursive: true, force: true });
    }
  });
});
