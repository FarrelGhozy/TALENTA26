import { Elysia, t } from 'elysia';
import * as profileService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';

export const profileRoutes = new Elysia({ prefix: '/api/v1/me/profile' })
  .use(authPlugin)
  .get('/', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);

    const profile = await profileService.getStudentProfile(auth.user.id);
    return { data: profile };
  })
  .patch(
    '/',
    async ({ auth, body, headers }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const clientIp = headers['x-forwarded-for'] || '127.0.0.1';
      const userAgent = headers['user-agent'] || '';

      const updated = await profileService.updateStudentProfile(
        auth.user.id,
        body,
        clientIp,
        userAgent
      );

      return { data: updated };
    },
    {
      body: t.Object({
        fullName: t.Optional(t.String()),
        studyProgram: t.Optional(t.String()),
        faculty: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        bio: t.Optional(t.String()),
      }),
    }
  );
