import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { createServer } from '../../src/app/server';
import { prisma, closeDatabase } from '../../src/lib/prisma';
import { hashPassword } from '../../src/lib/password';
import { createSession, hashSessionToken } from '../../src/lib/session';

process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = '';
process.env.DB_NAME = 'talenta_test';
process.env.NODE_ENV = 'test';

describe('Fase 1 — Patch Kritis Keamanan, Poin/Ledger, & Stabilitas Alur', () => {
  const app = createServer();
  const timeId = Date.now().toString().slice(-6);

  let institutionId = '';
  let periodId = '';
  let mhs1Id = '';
  let mhs1Token = '';
  let mhs2Id = '';
  let mhs2Token = '';
  let validatorId = '';
  let validatorToken = '';
  let adminId = '';
  let adminToken = '';
  let draftCompId = '';
  let draftCompSlug = '';
  let pubCompId = '';
  let pubCompSlug = '';

  beforeAll(async () => {
    const inst = await prisma.institution.upsert({
      where: { code: 'unida-gontor' },
      update: {},
      create: { code: 'unida-gontor', name: 'Universitas Darussalam Gontor' },
    });
    institutionId = inst.id;

    const period = await prisma.academicPeriod.create({
      data: {
        institutionId,
        name: `Periode Uji Fase 1 ${timeId}`,
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

    const u1 = await prisma.user.create({
      data: {
        institutionId,
        email: `f1_mhs1_${timeId}@unida.gontor.ac.id`,
        passwordHash: pwHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `F1NIM1_${timeId}`,
            fullName: 'Mahasiswa Fase Satu',
            studyProgram: 'Teknik Informatika',
            faculty: 'Sains dan Teknologi',
            phone: '081111111111',
          },
        },
      },
    });
    mhs1Id = u1.id;
    mhs1Token = (await createSession(u1.id)).token;

    const u2 = await prisma.user.create({
      data: {
        institutionId,
        email: `f1_mhs2_${timeId}@unida.gontor.ac.id`,
        passwordHash: pwHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `F1NIM2_${timeId}`,
            fullName: 'Mahasiswa Fase Dua',
            studyProgram: 'Manajemen',
            faculty: 'Ekonomi',
            phone: '082222222222',
          },
        },
      },
    });
    mhs2Id = u2.id;
    mhs2Token = (await createSession(u2.id)).token;

    const val = await prisma.user.create({
      data: {
        institutionId,
        email: `f1_val_${timeId}@unida.gontor.ac.id`,
        passwordHash: pwHash,
        role: 'validator',
        status: 'active',
      },
    });
    validatorId = val.id;
    validatorToken = (await createSession(val.id)).token;

    const adm = await prisma.user.create({
      data: {
        institutionId,
        email: `f1_adm_${timeId}@unida.gontor.ac.id`,
        passwordHash: pwHash,
        role: 'super_admin',
        status: 'active',
      },
    });
    adminId = adm.id;
    adminToken = (await createSession(adm.id)).token;

    draftCompSlug = `draft-comp-f1-${timeId}`;
    const draftComp = await prisma.competition.create({
      data: {
        institutionId,
        academicPeriodId: periodId,
        slug: draftCompSlug,
        name: 'Kompetisi Draft Rahasia',
        organizer: 'Panitia Uji',
        category: 'Teknologi',
        level: 'nasional',
        format: 'beregu',
        minTeamMembers: 2,
        maxTeamMembers: 3,
        description: 'Belum terbit',
        status: 'draft',
      },
    });
    draftCompId = draftComp.id;

    pubCompSlug = `pub-comp-f1-${timeId}`;
    const pubComp = await prisma.competition.create({
      data: {
        institutionId,
        academicPeriodId: periodId,
        slug: pubCompSlug,
        name: 'Kompetisi Publik Fase 1',
        organizer: 'BPTI',
        category: 'Teknologi',
        level: 'nasional',
        format: 'beregu',
        minTeamMembers: 2,
        maxTeamMembers: 3,
        description: 'Sudah terbit',
        status: 'published',
      },
    });
    pubCompId = pubComp.id;
  });

  afterAll(async () => {
    const userIds = [mhs1Id, mhs2Id, validatorId, adminId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.pointLedger.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.achievementDecision.deleteMany({ where: { decidedById: { in: userIds } } });
      await prisma.achievement.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.teamInvite.deleteMany({ where: { senderId: { in: userIds } } });
      await prisma.teamMember.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.team.deleteMany({ where: { creatorId: { in: userIds } } });
      await prisma.studentTarget.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.auditEvent.deleteMany({ where: { actorId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (draftCompId) await prisma.competition.deleteMany({ where: { id: draftCompId } });
    if (pubCompId) await prisma.competition.deleteMany({ where: { id: pubCompId } });
    await prisma.pointRule.deleteMany({ where: { institutionId, version: { gt: 1 } } });
    await prisma.pointRule.updateMany({ where: { institutionId, version: 1 }, data: { isActive: true } });
    if (periodId) await prisma.academicPeriod.deleteMany({ where: { id: periodId } });
    await closeDatabase();
  });

  it('Session token disimpan ter-hash (HMAC-SHA256) di auth_sessions', async () => {
    const raw = await prisma.authSession.findFirst({ where: { userId: mhs1Id } });
    expect(raw).toBeDefined();
    expect(raw?.sessionToken).not.toBe(mhs1Token);
    expect(raw?.sessionToken).toBe(hashSessionToken(mhs1Token));
  });

  it('GET /api/v1/users/:id tidak pernah membocorkan passwordHash atau PII lintas mahasiswa', async () => {
    const selfRes = await app.handle(
      new Request(`http://localhost/api/v1/users/${mhs1Id}`, {
        headers: { Authorization: `Bearer ${mhs1Token}` },
      })
    );
    expect(selfRes.status).toBe(200);
    const selfJson = (await selfRes.json()) as any;
    expect(selfJson.data.passwordHash).toBeUndefined();

    const otherRes = await app.handle(
      new Request(`http://localhost/api/v1/users/${mhs2Id}`, {
        headers: { Authorization: `Bearer ${mhs1Token}` },
      })
    );
    expect(otherRes.status).toBe(200);
    const otherJson = (await otherRes.json()) as any;
    expect(otherJson.data.passwordHash).toBeUndefined();
    expect(otherJson.data.email).toBe('');
    expect(otherJson.data.studentProfile?.nim).toBeUndefined();
    expect(otherJson.data.studentProfile?.phone).toBeUndefined();
  });

  it('Rute legacy IDOR (/users/:id/target, /matching/invites, POST /competitions) telah dihapus (404)', async () => {
    const r1 = await app.handle(
      new Request(`http://localhost/api/v1/users/${mhs2Id}/target`, {
        headers: { Authorization: `Bearer ${mhs1Token}` },
      })
    );
    expect(r1.status).toBe(404);

    const r2 = await app.handle(
      new Request('http://localhost/api/v1/matching/invites', {
        headers: { Authorization: `Bearer ${mhs1Token}` },
      })
    );
    expect(r2.status).toBe(404);

    const r3 = await app.handle(
      new Request('http://localhost/api/v1/competitions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'X', organizer: 'Y', category: 'Z', format: 'individu', description: 'D' }),
      })
    );
    expect(r3.status).toBe(404);
  });

  it('Konten kompetisi draft tidak bocor ke endpoint publik', async () => {
    const cRes = await app.handle(new Request(`http://localhost/api/v1/competitions/${draftCompSlug}`));
    expect(cRes.status).toBe(404);

    const rRes = await app.handle(new Request(`http://localhost/api/v1/roadmaps/${draftCompSlug}`));
    expect(rRes.status).toBe(404);

    const kRes = await app.handle(new Request(`http://localhost/api/v1/consultants?slug=${draftCompSlug}`));
    expect(kRes.status).toBe(404);
  });

  it('Rekrutmen tim: pelamar bisa cancel pengajuan, anggota keluar bisa bergabung ulang, dan getMyTeam bebas passwordHash/PII', async () => {
    const teamRes = await app.handle(
      new Request('http://localhost/api/v1/teams', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs1Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionSlug: pubCompSlug, teamName: 'Tim Fase 1', recruitmentType: 'terbuka' }),
      })
    );
    expect(teamRes.status).toBe(200);
    const teamData = ((await teamRes.json()) as any).data;
    const teamId = teamData.id;

    // Pastikan rute legacy /invites telah dihapus (404)
    const legacyInvRes = await app.handle(
      new Request(`http://localhost/api/v1/teams/${teamId}/invites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs1Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: mhs2Id }),
      })
    );
    expect(legacyInvRes.status).toBe(404);

    // Ajukan bergabung oleh mhs2 lalu batalkan
    const req1Res = await app.handle(
      new Request(`http://localhost/api/v1/teams/${teamId}/join-requests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs2Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredRole: 'Anggota' }),
      })
    );
    expect(req1Res.status).toBe(200);
    const req1Id = ((await req1Res.json()) as any).data.id;

    const cancelRes = await app.handle(
      new Request(`http://localhost/api/v1/join-requests/${req1Id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs2Token}` },
      })
    );
    expect(cancelRes.status).toBe(200);

    // Ajukan lagi, disetujui ketua, keluar, lalu bergabung ulang via kode undangan (uji reaktivasi TeamMember)
    const req2Res = await app.handle(
      new Request(`http://localhost/api/v1/teams/${teamId}/join-requests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs2Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredRole: 'Anggota' }),
      })
    );
    const req2Id = ((await req2Res.json()) as any).data.id;

    const acc1 = await app.handle(
      new Request(`http://localhost/api/v1/join-requests/${req2Id}/decide`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs1Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disetujui' }),
      })
    );
    expect(acc1.status).toBe(200);

    const myTeamRes = await app.handle(
      new Request('http://localhost/api/v1/teams/my', {
        headers: { Authorization: `Bearer ${mhs1Token}` },
      })
    );
    const myTeamJson = ((await myTeamRes.json()) as any).data;
    for (const m of myTeamJson.members) {
      expect(m.user.passwordHash).toBeUndefined();
      expect(m.user.email).toBeUndefined();
      expect(m.user.studentProfile?.nim).toBeUndefined();
      expect(m.user.studentProfile?.phone).toBeUndefined();
    }

    const leaveRes = await app.handle(
      new Request(`http://localhost/api/v1/teams/${teamId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs2Token}` },
      })
    );
    expect(leaveRes.status).toBe(200);

    const rejoinRes = await app.handle(
      new Request('http://localhost/api/v1/teams/join-by-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs2Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: teamData.inviteCode }),
      })
    );
    expect(rejoinRes.status).toBe(200);
  });

  it('PointRule v2 dipakai saat approve, reversal tidak double-negation di dashboard/CSV, dan koreksi ulang tidak minus/double-count', async () => {
    // Terbitkan PointRule versi baru (nasional juara_1 = 25)
    const ruleRes = await app.handle(
      new Request('http://localhost/api/v1/system/point-rules/version', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: [
            { level: 'nasional', result: 'juara_1', points: 25 },
            { level: 'lokal', result: 'juara_1', points: 10 },
          ],
        }),
      })
    );
    expect(ruleRes.status).toBe(201);

    // Ajukan prestasi
    const pdfBuf = Buffer.from('%PDF-1.4 valid test pdf').toString('base64');
    const createRes = await app.handle(
      new Request('http://localhost/api/v1/me/achievements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs1Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: `Lomba Poin V2 ${timeId}`,
          penyelenggara: 'BPTI',
          kategori: 'kompetisi',
          tingkat: 'nasional',
          jenisCapaian: 'juara_1',
          tanggal: '2026-06-15',
          files: [{ name: 'sertif.pdf', type: 'application/pdf', size: 10, buffer: pdfBuf }],
        }),
      })
    );
    expect(createRes.status).toBe(200);
    const achId = ((await createRes.json()) as any).data.id;

    // Approve 1 -> harus mendapat 25 poin (bukan 0 / bukan v1=18)
    const dec1 = await app.handle(
      new Request(`http://localhost/api/v1/admin/achievements/${achId}/decisions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${validatorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', version: 1 }),
      })
    );
    expect(dec1.status).toBe(200);

    // Tidak boleh memanggil /decisions lagi pada status disetujui
    const decBad = await app.handle(
      new Request(`http://localhost/api/v1/admin/achievements/${achId}/decisions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${validatorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: 'Coba bypass' }),
      })
    );
    expect(decBad.status).toBe(409);

    // Koreksi 1 -> perlu_perbaikan, poin harus kembali tepat 0 di dashboard & CSV
    const cor1 = await app.handle(
      new Request(`http://localhost/api/v1/admin/achievements/${achId}/corrections`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${validatorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Verifikasi ulang panitia', version: 2, targetStatus: 'perlu_perbaikan' }),
      })
    );
    expect(cor1.status).toBe(200);

    const dashAfterCor1 = await app.handle(
      new Request('http://localhost/api/v1/me/dashboard', {
        headers: { Authorization: `Bearer ${mhs1Token}` },
      })
    );
    const dashJson = (await dashAfterCor1.json()) as any;
    expect(dashJson.data.points.totalPoints).toBe(0);

    const csvRes = await app.handle(
      new Request('http://localhost/api/v1/admin/export', {
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    const csvText = await csvRes.text();
    expect(csvText).toContain(`"Lomba Poin V2 ${timeId}"`);
    const targetLine = csvText.split('\n').find((l) => l.includes(`Lomba Poin V2 ${timeId}`)) || '';
    expect(targetLine).toContain(',"0",');

    // Revisi -> Approve 2 -> harus tepat 25 poin, approvedCount=1, juara1Count=1
    const revRes = await app.handle(
      new Request(`http://localhost/api/v1/me/achievements/${achId}/revisions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs1Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Sudah diperbaiki' }),
      })
    );
    expect(revRes.status).toBe(200);

    const dec2 = await app.handle(
      new Request(`http://localhost/api/v1/admin/achievements/${achId}/decisions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${validatorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', version: 4 }),
      })
    );
    expect(dec2.status).toBe(200);

    const rankRes = await app.handle(new Request('http://localhost/api/v1/ranking'));
    const rankJson = (await rankRes.json()) as any;
    const entry = rankJson.data.ranking.find((r: any) => r.userId === mhs1Id);
    expect(entry).toBeDefined();
    expect(entry.points).toBe(25);
    expect(entry.approvedCount).toBe(1);
    expect(entry.juara1Count).toBe(1);

    // Koreksi 2 -> net poin harus 0, bukan -25!
    const cor2 = await app.handle(
      new Request(`http://localhost/api/v1/admin/achievements/${achId}/corrections`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${validatorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Koreksi kedua', version: 5, targetStatus: 'ditolak' }),
      })
    );
    expect(cor2.status).toBe(200);

    const ledgers = await prisma.pointLedger.findMany({ where: { achievementId: achId } });
    const netSum = ledgers.reduce((s, l) => s + l.points, 0);
    expect(netSum).toBe(0);
  });

  it('Mahasiswa dapat membatalkan pengajuan menunggu, dan Super Admin tidak bisa suspend dirinya sendiri', async () => {
    const pdfBuf = Buffer.from('%PDF-1.4 cancel test').toString('base64');
    const createRes = await app.handle(
      new Request('http://localhost/api/v1/me/achievements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs1Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: `Lomba Batal ${timeId}`,
          penyelenggara: 'Panitia',
          kategori: 'kompetisi',
          tingkat: 'lokal',
          jenisCapaian: 'juara_1',
          tanggal: '2026-06-15',
          files: [{ name: 'batal.pdf', type: 'application/pdf', size: 10, buffer: pdfBuf }],
        }),
      })
    );
    const achId = ((await createRes.json()) as any).data.id;

    const cancelRes = await app.handle(
      new Request(`http://localhost/api/v1/me/achievements/${achId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs1Token}` },
      })
    );
    expect(cancelRes.status).toBe(200);
    expect(((await cancelRes.json()) as any).data.status).toBe('dibatalkan');

    const selfSuspend = await app.handle(
      new Request(`http://localhost/api/v1/system/users/${adminId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'suspended' }),
      })
    );
    expect(selfSuspend.status).toBe(403);
  });
});
