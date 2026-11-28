import { describe, expect, it } from 'bun:test';
import { resolveSuperAdminBootstrapCredentials } from '../../prisma/seed';

describe('Bootstrap Super Admin dari Environment (.env)', () => {
  it('Production: menolak jika email atau password kosong/placeholder atau terlalu pendek', () => {
    expect(() =>
      resolveSuperAdminBootstrapCredentials({
        nodeEnv: 'production',
        superAdminBootstrapEmail: undefined,
        superAdminBootstrapPassword: 'StrongPassword2026!',
      })
    ).toThrow('SUPER_ADMIN_BOOTSTRAP_EMAIL');

    expect(() =>
      resolveSuperAdminBootstrapCredentials({
        nodeEnv: 'production',
        superAdminBootstrapEmail: 'admin@usc.unida.gontor.ac.id',
        superAdminBootstrapPassword: 'change-with-strong-bootstrap-password',
      })
    ).toThrow('SUPER_ADMIN_BOOTSTRAP_PASSWORD');

    expect(() =>
      resolveSuperAdminBootstrapCredentials({
        nodeEnv: 'production',
        superAdminBootstrapEmail: 'admin@usc.unida.gontor.ac.id',
        superAdminBootstrapPassword: 'dev-admin-password',
      })
    ).toThrow('SUPER_ADMIN_BOOTSTRAP_PASSWORD');

    expect(() =>
      resolveSuperAdminBootstrapCredentials({
        nodeEnv: 'production',
        superAdminBootstrapEmail: 'admin@usc.unida.gontor.ac.id',
        superAdminBootstrapPassword: 'short',
      })
    ).toThrow('8 hingga 128');

    expect(() =>
      resolveSuperAdminBootstrapCredentials({
        nodeEnv: 'production',
        superAdminBootstrapEmail: 'bukan-email',
        superAdminBootstrapPassword: 'StrongPassword2026!',
      })
    ).toThrow('Format SUPER_ADMIN_BOOTSTRAP_EMAIL');
  });

  it('Production: menerima email dan password kuat dari .env serta menormalisasi email', () => {
    const creds = resolveSuperAdminBootstrapCredentials({
      nodeEnv: 'production',
      superAdminBootstrapEmail: '  SuperAdmin@UNIDA.gontor.ac.id  ',
      superAdminBootstrapPassword: 'VeryStrong!Admin#Password2026',
    });

    expect(creds).toEqual({
      email: 'superadmin@unida.gontor.ac.id',
      password: 'VeryStrong!Admin#Password2026',
      usedDefaultPasswordFallback: false,
    });
  });

  it('Development: memakai fallback default lokal jika kosong atau masih placeholder change-with-*', () => {
    const fromEmpty = resolveSuperAdminBootstrapCredentials({
      nodeEnv: 'development',
      superAdminBootstrapEmail: undefined,
      superAdminBootstrapPassword: undefined,
    });
    expect(fromEmpty).toEqual({
      email: 'admin@unida.gontor.ac.id',
      password: 'AdminGontor2026!',
      usedDefaultPasswordFallback: true,
    });

    const fromPlaceholder = resolveSuperAdminBootstrapCredentials({
      nodeEnv: 'development',
      superAdminBootstrapEmail: 'ketua.usc@unida.gontor.ac.id',
      superAdminBootstrapPassword: 'change-with-strong-bootstrap-password',
    });
    expect(fromPlaceholder).toEqual({
      email: 'ketua.usc@unida.gontor.ac.id',
      password: 'AdminGontor2026!',
      usedDefaultPasswordFallback: true,
    });
  });

  it('Development: memakai email & password kustom dari .env dan tetap memvalidasi format/panjang', () => {
    const custom = resolveSuperAdminBootstrapCredentials({
      nodeEnv: 'development',
      superAdminBootstrapEmail: 'admin.custom@unida.gontor.ac.id',
      superAdminBootstrapPassword: 'CustomAdminPassword2026!',
    });
    expect(custom).toEqual({
      email: 'admin.custom@unida.gontor.ac.id',
      password: 'CustomAdminPassword2026!',
      usedDefaultPasswordFallback: false,
    });

    expect(() =>
      resolveSuperAdminBootstrapCredentials({
        nodeEnv: 'development',
        superAdminBootstrapEmail: 'admin.custom@unida.gontor.ac.id',
        superAdminBootstrapPassword: '123',
      })
    ).toThrow('8 hingga 128');

    expect(() =>
      resolveSuperAdminBootstrapCredentials({
        nodeEnv: 'development',
        superAdminBootstrapEmail: 'admin.custom@unida.gontor.ac.id',
        superAdminBootstrapPassword: 'A'.repeat(129),
      })
    ).toThrow('8 hingga 128');
  });
});
