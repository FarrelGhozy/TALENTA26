import { afterEach, describe, expect, it } from 'bun:test';
import { normalizeIp, resolveClientIp } from '../../src/app/middleware/client-ip';
import { InMemoryRateLimiter } from '../../src/app/middleware/rate-limit';
import { RateLimitError, ValidationError, formatErrorResponse } from '../../src/app/middleware/error';
import { hashPassword, verifyPassword, getArgon2ConcurrencyStats } from '../../src/lib/password';
import { assertProductionConfig, loadConfig } from '../../src/lib/config';

const prevEnv = { ...process.env };

afterEach(() => {
  process.env = { ...prevEnv };
});

describe('Wave 2 — Resolusi IP Anti-Spoofing, Bounded Rate Limiter, Argon2id & Production Guard', () => {
  it('Menormalisasi IPv4-mapped IPv6 (::ffff:127.0.0.1 -> 127.0.0.1) dan menolak string IP cacat/panjang', () => {
    expect(normalizeIp('::ffff:127.0.0.1')).toBe('127.0.0.1');
    expect(normalizeIp('::ffff:172.18.0.4')).toBe('172.18.0.4');
    expect(normalizeIp('999.999.999.999')).toBeNull();
    expect(normalizeIp('a'.repeat(200))).toBeNull();
    expect(normalizeIp('::::::')).toBeNull();

    delete process.env.TRUST_PROXY;
    expect(resolveClientIp({}, '::ffff:127.0.0.1')).toBe('127.0.0.1');
  });

  it('Kebal terhadap spoofing X-Forwarded-For saat TRUST_PROXY=true dan memprioritaskan CF-Connecting-IP', () => {
    process.env.TRUST_PROXY = 'true';

    // Penyerang mengirim header palsu 1.2.3.4; proxy menambahkan IP asli 203.0.113.99 lalu gateway 172.18.0.1
    const resolved = resolveClientIp({
      'x-forwarded-for': '1.2.3.4, 203.0.113.99, 172.18.0.1',
    });
    expect(resolved).toBe('203.0.113.99');

    // CF-Connecting-IP selalu diprioritaskan di balik Cloudflare Tunnel
    const cfResolved = resolveClientIp({
      'cf-connecting-ip': '198.51.100.42',
      'x-forwarded-for': '1.2.3.4, 203.0.113.99, 172.18.0.1',
    });
    expect(cfResolved).toBe('198.51.100.42');
  });

  it('InMemoryRateLimiter memiliki batas maxEntries (anti OOM Map) dan menyertakan Retry-After pada 429', () => {
    const limiter = new InMemoryRateLimiter(2, 60_000, { maxEntries: 100 });

    const r1 = limiter.check('client-a');
    expect(r1.limit).toBe(2);
    expect(r1.remaining).toBe(1);

    const r2 = limiter.check('client-a');
    expect(r2.remaining).toBe(0);

    let caught: unknown = null;
    try {
      limiter.check('client-a');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RateLimitError);
    const formatted = formatErrorResponse(caught, 'req-test');
    expect(formatted.status).toBe(429);
    expect(Number(formatted.headers?.['Retry-After'])).toBeGreaterThanOrEqual(1);
    expect(formatted.body.error.retryAfterSeconds).toBeGreaterThanOrEqual(1);

    // Simulasikan flood 250 IP acak unik -> ukuran Map harus tetap <= maxEntries (100)
    for (let i = 0; i < 250; i++) {
      limiter.check(`flood-ip-${i}`);
    }
    expect(limiter.size).toBeLessThanOrEqual(100);
  });

  it('Argon2id menolak password > 128 karakter tanpa mengalokasikan memori native dan membatasi konkurensi', async () => {
    const hugePassword = 'A'.repeat(500);
    await expect(hashPassword(hugePassword)).rejects.toThrow(ValidationError);

    const okHash = await hashPassword('PasswordAman123!');
    expect(await verifyPassword(hugePassword, okHash)).toBe(false);
    expect(await verifyPassword('PasswordAman123!', okHash)).toBe(true);
    expect(getArgon2ConcurrencyStats().maxConcurrent).toBe(4);
  });

  it('assertProductionConfig gagal tertutup bila PUBLIC_ORIGIN localhost atau SMTP placeholder', () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'a'.repeat(40);
    process.env.COOKIE_SECRET = 'b'.repeat(40);
    process.env.S3_ENDPOINT = 'http://rustfs:9000';
    process.env.S3_BUCKET = 'talenta-prod';
    process.env.S3_ACCESS_KEY = 'real-access-key';
    process.env.S3_SECRET_KEY = 'real-secret-key';
    process.env.SMTP_HOST = 'smtp.mailgun.org';
    process.env.SMTP_USER = 'postmaster@talenta.unida.gontor.ac.id';
    process.env.SMTP_PASS = 'real-smtp-password';

    process.env.PUBLIC_ORIGIN = 'http://localhost:5173';
    expect(() => assertProductionConfig(loadConfig())).toThrow('localhost');

    process.env.PUBLIC_ORIGIN = 'https://talenta.unida.gontor.ac.id';
    process.env.SMTP_HOST = 'smtp.example.com';
    expect(() => assertProductionConfig(loadConfig())).toThrow('SMTP');

    process.env.SMTP_HOST = 'smtp.mailgun.org';
    expect(() => assertProductionConfig(loadConfig())).not.toThrow();
  });
});
