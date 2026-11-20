import { prisma, closeDatabase } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';
import { loadConfig } from '../src/lib/config';

async function main() {
  const currentConfig = loadConfig();
  console.log('[SEED] Memulai inisialisasi basis data TALENTA...');

  // 1. Institusi default UNIDA Gontor
  const institution = await prisma.institution.upsert({
    where: { code: 'unida-gontor' },
    update: {
      name: 'Universitas Darussalam Gontor',
    },
    create: {
      code: 'unida-gontor',
      name: 'Universitas Darussalam Gontor',
    },
  });
  console.log(`[SEED] Institusi terverifikasi: ${institution.name} (${institution.code})`);

  // 2. Super Admin Bootstrap
  const superAdminEmail = (
    currentConfig.superAdminBootstrapEmail || 'admin@unida.gontor.ac.id'
  ).toLowerCase();
  const superAdminPassword =
    currentConfig.superAdminBootstrapPassword || 'AdminGontor2026!';

  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: 'super_admin' },
  });

  if (!existingSuperAdmin) {
    const passwordHash = await hashPassword(superAdminPassword);
    const createdAdmin = await prisma.user.create({
      data: {
        institutionId: institution.id,
        email: superAdminEmail,
        passwordHash,
        role: 'super_admin',
        status: 'active',
      },
    });

    await prisma.auditEvent.create({
      data: {
        institutionId: institution.id,
        actorId: createdAdmin.id,
        action: 'SYSTEM_BOOTSTRAP_SUPERADMIN',
        targetType: 'User',
        targetId: createdAdmin.id,
        metadata: { email: superAdminEmail },
      },
    });

    console.log(`[SEED] Super admin berhasil dibuat: ${superAdminEmail}`);
  } else {
    console.log(
      `[SEED] Super admin sudah terdaftar (${existingSuperAdmin.email}). Bootstrap dilewati.`
    );
  }

  // 3. Validator Akun Uji Coba (khusus dev/test agar pengujian RBAC lokal dapat dilakukan)
  if (currentConfig.nodeEnv !== 'production') {
    const validatorEmail = 'validator@unida.gontor.ac.id';
    const existingValidator = await prisma.user.findUnique({
      where: { email: validatorEmail },
    });

    if (!existingValidator) {
      const valHash = await hashPassword('Validator2026!');
      await prisma.user.create({
        data: {
          institutionId: institution.id,
          email: validatorEmail,
          passwordHash: valHash,
          role: 'validator',
          status: 'active',
        },
      });
      console.log(`[SEED:DEV] Validator uji coba dibuat: ${validatorEmail}`);
    }
  }

  console.log('[SEED] Inisialisasi basis data selesai dengan aman.');
}

main()
  .catch((e) => {
    console.error('[SEED_ERROR] Gagal menjalankan seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await closeDatabase();
  });
