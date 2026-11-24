import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { createServer } from '../../src/app/server';
import { prisma, closeDatabase } from '../../src/lib/prisma';
import { hashPassword } from '../../src/lib/password';
import { createSession } from '../../src/lib/session';

process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = '';
process.env.DB_NAME = 'talenta_test';
process.env.NODE_ENV = 'test';

describe('Hapus Lomba — Cascade Data Terkait & Pertahankan Input Prestasi Mahasiswa', () => {
  const app = createServer();
  const timeId = Date.now().toString().slice(-6);

  let institutionId = '';
  let periodId = '';
  let mhs1Id = '';
  let mhs1Token = '';
  let mhs2Id = '';
  let validatorId = '';
  let validatorToken = '';

  let publishedCompId = '';
  let draftCompId = '';
  let teamId = '';
  let roadmapId = '';
  let phaseId = '';
  let taskId = '';
  let achApprovedId = '';
  let achPendingId = '';

  beforeAll(async () => {
    const inst = await prisma.institution.upsert({
      where: { code: 'unida-gontor' },
      update: {},
      create: { code: 'unida-gontor', name: 'Universitas Darussalam Gontor' },
    });
    institutionId = inst.id;

    // Pastikan aturan dasar poin v1 aktif tersedia untuk fallback setelah lomba dihapus
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

    const period = await prisma.academicPeriod.create({
      data: {
        institutionId,
        name: `Periode Hapus Lomba ${timeId}`,
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

    const pwHash = await hashPassword('Password123!');

    const mhs1 = await prisma.user.create({
      data: {
        institutionId,
        email: `delcomp_mhs1_${timeId}@unida.gontor.ac.id`,
        fullName: 'Mahasiswa Uji Hapus 1',
        passwordHash: pwHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `DCM1_${timeId}`,
            fullName: 'Mahasiswa Uji Hapus 1',
            studyProgram: 'Teknik Informatika',
            faculty: 'Sains dan Teknologi',
          },
        },
      },
    });
    mhs1Id = mhs1.id;
    mhs1Token = (await createSession(mhs1Id)).token;

    const mhs2 = await prisma.user.create({
      data: {
        institutionId,
        email: `delcomp_mhs2_${timeId}@unida.gontor.ac.id`,
        fullName: 'Mahasiswa Uji Hapus 2',
        passwordHash: pwHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `DCM2_${timeId}`,
            fullName: 'Mahasiswa Uji Hapus 2',
            studyProgram: 'Sistem Informasi',
            faculty: 'Sains dan Teknologi',
          },
        },
      },
    });
    mhs2Id = mhs2.id;

    const validator = await prisma.user.create({
      data: {
        institutionId,
        email: `delcomp_val_${timeId}@unida.gontor.ac.id`,
        fullName: 'Validator Uji Hapus',
        passwordHash: pwHash,
        role: 'validator',
        status: 'active',
      },
    });
    validatorId = validator.id;
    validatorToken = (await createSession(validatorId)).token;

    // Buat kompetisi published lengkap dengan seluruh relasi terkait
    const comp = await prisma.competition.create({
      data: {
        institutionId,
        academicPeriodId: periodId,
        slug: `lomba-uji-hapus-${timeId}`,
        name: `Lomba Uji Hapus ${timeId}`,
        organizer: 'Kemendikbud',
        category: 'Teknologi',
        level: 'nasional',
        format: 'beregu',
        minTeamMembers: 2,
        maxTeamMembers: 3,
        description: 'Kompetisi uji coba penghapusan menyeluruh.',
        status: 'published',
      },
    });
    publishedCompId = comp.id;

    await prisma.studentTarget.createMany({
      data: [
        { userId: mhs1Id, competitionId: publishedCompId, academicPeriodId: periodId, status: 'active' },
        { userId: mhs2Id, competitionId: publishedCompId, academicPeriodId: periodId, status: 'active' },
      ],
    });

    const team = await prisma.team.create({
      data: {
        competitionId: publishedCompId,
        name: `Tim Uji Hapus ${timeId}`,
        creatorId: mhs1Id,
        leaderId: mhs1Id,
        status: 'terkunci_seleksi',
        members: {
          create: [{ userId: mhs1Id, roleInTeam: 'Ketua Tim', status: 'active' }],
        },
        joinRequests: {
          create: [{ userId: mhs2Id, preferredRole: 'Anggota', status: 'menunggu' }],
        },
        invites: {
          create: [
            {
              senderId: mhs1Id,
              receiverId: mhs2Id,
              status: 'diajukan',
              expiresAt: new Date(Date.now() + 86400000),
            },
          ],
        },
      },
    });
    teamId = team.id;

    const roadmap = await prisma.roadmap.create({
      data: {
        competitionId: publishedCompId,
        status: 'published',
        phases: {
          create: [
            {
              orderIndex: 1,
              title: 'Fase Persiapan',
              tasks: {
                create: [{ orderIndex: 1, title: 'Susun Proposal', isRequired: true }],
              },
            },
          ],
        },
      },
      include: { phases: { include: { tasks: true } } },
    });
    roadmapId = roadmap.id;
    phaseId = roadmap.phases[0].id;
    taskId = roadmap.phases[0].tasks[0].id;

    await prisma.roadmapProgress.create({
      data: { userId: mhs1Id, taskId, completed: true, completedAt: new Date() },
    });

    await prisma.consultantContact.create({
      data: {
        competitionId: publishedCompId,
        name: 'Ustadz Pembina Uji',
        field: 'Teknologi',
        whatsappNumber: '6281234567890',
        status: 'published',
      },
    });

    await prisma.internalSelection.create({
      data: {
        institutionId,
        competitionId: publishedCompId,
        teamId,
        stage: 'Seleksi Internal Kampus',
        result: 'lolos',
        organizerVerified: true,
        validatorId,
        confirmedAt: new Date(),
      },
    });

    await prisma.competitionPointRule.create({
      data: {
        institutionId,
        competitionId: publishedCompId,
        level: 'nasional',
        result: 'juara_1',
        points: 25,
        description: 'Bobot khusus lomba uji hapus',
        isActive: true,
      },
    });

    // Prestasi 1: Sudah disetujui + PointLedger 25 poin
    const achApproved = await prisma.achievement.create({
      data: {
        institutionId,
        userId: mhs1Id,
        academicPeriodId: periodId,
        competitionId: publishedCompId,
        teamId,
        participationType: 'kelompok',
        name: `Juara 1 Lomba Uji Hapus ${timeId}`,
        organizer: 'Kemendikbud',
        category: 'kompetisi',
        level: 'nasional',
        result: 'juara_1',
        eventDate: new Date('2026-05-01T00:00:00.000Z'),
        status: 'disetujui',
        version: 2,
        participants: {
          create: [{ userId: mhs1Id, roleInTeam: 'Ketua Tim', isSubmitter: true }],
        },
        evidences: {
          create: [
            {
              uploaderId: mhs1Id,
              objectKey: `test/delcomp/${timeId}-approved.pdf`,
              fileName: 'sertifikat-approved.pdf',
              fileSize: 1024,
              mimeType: 'application/pdf',
              isActive: true,
            },
          ],
        },
        decisions: {
          create: [
            {
              decidedById: validatorId,
              action: 'approve',
              previousStatus: 'menunggu',
              newStatus: 'disetujui',
              calculatedPoints: 25,
              awardedPoints: 25,
              pointSource: 'competition_custom',
              version: 1,
            },
          ],
        },
        pointLedgers: {
          create: [
            {
              institutionId,
              userId: mhs1Id,
              academicPeriodId: periodId,
              points: 25,
              type: 'award',
              pointSource: 'competition_custom',
              calculatedPoints: 25,
              idempotencyKey: `delcomp-approved-${timeId}`,
            },
          ],
        },
      },
    });
    achApprovedId = achApproved.id;

    // Prestasi 2: Masih menunggu verifikasi
    const achPending = await prisma.achievement.create({
      data: {
        institutionId,
        userId: mhs2Id,
        academicPeriodId: periodId,
        competitionId: publishedCompId,
        participationType: 'individu',
        name: `Pengajuan Menunggu Lomba Uji Hapus ${timeId}`,
        organizer: 'Kemendikbud',
        category: 'kompetisi',
        level: 'nasional',
        result: 'juara_1',
        eventDate: new Date('2026-05-02T00:00:00.000Z'),
        status: 'menunggu',
        version: 1,
        participants: {
          create: [{ userId: mhs2Id, isSubmitter: true }],
        },
        evidences: {
          create: [
            {
              uploaderId: mhs2Id,
              objectKey: `test/delcomp/${timeId}-pending.pdf`,
              fileName: 'sertifikat-pending.pdf',
              fileSize: 2048,
              mimeType: 'application/pdf',
              isActive: true,
            },
          ],
        },
      },
    });
    achPendingId = achPending.id;

    // Buat kompetisi draft kosong tanpa relasi
    const draftComp = await prisma.competition.create({
      data: {
        institutionId,
        academicPeriodId: periodId,
        slug: `lomba-draft-hapus-${timeId}`,
        name: `Lomba Draft Hapus ${timeId}`,
        organizer: 'Internal',
        category: 'Sains',
        level: 'lokal',
        format: 'individu',
        minTeamMembers: 1,
        maxTeamMembers: 1,
        description: 'Draft kosong untuk uji hapus cepat.',
        status: 'draft',
      },
    });
    draftCompId = draftComp.id;
  });

  afterAll(async () => {
    await prisma.pointLedger.deleteMany({ where: { achievementId: { in: [achApprovedId, achPendingId].filter(Boolean) } } });
    await prisma.achievementDecision.deleteMany({ where: { achievementId: { in: [achApprovedId, achPendingId].filter(Boolean) } } });
    await prisma.achievement.deleteMany({ where: { id: { in: [achApprovedId, achPendingId].filter(Boolean) } } });
    await prisma.competition.deleteMany({ where: { id: { in: [publishedCompId, draftCompId].filter(Boolean) } } });
    await prisma.auditEvent.deleteMany({ where: { actorId: { in: [validatorId, mhs1Id, mhs2Id].filter(Boolean) } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: [mhs1Id, mhs2Id, validatorId].filter(Boolean) } } });
    await prisma.user.deleteMany({ where: { id: { in: [mhs1Id, mhs2Id, validatorId].filter(Boolean) } } });
    await prisma.academicPeriod.deleteMany({ where: { id: periodId } });
    await closeDatabase();
  });

  it('1. Menolak akses tanpa autentikasi (401) dan mahasiswa (403)', async () => {
    const resUnauthPreview = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${publishedCompId}/delete-preview`)
    );
    expect(resUnauthPreview.status).toBe(401);

    const resUnauthDelete = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${publishedCompId}`, {
        method: 'DELETE',
      })
    );
    expect(resUnauthDelete.status).toBe(401);

    const resMhsPreview = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${publishedCompId}/delete-preview`, {
        headers: { Authorization: `Bearer ${mhs1Token}` },
      })
    );
    expect(resMhsPreview.status).toBe(403);

    const resMhsDelete = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${publishedCompId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mhs1Token}` },
      })
    );
    expect(resMhsDelete.status).toBe(403);
  });

  it('2. Pratinjau dampak mengembalikan jumlah relasi yang tepat beserta jumlah prestasi yang tetap aman', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${publishedCompId}/delete-preview`, {
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.competition.id).toBe(publishedCompId);
    expect(body.data.requiresTypedConfirmation).toBe(true);
    expect(body.data.counts).toEqual({
      targets: 2,
      activeTargets: 2,
      teams: 1,
      lockedSelectionTeams: 1,
      teamMembers: 1,
      teamJoinRequests: 1,
      teamInvites: 1,
      roadmaps: 1,
      roadmapPhases: 1,
      roadmapTasks: 1,
      roadmapProgress: 1,
      consultants: 1,
      selections: 1,
      customPointRules: 1,
      preservedAchievements: 2,
    });
  });

  it('3. Menghapus kompetisi menghapus seluruh data terkait kecuali input prestasi mahasiswa, poin, dan ranking', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${publishedCompId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.deletedId).toBe(publishedCompId);
    expect(body.data.preservedAchievementsCount).toBe(2);

    // Seluruh data milik lomba harus terhapus
    expect(await prisma.competition.findUnique({ where: { id: publishedCompId } })).toBeNull();
    expect(await prisma.studentTarget.count({ where: { competitionId: publishedCompId } })).toBe(0);
    expect(await prisma.team.findUnique({ where: { id: teamId } })).toBeNull();
    expect(await prisma.teamMember.count({ where: { teamId } })).toBe(0);
    expect(await prisma.teamJoinRequest.count({ where: { teamId } })).toBe(0);
    expect(await prisma.teamInvite.count({ where: { teamId } })).toBe(0);
    expect(await prisma.roadmap.findUnique({ where: { id: roadmapId } })).toBeNull();
    expect(await prisma.roadmapPhase.findUnique({ where: { id: phaseId } })).toBeNull();
    expect(await prisma.roadmapTask.findUnique({ where: { id: taskId } })).toBeNull();
    expect(await prisma.roadmapProgress.count({ where: { taskId } })).toBe(0);
    expect(await prisma.consultantContact.count({ where: { competitionId: publishedCompId } })).toBe(0);
    expect(await prisma.internalSelection.count({ where: { competitionId: publishedCompId } })).toBe(0);
    expect(await prisma.competitionPointRule.count({ where: { competitionId: publishedCompId } })).toBe(0);

    // Kedua input prestasi mahasiswa HARUS tetap utuh dengan tautan kompetisi & tim = null
    const approvedAfter = await prisma.achievement.findUnique({
      where: { id: achApprovedId },
      include: { participants: true, evidences: true, decisions: true, pointLedgers: true },
    });
    expect(approvedAfter).not.toBeNull();
    expect(approvedAfter!.competitionId).toBeNull();
    expect(approvedAfter!.teamId).toBeNull();
    expect(approvedAfter!.status).toBe('disetujui');
    expect(approvedAfter!.participants.length).toBe(1);
    expect(approvedAfter!.evidences.length).toBe(1);
    expect(approvedAfter!.decisions.length).toBe(1);
    expect(approvedAfter!.pointLedgers.length).toBe(1);
    expect(approvedAfter!.pointLedgers[0].points).toBe(25);

    const pendingAfter = await prisma.achievement.findUnique({
      where: { id: achPendingId },
      include: { participants: true, evidences: true },
    });
    expect(pendingAfter).not.toBeNull();
    expect(pendingAfter!.competitionId).toBeNull();
    expect(pendingAfter!.teamId).toBeNull();
    expect(pendingAfter!.status).toBe('menunggu');
    expect(pendingAfter!.participants.length).toBe(1);
    expect(pendingAfter!.evidences.length).toBe(1);

    // Prestasi menunggu masih bisa dilihat & diverifikasi dengan fallback aturan poin aktif
    const resDetail = await app.handle(
      new Request(`http://localhost/api/v1/admin/achievements/${achPendingId}`, {
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    expect(resDetail.status).toBe(200);

    const resApprove = await app.handle(
      new Request(`http://localhost/api/v1/admin/achievements/${achPendingId}/decisions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validatorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve', version: 1 }),
      })
    );
    expect(resApprove.status).toBe(200);

    // Ranking periode tetap mencerminkan poin mahasiswa yang prestasi disetujuinya dipertahankan
    const resRanking = await app.handle(
      new Request(`http://localhost/api/v1/ranking?periodId=${periodId}`)
    );
    expect(resRanking.status).toBe(200);
    const rankingBody: any = await resRanking.json();
    const row1 = rankingBody.data.ranking.find((r: any) => r.userId === mhs1Id);
    const row2 = rankingBody.data.ranking.find((r: any) => r.userId === mhs2Id);
    expect(row1?.points).toBe(25);
    expect(row2?.points).toBe(18);

    // AuditEvent mencatat COMPETITION_DELETED
    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'COMPETITION_DELETED', targetId: publishedCompId },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();
    expect((audit!.metadata as any)?.preservedAchievementsCount).toBe(2);
  });

  it('4. Draft kosong tidak mewajibkan konfirmasi ketik dan dapat dihapus, sedangkan ID tidak ada mengembalikan 404', async () => {
    const resPreview = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${draftCompId}/delete-preview`, {
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    expect(resPreview.status).toBe(200);
    const previewBody: any = await resPreview.json();
    expect(previewBody.data.requiresTypedConfirmation).toBe(false);
    expect(previewBody.data.counts.targets).toBe(0);
    expect(previewBody.data.counts.preservedAchievements).toBe(0);

    const resDel = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${draftCompId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    expect(resDel.status).toBe(200);

    const res404 = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${draftCompId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    expect(res404.status).toBe(404);
  });
});
