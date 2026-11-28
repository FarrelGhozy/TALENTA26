import { afterEach, describe, expect, it } from 'bun:test';
import { resolveClientIp } from '../../src/app/middleware/client-ip';
import { assertSameOrigin } from '../../src/app/middleware/csrf';
import { ForbiddenError } from '../../src/app/middleware/error';
import { sendPasswordResetEmail } from '../../src/lib/mailer';

const previousEnv = { ...process.env };

afterEach(() => {
  process.env = { ...previousEnv };
});

describe('Keamanan autentikasi', () => {
  it('mengabaikan x-forwarded-for saat proxy belum dipercaya', () => {
    delete process.env.TRUST_PROXY;
    expect(resolveClientIp({ 'x-forwarded-for': '203.0.113.7' })).toBe('unknown');
  });

  it('mengambil alamat pertama hanya saat proxy dipercaya', () => {
    process.env.TRUST_PROXY = 'true';
    expect(resolveClientIp({ 'x-forwarded-for': '203.0.113.7, 10.0.0.2' })).toBe('203.0.113.7');
  });

  it('menolak mutasi dari origin lain', () => {
    process.env.PUBLIC_ORIGIN = 'https://talenta.example.com';
    const request = new Request('https://talenta.example.com/api/v1/me/profile', {
      method: 'PATCH',
      headers: { Origin: 'https://evil.example' },
    });
    expect(() => assertSameOrigin(request)).toThrow(ForbiddenError);
  });

  it('menolak mutasi berbasis cookie tanpa Origin', () => {
    const request = new Request('https://talenta.example.com/api/v1/me/profile', {
      method: 'PATCH',
      headers: { cookie: 'talenta_session=token-uji' },
    });
    expect(() => assertSameOrigin(request)).toThrow('Origin sesi');
  });

  it('tidak menyediakan preview token di production tanpa SMTP dan menolak placeholder dengan MailerUnavailableError', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    await expect(sendPasswordResetEmail('user@example.com', 'secret-token')).rejects.toThrow(
      'belum dikonfigurasi'
    );

    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'no-reply@unida.gontor.ac.id';
    process.env.SMTP_PASS = 'change-with-smtp-password';
    await expect(sendPasswordResetEmail('user@example.com', 'secret-token')).rejects.toThrow(
      'belum dikonfigurasi'
    );
  });

  it('mengembalikan preview token di non-production jika SMTP masih placeholder', async () => {
    process.env.NODE_ENV = 'development';
    process.env.PUBLIC_ORIGIN = 'http://localhost:5173';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'no-reply@unida.gontor.ac.id';
    process.env.SMTP_PASS = 'change-with-smtp-password';

    const result = await sendPasswordResetEmail('user@example.com', 'dev-reset-token');
    expect(result).toEqual({ success: true, previewToken: 'dev-reset-token' });
  });

  it('melempar MailerUnavailableError dan mencatat log aman saat transport SMTP gagal mengirim', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PUBLIC_ORIGIN = 'https://talenta.example.com';
    process.env.SMTP_HOST = 'smtp.mailtrap.io';
    process.env.SMTP_USER = 'mailer';
    process.env.SMTP_PASS = 'password-uji';

    await expect(
      sendPasswordResetEmail('user@example.com', 'token-uji', () => ({
        async sendMail() {
          throw new Error('connect ECONNREFUSED 127.0.0.1:587');
        },
      }))
    ).rejects.toThrow('gagal terhubung ke server SMTP');
  });

  it('mengirim tautan reset melalui transport SMTP yang dikonfigurasi', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PUBLIC_ORIGIN = 'https://talenta.example.com';
    process.env.SMTP_HOST = 'smtp.mailtrap.io';
    process.env.SMTP_USER = 'mailer';
    process.env.SMTP_PASS = 'password-uji';
    process.env.SMTP_FROM = 'noreply@example.com';
    let sentMessage: { to: string; text: string } | undefined;

    const result = await sendPasswordResetEmail(
      'user@example.com',
      'token-uji',
      () => ({
        async sendMail(message) {
          sentMessage = message;
          return { messageId: 'message-1' };
        },
      })
    );

    expect(result).toEqual({ success: true, messageId: 'message-1' });
    expect(sentMessage?.to).toBe('user@example.com');
    expect(sentMessage?.text).toContain(
      'https://talenta.example.com/reset-password?token=token-uji'
    );
  });
});
