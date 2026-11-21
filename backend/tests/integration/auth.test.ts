import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { createServer } from '../../src/app/server';
import { prisma, closeDatabase } from '../../src/lib/prisma';

// Pastikan koneksi mengarah ke database test via variabel terpecah
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = '';
process.env.DB_NAME = 'talenta_test';
process.env.NODE_ENV = 'test';

describe('Stage 2 — Backend Auth, RBAC & Profile Test Suite', () => {
  const app = createServer();
  const testNim = `TEST${Date.now().toString().slice(-6)}`;
  const testEmail = `mhs_${Date.now()}@unida.gontor.ac.id`;
  const testPassword = 'PasswordMhs123!';
  let mhsToken = '';
  let mhsUserId = '';

  beforeAll(async () => {
    // Pastikan institusi terdaftar di database test
    await prisma.institution.upsert({
      where: { code: 'unida-gontor' },
      update: {},
      create: {
        code: 'unida-gontor',
        name: 'Universitas Darussalam Gontor',
      },
    });
  });

  afterAll(async () => {
    // Bersihkan data tes secara aman
    if (mhsUserId) {
      await prisma.user.deleteMany({ where: { id: mhsUserId } });
    }
    await closeDatabase();
  });

  // 1. Health Checks
  describe('Health Endpoints', () => {
    it('GET /health/live harus mengembalikan status ok 200', async () => {
      const res = await app.handle(new Request('http://localhost/health/live'));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.status).toBe('ok');
    });

    it('GET /health/ready harus mengembalikan database connected 200', async () => {
      const res = await app.handle(new Request('http://localhost/health/ready'));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.status).toBe('ready');
      expect(json.data.database).toBe('connected');
    });
  });

  // 2. Registrasi Mahasiswa
  describe('Pendaftaran Mahasiswa (Register)', () => {
    it('Harus berhasil mendaftarkan mahasiswa baru dengan data lengkap', async () => {
      const payload = {
        email: testEmail,
        password: testPassword,
        nim: testNim,
        fullName: 'Mahasiswa Uji Coba',
        studyProgram: 'Teknik Informatika',
        faculty: 'Sains dan Teknologi',
        phone: '081234567890',
      };

      const res = await app.handle(
        new Request('http://localhost/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.token).toBeDefined();
      expect(json.data.user.email).toBe(testEmail);
      expect(json.data.user.role).toBe('mahasiswa');
      expect(json.data.user.studentProfile.nim).toBe(testNim);

      mhsToken = json.data.token;
      mhsUserId = json.data.user.id;
    });

    it('Harus menolak pendaftaran dengan email yang sama (409 Conflict)', async () => {
      const payload = {
        email: testEmail,
        password: testPassword,
        nim: `OTHER${Date.now().toString().slice(-4)}`,
        fullName: 'Mahasiswa Duplikat Email',
        studyProgram: 'Teknik Informatika',
        faculty: 'Sains dan Teknologi',
      };

      const res = await app.handle(
        new Request('http://localhost/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      );

      expect(res.status).toBe(409);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('CONFLICT');
    });

    it('Harus menolak pendaftaran dengan NIM yang sama (409 Conflict)', async () => {
      const payload = {
        email: `other_${Date.now()}@unida.gontor.ac.id`,
        password: testPassword,
        nim: testNim,
        fullName: 'Mahasiswa Duplikat NIM',
        studyProgram: 'Teknik Informatika',
        faculty: 'Sains dan Teknologi',
      };

      const res = await app.handle(
        new Request('http://localhost/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      );

      expect(res.status).toBe(409);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('CONFLICT');
    });

    it('Harus menolak pendaftaran dengan password kurang dari 8 karakter (422)', async () => {
      const payload = {
        email: `short_${Date.now()}@unida.gontor.ac.id`,
        password: 'short',
        nim: `SHT${Date.now().toString().slice(-4)}`,
        fullName: 'Mahasiswa Password Pendek',
        studyProgram: 'Teknik Informatika',
        faculty: 'Sains dan Teknologi',
      };

      const res = await app.handle(
        new Request('http://localhost/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      );

      expect(res.status).toBe(422);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // 3. Login & Sesi
  describe('Login & Sesi Pengguna', () => {
    it('Harus berhasil login dengan kredensial yang valid', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail, password: testPassword }),
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.token).toBeDefined();
      expect(json.data.user.email).toBe(testEmail);
      mhsToken = json.data.token;
    });

    it('Cookie HttpOnly dari login dapat dipakai tanpa bearer token', async () => {
      const loginRes = await app.handle(new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      }));
      expect(loginRes.status).toBe(200);
      const setCookie = loginRes.headers.get('set-cookie') || '';
      expect(setCookie).toContain('talenta_session=');
      expect(setCookie.toLowerCase()).toContain('httponly');
      const cookie = setCookie.split(';')[0];
      const meRes = await app.handle(new Request('http://localhost/api/v1/auth/me', {
        headers: { Cookie: cookie },
      }));
      expect(meRes.status).toBe(200);
    });

    it('Mutasi dari origin lain ditolak walaupun sesi valid', async () => {
      const res = await app.handle(new Request('http://localhost/api/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}`, Origin: 'https://evil.example' },
      }));
      expect(res.status).toBe(403);
    });

    it('Mutasi dengan cookie tanpa Origin ditolak', async () => {
      const login = await app.handle(new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      }));
      const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
      const res = await app.handle(new Request('http://localhost/api/v1/auth/logout', {
        method: 'POST',
        headers: { Cookie: cookie },
      }));
      expect(res.status).toBe(403);
    });

    it('Harus menolak login dengan password salah (401)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail, password: 'PasswordSalahTotal!' }),
        })
      );

      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('Harus menolak login dengan email yang tidak terdaftar (401)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'tidak_ada_user_ini@unida.gontor.ac.id',
            password: 'AnyPassword123!',
          }),
        })
      );

      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('UNAUTHORIZED');
    });
  });

  // 4. Endpoint Terautentikasi (GET /auth/me)
  describe('GET /api/v1/auth/me', () => {
    it('Harus mengembalikan 401 jika diakses tanpa header Authorization', async () => {
      const res = await app.handle(new Request('http://localhost/api/v1/auth/me'));
      expect(res.status).toBe(401);
    });

    it('Harus mengembalikan identitas pengguna jika token valid', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${mhsToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.email).toBe(testEmail);
      expect(json.data.role).toBe('mahasiswa');
      expect(json.data.studentProfile.nim).toBe(testNim);
    });
  });

  // 5. Profil Mahasiswa (Anti-IDOR & RBAC)
  describe('Profil Mahasiswa (GET & PATCH /api/v1/me/profile)', () => {
    it('Mahasiswa dapat melihat profil dirinya sendiri', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/me/profile', {
          headers: { Authorization: `Bearer ${mhsToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.nim).toBe(testNim);
      expect(json.data.studyProgram).toBe('Teknik Informatika');
    });

    it('Mahasiswa dapat memperbarui kontak dan bio dirinya sendiri', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/me/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            bio: 'Mahasiswa berminat di bidang Competitive Programming',
            phone: '089988776655',
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.bio).toBe('Mahasiswa berminat di bidang Competitive Programming');
      expect(json.data.phone).toBe('089988776655');
      // NIM tidak berubah meskipun mencoba dimutasi
      expect(json.data.nim).toBe(testNim);
    });
  });

  // 6. Logout dan Pencabutan Sesi
  describe('Logout & Pencabutan Sesi', () => {
    it('Harus berhasil logout dan mencabut token', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${mhsToken}` },
        })
      );

      expect(res.status).toBe(200);

      // Setelah logout, token lama tidak dapat digunakan kembali
      const meRes = await app.handle(
        new Request('http://localhost/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${mhsToken}` },
        })
      );
      expect(meRes.status).toBe(401);
    });
  });

  // 7. Alur Lupa & Reset Password
  describe('Alur Reset Password', () => {
    let previewResetToken = '';

    it('Meminta reset password harus mengembalikan pesan aman tanpa membocorkan status', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail }),
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.message).toContain('Jika email terdaftar');
      previewResetToken = json.data.previewToken;
      expect(previewResetToken).toBeDefined();
    });

    it('Reset password dengan token palsu harus ditolak (400)', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/v1/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'token_palsu_random_12345',
            password: 'NewValidPassword123!',
          }),
        })
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('INVALID_RESET_TOKEN');
    });

    it('Reset password dengan token valid harus berhasil dan memungkinkan login baru', async () => {
      const newPassword = 'NewPasswordAfterReset123!';

      const res = await app.handle(
        new Request('http://localhost/api/v1/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: previewResetToken,
            password: newPassword,
          }),
        })
      );

      expect(res.status).toBe(200);

      // Login dengan password lama harus ditolak
      const oldLoginRes = await app.handle(
        new Request('http://localhost/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail, password: testPassword }),
        })
      );
      expect(oldLoginRes.status).toBe(401);

      // Login dengan password baru harus berhasil
      const newLoginRes = await app.handle(
        new Request('http://localhost/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail, password: newPassword }),
        })
      );
      expect(newLoginRes.status).toBe(200);
    });
  });
});
