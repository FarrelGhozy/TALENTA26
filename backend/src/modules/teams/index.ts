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
  // Aliases for compatibility
  .get('/matching/invites', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);

    const invites = await teamService.getMyInvites(auth.user.id);
    const combined = [
      ...invites.incoming.map((i) => ({
        id: i.id,
        institutionId: auth.user.institutionId,
        dari: i.senderId,
        ke: i.receiverId,
        teamId: i.teamId,
        status: i.status,
        createdAt: i.createdAt.toISOString().split('T')[0],
      })),
      ...invites.outgoing.map((i) => ({
        id: i.id,
        institutionId: auth.user.institutionId,
        dari: i.senderId,
        ke: i.receiverId,
        teamId: i.teamId,
        status: i.status,
        createdAt: i.createdAt.toISOString().split('T')[0],
      })),
    ];
    return { data: combined };
  })
  .post(
    '/matching/invites',
    async ({ auth, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const invite = await teamService.sendInvite(
        auth.user.id,
        body.teamId,
        body.ke,
        auth.user.institutionId
      );

      return {
        data: {
          id: invite.id,
          institutionId: auth.user.institutionId,
          dari: invite.senderId,
          ke: invite.receiverId,
          teamId: invite.teamId,
          status: invite.status,
          createdAt: invite.createdAt.toISOString().split('T')[0],
        },
      };
    },
    {
      body: t.Object({
        dari: t.Optional(t.String()),
        ke: t.String(),
        teamId: t.String(),
      }),
    }
  )
  .patch(
    '/matching/invites/:id',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const result = await teamService.respondInvite(
        auth.user.id,
        params.id,
        body.status,
        auth.user.institutionId
      );

      return { data: result };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        status: t.Union([t.Literal('diterima'), t.Literal('ditolak')]),
      }),
    }
  );
