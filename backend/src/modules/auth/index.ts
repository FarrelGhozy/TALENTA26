import { Elysia, t } from 'elysia';
import * as authService from './service';
import { assertAuthenticated, extractToken, authPlugin } from '../../app/middleware/auth';
import { authRateLimiter } from '../../app/middleware/rate-limit';
import { loadConfig } from '../../lib/config';
import { resolveClientIp } from '../../app/middleware/client-ip';

export const authRoutes = new Elysia({ prefix: '/api/v1/auth' })
  .use(authPlugin)
  .post(
    '/register',
    async ({ body, headers, cookie }) => {
      const clientIp = resolveClientIp(headers);
      const userAgent = headers['user-agent'] || '';

      authRateLimiter.check(clientIp);

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

      return { data: result };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
        nim: t.String(),
        fullName: t.String(),
        studyProgram: t.String(),
        faculty: t.String(),
        phone: t.Optional(t.String()),
      }),
    }
  )
  .post(
    '/login',
    async ({ body, headers, cookie }) => {
      const clientIp = resolveClientIp(headers);
      const userAgent = headers['user-agent'] || '';

      authRateLimiter.check(clientIp);

      const result = await authService.login(body, clientIp, userAgent);

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

      return { data: result };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )
  .post('/logout', async ({ headers, cookie, auth }) => {
    const rawCookie = cookie.talenta_session?.value;
    const cookieStr = typeof rawCookie === 'string' ? rawCookie : null;
    const token = extractToken(headers['authorization'], cookieStr);

    if (token) {
      await authService.logout(
        token,
        auth?.user?.id,
        auth?.user?.institutionId,
        resolveClientIp(headers),
        headers['user-agent']
      );
    }

    if (cookie.talenta_session) {
      cookie.talenta_session.remove();
    }

    return { data: { message: 'Berhasil keluar dari sesi' } };
  })
  .get('/me', async ({ auth }) => {
    assertAuthenticated(auth);
    const me = await authService.getMe(auth.user.id);
    return {
      data: {
        id: me.id,
        email: me.email,
        role: me.role,
        status: me.status,
        institutionId: me.institutionId,
        studentProfile: me.studentProfile,
      },
    };
  })
  .post(
    '/forgot-password',
    async ({ body, headers }) => {
      const clientIp = resolveClientIp(headers);
      authRateLimiter.check(clientIp);

      const result = await authService.requestPasswordReset(
        body.email,
        clientIp,
        headers['user-agent']
      );
      return { data: result };
    },
    {
      body: t.Object({
        email: t.String(),
      }),
    }
  )
  .post(
    '/reset-password',
    async ({ body, headers }) => {
      const clientIp = resolveClientIp(headers);
      authRateLimiter.check(clientIp);

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
        token: t.String(),
        password: t.String(),
      }),
    }
  );
