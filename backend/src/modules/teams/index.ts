import { Elysia, t } from 'elysia';
import * as teamService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';

export const teamRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authPlugin)
  .get('/teams/my', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);

    const team = await teamService.getMyTeam(auth.user.id);
    return { data: team };
  })
  .post(
    '/teams',
    async ({ auth, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const team = await teamService.createTeam(
        auth.user.id,
        body,
        auth.user.institutionId
      );

      return { data: team };
    },
    {
      body: t.Object({
        competitionSlug: t.String(),
        teamName: t.String(),
        roleInTeam: t.Optional(t.String()),
      }),
    }
  )
  .post(
    '/teams/:id/leave',
    async ({ auth, params }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const result = await teamService.leaveTeam(
        auth.user.id,
        params.id,
        auth.user.institutionId
      );

      return { data: result };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    '/teams/:id/invites',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const invite = await teamService.sendInvite(
        auth.user.id,
        params.id,
        body.receiverId,
        auth.user.institutionId
      );

      return { data: invite };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        receiverId: t.String(),
      }),
    }
  )
  .get('/me/invites', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);

    const invites = await teamService.getMyInvites(auth.user.id);
    return { data: invites };
  })
  .post(
    '/invites/:id/respond',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const result = await teamService.respondInvite(
        auth.user.id,
        params.id,
        body.action,
        auth.user.institutionId
      );

      return { data: result };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        action: t.Union([t.Literal('diterima'), t.Literal('ditolak')]),
      }),
    }
  )
  .post(
    '/invites/:id/cancel',
    async ({ auth, params }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const result = await teamService.cancelInvite(
        auth.user.id,
        params.id,
        auth.user.institutionId
      );

      return { data: result };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
