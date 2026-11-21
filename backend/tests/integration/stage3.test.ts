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

describe('Stage 3 — Mahasiswa, Kompetisi, Tim & Roadmap Integration Suite', () => {
  const app = createServer();
  const timeId = Date.now().toString().slice(-6);

  let institutionId = '';
  let student1Token = '';
  let student1Id = '';
  let student2Token = '';
  let student2Id = '';
  let student3Token = '';
  let student3Id = '';
  let student4Token = '';
  let student4Id = '';
  let validatorToken = '';
  let validatorId = '';
  let createdTeamId = '';

  beforeAll(async () => {
    const inst = await prisma.institution.upsert({
      where: { code: 'unida-gontor' },
      update: {},
      create: {
        code: 'unida-gontor',
        name: 'Universitas Darussalam Gontor',
      },
    });
    institutionId = inst.id;

    const passHash = await hashPassword('Password123!');

    // Buat Mahasiswa 1 (Hacker)
    const u1 = await prisma.user.create({
      data: {
        institutionId,
        email: `mhs1_${timeId}@unida.gontor.ac.id`,
        passwordHash: passHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `NIM1_${timeId}`,
            fullName: 'Ahmad Mahasiswa Satu',
            studyProgram: 'Teknik Informatika',
            faculty: 'Sains dan Teknologi',
            phone: '081234567801',
            rolesCapable: ['Hacker (Programmer)'],
            skills: [{ nama: 'React', level: 3 }, { nama: 'TypeScript', level: 3 }],
            interests: ['Web Development', 'AI'],
            availability: { hari: ['Senin', 'Rabu', 'Jumat'], jam: 6 },
          },
        },
      },
    });
    student1Id = u1.id;
    const s1 = await createSession(u1.id);
    student1Token = s1.token;

    // Buat Mahasiswa 2 (Hipster)
    const u2 = await prisma.user.create({
      data: {
        institutionId,
        email: `mhs2_${timeId}@unida.gontor.ac.id`,
        passwordHash: passHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `NIM2_${timeId}`,
            fullName: 'Budi Mahasiswa Dua',
            studyProgram: 'Teknik Informatika',
            faculty: 'Sains dan Teknologi',
            phone: '081234567802',
            rolesCapable: ['Hipster (UI/UX Designer)'],
            skills: [{ nama: 'Figma', level: 3 }, { nama: 'UI Design', level: 2 }],
            interests: ['Web Development', 'Design System'],
            availability: { hari: ['Senin', 'Selasa', 'Rabu'], jam: 5 },
          },
        },
      },
    });
    student2Id = u2.id;
    const s2 = await createSession(u2.id);
    student2Token = s2.token;

    // Buat Mahasiswa 3 (Hustler)
    const u3 = await prisma.user.create({
      data: {
        institutionId,
        email: `mhs3_${timeId}@unida.gontor.ac.id`,
        passwordHash: passHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `NIM3_${timeId}`,
            fullName: 'Candra Mahasiswa Tiga',
            studyProgram: 'Manajemen',
            faculty: 'Ekonomi dan Manajemen',
            rolesCapable: ['Hustler (Pitch/Product)'],
            skills: [{ nama: 'Business Model Canvas', level: 3 }],
            interests: ['Product Management'],
            availability: { hari: ['Rabu', 'Kamis'], jam: 4 },
          },
        },
      },
    });
    student3Id = u3.id;
    const s3 = await createSession(u3.id);
    student3Token = s3.token;

    // Buat Mahasiswa 4 (Candidate for Concurrency)
    const u4 = await prisma.user.create({
      data: {
        institutionId,
        email: `mhs4_${timeId}@unida.gontor.ac.id`,
        passwordHash: passHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `NIM4_${timeId}`,
            fullName: 'Doni Mahasiswa Empat',
            studyProgram: 'Teknik Informatika',
            faculty: 'Sains dan Teknologi',
            rolesCapable: ['Hustler (Pitch/Product)'],
          },
        },
      },
    });
    student4Id = u4.id;
    const s4 = await createSession(u4.id);
    student4Token = s4.token;

    // Buat Akun Validator
    const val = await prisma.user.create({
      data: {
        institutionId,
        email: `validator_${timeId}@unida.gontor.ac.id`,
        passwordHash: passHash,
        role: 'validator',
        status: 'active',
      },
    });
    validatorId = val.id;
    const sVal = await createSession(val.id);
    validatorToken = sVal.token;
  });

  afterAll(async () => {
    // Bersihkan data uji dengan urutan relasi foreign key yang aman
    const userIds = [student1Id, student2Id, student3Id, student4Id, validatorId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.roadmapProgress.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.teamInvite.deleteMany({
        where: { OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }] },
      });
      if (createdTeamId) {
        await prisma.internalSelection.deleteMany({ where: { teamId: createdTeamId } });
      }
      await prisma.teamMember.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.team.deleteMany({ where: { creatorId: { in: userIds } } });
      await prisma.studentTarget.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.auditEvent.deleteMany({ where: { actorId: { in: userIds } } });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
    await closeDatabase();
  });

  // 1. Katalog Kompetisi & Filter
  describe('1. Katalog & Detail Kompetisi', () => {
    it('GET /api/v1/competitions mengembalikan daftar kompetisi resmi yang berstatus published', async () => {
      const res = await app.handle(new Request('http://localhost/api/v1/competitions'));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);

      const gemastik = json.data.find((c: any) => c.slug === 'gemastik-2026');
      expect(gemastik).toBeDefined();
      expect(gemastik.name).toContain('Gemastik');
      expect(gemastik.maxTeamMembers).toBe(3);
    });

    it('Filter kategori teknologi mengembalikan hanya kompetisi teknologi', async () => {
      const res = await app.handle(new Request('http://localhost/api/v1/competitions?category=Teknologi'));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      for (const comp of json.data) {
        expect(comp.category).toBe('Teknologi');
      }
    });

    it('GET /api/v1/competitions/:slug mengembalikan detail kompetisi dengan benar', async () => {
      const res = await app.handle(new Request('http://localhost/api/v1/competitions/gemastik-2026'));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.slug).toBe('gemastik-2026');
      expect(json.data.format).toBe('beregu');
    });

    it('GET /api/v1/competitions/:slug mengembalikan 404 jika slug tidak ada', async () => {
      const res = await app.handle(new Request('http://localhost/api/v1/competitions/slug-tidak-ditemukan'));
      expect(res.status).toBe(404);
    });
  });

  // 2. Pemilihan Target Mahasiswa & Arsip Atomik
  describe('2. Pemilihan Target Kompetisi & Arsip Atomik', () => {
    it('POST /api/v1/me/target menetapkan target kompetisi aktif mahasiswa', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/me/target', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student1Token}`,
          },
          body: JSON.stringify({ slug: 'gemastik-2026' }),
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.status).toBe('active');
      expect(json.data.competition.slug).toBe('gemastik-2026');

      // Set target juga untuk student2, student3, dan student4
      await app.handle(
        new Request('http://localhost/api/v1/me/target', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student2Token}` },
          body: JSON.stringify({ slug: 'gemastik-2026' }),
        })
      );
      await app.handle(
        new Request('http://localhost/api/v1/me/target', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student3Token}` },
          body: JSON.stringify({ slug: 'gemastik-2026' }),
        })
      );
      await app.handle(
        new Request('http://localhost/api/v1/me/target', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student4Token}` },
          body: JSON.stringify({ slug: 'gemastik-2026' }),
        })
      );
    });

    it('GET /api/v1/me/target mengembalikan target aktif saat ini', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/me/target', {
          headers: { Authorization: `Bearer ${student1Token}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.competition.slug).toBe('gemastik-2026');
      expect(json.data.status).toBe('active');
    });

    it('Perpindahan target kompetisi secara atomik mengarsipkan target lama', async () => {
      // Mahasiswa 4 berganti target ke pkm-2026
      const res = await app.handle(
        new Request('http://localhost/api/v1/me/target', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student4Token}`,
          },
          body: JSON.stringify({ slug: 'pkm-2026' }),
        })
      );
      expect(res.status).toBe(200);

      // Verifikasi di basis data: target lama gemastik berstatus archived, target baru pkm berstatus active
      const targets = await prisma.studentTarget.findMany({
        where: { userId: student4Id },
        include: { competition: true },
      });
      const oldTarget = targets.find((t) => t.competition.slug === 'gemastik-2026');
      const newTarget = targets.find((t) => t.competition.slug === 'pkm-2026');

      expect(oldTarget?.status).toBe('archived');
      expect(newTarget?.status).toBe('active');

      // Kembalikan mahasiswa 4 ke gemastik-2026 untuk tes matching & concurrency nanti
      await app.handle(
        new Request('http://localhost/api/v1/me/target', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student4Token}` },
          body: JSON.stringify({ slug: 'gemastik-2026' }),
        })
      );
    });
  });

  // 3. Algoritma Matching Transparan & Privasi Tanpa PII
  describe('3. Matching Calon Partner & Privasi PII', () => {
    it('GET /api/v1/matching/candidates mengembalikan calon partner berdasar target sama & komplementer', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/matching/candidates', {
          headers: { Authorization: `Bearer ${student1Token}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(Array.isArray(json.data)).toBe(true);

      const candidate2 = json.data.find((c: any) => c.userId === student2Id);
      expect(candidate2).toBeDefined();
      expect(candidate2.skorKecocokan).toBeGreaterThanOrEqual(50);
      expect(candidate2.alasanKecocokan.length).toBeGreaterThan(0);
      expect(candidate2.labelKesesuaian).toBeDefined();
    });

    it('Output matching kandidat TIDAK memuat PII sensitif (NIM, email, no HP)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/matching/candidates', {
          headers: { Authorization: `Bearer ${student1Token}` },
        })
      );
      const json = (await res.json()) as any;
      for (const cand of json.data) {
        expect(cand.nim).toBeUndefined();
        expect(cand.email).toBeUndefined();
        expect(cand.phone).toBeUndefined();
        expect(cand.whatsappNumber).toBeUndefined();
      }
    });
  });

  // 4. Pembentukan Tim, Undangan & Limit
  describe('4. Pembuatan Tim & Manajemen Undangan', () => {
    let inviteToStudent2Id = '';

    it('POST /api/v1/teams membuat tim baru dengan pembuat otomatis menjadi ketua', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/teams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student1Token}`,
          },
          body: JSON.stringify({
            competitionSlug: 'gemastik-2026',
            teamName: 'Tim Alpha Unida',
            roleInTeam: 'Ketua Tim',
          }),
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      createdTeamId = json.data.id;
      expect(json.data.name).toBe('Tim Alpha Unida');
      expect(json.data.status).toBe('mencari');

      // Verifikasi membership di database
      const member = await prisma.teamMember.findFirst({
        where: { teamId: createdTeamId, userId: student1Id },
      });
      expect(member).toBeDefined();
      expect(member?.roleInTeam).toBe('Ketua Tim');
    });

    it('Tidak dapat membuat tim kedua pada kompetisi yang sama (Conflict 409)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/teams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student1Token}`,
          },
          body: JSON.stringify({
            competitionSlug: 'gemastik-2026',
            teamName: 'Tim Beta Unida',
          }),
        })
      );
      expect(res.status).toBe(409);
    });

    it('POST /api/v1/teams/:id/invites mengirim undangan ke rekan', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/teams/${createdTeamId}/invites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student1Token}`,
          },
          body: JSON.stringify({ receiverId: student2Id }),
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      inviteToStudent2Id = json.data.id;
      expect(json.data.status).toBe('diajukan');
    });

    it('Mengirim undangan duplikat ke mahasiswa yang sama gagal 409', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/teams/${createdTeamId}/invites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student1Token}`,
          },
          body: JSON.stringify({ receiverId: student2Id }),
        })
      );
      expect(res.status).toBe(409);
    });

    it('Anti-IDOR: Mahasiswa lain tidak dapat merespon undangan yang bukan miliknya', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/invites/${inviteToStudent2Id}/respond`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student3Token}`, // Mahasiswa 3 bukan penerima
          },
          body: JSON.stringify({ action: 'diterima' }),
        })
      );
      expect(res.status).toBe(404);
    });

    it('Penerima yang sah dapat menerima undangan dan resmi bergabung ke dalam tim', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/invites/${inviteToStudent2Id}/respond`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student2Token}`,
          },
          body: JSON.stringify({ action: 'diterima' }),
        })
      );
      expect(res.status).toBe(200);

      // Verifikasi student2 sekarang ada di tim
      const member = await prisma.teamMember.findFirst({
        where: { teamId: createdTeamId, userId: student2Id, status: 'active' },
      });
      expect(member).toBeDefined();
    });
  });

  // 5. Concurrency Race Condition Test (At most maxTeamMembers can join)
  describe('5. Concurrency Test — Kapasitas Maksimal Tim', () => {
    it('Dua mahasiswa merespon undangan secara serentak untuk 1 sisa slot tidak boleh melebihi maxTeamMembers', async () => {
      // Saat ini tim beranggotakan 2 orang (Student 1 dan Student 2)
      // Batas maksimal Gemastik adalah 3 orang (sisa 1 slot)
      const team = await prisma.team.findUnique({
        where: { id: createdTeamId },
        include: { members: { where: { status: 'active' } } },
      });
      expect(team?.members.length).toBe(2);

      // Kirim undangan ke Mahasiswa 3 dan Mahasiswa 4
      const resInv3 = await app.handle(
        new Request(`http://localhost/api/v1/teams/${createdTeamId}/invites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
          body: JSON.stringify({ receiverId: student3Id }),
        })
      );
      expect(resInv3.status).toBe(200);
      const inv3 = ((await resInv3.json()) as any).data;

      const resInv4 = await app.handle(
        new Request(`http://localhost/api/v1/teams/${createdTeamId}/invites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
          body: JSON.stringify({ receiverId: student4Id }),
        })
      );
      expect(resInv4.status).toBe(200);
      const inv4 = ((await resInv4.json()) as any).data;

      // Jalankan penerimaan undangan secara bersamaan menggunakan Promise.all
      const [res3, res4] = await Promise.all([
        app.handle(
          new Request(`http://localhost/api/v1/invites/${inv3.id}/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student3Token}` },
            body: JSON.stringify({ action: 'diterima' }),
          })
        ),
        app.handle(
          new Request(`http://localhost/api/v1/invites/${inv4.id}/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student4Token}` },
            body: JSON.stringify({ action: 'diterima' }),
          })
        ),
      ]);

      const statuses = [res3.status, res4.status];
      // Tepat satu yang berhasil (200), dan satu ditolak karena kapasitas penuh (409)
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);

      // Verifikasi final di basis data: anggota aktif tepat 3 orang (tidak pernah tembus 4)
      const updatedMembers = await prisma.teamMember.findMany({
        where: { teamId: team!.id, status: 'active' },
      });
      expect(updatedMembers.length).toBe(3);

      // Status tim harus menjadi 'terbentuk' karena telah memenuhi minTeamMembers (3)
      const updatedTeam = await prisma.team.findUnique({
        where: { id: team!.id },
      });
      expect(updatedTeam?.status).toBe('terbentuk');
    });
  });

  // 6. Meninggalkan Tim
  describe('6. Meninggalkan Tim (Leave Team)', () => {
    it('Mahasiswa 2 dapat meninggalkan tim secara mandiri', async () => {
      const myTeamRes = await app.handle(
        new Request('http://localhost/api/v1/teams/my', {
          headers: { Authorization: `Bearer ${student2Token}` },
        })
      );
      const team = ((await myTeamRes.json()) as any).data;

      const res = await app.handle(
        new Request(`http://localhost/api/v1/teams/${team.id}/leave`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${student2Token}` },
        })
      );
      expect(res.status).toBe(200);

      // Verifikasi status membership di database menjadi 'left'
      const mem = await prisma.teamMember.findFirst({
        where: { teamId: team.id, userId: student2Id },
      });
      expect(mem?.status).toBe('left');
    });
  });

  // 7. Roadmap & Progress Checklist
  describe('7. Roadmap Kurikulum & Checklist Persiapan', () => {
    it('GET /api/v1/roadmaps/:slug mengembalikan silabus kurikulum roadmap', async () => {
      const res = await app.handle(new Request('http://localhost/api/v1/roadmaps/gemastik-2026'));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.competitionSlug).toBe('gemastik-2026');
      expect(Array.isArray(json.data.fase)).toBe(true);
      expect(json.data.fase.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/v1/roadmaps/:slug/checklist mencentang progres checklist secara persisten', async () => {
      const toggleRes = await app.handle(
        new Request('http://localhost/api/v1/roadmaps/gemastik-2026/checklist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student1Token}`,
          },
          body: JSON.stringify({ taskId: 'p0-l0' }),
        })
      );
      expect(toggleRes.status).toBe(200);
      const json = (await toggleRes.json()) as any;
      expect(json.data['p0-l0']).toBe(true);

      // Toggle ulang untuk membatalkan centang (flip to false)
      const untoggleRes = await app.handle(
        new Request('http://localhost/api/v1/roadmaps/gemastik-2026/checklist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student1Token}`,
          },
          body: JSON.stringify({ taskId: 'p0-l0' }),
        })
      );
      expect(untoggleRes.status).toBe(200);
      const unjson = (await untoggleRes.json()) as any;
      expect(unjson.data['p0-l0']).toBe(false);
    });
  });

  // 8. Kontak Konsultan WhatsApp Resmi
  describe('8. Kontak Dosen Pembimbing / Konsultan Terverifikasi', () => {
    it('GET /api/v1/consultants mengembalikan kontak resmi pembimbing', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/consultants?slug=gemastik-2026')
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);

      const contact = json.data[0];
      expect(contact.name).toBeDefined();
      expect(contact.whatsappNumber).toBeDefined();
      expect(contact.isApproved).toBe(true);
    });
  });

  // 9. Validator & Admin RBAC Protection
  describe('9. Otorisasi Validator pada Admin Endpoints', () => {
    it('Mahasiswa dilarang membuat kompetisi admin (403 Forbidden)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/admin/competitions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student1Token}`,
          },
          body: JSON.stringify({
            name: 'Lomba Baru Uji',
            organizer: 'BPTI',
            category: 'Teknologi',
            level: 'nasional',
            format: 'beregu',
            description: 'Deskripsi uji',
          }),
        })
      );
      expect(res.status).toBe(403);
    });

    it('Validator berhasil memperbarui kontak konsultan kompetisi', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/admin/consultants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validatorToken}`,
          },
          body: JSON.stringify({
            competitionSlug: 'gemastik-2026',
            name: 'Dosen Pembimbing Uji Coba',
            field: 'AI & Data Science',
            whatsappNumber: '628999888777',
            capacityNote: 'Konsultasi online via zoom/wa',
          }),
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.name).toBe('Dosen Pembimbing Uji Coba');
    });
  });

  describe('10. Seleksi Internal', () => {
    it('Validator mencatat hasil seleksi dan mengunci tim yang lolos setelah konfirmasi panitia', async () => {
      const competition = await prisma.competition.findUniqueOrThrow({ where: { slug: 'gemastik-2026' } });
      const res = await app.handle(new Request('http://localhost/api/v1/admin/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validatorToken}` },
        body: JSON.stringify({
          competitionId: competition.id,
          teamId: createdTeamId,
          stage: 'Presentasi',
          result: 'lolos',
          organizerVerified: true,
        }),
      }));
      expect(res.status).toBe(200);
      const team = await prisma.team.findUniqueOrThrow({ where: { id: createdTeamId } });
      expect(team.status).toBe('terkunci_seleksi');
    });

    it('Mahasiswa tidak dapat mengakses daftar seleksi internal', async () => {
      const res = await app.handle(new Request('http://localhost/api/v1/admin/selections', {
        headers: { Authorization: `Bearer ${student1Token}` },
      }));
      expect(res.status).toBe(403);
    });
  });
});
