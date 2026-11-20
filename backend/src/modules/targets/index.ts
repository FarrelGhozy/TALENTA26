import { Elysia, t } from 'elysia';
import * as targetService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';

export const targetRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authPlugin)
  .get('/me/target', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);

    const target = await targetService.getMyActiveTarget(auth.user.id);
    return { data: target };
  })
  .post(
    '/me/target',
    async ({ auth, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const target = await targetService.setTargetCompetition(
        auth.user.id,
        body.slug,
        auth.user.institutionId
      );

      return { data: target };
    },
    {
      body: t.Object({
        slug: t.String(),
      }),
    }
  )
  .get('/users/:userId/target', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);

    const target = await targetService.getMyActiveTarget(params.userId);
    return { data: target };
  })
  .post(
    '/users/:userId/target',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const target = await targetService.setTargetCompetition(
        params.userId,
        body.slug,
        auth.user.institutionId
      );

      return { data: target };
    },
    {
      params: t.Object({
        userId: t.String(),
      }),
      body: t.Object({
        slug: t.String(),
      }),
    }
  );
