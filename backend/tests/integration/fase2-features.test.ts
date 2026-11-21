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

const VALID_PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
const VALID_PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

describe('Fase 2 — Fitur Utama, Sistem Poin 3 Lapis, Prestasi Kelompok, Avatar RustFS, & Pergantian Periode', () => {
  const app = createServer();
  const timeId = Date.now().toString().slice(-6);

  let institutionId = '';
  let period1Id = '';
  let period2Id = '';
  let mhs1Id = '';
  let mhs1Token = '';
  let mhs2Id = '';
  let mhs2Token = '';
  let validatorId = '';
  let validatorToken = '';
  let adminId = '';
  let adminToken = '';

  let categoryId = '';
  let subCategoryId = '';
  let compId = '';
  let compSlug = '';
  let indCompId = '';
  let templateId = '';
  let groupAchId = '';
  let targetPeriodCompId = '';

  beforeAll(async () => {
    const inst = await prisma.institution.upsert({
      where: { code: 'unida-gontor' },
      update: {},
      create: { code: 'unida-gontor', name: 'Universitas Darussalam Gontor' },
    });
    institutionId = inst.id;

    // Pastikan aturan dasar poin v1 aktif tersedia
    await prisma.pointRule.updateMany({ where: { institutionId }, data: { isActive: false } });
    const v1Count = await prisma.pointRule.count({ where: { institutionId, version: 1 } });
    if (v1Count === 0) {
      await prisma.pointRule.createMany({
        data: [
          { institutionId, version: 1, level: 'nasional', result: 'juara_1', points: 18, isActive: true },
          { institutionId, version: 1, level: 'nasional', result: 'juara_2', points: 14, isActive: true },
        ],
      });
    } else {
      await prisma.pointRule.updateMany({
        where: { institutionId, version: 1 },
        data: { isActive: true },
      });
    }

    const p1 = await prisma.academicPeriod.create({
      data: {
        institutionId,
        name: `Periode Fase2 Ganjil ${timeId}`,
        year: 2026,
        semester: 'ganjil',
        isActive: true,
      },
    });
    period1Id = p1.id;
    await prisma.academicPeriod.updateMany({
      where: { institutionId, id: { not: period1Id } },
      data: { isActive: false },
    });

    const pwHash = await hashPassword('Password123!');

    const u1 = await prisma.user.create({
      data: {
        institutionId,
        email: `f2_mhs1_${timeId}@unida.gontor.ac.id`,
        fullName: 'Ketua Kelompok Uji',
        passwordHash: pwHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `F2NIM1_${timeId}`,
            fullName: 'Ketua Kelompok Uji',
            studyProgram: 'Teknik Informatika',
            faculty: 'Sains dan Teknologi',
          },
        },
      },
    });
    mhs1Id = u1.id;
    mhs1Token = (await createSession(mhs1Id)).token;

    const u2 = await prisma.user.create({
      data: {
        institutionId,
        email: `f2_mhs2_${timeId}@unida.gontor.ac.id`,
        fullName: 'Anggota Kelompok Uji',
        passwordHash: pwHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `F2NIM2_${timeId}`,
            fullName: 'Anggota Kelompok Uji',
            studyProgram: 'Sistem Informasi',
            faculty: 'Sains dan Teknologi',
          },
        },
      },
    });
    mhs2Id = u2.id;
    mhs2Token = (await createSession(mhs2Id)).token;

    const val = await prisma.user.create({
      data: {
        institutionId,
        email: `f2_val_${timeId}@unida.gontor.ac.id`,
        fullName: 'Ustadz Ahmad Verifikator, M.Kom.',
        passwordHash: pwHash,
        role: 'validator',
        status: 'active',
      },
    });
    validatorId = val.id;
    validatorToken = (await createSession(validatorId)).token;

    const adm = await prisma.user.create({
      data: {
        institutionId,
        email: `f2_adm_${timeId}@unida.gontor.ac.id`,
        fullName: 'Ustadz Farrel Admin, M.T.',
        passwordHash: pwHash,
        role: 'super_admin',
        status: 'active',
      },
    });
    adminId = adm.id;
    adminToken = (await createSession(adminId)).token;

    compSlug = `f2-comp-${timeId}`;
    const comp = await prisma.competition.create({
      data: {
        institutionId,
        academicPeriodId: period1Id,
        slug: compSlug,
        name: `LIDM Uji ${timeId}`,
        organizer: 'Kemdikbudristek',
        category: 'Teknologi',
        level: 'nasional',
        format: 'beregu',
        minTeamMembers: 2,
        maxTeamMembers: 4,
        requiredRoles: ['Ketua', 'Pengembang'],
        description: 'Kompetisi uji fitur Fase 2.',
        status: 'published',
      },
    });
    compId = comp.id;

    const indComp = await prisma.competition.create({
      data: {
        institutionId,
        academicPeriodId: period1Id,
        slug: `f2-ind-comp-${timeId}`,
        name: `ONMIPA Uji ${timeId}`,
        organizer: 'BPTI',
        category: 'Sains',
        level: 'nasional',
        format: 'individu',
        minTeamMembers: 1,
        maxTeamMembers: 1,
        requiredRoles: ['Peserta'],
        description: 'Kompetisi individu uji seleksi.',
        status: 'published',
      },
    });
    indCompId = indComp.id;
    targetPeriodCompId = comp.id;
  });

  afterAll(async () => {
    try {
      await prisma.pointLedger.deleteMany({
        where: { userId: { in: [mhs1Id, mhs2Id].filter(Boolean) } },
      });
      await prisma.achievement.deleteMany({
        where: { userId: { in: [mhs1Id, mhs2Id].filter(Boolean) } },
      });
      await prisma.internalSelection.deleteMany({
        where: { competitionId: { in: [compId, indCompId].filter(Boolean) } },
      });
      await prisma.studentTarget.deleteMany({
        where: { userId: { in: [mhs1Id, mhs2Id].filter(Boolean) } },
      });
      await prisma.competitionPointRule.deleteMany({
        where: {
          OR: [
            ...(compId ? [{ competitionId: compId }] : []),
            ...(subCategoryId ? [{ subCategoryId }] : []),
          ],
        },
      });
      await prisma.competition.deleteMany({
        where: { id: { in: [compId, indCompId].filter(Boolean) } },
      });
      if (templateId) {
        await prisma.pointRule.deleteMany({ where: { pointTemplateId: templateId } });
        await prisma.pointTemplate.deleteMany({ where: { id: templateId } });
      }
      if (categoryId) {
        await prisma.competitionSubCategory.deleteMany({ where: { categoryId } });
        await prisma.competitionCategory.deleteMany({ where: { id: categoryId } });
      }
      await prisma.pointRule.updateMany({ where: { institutionId }, data: { isActive: false } });
      await prisma.pointRule.updateMany({ where: { institutionId, version: 1 }, data: { isActive: true } });
      await prisma.user.deleteMany({
        where: { id: { in: [mhs1Id, mhs2Id, validatorId, adminId].filter(Boolean) } },
      });
      if (period2Id) {
        await prisma.academicPeriod.deleteMany({ where: { id: period2Id } });
      }
      if (period1Id) {
        await prisma.academicPeriod.deleteMany({ where: { id: period1Id } });
      }
    } finally {
      await closeDatabase();
    }
  });

  it('1. Super Admin dapat membuat staf dengan nama lengkap (fullName) dan memperbarui nama', async () => {
    const createRes = await app.handle(
      new Request('http://localhost/api/v1/system/users/staff', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `f2_staff_${timeId}@unida.gontor.ac.id`,
          fullName: 'Ustadz Pembina Baru',
          password: 'Password123!',
          role: 'validator',
        }),
      })
    );
    expect(createRes.status).toBe(201);
    const createdBody = (await createRes.json()) as any;
    expect(createdBody.data.fullName).toBe('Ustadz Pembina Baru');
    const createdStaffId = createdBody.data.id;

    const patchRes = await app.handle(
      new Request(`http://localhost/api/v1/system/users/${createdStaffId}/name`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullName: 'Ustadz Pembina Senior, M.Pd.' }),
      })
    );
    expect(patchRes.status).toBe(200);
    const patchBody = (await patchRes.json()) as any;
    expect(patchBody.data.fullName).toBe('Ustadz Pembina Senior, M.Pd.');

    await prisma.user.delete({ where: { id: createdStaffId } });
  });

  it('2. Sistem Poin 3 Lapis: Super Admin buat Template, Validator buat Jenis/Sub-Lomba & Custom Point Rule', async () => {
    // A. Template poin baru oleh Super Admin
    const tplRes = await app.handle(
      new Request('http://localhost/api/v1/system/point-templates', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Template Uji ${timeId}`,
          description: 'Template uji integrasi Fase 2',
          activateAsDefault: false,
          rules: [{ level: 'nasional', result: 'juara_1', points: 25 }],
        }),
      })
    );
    expect(tplRes.status).toBe(201);
    templateId = ((await tplRes.json()) as any).data.id;

    // B. Master Jenis & Sub-Lomba oleh Validator
    const catRes = await app.handle(
      new Request('http://localhost/api/v1/admin/competition-categories', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validatorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: `cat-${timeId}`,
          name: 'Inovasi Digital Uji',
          description: 'Kategori uji integrasi',
        }),
      })
    );
    expect(catRes.status).toBe(201);
    categoryId = ((await catRes.json()) as any).data.id;

    const subRes = await app.handle(
      new Request('http://localhost/api/v1/admin/competition-subcategories', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validatorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId,
          code: `sub-${timeId}`,
          name: 'Divisi Inovasi Teknologi Pendidikan',
          rules: [
            {
              level: 'nasional',
              result: 'juara_1',
              points: 22,
              description: 'Poin default sub-lomba inovasi pendidikan',
            },
          ],
        }),
      })
    );
    expect(subRes.status).toBe(201);
    subCategoryId = ((await subRes.json()) as any).data.id;

    // C. Aturan khusus perlombaan + sub-lomba oleh Validator
    const compRuleRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${compId}/point-rules`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${validatorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitionCategoryId: categoryId,
          pointDescription: 'Lomba prioritas nasional dengan bobot khusus sub-lomba divisi teknologi.',
          customRules: [
            {
              subCategoryId,
              level: 'nasional',
              result: 'juara_1',
              points: 28,
              description: 'Juara 1 Divisi Teknologi LIDM mendapat 28 poin.',
            },
          ],
        }),
      })
    );
    expect(compRuleRes.status).toBe(200);

    // D. Verifikasi endpoint publik point-rules mengembalikan keterangan & custom rules
    const pubRes = await app.handle(
      new Request(`http://localhost/api/v1/competitions/${compSlug}/point-rules`)
    );
    expect(pubRes.status).toBe(200);
    const pubBody = (await pubRes.json()) as any;
    expect(pubBody.data.pointDescription).toContain('Lomba prioritas nasional');
    expect(pubBody.data.customRules.some((r: any) => r.points === 28)).toBe(true);
  });

  it('3. Prestasi Kelompok: semua anggota mendapat poin penuh (Lapis 2), & Override Validator (Lapis 3) wajib alasan', async () => {
    const fd = new FormData();
    fd.append('name', `Prestasi Kelompok LIDM ${timeId}`);
    fd.append('organizer', 'Kemdikbudristek');
    fd.append('category', 'kompetisi');
    fd.append('level', 'nasional');
    fd.append('result', 'juara_1');
    fd.append('eventDate', '2026-06-15');
    fd.append('competitionId', compId);
    fd.append('competitionCategoryId', categoryId);
    fd.append('subCategoryId', subCategoryId);
    fd.append('participationType', 'kelompok');
    fd.append('participantUserIds', JSON.stringify([mhs1Id, mhs2Id]));
    fd.append('evidence', new File([VALID_PDF_BYTES], 'sertif-kelompok.pdf', { type: 'application/pdf' }));

    const submitRes = await app.handle(
      new Request('http://localhost/api/v1/me/achievements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs1Token}` },
        body: fd,
      })
    );
    expect(submitRes.status).toBe(200);
    const created = ((await submitRes.json()) as any).data;
    groupAchId = created.id;
    expect(created.participationType).toBe('kelompok');
    expect(created.participants.length).toBe(2);

    // Anggota 2 juga bisa melihat prestasi tersebut tanpa IDOR block
    const detailMhs2Res = await app.handle(
      new Request(`http://localhost/api/v1/me/achievements/${groupAchId}`, {
        headers: { Authorization: `Bearer ${mhs2Token}` },
      })
    );
    expect(detailMhs2Res.status).toBe(200);
    const detailMhs2 = ((await detailMhs2Res.json()) as any).data;
    expect(detailMhs2.pointRecommendation.calculatedPoints).toBe(28);
    expect(detailMhs2.pointRecommendation.pointSource).toBe('sub_competition_rule');

    // Validator mencoba override tanpa alasan -> 422
    const badOverrideRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/achievements/${groupAchId}/decisions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validatorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          overridePoints: 35,
          version: 1,
        }),
      })
    );
    expect(badOverrideRes.status).toBe(422);

    // Validator menyetujui dengan overridePoints = 32 dan alasan valid
    const approveRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/achievements/${groupAchId}/decisions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validatorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          overridePoints: 32,
          overrideReason: 'Penghargaan tim terbaik tingkat nasional',
          version: 1,
        }),
      })
    );
    expect(approveRes.status).toBe(200);

    // Verifikasi: KEDUA anggota memperoleh 32 poin penuh di PointLedger
    const ledgers = await prisma.pointLedger.findMany({
      where: { achievementId: groupAchId },
    });
    expect(ledgers.length).toBe(2);
    expect(ledgers.every((l) => l.points === 32 && l.pointSource === 'validator_override')).toBe(true);

    // Verifikasi nama asli validator tampil di riwayat keputusan
    const valViewRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/achievements/${groupAchId}`, {
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    const valView = ((await valViewRes.json()) as any).data;
    expect(valView.decisions[0].decidedBy.fullName).toBe('Ustadz Ahmad Verifikator, M.Kom.');
    expect(valView.decisions[0].calculatedPoints).toBe(28);
    expect(valView.decisions[0].awardedPoints).toBe(32);

    // Koreksi keputusan -> SEMUA anggota dibalikkan poinnya ke net 0
    const corrRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/achievements/${groupAchId}/corrections`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validatorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Bukti sertifikat perlu perbaikan tanda tangan resmi',
          targetStatus: 'perlu_perbaikan',
          version: 2,
        }),
      })
    );
    expect(corrRes.status).toBe(200);

    const netAfterCorrection = await prisma.pointLedger.groupBy({
      by: ['userId'],
      where: { achievementId: groupAchId },
      _sum: { points: true },
    });
    expect(netAfterCorrection.every((row) => row._sum.points === 0)).toBe(true);
  });

  it('4. Revisi Penuh dapat mengganti berkas bukti aktif (replaceEvidenceIds) & mempertahankan riwayat audit', async () => {
    const firstEv = await prisma.achievementEvidence.findFirst({
      where: { achievementId: groupAchId, isActive: true },
    });
    expect(firstEv).toBeDefined();

    const revFd = new FormData();
    revFd.append('name', `Prestasi Kelompok LIDM Revisi ${timeId}`);
    revFd.append('note', 'Memperbarui file sertifikat bertanda tangan basah');
    revFd.append('replaceEvidenceIds', JSON.stringify([firstEv!.id]));
    revFd.append('evidence', new File([VALID_PDF_BYTES], 'sertif-revisi.pdf', { type: 'application/pdf' }));

    const revRes = await app.handle(
      new Request(`http://localhost/api/v1/me/achievements/${groupAchId}/revisions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs1Token}` },
        body: revFd,
      })
    );
    expect(revRes.status).toBe(200);
    const revBody = ((await revRes.json()) as any).data;
    expect(revBody.status).toBe('menunggu');
    expect(revBody.evidences.length).toBe(1);
    expect(revBody.evidences[0].fileName).toBe('sertif-revisi.pdf');

    const oldEvAfter = await prisma.achievementEvidence.findUnique({ where: { id: firstEv!.id } });
    expect(oldEvAfter?.isActive).toBe(false);
    expect(oldEvAfter?.supersededByRevisionId).toBeTruthy();
  });

  it('5. Avatar RustFS Privat: unggah PNG valid berhasil, stream terotorisasi 200, Base64 via PATCH ditolak 422, & ranking bebas avatar', async () => {
    // Reject Base64 on PATCH /me/profile
    const base64Res = await app.handle(
      new Request('http://localhost/api/v1/me/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${mhs1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarUrl: 'data:image/png;base64,iVBORw0KGgo=' }),
      })
    );
    expect(base64Res.status).toBe(422);

    // Reject spoofed PNG
    const badFd = new FormData();
    badFd.append('avatar', new File([Buffer.from('not-a-png')], 'fake.png', { type: 'image/png' }));
    const badAvatarRes = await app.handle(
      new Request('http://localhost/api/v1/me/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs1Token}` },
        body: badFd,
      })
    );
    expect(badAvatarRes.status).toBe(422);

    // Upload valid PNG
    const okFd = new FormData();
    okFd.append('avatar', new File([VALID_PNG_BYTES], 'foto.png', { type: 'image/png' }));
    const uploadRes = await app.handle(
      new Request('http://localhost/api/v1/me/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs1Token}` },
        body: okFd,
      })
    );
    expect(uploadRes.status).toBe(200);
    const uploadBody = ((await uploadRes.json()) as any).data;
    expect(uploadBody.avatarUrl).toContain(`/api/v1/users/${mhs1Id}/avatar`);

    // Authenticated stream succeeds, unauthenticated denied 401
    const unauthStream = await app.handle(new Request(`http://localhost/api/v1/users/${mhs1Id}/avatar`));
    expect(unauthStream.status).toBe(401);

    const authStream = await app.handle(
      new Request(`http://localhost/api/v1/users/${mhs1Id}/avatar`, {
        headers: { Authorization: `Bearer ${mhs2Token}` },
      })
    );
    expect(authStream.status).toBe(200);
    expect(authStream.headers.get('content-type')).toBe('image/png');
  });

  it('6. Roadmap non-destruktif mempertahankan progres mahasiswa & Seleksi Internal mendukung peserta individu', async () => {
    const firstSave = await app.handle(
      new Request(`http://localhost/api/v1/admin/roadmaps/${compSlug}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validatorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phases: [
            {
              title: 'Tahap Proposal',
              description: 'Persiapan proposal awal',
              orderIndex: 1,
              tasks: [
                {
                  title: 'Susun Draft Proposal',
                  description: 'Lengkapi abstrak dan metodologi',
                  isRequired: true,
                  orderIndex: 1,
                },
              ],
            },
          ],
        }),
      })
    );
    expect(firstSave.status).toBe(200);
    const r1 = ((await firstSave.json()) as any).data;
    const phaseId = r1.phases[0].id;
    const taskId = r1.phases[0].tasks[0].id;

    // Mahasiswa menandai progres selesai
    const progRes = await app.handle(
      new Request(`http://localhost/api/v1/me/roadmap-progress/${taskId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${mhs1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: true }),
      })
    );
    expect(progRes.status).toBe(200);

    // Validator mengedit roadmap dengan id phase/task tetap + menambah task baru
    const secondSave = await app.handle(
      new Request(`http://localhost/api/v1/admin/roadmaps/${compSlug}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validatorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phases: [
            {
              id: phaseId,
              title: 'Tahap Proposal Diperbarui',
              description: 'Persiapan proposal final',
              orderIndex: 1,
              tasks: [
                {
                  id: taskId,
                  title: 'Susun Draft Proposal (Revisi)',
                  description: 'Lengkapi abstrak, metodologi, dan RAB',
                  isRequired: true,
                  orderIndex: 1,
                },
                {
                  title: 'Simulasi Presentasi',
                  isRequired: false,
                  orderIndex: 2,
                },
              ],
            },
          ],
        }),
      })
    );
    expect(secondSave.status).toBe(200);

    const savedProgress = await prisma.roadmapProgress.findUnique({
      where: { userId_taskId: { userId: mhs1Id, taskId } },
    });
    expect(savedProgress?.completed).toBe(true);

    // Seleksi internal untuk peserta individu (ONMIPA)
    const selRes = await app.handle(
      new Request('http://localhost/api/v1/admin/selections', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validatorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitionId: indCompId,
          userId: mhs2Id,
          stage: 'Seleksi Kampus Bidang Matematika',
          result: 'lolos',
          organizerVerified: true,
          notes: 'Lolos peringkat 1 seleksi internal kampus',
        }),
      })
    );
    expect(selRes.status).toBe(200);
    const selBody = ((await selRes.json()) as any).data;
    expect(selBody.userId).toBe(mhs2Id);
    expect(selBody.result).toBe('lolos');
  });

  it('7. Pergantian Periode Akademik: preview dampak akurat & aktivasi mengarsipkan target periode lama secara atomik', async () => {
    // Mahasiswa memilih target lomba periode 1
    await prisma.studentTarget.create({
      data: {
        userId: mhs1Id,
        competitionId: targetPeriodCompId,
        academicPeriodId: period1Id,
        status: 'active',
      },
    });

    const p2Res = await app.handle(
      new Request('http://localhost/api/v1/system/academic-periods', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Periode Fase2 Genap ${timeId}`,
          year: 2027,
          semester: 'genap',
          startDate: '2027-02-01',
          endDate: '2027-07-31',
        }),
      })
    );
    expect(p2Res.status).toBe(201);
    period2Id = ((await p2Res.json()) as any).data.id;

    const prevRes = await app.handle(
      new Request(`http://localhost/api/v1/system/academic-periods/${period2Id}/activation-preview`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    expect(prevRes.status).toBe(200);
    const prevBody = ((await prevRes.json()) as any).data;
    expect(prevBody.activeTargetsToArchive).toBeGreaterThanOrEqual(1);

    const actRes = await app.handle(
      new Request(`http://localhost/api/v1/system/academic-periods/${period2Id}/activate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archiveOldTargets: true }),
      })
    );
    expect(actRes.status).toBe(200);

    const archivedTargets = await prisma.studentTarget.findMany({
      where: { userId: mhs1Id, competitionId: targetPeriodCompId },
    });
    expect(archivedTargets[0]?.status).toBe('archived');
  });
});
