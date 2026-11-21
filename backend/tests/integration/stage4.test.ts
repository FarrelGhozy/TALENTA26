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

describe('Stage 4 — Prestasi, Bukti Privat RustFS/S3, Verifikasi & Ranking Integration Suite', () => {
  const app = createServer();
  const timeId = Date.now().toString().slice(-6);

  let institutionId = '';
  let periodId = '';
  let student1Token = '';
  let student1Id = '';
  let student2Token = '';
  let student2Id = '';
  let validatorToken = '';
  let validatorId = '';
  let superAdminToken = '';
  let superAdminId = '';

  let createdAchievementId = '';
  let evidenceId = '';

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

    // 2. Periode Akademik
    const period = await prisma.academicPeriod.upsert({
      where: { id: `period-2026-${timeId}` },
      update: {},
      create: {
        id: `period-2026-${timeId}`,
        institutionId,
        name: `Tahun Akademik 2026 Genap ${timeId}`,
        year: 2026,
        semester: 'genap',
        isActive: true,
      },
    });
    periodId = period.id;

    // Nonaktifkan periode lain agar periode ini yang aktif
    await prisma.academicPeriod.updateMany({
      where: { institutionId, id: { not: periodId } },
      data: { isActive: false },
    });

    // 3. Pasang PointRule versi 1 jika belum ada
    const pointMatrix = [
      { level: 'lokal', result: 'juara_1', points: 8 },
      { level: 'nasional', result: 'juara_1', points: 18 },
      { level: 'nasional', result: 'juara_2', points: 14 },
      { level: 'internasional', result: 'juara_1', points: 30 },
    ];
    for (const r of pointMatrix) {
      await prisma.pointRule.upsert({
        where: {
          institutionId_version_level_result: {
            institutionId,
            version: 1,
            level: r.level as any,
            result: r.result as any,
          },
        },
        update: { points: r.points, isActive: true },
        create: {
          institutionId,
          version: 1,
          level: r.level as any,
          result: r.result as any,
          points: r.points,
          isActive: true,
        },
      });
    }

    const passHash = await hashPassword('Password123!');

    // 4. Mahasiswa 1 (Peraih Juara 1 Nasional)
    const u1 = await prisma.user.create({
      data: {
        institutionId,
        email: `mhs1_st4_${timeId}@unida.gontor.ac.id`,
        passwordHash: passHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `NIM1_ST4_${timeId}`,
            fullName: 'Ahmad Bintang Prestasi',
            studyProgram: 'Teknik Informatika',
            faculty: 'Sains dan Teknologi',
          },
        },
      },
    });
    student1Id = u1.id;
    const s1 = await createSession(u1.id);
    student1Token = s1.token;

    // 5. Mahasiswa 2 (Anti-IDOR test)
    const u2 = await prisma.user.create({
      data: {
        institutionId,
        email: `mhs2_st4_${timeId}@unida.gontor.ac.id`,
        passwordHash: passHash,
        role: 'mahasiswa',
        status: 'active',
        studentProfile: {
          create: {
            nim: `NIM2_ST4_${timeId}`,
            fullName: 'Budi Kurniawan',
            studyProgram: 'Manajemen',
            faculty: 'Ekonomi dan Manajemen',
          },
        },
      },
    });
    student2Id = u2.id;
    const s2 = await createSession(u2.id);
    student2Token = s2.token;

    // 6. Validator
    const uVal = await prisma.user.create({
      data: {
        institutionId,
        email: `val_st4_${timeId}@unida.gontor.ac.id`,
        passwordHash: passHash,
        role: 'validator',
        status: 'active',
      },
    });
    validatorId = uVal.id;
    const sVal = await createSession(uVal.id);
    validatorToken = sVal.token;

    // 7. Super Admin
    const uAdmin = await prisma.user.create({
      data: {
        institutionId,
        email: `admin_st4_${timeId}@unida.gontor.ac.id`,
        passwordHash: passHash,
        role: 'super_admin',
        status: 'active',
      },
    });
    superAdminId = uAdmin.id;
    const sAdmin = await createSession(uAdmin.id);
    superAdminToken = sAdmin.token;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  // ==============================================================
  // Bagian 1: Validasi Masukan & Batasan Berkas (8 MB max, format, jumlah)
  // ==============================================================
  describe('1. Validasi Masukan Pengajuan Prestasi', () => {
    it('Harus menolak pengajuan dengan nama kegiatan < 3 karakter (422)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/me/achievements', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${student1Token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nama: 'AB',
            penyelenggara: 'Kemendikbud',
            tanggal: '2026-05-10',
            kategori: 'kompetisi',
            tingkat: 'nasional',
            jenisCapaian: 'juara_1',
            files: [{ name: 'sertifikat.pdf', type: 'application/pdf', buffer: 'dGVzdA==' }],
          }),
        })
      );
      expect(res.status).toBe(422);
    });

    it('Harus menolak pengajuan dengan tanggal di masa depan (422)', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const res = await app.handle(
        new Request('http://localhost/api/v1/me/achievements', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${student1Token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nama: 'Lomba Desain Nasional',
            penyelenggara: 'Kemendikbud',
            tanggal: futureDate.toISOString().split('T')[0],
            kategori: 'kompetisi',
            tingkat: 'nasional',
            jenisCapaian: 'juara_1',
            files: [{ name: 'sertifikat.pdf', type: 'application/pdf', buffer: 'dGVzdA==' }],
          }),
        })
      );
      expect(res.status).toBe(422);
    });

    it('Harus menolak pengajuan tanpa berkas bukti sama sekali (422)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/me/achievements', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${student1Token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nama: 'Lomba Desain Nasional',
            penyelenggara: 'Kemendikbud',
            tanggal: '2026-05-10',
            kategori: 'kompetisi',
            tingkat: 'nasional',
            jenisCapaian: 'juara_1',
            files: [],
          }),
        })
      );
      expect(res.status).toBe(422);
    });

    it('Harus menolak pengajuan dengan format berkas bukan PDF/JPG/PNG (422)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/me/achievements', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${student1Token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nama: 'Lomba Desain Nasional',
            penyelenggara: 'Kemendikbud',
            tanggal: '2026-05-10',
            kategori: 'kompetisi',
            tingkat: 'nasional',
            jenisCapaian: 'juara_1',
            files: [{ name: 'malware.exe', type: 'application/x-msdownload', buffer: 'dGVzdA==' }],
          }),
        })
      );
      expect(res.status).toBe(422);
    });

    it('Harus menolak berkas bukti yang melebihi batas 8 MB (422)', async () => {
      // 8.5 MB buffer
      const largeBuffer = Buffer.alloc(8.5 * 1024 * 1024, 0);

      const res = await app.handle(
        new Request('http://localhost/api/v1/me/achievements', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${student1Token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nama: 'Lomba Desain Nasional',
            penyelenggara: 'Kemendikbud',
            tanggal: '2026-05-10',
            kategori: 'kompetisi',
            tingkat: 'nasional',
            jenisCapaian: 'juara_1',
            files: [
              {
                name: 'sertifikat-terlalu-besar.pdf',
                type: 'application/pdf',
                size: largeBuffer.length,
                buffer: largeBuffer.toString('base64'),
              },
            ],
          }),
        })
      );
      expect(res.status).toBe(422);
      const json = (await res.json()) as any;
      expect(json.error.message).toContain('8 MB');
    });

    it('Harus menolak jika berkas bukti lebih dari 3 berkas (422)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/me/achievements', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${student1Token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nama: 'Lomba Desain Nasional',
            penyelenggara: 'Kemendikbud',
            tanggal: '2026-05-10',
            kategori: 'kompetisi',
            tingkat: 'nasional',
            jenisCapaian: 'juara_1',
            files: [
              { name: 'b1.pdf', type: 'application/pdf', buffer: 'dGVzdA==' },
              { name: 'b2.pdf', type: 'application/pdf', buffer: 'dGVzdA==' },
              { name: 'b3.pdf', type: 'application/pdf', buffer: 'dGVzdA==' },
              { name: 'b4.pdf', type: 'application/pdf', buffer: 'dGVzdA==' },
            ],
          }),
        })
      );
      expect(res.status).toBe(422);
    });
  });

  // ==============================================================
  // Bagian 2: Pengajuan Mandiri Berhasil & Penyimpanan Bukti Privat
  // ==============================================================
  describe('2. Pengajuan Prestasi Berhasil & Penyimpanan Bukti', () => {
    it('Mahasiswa 1 berhasil mengajukan prestasi lomba dengan bukti sertifikat PDF (200 OK)', async () => {
      const dummyPdfContent = Buffer.from('%PDF-1.4 Sertifikat Juara 1 Gemastik UNIDA 2026');

      const res = await app.handle(
        new Request('http://localhost/api/v1/me/achievements', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${student1Token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nama: 'Gemastik Divisi UX Design 2026',
            penyelenggara: 'Puspresnas / Belmawa Kemendikbud',
            kategori: 'kompetisi',
            tingkat: 'nasional',
            jenisCapaian: 'juara_1',
            tanggal: '2026-05-10',
            deskripsi: 'Meraih medali emas kategori UX Design tingkat nasional.',
            files: [
              {
                name: 'sertifikat_juara1_gemastik.pdf',
                type: 'application/pdf',
                size: dummyPdfContent.length,
                buffer: dummyPdfContent.toString('base64'),
              },
            ],
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data).toBeDefined();
      expect(json.data.status).toBe('menunggu');
      expect(json.data.version).toBe(1);

      createdAchievementId = json.data.id;
    });

    it('Mahasiswa 1 dapat melihat daftar dan detail prestasi miliknya (200 OK)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/me/achievements', {
          headers: { Authorization: `Bearer ${student1Token}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);

      const item = json.data.find((a: any) => a.id === createdAchievementId);
      expect(item).toBeDefined();
      expect(item.evidences.length).toBe(1);
      evidenceId = item.evidences[0].id;
    });

    it('Deteksi potensi duplikat: Pengajuan kedua dengan nama dan tanggal sama diberi peringatan', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/me/achievements', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${student1Token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nama: 'Gemastik Divisi UX Design 2026',
            penyelenggara: 'Puspresnas / Belmawa Kemendikbud',
            kategori: 'kompetisi',
            tingkat: 'nasional',
            jenisCapaian: 'juara_1',
            tanggal: '2026-05-10',
            files: [
              {
                name: 'sertifikat2.pdf',
                type: 'application/pdf',
                size: 100,
                buffer: Buffer.from('%PDF-1.4 duplicate test').toString('base64'),
              },
            ],
          }),
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.warning).toBeDefined();
      expect(json.data.warning).toContain('serupa');
    });
  });

  // ==============================================================
  // Bagian 3: Anti-IDOR pada Berkas Bukti Privat
  // ==============================================================
  describe('3. Anti-IDOR & Pengunduhan Bukti Terotorisasi', () => {
    it('Mahasiswa 2 dilarang mengunduh berkas bukti milik Mahasiswa 1 (403 Forbidden)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/evidence/${evidenceId}/download`, {
          headers: { Authorization: `Bearer ${student2Token}` },
        })
      );
      expect(res.status).toBe(403);
    });

    it('Mahasiswa 1 (pemilik sah) dapat mengunduh berkas bukti miliknya (200 OK)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/evidence/${evidenceId}/download`, {
          headers: { Authorization: `Bearer ${student1Token}` },
        })
      );
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('pdf');
      const buf = await res.arrayBuffer();
      expect(buf.byteLength).toBeGreaterThan(0);
    });

    it('Validator dapat mengunduh berkas bukti mahasiswa untuk verifikasi (200 OK)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/evidence/${evidenceId}/download`, {
          headers: { Authorization: `Bearer ${validatorToken}` },
        })
      );
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('pdf');
    });

    it('Permintaan unduh tanpa token autentikasi ditolak (401 Unauthorized)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/evidence/${evidenceId}/download`)
      );
      expect(res.status).toBe(401);
    });
  });

  // ==============================================================
  // Bagian 4: Alur Verifikasi Validator & Optimistic Locking Concurrency
  // ==============================================================
  describe('4. Verifikasi Validator, Revisi & Concurrency Control', () => {
    it('Validator melihat antrean pengajuan di portal admin (200 OK)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/admin/achievements?status=menunggu', {
          headers: { Authorization: `Bearer ${validatorToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(Array.isArray(json.data)).toBe(true);
      const target = json.data.find((a: any) => a.id === createdAchievementId);
      expect(target).toBeDefined();
      expect(target.user.studentProfile.fullName).toBe('Ahmad Bintang Prestasi');
    });

    it('Validator meminta perbaikan (request_changes) tanpa catatan wajib ditolak (422)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/admin/achievements/${createdAchievementId}/decisions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validatorToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'request_changes',
            reason: '', // kosong
            version: 1,
          }),
        })
      );
      expect(res.status).toBe(422);
    });

    it('Validator berhasil meminta perbaikan dengan catatan resmi (200 OK)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/admin/achievements/${createdAchievementId}/decisions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validatorToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'request_changes',
            reason: 'Lampiran sertifikat kurang jelas, mohon unggah SK pemenang rektorat pendukung.',
            version: 1,
          }),
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.status).toBe('perlu_perbaikan');
      expect(json.data.version).toBe(2);
    });

    it('Mahasiswa mengirim revisi dengan melampirkan berkas SK baru (200 OK)', async () => {
      const skBuffer = Buffer.from('%PDF-1.4 SK Pemenang Rektorat');
      const res = await app.handle(
        new Request(`http://localhost/api/v1/me/achievements/${createdAchievementId}/revisions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${student1Token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            note: 'Telah dilampirkan SK Pemenang dari Rektorat sesuai arahan validator.',
            files: [
              {
                name: 'sk_rektorat_gemastik.pdf',
                type: 'application/pdf',
                size: skBuffer.length,
                buffer: skBuffer.toString('base64'),
              },
            ],
          }),
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.status).toBe('menunggu');
      expect(json.data.version).toBe(3); // version naik menjadi 3
    });

    it('Uji Konkurensi: Dua validator memutuskan serentak dengan version yang sama -> tepat 1 berhasil, 1 konflik 409', async () => {
      // Current version adalah 3
      const [res1, res2] = await Promise.all([
        app.handle(
          new Request(`http://localhost/api/v1/admin/achievements/${createdAchievementId}/decisions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${validatorToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'approve',
              reason: 'Berkas telah lengkap dan sah.',
              version: 3,
            }),
          })
        ),
        app.handle(
          new Request(`http://localhost/api/v1/admin/achievements/${createdAchievementId}/decisions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${superAdminToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'reject',
              reason: 'Data meragukan.',
              version: 3,
            }),
          })
        ),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);
    });
  });

  // ==============================================================
  // Bagian 5: Kalkulasi Poin Lomba vs Non-Lomba & Ledger Poin
  // ==============================================================
  describe('5. Kalkulasi Poin & Mutasi Buku Besar (PointLedger)', () => {
    it('Prestasi lomba disetujui (Nasional Juara 1) otomatis menghasilkan 18 poin di PointLedger', async () => {
      const ledgerEntry = await prisma.pointLedger.findFirst({
        where: {
          achievementId: createdAchievementId,
          type: 'award',
        },
      });

      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry?.points).toBe(18); // Sesuai aturan PointRule versi 1: nasional + juara_1 = 18 poin
      expect(ledgerEntry?.userId).toBe(student1Id);
    });

    it('Prestasi kategori non-lomba (Konferensi Ilmiah) disetujui -> menghasilkan 0 poin di PointLedger', async () => {
      // 1. Buat pengajuan konferensi
      const createRes = await app.handle(
        new Request('http://localhost/api/v1/me/achievements', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${student1Token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nama: 'International Conference on Science & Technology (ICST 2026)',
            penyelenggara: 'IEEE Indonesia Section',
            kategori: 'konferensi',
            tingkat: 'internasional',
            jenisCapaian: 'juara_1',
            tanggal: '2026-06-01',
            files: [
              {
                name: 'best_paper_certificate.pdf',
                type: 'application/pdf',
                size: 200,
                buffer: Buffer.from('%PDF-1.4 conference certificate').toString('base64'),
              },
            ],
          }),
        })
      );
      expect(createRes.status).toBe(200);
      const confAch = ((await createRes.json()) as any).data;

      // 2. Setujui pengajuan konferensi
      const approveRes = await app.handle(
        new Request(`http://localhost/api/v1/admin/achievements/${confAch.id}/decisions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validatorToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'approve',
            version: 1,
          }),
        })
      );
      expect(approveRes.status).toBe(200);

      // 3. Verifikasi PointLedger tidak menambah poin lomba untuk konferensi
      const confLedger = await prisma.pointLedger.findFirst({
        where: { achievementId: confAch.id },
      });
      expect(confLedger).toBeNull();
    });
  });

  // ==============================================================
  // Bagian 6: Koreksi Keputusan & Pembalikan Poin Transparan
  // ==============================================================
  describe('6. Alur Koreksi Keputusan (Correction Flow)', () => {
    it('Validator/Super Admin dapat mengoreksi prestasi yang disetujui dengan alasan wajib (200 OK)', async () => {
      const achBefore = await prisma.achievement.findUnique({
        where: { id: createdAchievementId },
      });

      const res = await app.handle(
        new Request(`http://localhost/api/v1/admin/achievements/${createdAchievementId}/corrections`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validatorToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: 'Klarifikasi panitia pusat: nama mahasiswa tercatat sebagai finalis, bukan juara 1.',
            version: achBefore?.version,
            targetStatus: 'perlu_perbaikan',
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.status).toBe('perlu_perbaikan');

      // Verifikasi entry reversal (-18 poin) dibuat di PointLedger
      const reversalEntry = await prisma.pointLedger.findFirst({
        where: {
          achievementId: createdAchievementId,
          type: 'reversal',
        },
      });
      expect(reversalEntry).toBeDefined();
      expect(reversalEntry?.points).toBe(-18);
    });

    it('Koreksi tanpa alasan ditolak (422)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/admin/achievements/${createdAchievementId}/corrections`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validatorToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: '', // kosong
          }),
        })
      );
      expect(res.status).toBe(422);
    });
  });

  // ==============================================================
  // Bagian 7: Mesin Ranking Publik & Perlindungan Privasi (Bebas PII)
  // ==============================================================
  describe('7. Ranking Publik & Perlindungan Privasi PII', () => {
    beforeAll(async () => {
      // Setujui kembali prestasi Mahasiswa 1 agar memiliki poin di ranking
      const ach = await prisma.achievement.findUnique({
        where: { id: createdAchievementId },
      });
      await app.handle(
        new Request(`http://localhost/api/v1/admin/achievements/${createdAchievementId}/decisions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validatorToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'approve',
            version: ach?.version,
          }),
        })
      );
    });

    it('Ranking periode berjalan kosong saat tidak ada periode aktif dan tidak mencampur histori', async () => {
      await prisma.academicPeriod.updateMany({ where: { institutionId }, data: { isActive: false } });
      try {
        const res = await app.handle(new Request('http://localhost/api/v1/ranking'));
        expect(res.status).toBe(200);
        const json = (await res.json()) as any;
        expect(json.data.period).toBeNull();
        expect(json.data.ranking).toEqual([]);

        const historical = await app.handle(new Request(`http://localhost/api/v1/ranking?periodId=${periodId}`));
        expect(historical.status).toBe(200);
        const historicalJson = (await historical.json()) as any;
        expect(historicalJson.data.period.id).toBe(periodId);
      } finally {
        await prisma.academicPeriod.update({ where: { id: periodId }, data: { isActive: true } });
      }
    });

    it('GET /api/v1/ranking mengembalikan daftar ranking aktif berdasar akumulasi poin (200 OK)', async () => {
      const res = await app.handle(new Request('http://localhost/api/v1/ranking'));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data.ranking)).toBe(true);
      expect(json.data.ranking.length).toBeGreaterThanOrEqual(1);

      const topRank = json.data.ranking[0];
      expect(topRank.rank).toBe(1);
      expect(topRank.points).toBeGreaterThan(0);
      expect(topRank.fullName).toBe('Ahmad Bintang Prestasi');
      expect(topRank.studyProgram).toBe('Teknik Informatika');
    });

    it('Jaminan Keamanan & Privasi PII: Output ranking publik TIDAK memuat NIM, email, nomor telepon, atau URL berkas', async () => {
      const res = await app.handle(new Request('http://localhost/api/v1/ranking'));
      const text = await res.text();

      // Pastikan tidak ada NIM atau email pribadi
      expect(text).not.toContain(`NIM1_ST4_${timeId}`);
      expect(text).not.toContain(`mhs1_st4_${timeId}@unida.gontor.ac.id`);
      expect(text).not.toContain('081234');
      expect(text).not.toContain('objectKey');
      expect(text).not.toContain('sertifikat_juara1_gemastik.pdf');
    });

    it('GET /api/v1/ranking/lifetime mengembalikan agregasi sepanjang waktu (200 OK)', async () => {
      const res = await app.handle(new Request('http://localhost/api/v1/ranking/lifetime'));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.period.id).toBe('lifetime');
      expect(json.data.ranking.length).toBeGreaterThanOrEqual(1);
    });
  });
});
