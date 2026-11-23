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

describe('Fase 3B — Rekrutmen Tim Berbasis Pengajuan, Kode Undangan & Aturan Dinamis Kompetisi', () => {
  const app = createServer();
  const suffix = Date.now().toString().slice(-6);

  let institutionId = '';
  let validatorToken = '';
  let compSlug = '';
  let compId = '';
  let individuSlug = '';

  let leaderId = '';
  let leaderToken = '';
  let studentBId = '';
  let studentBToken = '';
  let studentCId = '';
  let studentCToken = '';
  let studentDId = '';
  let studentDToken = '';
  let studentEId = '';
  let studentEToken = '';

  let openTeamId = '';
  let openTeamCode = '';
  let privateTeamId = '';
  let privateTeamCode = '';

  async function makeStudent(tag: string, prodi: string, roles: string[]) {
    const passHash = await hashPassword('Password123!');
    const u = await prisma.user.create({
      data: {
        institutionId,
        email: `rec_${tag}_${suffix}@unida.gontor.ac.id`,
        passwordHash: passHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `REC${tag}${suffix}`,
            fullName: `Mahasiswa ${tag.toUpperCase()}`,
            studyProgram: prodi,
            faculty: 'Sains dan Teknologi',
            enrollmentYear: 2024,
            phone: `08123456${tag.slice(0, 4)}`,
            rolesCapable: roles,
            skills: [{ nama: 'Riset', level: 3 }],
            interests: ['PKM'],
          },
        },
      },
    });
    const session = await createSession(u.id);
    return { id: u.id, token: session.token };
  }

  beforeAll(async () => {
    const inst = await prisma.institution.upsert({
      where: { code: 'unida-gontor' },
      update: {},
      create: { code: 'unida-gontor', name: 'Universitas Darussalam Gontor' },
    });
    institutionId = inst.id;

    const passHash = await hashPassword('Validator123!');
    const val = await prisma.user.create({
      data: {
        institutionId,
        email: `val_rec_${suffix}@unida.gontor.ac.id`,
        fullName: 'Validator Rekrutmen Test',
        passwordHash: passHash,
        role: 'validator',
        status: 'active',
      },
    });
    validatorToken = (await createSession(val.id)).token;

    const l = await makeStudent('ldr', 'Teknik Informatika', ['Ketua Tim', 'Penulis Proposal']);
    leaderId = l.id;
    leaderToken = l.token;

    const b = await makeStudent('stb', 'Teknik Informatika', ['Analis Data']);
    studentBId = b.id;
    studentBToken = b.token;

    const c = await makeStudent('stc', 'Teknik Informatika', ['Desain UI']);
    studentCId = c.id;
    studentCToken = c.token;

    const d = await makeStudent('std', 'Agroteknologi', ['Penulis Proposal']);
    studentDId = d.id;
    studentDToken = d.token;

    const e = await makeStudent('ste', 'Manajemen', ['Analis Data']);
    studentEId = e.id;
    studentEToken = e.token;
  });

  afterAll(async () => {
    const userIds = [leaderId, studentBId, studentCId, studentDId, studentEId].filter(Boolean);
    if (compId) {
      await prisma.internalSelection.deleteMany({ where: { competitionId: compId } });
      await prisma.teamJoinRequest.deleteMany({ where: { team: { competitionId: compId } } });
      await prisma.teamMember.deleteMany({ where: { team: { competitionId: compId } } });
      await prisma.team.deleteMany({ where: { competitionId: compId } });
      await prisma.studentTarget.deleteMany({ where: { competitionId: compId } });
      await prisma.competition.deleteMany({ where: { id: compId } });
    }
    if (individuSlug) {
      await prisma.competition.deleteMany({ where: { slug: individuSlug } });
    }
    if (userIds.length > 0) {
      await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await closeDatabase();
  });

  it('1. Admin dapat mengatur aturan dinamis per kompetisi (beregu & individu) serta menerbitkannya', async () => {
    const resCreate = await app.handle(
      new Request('http://localhost/api/v1/admin/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validatorToken}` },
        body: JSON.stringify({
          name: `PKM Riset Test ${suffix}`,
          organizer: 'Kemendikbudristek',
          category: 'Riset',
          level: 'nasional',
          format: 'beregu',
          minTeamMembers: 3,
          maxTeamMembers: 4,
          requiredRoles: ['Penulis Proposal', 'Analis Data'],
          registrationStatus: 'buka',
          requireRoles: true,
          requireCrossStudyProgram: true,
          singleTeamPerCompetition: true,
          description: 'Kompetisi uji aturan dinamis beregu',
        }),
      })
    );
    expect(resCreate.status).toBe(200);
    const created = ((await resCreate.json()) as any).data;
    compId = created.id;
    compSlug = created.slug;
    expect(created.registrationStatus).toBe('buka');
    expect(created.requireCrossStudyProgram).toBe(true);
    expect(created.requireRoles).toBe(true);

    const resPub = await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${compId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    expect(resPub.status).toBe(200);

    // Buat & terbitkan lomba individu
    const resInd = await app.handle(
      new Request('http://localhost/api/v1/admin/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validatorToken}` },
        body: JSON.stringify({
          name: `ONMIPA Test ${suffix}`,
          organizer: 'BPTI',
          category: 'Sains',
          format: 'individu',
          description: 'Kompetisi uji individu',
        }),
      })
    );
    expect(resInd.status).toBe(200);
    const indData = ((await resInd.json()) as any).data;
    individuSlug = indData.slug;
    expect(indData.minTeamMembers).toBe(1);
    expect(indData.maxTeamMembers).toBe(1);
    expect(indData.requireCrossStudyProgram).toBe(false);

    await app.handle(
      new Request(`http://localhost/api/v1/admin/competitions/${indData.id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
  });

  it('2. Lomba individu menolak pembuatan tim (422)', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${leaderToken}` },
        body: JSON.stringify({
          competitionSlug: individuSlug,
          teamName: 'Tim Tidak Sah',
        }),
      })
    );
    expect(res.status).toBe(422);
  });

  it('3. Ketua membuat Tim Terbuka dengan targetMaxMembers sesuai aturan lomba & mendapatkan kode undangan acak', async () => {
    // Set target untuk semua mahasiswa
    for (const token of [leaderToken, studentBToken, studentCToken, studentDToken, studentEToken]) {
      const r = await app.handle(
        new Request('http://localhost/api/v1/me/target', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ slug: compSlug }),
        })
      );
      expect(r.status).toBe(200);
    }

    // Tolak targetMaxMembers di luar batas kompetisi (mis. 6 > 4)
    const badRes = await app.handle(
      new Request('http://localhost/api/v1/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${leaderToken}` },
        body: JSON.stringify({
          competitionSlug: compSlug,
          teamName: 'Tim Over Limit',
          targetMaxMembers: 6,
        }),
      })
    );
    expect(badRes.status).toBe(422);

    // Buat tim valid (targetMaxMembers = 3)
    const res = await app.handle(
      new Request('http://localhost/api/v1/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${leaderToken}` },
        body: JSON.stringify({
          competitionSlug: compSlug,
          teamName: 'Tim Riset Alpha Test',
          description: 'Mengembangkan riset teknologi tepat guna',
          neededRoles: ['Penulis Proposal', 'Analis Data'],
          recruitmentType: 'terbuka',
          targetMaxMembers: 3,
        }),
      })
    );
    expect(res.status).toBe(200);
    const team = ((await res.json()) as any).data;
    openTeamId = team.id;
    openTeamCode = team.inviteCode;
    expect(team.leaderId).toBe(leaderId);
    expect(team.recruitmentType).toBe('terbuka');
    expect(team.isRecruiting).toBe(true);
    expect(openTeamCode).toMatch(/^TLN-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    // Cek GET /teams/my untuk ketua: readiness Level 1 (dibuat), roadmap boleh diakses, belum siap seleksi
    const myRes = await app.handle(
      new Request('http://localhost/api/v1/teams/my', {
        headers: { Authorization: `Bearer ${leaderToken}` },
      })
    );
    expect(myRes.status).toBe(200);
    const myTeam = ((await myRes.json()) as any).data;
    expect(myTeam.isLeader).toBe(true);
    expect(myTeam.inviteCode).toBe(openTeamCode);
    expect(myTeam.readiness.level).toBe('dibuat');
    expect(myTeam.readiness.canAccessRoadmap).toBe(true);
    expect(myTeam.readiness.isSelectionReady).toBe(false);
  });

  it('4. Direktori tim terbuka menampilkan lowongan tanpa PII, mendukung filter, dan menyembunyikan tim privat', async () => {
    // Student E buat tim privat sementara untuk memastikan tidak muncul di direktori
    const privRes = await app.handle(
      new Request('http://localhost/api/v1/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentEToken}` },
        body: JSON.stringify({
          competitionSlug: compSlug,
          teamName: 'Tim Privat Rahasia',
          recruitmentType: 'privat',
        }),
      })
    );
    expect(privRes.status).toBe(200);
    const privTeam = ((await privRes.json()) as any).data;
    privateTeamId = privTeam.id;
    privateTeamCode = privTeam.inviteCode;
    expect(privTeam.isRecruiting).toBe(false);

    const dirRes = await app.handle(
      new Request(`http://localhost/api/v1/teams/directory?competitionSlug=${compSlug}&role=Analis`, {
        headers: { Authorization: `Bearer ${studentBToken}` },
      })
    );
    expect(dirRes.status).toBe(200);
    const payload = ((await dirRes.json()) as any).data;
    expect(payload.teams.some((t: any) => t.id === openTeamId)).toBe(true);
    expect(payload.teams.some((t: any) => t.id === privateTeamId)).toBe(false);

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain(`RECldr${suffix}`);
    expect(serialized).not.toContain('@unida.gontor.ac.id');
    expect(serialized).not.toContain('08123456');
  });

  it('5. Pelamar mengajukan bergabung, dapat membatalkan & mengajukan ulang; non-ketua ditolak (403) saat mencoba memproses', async () => {
    const req1 = await app.handle(
      new Request(`http://localhost/api/v1/teams/${openTeamId}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentBToken}` },
        body: JSON.stringify({ preferredRole: 'Analis Data', note: 'Siap bantu olah data' }),
      })
    );
    expect(req1.status).toBe(200);
    const jr1 = ((await req1.json()) as any).data;

    // Duplikat pengajuan saat masih menunggu -> 409
    const dupReq = await app.handle(
      new Request(`http://localhost/api/v1/teams/${openTeamId}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentBToken}` },
        body: JSON.stringify({ preferredRole: 'Analis Data' }),
      })
    );
    expect(dupReq.status).toBe(409);

    // Non-ketua (studentC) mencoba approve -> 403
    const illegalDecide = await app.handle(
      new Request(`http://localhost/api/v1/join-requests/${jr1.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentCToken}` },
        body: JSON.stringify({ action: 'disetujui' }),
      })
    );
    expect(illegalDecide.status).toBe(403);

    // Pelamar batalkan pengajuan sendiri -> lalu kirim ulang
    const cancelRes = await app.handle(
      new Request(`http://localhost/api/v1/join-requests/${jr1.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentBToken}` },
      })
    );
    expect(cancelRes.status).toBe(200);

    const req2 = await app.handle(
      new Request(`http://localhost/api/v1/teams/${openTeamId}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentBToken}` },
        body: JSON.stringify({ preferredRole: 'Analis Data', note: 'Pengajuan kedua' }),
      })
    );
    expect(req2.status).toBe(200);
    const jr2 = ((await req2.json()) as any).data;

    // Ketua menyetujui student B -> anggota menjadi 2/3
    const approveB = await app.handle(
      new Request(`http://localhost/api/v1/join-requests/${jr2.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${leaderToken}` },
        body: JSON.stringify({ action: 'disetujui' }),
      })
    );
    expect(approveB.status).toBe(200);

    // Anggota biasa (student B) mengakses GET /teams/my tidak melihat inviteCode & joinRequests, serta ditolak rotasi kode (403)
    const memberTeamRes = await app.handle(
      new Request('http://localhost/api/v1/teams/my', {
        headers: { Authorization: `Bearer ${studentBToken}` },
      })
    );
    const memberTeam = ((await memberTeamRes.json()) as any).data;
    expect(memberTeam.isLeader).toBe(false);
    expect(memberTeam.inviteCode).toBeNull();
    expect(memberTeam.joinRequests).toHaveLength(0);

    const illegalRotate = await app.handle(
      new Request(`http://localhost/api/v1/teams/${openTeamId}/invite-code/rotate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentBToken}` },
      })
    );
    expect(illegalRotate.status).toBe(403);
  });

  it('6. Concurrency batas maksimal (slot sisa 1): dua penerimaan serentak hanya meloloskan 1 orang & otomatis menutup rekrutmen', async () => {
    // Student C dan Student D sama-sama mengajukan ke openTeam (sisa 1 slot karena targetMaxMembers=3)
    const rc = await app.handle(
      new Request(`http://localhost/api/v1/teams/${openTeamId}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentCToken}` },
        body: JSON.stringify({ preferredRole: 'Desain UI' }),
      })
    );
    const rd = await app.handle(
      new Request(`http://localhost/api/v1/teams/${openTeamId}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentDToken}` },
        body: JSON.stringify({ preferredRole: 'Penulis Proposal' }),
      })
    );
    expect(rc.status).toBe(200);
    expect(rd.status).toBe(200);
    const jrC = ((await rc.json()) as any).data;
    const jrD = ((await rd.json()) as any).data;

    // Ketua menekan approve secara bersamaan
    const [resC, resD] = await Promise.all([
      app.handle(
        new Request(`http://localhost/api/v1/join-requests/${jrC.id}/decide`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${leaderToken}` },
          body: JSON.stringify({ action: 'disetujui' }),
        })
      ),
      app.handle(
        new Request(`http://localhost/api/v1/join-requests/${jrD.id}/decide`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${leaderToken}` },
          body: JSON.stringify({ action: 'disetujui' }),
        })
      ),
    ]);

    const statuses = [resC.status, resD.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409]);

    const teamInDb = await prisma.team.findUnique({
      where: { id: openTeamId },
      include: { members: { where: { status: 'active' } } },
    });
    expect(teamInDb?.members.length).toBe(3);
    expect(teamInDb?.status).toBe('terbentuk');
    expect(teamInDb?.isRecruiting).toBe(false);
  });

  it('7. Validasi 3 lapis kesiapan & pendaftaran seleksi internal (tertolak bila lintas prodi belum terpenuhi, lolos setelah lintas prodi terpenuhi)', async () => {
    const teamInDb = await prisma.team.findUnique({
      where: { id: openTeamId },
      include: { members: { where: { status: 'active' } } },
    });
    const hasStudentC = teamInDb?.members.some((m) => m.userId === studentCId);

    if (hasStudentC) {
      // Semua anggota (leader, B, C) dari Teknik Informatika -> gagal requireCrossStudyProgram (422)
      const failSel = await app.handle(
        new Request(`http://localhost/api/v1/teams/${openTeamId}/register-selection`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${leaderToken}` },
        })
      );
      expect(failSel.status).toBe(422);

      // Ketua keluarkan student C -> slot terbuka lagi -> student D (Agroteknologi) masuk lewat kode undangan
      const remRes = await app.handle(
        new Request(`http://localhost/api/v1/teams/${openTeamId}/members/${studentCId}/remove`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${leaderToken}` },
        })
      );
      expect(remRes.status).toBe(200);

      // Putar ulang kode undangan -> kode lama harus 404, kode baru berhasil join
      const rotRes = await app.handle(
        new Request(`http://localhost/api/v1/teams/${openTeamId}/invite-code/rotate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${leaderToken}` },
        })
      );
      expect(rotRes.status).toBe(200);
      const newCode = ((await rotRes.json()) as any).data.inviteCode;
      expect(newCode).not.toBe(openTeamCode);

      const oldCodeJoin = await app.handle(
        new Request('http://localhost/api/v1/teams/join-by-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentDToken}` },
          body: JSON.stringify({ inviteCode: openTeamCode }),
        })
      );
      expect(oldCodeJoin.status).toBe(404);

      const newCodeJoin = await app.handle(
        new Request('http://localhost/api/v1/teams/join-by-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentDToken}` },
          body: JSON.stringify({ inviteCode: newCode }),
        })
      );
      expect(newCodeJoin.status).toBe(200);
    }

    // Sekarang anggota = Leader (TI), B (TI), D (Agroteknologi) -> lintas prodi & peran wajib terpenuhi -> Daftar Seleksi Internal sukses
    const okSel = await app.handle(
      new Request(`http://localhost/api/v1/teams/${openTeamId}/register-selection`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${leaderToken}` },
      })
    );
    expect(okSel.status).toBe(200);
    const selData = ((await okSel.json()) as any).data;
    expect(selData.teamId).toBe(openTeamId);
    expect(selData.result).toBe('menunggu');
  });

  it('8. Cegah anggota aktif ganda & transfer ketua otomatis saat ketua keluar tim', async () => {
    // Student B yang sudah aktif di openTeam mencoba join ke privateTeam via kode -> 409
    const dupJoin = await app.handle(
      new Request('http://localhost/api/v1/teams/join-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentBToken}` },
        body: JSON.stringify({ inviteCode: privateTeamCode }),
      })
    );
    expect(dupJoin.status).toBe(409);

    // Ketua (leaderId) keluar dari openTeam -> kepemimpinan otomatis berpindah ke studentB (anggota paling awal)
    const leaveRes = await app.handle(
      new Request(`http://localhost/api/v1/teams/${openTeamId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${leaderToken}` },
      })
    );
    expect(leaveRes.status).toBe(200);
    const leaveData = ((await leaveRes.json()) as any).data;
    expect(leaveData.newLeaderId).toBe(studentBId);

    const updatedTeam = await prisma.team.findUnique({ where: { id: openTeamId } });
    expect(updatedTeam?.leaderId).toBe(studentBId);
    expect(updatedTeam?.status).toBe('mencari');

    // Student E (anggota tunggal privateTeam) keluar -> tim diarsipkan
    const leavePriv = await app.handle(
      new Request(`http://localhost/api/v1/teams/${privateTeamId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentEToken}` },
      })
    );
    expect(leavePriv.status).toBe(200);
    const archivedPriv = await prisma.team.findUnique({ where: { id: privateTeamId } });
    expect(archivedPriv?.status).toBe('arsip');
  });
});
