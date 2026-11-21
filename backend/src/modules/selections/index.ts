import { Elysia, t } from 'elysia';
import { authPlugin, assertAuthenticated } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';
import * as service from './service';

export const selectionRoutes = new Elysia({ prefix: '/api/v1/admin/selections' })
  .use(authPlugin)
  .get('/', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    return { data: await service.listSelections(auth.user.institutionId) };
  })
  .post(
    '/',
    async ({ auth, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);
      return {
        data: await service.saveSelection(auth.user.institutionId, auth.user.id, body),
      };
    },
    {
      body: t.Object({
        competitionId: t.String(),
        teamId: t.Optional(t.Nullable(t.String())),
        userId: t.Optional(t.Nullable(t.String())),
        stage: t.String(),
        result: t.Union([t.Literal('menunggu'), t.Literal('lolos'), t.Literal('tidak')]),
        organizerVerified: t.Boolean(),
        notes: t.Optional(t.String()),
      }),
    }
  );
