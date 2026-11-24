import { Elysia, t } from 'elysia';
import * as authService from './service';
import { assertAuthenticated, extractToken, authPlugin } from '../../app/middleware/auth';
import {
  authForgotEmailLimiter,
  authLoginEmailLimiter,
  authRateLimiter,
  authRegisterIpLimiter,
} from '../../app/middleware/rate-limit';
import { loadConfig } from '../../lib/config';
import { resolveClientIp } from '../../app/middleware/client-ip';

export const authRoutes = new Elysia({ prefix: '/api/v1/auth' })
  .use(authPlugin)
  .post(
    '/register',
    async ({ body, headers, cookie, request, server }) => {
      const remoteAddress = server?.requestIP?.(request)?.address;
      const clientIp = resolveClientIp(headers, remoteAddress);
      const userAgent = headers['user-agent'] || '';

      authRateLimiter.check(`auth:${clientIp}`);
      authRegisterIpLimiter.check(`reg:${clientIp}`);

      const result = await authService.registerMahasiswa(body, clientIp, userAgent);

      const currentConfig = loadConfig();
      if (cookie.talenta_session) {
        cookie.talenta_session.set({
          value: result.token,
          httpOnly: true,
          secure: currentConfig.nodeEnv === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
        });
      }

      if (currentConfig.nodeEnv === 'production') {
        return { data: { user: result.user, expiresAt: result.expiresAt } };
      }

      return { data: result };
    },
    {
      body: t.Object({
        email: t.String({ maxLength: 254 }),
        password: t.String({ maxLength: 128 }),
        nim: t.String({ maxLength: 32 }),
        fullName: t.String({ maxLength: 150 }),
        studyProgram: t.String({ maxLength: 120 }),
        faculty: t.String({ maxLength: 120 }),
        enrollmentYear: t.Optional(t.Number()),
        phone: t.Optional(t.String({ maxLength: 30 })),
      }),
    }
  )
  .post(
    '/login',
    async ({ body, headers, cookie, request, server }) => {
      const remoteAddress = server?.requestIP?.(request)?.address;
      const clientIp = resolveClientIp(headers, remoteAddress);
      const userAgent = headers['user-agent'] || '';
      const emailKey = `login:${(body.email || '').trim().toLowerCase()}`;

      authRateLimiter.check(`auth:${clientIp}`);
      authLoginEmailLimiter.check(emailKey);

      const result = await authService.login(body, clientIp, userAgent);
      // Reset throttle akun setelah login berhasil agar tidak memblokir pengguna sah
      authLoginEmailLimiter.reset(emailKey);

      const currentConfig = loadConfig();
      if (cookie.talenta_session) {
        cookie.talenta_session.set({
          value: result.token,
          httpOnly: true,
          secure: currentConfig.nodeEnv === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
        });
      }

      if (currentConfig.nodeEnv === 'production') {
        return { data: { user: result.user, expiresAt: result.expiresAt } };
      }

      return { data: result };
    },
    {
      body: t.Object({
        email: t.String({ maxLength: 254 }),
        password: t.String({ maxLength: 128 }),
      }),
    }
  )
  .post('/logout', async ({ headers, cookie, auth, request, server }) => {
    const rawCookie = cookie.talenta_session?.value;
    const cookieStr = typeof rawCookie === 'string' ? rawCookie : null;
    const token = extractToken(headers['authorization'], cookieStr);
    const remoteAddress = server?.requestIP?.(request)?.address;

    if (token) {
      await authService.logout(
        token,
        auth?.user?.id,
        auth?.user?.institutionId,
        resolveClientIp(headers, remoteAddress),
        headers['user-agent']
      );
    }

    const currentConfig = loadConfig();
    if (cookie.talenta_session) {
      cookie.talenta_session.set({
        value: '',
        httpOnly: true,
        secure: currentConfig.nodeEnv === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
      cookie.talenta_session.remove();
    }

    return { data: { message: 'Berhasil keluar dari sesi' } };
  })
  .get('/me', async ({ auth }) => {
    assertAuthenticated(auth);
    const { user, activePeriod } = await authService.getMeWithPeriod(auth.user.id, auth.user.institutionId);
    return {
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName || user.studentProfile?.fullName || null,
        role: user.role,
        status: user.status,
        institutionId: user.institutionId,
        studentProfile: user.studentProfile,
        activePeriod,
      },
    };
  })
  .post(
    '/forgot-password',
    async ({ body, headers, request, server }) => {
      const remoteAddress = server?.requestIP?.(request)?.address;
      const clientIp = resolveClientIp(headers, remoteAddress);
      authRateLimiter.check(`auth:${clientIp}`);
      authForgotEmailLimiter.check(`forgot:${(body.email || '').trim().toLowerCase()}`);

      const result = await authService.requestPasswordReset(
        body.email,
        clientIp,
        headers['user-agent']
      );
      return { data: result };
    },
    {
      body: t.Object({
        email: t.String({ maxLength: 254 }),
      }),
    }
  )
  .post(
    '/reset-password',
    async ({ body, headers, request, server }) => {
      const remoteAddress = server?.requestIP?.(request)?.address;
      const clientIp = resolveClientIp(headers, remoteAddress);
      authRateLimiter.check(`auth:${clientIp}`);

      const result = await authService.resetPasswordWithToken(
        body.token,
        body.password,
        clientIp,
        headers['user-agent']
      );
      return { data: result };
    },
    {
      body: t.Object({
        token: t.String({ maxLength: 256 }),
        password: t.String({ maxLength: 128 }),
      }),
    }
  );
