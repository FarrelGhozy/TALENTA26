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
  .get('/me/targets/history', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);

    const history = await targetService.getMyTargetHistory(auth.user.id);
    return { data: history };
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
  );
