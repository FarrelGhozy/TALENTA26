import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { createServer } from '../../src/app/server';
import { prisma, closeDatabase } from '../../src/lib/prisma';
import { hashPassword } from '../../src/lib/password';
import { createSession } from '../../src/lib/session';

process.env.DATABASE_URL = 'mysql://root@127.0.0.1:3306/talenta_test';
process.env.NODE_ENV = 'test';

describe('Stage 2 — Backend RBAC Guard Test Suite', () => {
  const app = createServer();
  let validatorToken = '';
  let superAdminToken = '';
  let validatorUserId = '';
  let superAdminUserId = '';

  beforeAll(async () => {
    const institution = await prisma.institution.upsert({
      where: { code: 'unida-gontor' },
      update: {},
      create: {
        code: 'unida-gontor',
        name: 'Universitas Darussalam Gontor',
      },
    });

    const passHash = await hashPassword('PasswordStaff123!');

    // Buat akun validator tes
    const valUser = await prisma.user.upsert({
      where: { email: 'val_test@unida.gontor.ac.id' },
      update: {},
      create: {
        institutionId: institution.id,
        email: 'val_test@unida.gontor.ac.id',
        passwordHash: passHash,
        role: 'validator',
        status: 'active',
      },
    });
    validatorUserId = valUser.id;
    const valSession = await createSession(valUser.id);
    validatorToken = valSession.token;

    // Buat akun super admin tes
    const saUser = await prisma.user.upsert({
      where: { email: 'sa_test@unida.gontor.ac.id' },
      update: {},
      create: {
        institutionId: institution.id,
        email: 'sa_test@unida.gontor.ac.id',
        passwordHash: passHash,
        role: 'super_admin',
        status: 'active',
      },
    });
    superAdminUserId = saUser.id;
    const saSession = await createSession(saUser.id);
    superAdminToken = saSession.token;
  });

  afterAll(async () => {
    if (validatorUserId) {
      await prisma.user.deleteMany({ where: { id: validatorUserId } });
    }
    if (superAdminUserId) {
      await prisma.user.deleteMany({ where: { id: superAdminUserId } });
    }
    await closeDatabase();
  });

  it('Validator dapat memanggil /api/v1/auth/me dan mendapatkan role validator', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.role).toBe('validator');
  });

  it('Super admin dapat memanggil /api/v1/auth/me dan mendapatkan role super_admin', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.role).toBe('super_admin');
  });

  it('Validator mengakses /api/v1/me/profile harus ditolak 403 Forbidden (khusus mahasiswa)', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/me/profile', {
        headers: { Authorization: `Bearer ${validatorToken}` },
      })
    );
    expect(res.status).toBe(403);
    const json = (await res.json()) as any;
    expect(json.error.code).toBe('FORBIDDEN');
  });

  it('Super admin mengakses /api/v1/me/profile harus ditolak 403 Forbidden (khusus mahasiswa)', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/me/profile', {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      })
    );
    expect(res.status).toBe(403);
    const json = (await res.json()) as any;
    expect(json.error.code).toBe('FORBIDDEN');
  });
});
