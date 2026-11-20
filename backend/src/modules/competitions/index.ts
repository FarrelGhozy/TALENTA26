import { Elysia, t } from 'elysia';
import * as compService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';
import { NotFoundError } from '../../app/middleware/error';

export const competitionRoutes = new Elysia()
  .use(authPlugin)
  // Rute Publik
  .get(
    '/api/v1/competitions',
    async ({ query }) => {
      const data = await compService.getPublishedCompetitions({
        category: query.category,
        level: query.level,
        format: query.format,
        search: query.q || query.search,
      });
      return { data };
    },
    {
      query: t.Object({
        category: t.Optional(t.String()),
        level: t.Optional(t.String()),
        format: t.Optional(t.String()),
        q: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
    }
  )
  .get('/api/v1/competitions/:slug', async ({ params }) => {
    const data = await compService.getCompetitionBySlug(params.slug);
    if (!data) throw new NotFoundError('Kompetisi tidak ditemukan');
    return { data };
  })
  .get('/api/v1/periods/current', async () => {
    const data = await compService.getCurrentAcademicPeriod();
    return { data };
  })

  // Rute Pengelolaan Validator & Super Admin
  .get('/api/v1/admin/competitions', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const data = await compService.getAllCompetitionsAdmin();
    return { data };
  })
  .post(
    '/api/v1/admin/competitions',
    async ({ auth, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);

      const created = await compService.createCompetition(
        auth.user.institutionId,
        auth.user.id,
        body as compService.CreateCompetitionDto
      );
      return { data: created };
    },
    {
      body: t.Object({
        name: t.String(),
        organizer: t.String(),
        category: t.String(),
        level: t.Optional(t.String()),
        format: t.Union([t.Literal('individu'), t.Literal('beregu')]),
        minTeamMembers: t.Optional(t.Number()),
        maxTeamMembers: t.Optional(t.Number()),
        requiredRoles: t.Optional(t.Array(t.String())),
        description: t.String(),
        registrationDeadline: t.Optional(t.String()),
        competitionDate: t.Optional(t.String()),
      }),
    }
  )
  .post(
    '/api/v1/competitions',
    async ({ auth, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);

      const created = await compService.createCompetition(
        auth.user.institutionId,
        auth.user.id,
        body as compService.CreateCompetitionDto
      );
      return { data: created };
    },
    {
      body: t.Object({
        name: t.String(),
        organizer: t.String(),
        category: t.String(),
        level: t.Optional(t.String()),
        format: t.Union([t.Literal('individu'), t.Literal('beregu')]),
        minTeamMembers: t.Optional(t.Number()),
        maxTeamMembers: t.Optional(t.Number()),
        requiredRoles: t.Optional(t.Array(t.String())),
        description: t.String(),
        registrationDeadline: t.Optional(t.String()),
        competitionDate: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    '/api/v1/admin/competitions/:id',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);

      const updated = await compService.updateCompetition(
        params.id,
        auth.user.id,
        body as compService.UpdateCompetitionDto
      );
      return { data: updated };
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        organizer: t.Optional(t.String()),
        category: t.Optional(t.String()),
        level: t.Optional(t.String()),
        format: t.Optional(t.Union([t.Literal('individu'), t.Literal('beregu')])),
        minTeamMembers: t.Optional(t.Number()),
        maxTeamMembers: t.Optional(t.Number()),
        requiredRoles: t.Optional(t.Array(t.String())),
        description: t.Optional(t.String()),
        registrationDeadline: t.Optional(t.String()),
        competitionDate: t.Optional(t.String()),
        status: t.Optional(t.Union([t.Literal('draft'), t.Literal('published'), t.Literal('archived')])),
      }),
    }
  )
  .post('/api/v1/admin/competitions/:id/publish', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const updated = await compService.setCompetitionStatus(params.id, auth.user.id, 'published');
    return { data: updated };
  })
  .post('/api/v1/admin/competitions/:id/archive', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const updated = await compService.setCompetitionStatus(params.id, auth.user.id, 'archived');
    return { data: updated };
  });
