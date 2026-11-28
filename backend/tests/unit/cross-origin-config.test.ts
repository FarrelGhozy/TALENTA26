import { afterEach, describe, expect, it } from 'bun:test';
import {
  assertProductionConfig,
  getSessionCookieOptions,
  loadConfig,
} from '../../src/lib/config';
import { createServer } from '../../src/app/server';

const prevEnv = { ...process.env };

function setValidProdEnv(overrides: Record<string, string | undefined> = {}): void {
  process.env.NODE_ENV = 'production';
  process.env.SESSION_SECRET = 'a'.repeat(40);
  process.env.COOKIE_SECRET = 'b'.repeat(40);
  process.env.S3_ENDPOINT = 'http://rustfs:9000';
  process.env.S3_BUCKET = 'talenta-prod';
  process.env.S3_ACCESS_KEY = 'real-access-key';
  process.env.S3_SECRET_KEY = 'real-secret-key';
  process.env.SMTP_HOST = 'smtp.mailgun.org';
  process.env.SMTP_USER = 'postmaster@usc.unida.gontor.ac.id';
  process.env.SMTP_PASS = 'real-smtp-password';
  process.env.PUBLIC_ORIGIN = 'https://app.example.com';

  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

afterEach(() => {
  process.env = { ...prevEnv };
});

describe('Konfigurasi Produksi Lintas Subdomain & Cookie Sesi', () => {
  it('assertProductionConfig menerima dual-subdomain valid dan menolak API_PUBLIC_ORIGIN localhost atau URL cacat', () => {
    setValidProdEnv({
      PUBLIC_ORIGIN: 'https://app.example.com/',
      API_PUBLIC_ORIGIN: 'https://api.example.com/',
    });

    const conf = loadConfig();
    expect(conf.publicOrigin).toBe('https://app.example.com');
    expect(conf.apiPublicOrigin).toBe('https://api.example.com');
    expect(() => assertProductionConfig(conf)).not.toThrow();

    process.env.API_PUBLIC_ORIGIN = 'http://localhost:3360';
    expect(() => assertProductionConfig(loadConfig())).toThrow('API_PUBLIC_ORIGIN');

    process.env.API_PUBLIC_ORIGIN = 'http://127.0.0.1:3360';
    expect(() => assertProductionConfig(loadConfig())).toThrow('API_PUBLIC_ORIGIN');

    process.env.API_PUBLIC_ORIGIN = 'bukan-url';
    expect(() => assertProductionConfig(loadConfig())).toThrow('API_PUBLIC_ORIGIN');
  });

  it('getSessionCookieOptions menyesuaikan sameSite antara mode same-origin dan lintas subdomain HTTPS', () => {
    expect(
      getSessionCookieOptions({
        nodeEnv: 'development',
        publicOrigin: 'http://localhost:5173',
        apiPublicOrigin: 'https://api.example.com',
      })
    ).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    expect(
      getSessionCookieOptions({
        nodeEnv: 'production',
        publicOrigin: 'https://app.example.com',
        apiPublicOrigin: undefined,
      })
    ).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });

    expect(
      getSessionCookieOptions({
        nodeEnv: 'production',
        publicOrigin: 'https://app.example.com',
        apiPublicOrigin: 'https://api.example.com',
      })
    ).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
  });

  it('createServer mengizinkan CORS & CSRF dari PUBLIC_ORIGIN lintas subdomain serta menolak origin lain atau cookie tanpa Origin', async () => {
    setValidProdEnv({
      PUBLIC_ORIGIN: 'https://app.example.com/',
      API_PUBLIC_ORIGIN: 'https://api.example.com/',
    });

    const app = createServer();

    const preflightRes = await app.handle(
      new Request('https://api.example.com/api/v1/auth/login', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://app.example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Idempotency-Key',
        },
      })
    );
    expect(preflightRes.status).toBe(204);
    expect(preflightRes.headers.get('access-control-allow-origin')).toBe('https://app.example.com');
    expect(preflightRes.headers.get('access-control-allow-credentials')).toBe('true');

    const getRes = await app.handle(
      new Request('https://api.example.com/health/live', {
        method: 'GET',
        headers: {
          Origin: 'https://app.example.com',
        },
      })
    );
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get('access-control-allow-origin')).toBe('https://app.example.com');
    expect(getRes.headers.get('access-control-expose-headers')).toContain('Retry-After');

    const crossSiteForbidden = await app.handle(
      new Request('https://api.example.com/api/v1/auth/login', {
        method: 'POST',
        headers: {
          Origin: 'https://evil.example.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'a@b.com', password: 'Password123!' }),
      })
    );
    expect(crossSiteForbidden.status).toBe(403);

    const missingOriginWithCookie = await app.handle(
      new Request('https://api.example.com/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: 'talenta_session=dummy-token',
        },
      })
    );
    expect(missingOriginWithCookie.status).toBe(403);
  });
});
