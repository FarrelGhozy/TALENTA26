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

describe('Admin Kelola Lomba — Ringkasan Kartu (_count) & Detail Kompetisi (/admin/competitions/:id)', () => {
  const app = createServer();
  const timeId = Date.now().toString().slice(-6);

  let institutionId = '';
  let otherInstId = '';
  let validatorId = '';
  let validatorToken = '';
  let studentId = '';
  let studentToken = '';
  let compId = '';
  let otherCompId = '';

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
        name: `Kampus Isolasi ${timeId}`,
      },
    });
    otherInstId = otherInst.id;

    const pwHash = await hashPassword('Password123!');

    const validator = await prisma.user.create({
      data: {
        institutionId,
        email: `admindetail_val_${timeId}@unida.gontor.ac.id`,
        fullName: 'Validator Uji Detail',
        passwordHash: pwHash,
        role: 'validator',
        status: 'active',
      },
    });
    validatorId = validator.id;
    validatorToken = (await createSession(validatorId)).token;

    const student = await prisma.user.create({
      data: {
        institutionId,
        email: `admindetail_mhs_${timeId}@unida.gontor.ac.id`,
        fullName: 'Mahasiswa Uji Detail',
        passwordHash: pwHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `ADM_${timeId}`,
            fullName: 'Mahasiswa Uji Detail',
            studyProgram: 'Teknik Informatika',
            faculty: 'Sains dan Teknologi',
          },
        },
      },
    });
    studentId = student.id;
    studentToken = (await createSession(studentId)).token;

    const comp = await prisma.competition.create({
      data: {
        institutionId,
        slug: `lomba-terpadu-${timeId}`,
        name: `Lomba Uji Terpadu ${timeId}`,
        organizer: 'Panitia Uji',
        category: 'Teknologi',
        level: 'nasional',
        format: 'beregu',
        minTeamMembers: 2,
        maxTeamMembers: 4,
        description: 'Kompetisi uji kelengkapan indikator kartu admin.',
        status: 'draft',
      },
    });
    compId = comp.id;

    // Tambahkan 1 roadmap dengan 2 fase, 1 konsultan, 1 target, dan 1 aturan poin khusus
    await prisma.roadmap.create({
      data: {
        competitionId: compId,
        version: 1,
        status: 'published',
        phases: {
          create: [
            {
              orderIndex: 1,
              title: 'Fase Riset Awal',
              tasks: { create: [{ orderIndex: 1, title: 'Baca pedoman', isRequired: true }] },
            },
            {
              orderIndex: 2,
              title: 'Fase Proposal',
              tasks: { create: [{ orderIndex: 1, title: 'Susun draf', isRequired: true }] },
            },
          ],
        },
      },
    });

    await prisma.consultantContact.create({
      data: {
        competitionId: compId,
        name: 'Dr. Pembina Uji',
        field: 'Riset & Teknologi',
        whatsappNumber: '628111111111',
        isApproved: true,
        status: 'published',
      },
    });

    await prisma.studentTarget.create({
      data: {
        userId: studentId,
        competitionId: compId,
        status: 'active',
      },
    });

    await prisma.competitionPointRule.create({
      data: {
        institutionId,
        competitionId: compId,
        level: 'nasional',
        result: 'juara_1',
        points: 30,
        description: 'Bobot khusus uji',
        isActive: true,
      },
    });

    const otherComp = await prisma.competition.create({
      data: {
        institutionId: otherInstId,
        slug: `lomba-inst-lain-${timeId}`,
        name: `Lomba Kampus Lain ${timeId}`,
        organizer: 'Panitia Luar',
        category: 'Sains',
        level: 'nasional',
        format: 'individu',
        minTeamMembers: 1,
        maxTeamMembers: 1,
        description: 'Kompetisi lintas institusi untuk uji isolasi.',
        status: 'draft',
      },
    });
    otherCompId = otherComp.id;
  });

  afterAll(async () => {
    await prisma.competition.deleteMany({ where: { id: { in: [compId, otherCompId].filter(Boolean) } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: [validatorId, studentId].filter(Boolean) } } });
    await prisma.user.deleteMany({ where: { id: { in: [validatorId, studentId].filter(Boolean) } } });
    if (otherInstId) {
      await prisma.institution.delete({ where: { id: otherInstId } }).catch(() => {});
    }
    await closeDatabase();
  });

  it('menolak akses tanpa autentikasi (401) dan peran mahasiswa (403) pada GET /admin/competitions/:id', async () => {
    const unauthRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${compId}`)
    );
    expect(unauthRes.status).toBe(401);

    const studentRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${compId}`, {
        headers: { Cookie: `talenta_session=${studentToken}` },
      })
    );
    expect(studentRes.status).toBe(403);
  });

  it('mengembalikan 404 untuk ID tidak ada maupun kompetisi milik institusi lain', async () => {
    const missingRes = await app.handle(
      new Request('http://localhost/api/v1/admin/competitions/tidak-ada-id', {
        headers: { Cookie: `talenta_session=${validatorToken}` },
      })
    );
    expect(missingRes.status).toBe(404);

    const crossTenantRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${otherCompId}`, {
        headers: { Cookie: `talenta_session=${validatorToken}` },
      })
    );
    expect(crossTenantRes.status).toBe(404);
  });

  it('mengembalikan ringkasan _count dan jumlah fase roadmap akurat pada GET /admin/competitions dan GET /admin/competitions/:id', async () => {
    const listRes = await app.handle(
      new Request('http://localhost/api/v1/admin/competitions', {
        headers: { Cookie: `talenta_session=${validatorToken}` },
      })
    );
    expect(listRes.status).toBe(200);
    const listJson: any = await listRes.json();
    const found = listJson.data.find((c: any) => c.id === compId);
    expect(found).toBeDefined();
    expect(found._count.roadmaps).toBe(1);
    expect(found._count.consultantContacts).toBe(1);
    expect(found._count.studentTargets).toBe(1);
    expect(found._count.competitionPointRules).toBe(1);
    expect(found.roadmaps[0]._count.phases).toBe(2);

    const detailRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${compId}`, {
        headers: { Cookie: `talenta_session=${validatorToken}` },
      })
    );
    expect(detailRes.status).toBe(200);
    const detailJson: any = await detailRes.json();
    expect(detailJson.data.id).toBe(compId);
    expect(detailJson.data.name).toBe(`Lomba Uji Terpadu ${timeId}`);
    expect(detailJson.data._count.consultantContacts).toBe(1);
    expect(detailJson.data._count.competitionPointRules).toBe(1);
    expect(detailJson.data.roadmaps[0]._count.phases).toBe(2);
  });
});
