import { Elysia, t } from 'elysia';
import * as teamService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';
import { joinCodeUserLimiter } from '../../app/middleware/rate-limit';

export const teamRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authPlugin)
  .get('/teams/my', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);

    const team = await teamService.getMyTeam(auth.user.id);
    return { data: team };
  })
  .get(
    '/teams/directory',
    async ({ auth, query }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const result = await teamService.getOpenTeamsDirectory(
        auth.user.id,
        auth.user.institutionId,
        {
          competitionSlug: query.competitionSlug,
          q: query.q,
          role: query.role,
          page: query.page ? Number(query.page) : undefined,
          limit: query.limit ? Number(query.limit) : undefined,
        }
      );
      return { data: result };
    },
    {
      query: t.Object({
        competitionSlug: t.Optional(t.String()),
        q: t.Optional(t.String()),
        role: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .get('/me/join-requests', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);

    const requests = await teamService.getMyJoinRequests(
      auth.user.id,
      auth.user.institutionId
    );
    return { data: requests };
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
        competitionSlug: t.String({ maxLength: 160 }),
        teamName: t.String({ maxLength: 120 }),
        roleInTeam: t.Optional(t.String({ maxLength: 80 })),
        description: t.Optional(t.String({ maxLength: 1000 })),
        neededRoles: t.Optional(t.Array(t.String({ maxLength: 80 }), { maxItems: 15 })),
        recruitmentType: t.Optional(t.Union([t.Literal('terbuka'), t.Literal('privat')])),
        targetMaxMembers: t.Optional(t.Number()),
      }),
    }
  )
  .post(
    '/teams/join-by-code',
    async ({ auth, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);
      joinCodeUserLimiter.check(`joincode:${auth.user.id}`);

      const result = await teamService.joinTeamByCode(
        auth.user.id,
        body.inviteCode,
        auth.user.institutionId
      );
      return { data: result };
    },
    {
      body: t.Object({
        inviteCode: t.String({ maxLength: 32 }),
      }),
    }
  )
  .patch(
    '/teams/:id',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const updated = await teamService.updateTeam(
        auth.user.id,
        params.id,
        body,
        auth.user.institutionId
      );
      return { data: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        teamName: t.Optional(t.String()),
        description: t.Optional(t.Nullable(t.String())),
        neededRoles: t.Optional(t.Array(t.String())),
        recruitmentType: t.Optional(t.Union([t.Literal('terbuka'), t.Literal('privat')])),
        isRecruiting: t.Optional(t.Boolean()),
        targetMaxMembers: t.Optional(t.Number()),
      }),
    }
  )
  .post(
    '/teams/:id/invite-code/rotate',
    async ({ auth, params }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const result = await teamService.rotateInviteCode(
        auth.user.id,
        params.id,
        auth.user.institutionId
      );
      return { data: result };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  .post(
    '/teams/:id/join-requests',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const created = await teamService.createJoinRequest(
        auth.user.id,
        params.id,
        body || {},
        auth.user.institutionId
      );
      return { data: created };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Optional(
        t.Object({
          preferredRole: t.Optional(t.String()),
          note: t.Optional(t.String()),
        })
      ),
    }
  )
  .post(
    '/join-requests/:id/cancel',
    async ({ auth, params }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const result = await teamService.cancelJoinRequest(
        auth.user.id,
        params.id,
        auth.user.institutionId
      );
      return { data: result };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  .post(
    '/join-requests/:id/decide',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const result = await teamService.decideJoinRequest(
        auth.user.id,
        params.id,
        body.action,
        auth.user.institutionId
      );
      return { data: result };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        action: t.Union([t.Literal('disetujui'), t.Literal('ditolak')]),
      }),
    }
  )
  .post(
    '/teams/:id/members/:userId/remove',
    async ({ auth, params }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const result = await teamService.removeMember(
        auth.user.id,
        params.id,
        params.userId,
        auth.user.institutionId
      );
      return { data: result };
    },
    {
      params: t.Object({
        id: t.String(),
        userId: t.String(),
      }),
    }
  )
  .post(
    '/teams/:id/register-selection',
    async ({ auth, params }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const result = await teamService.registerForInternalSelection(
        auth.user.id,
        params.id,
        auth.user.institutionId
      );
      return { data: result };
    },
    {
      params: t.Object({ id: t.String() }),
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
  );
