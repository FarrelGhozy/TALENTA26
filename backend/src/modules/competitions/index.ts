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
        periodId: query.periodId,
        search: query.q || query.search,
      });
      return { data };
    },
    {
      query: t.Object({
        category: t.Optional(t.String()),
        level: t.Optional(t.String()),
        format: t.Optional(t.String()),
        periodId: t.Optional(t.String()),
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
    const data = await compService.getAllCompetitionsAdmin(auth.user.institutionId);
    return { data };
  })
  .get('/api/v1/admin/competitions/:id', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const data = await compService.getCompetitionByIdAdmin(params.id, auth.user.institutionId);
    return { data };
  })
  .get('/api/v1/admin/competitions/:id/participants', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const data = await compService.getCompetitionParticipantsAdmin(
      params.id,
      auth.user.institutionId
    );
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
        registrationDeadline: t.Optional(t.Nullable(t.String())),
        competitionDate: t.Optional(t.Nullable(t.String())),
        registrationStatus: t.Optional(t.Union([t.Literal('buka'), t.Literal('tutup')])),
        internalSelectionDeadline: t.Optional(t.Nullable(t.String())),
        requireRoles: t.Optional(t.Boolean()),
        requireCrossStudyProgram: t.Optional(t.Boolean()),
        singleTeamPerCompetition: t.Optional(t.Boolean()),
        requirements: t.Optional(t.Array(t.String())),
        scheduleTimeline: t.Optional(t.Array(t.Object({ label: t.String(), tanggal: t.String() }))),
        competitionCategoryId: t.Optional(t.Nullable(t.String())),
        pointTemplateId: t.Optional(t.Nullable(t.String())),
        pointDescription: t.Optional(t.Nullable(t.String())),
        sourceUrl: t.Optional(t.Nullable(t.String())),
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
        body as compService.UpdateCompetitionDto,
        auth.user.institutionId
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
        registrationDeadline: t.Optional(t.Nullable(t.String())),
        competitionDate: t.Optional(t.Nullable(t.String())),
        registrationStatus: t.Optional(t.Union([t.Literal('buka'), t.Literal('tutup')])),
        internalSelectionDeadline: t.Optional(t.Nullable(t.String())),
        requireRoles: t.Optional(t.Boolean()),
        requireCrossStudyProgram: t.Optional(t.Boolean()),
        singleTeamPerCompetition: t.Optional(t.Boolean()),
        requirements: t.Optional(t.Array(t.String())),
        scheduleTimeline: t.Optional(t.Array(t.Object({ label: t.String(), tanggal: t.String() }))),
        competitionCategoryId: t.Optional(t.Nullable(t.String())),
        pointTemplateId: t.Optional(t.Nullable(t.String())),
        pointDescription: t.Optional(t.Nullable(t.String())),
        sourceUrl: t.Optional(t.Nullable(t.String())),
        status: t.Optional(t.Union([t.Literal('draft'), t.Literal('published'), t.Literal('archived')])),
      }),
    }
  )
  .post('/api/v1/admin/competitions/:id/publish', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const updated = await compService.setCompetitionStatus(
      params.id,
      auth.user.id,
      'published',
      auth.user.institutionId
    );
    return { data: updated };
  })
  .post('/api/v1/admin/competitions/:id/archive', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const updated = await compService.setCompetitionStatus(
      params.id,
      auth.user.id,
      'archived',
      auth.user.institutionId
    );
    return { data: updated };
  })
  .get('/api/v1/admin/competitions/:id/delete-preview', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const data = await compService.getCompetitionDeletePreview(
      params.id,
      auth.user.institutionId
    );
    return { data };
  })
  .delete('/api/v1/admin/competitions/:id', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const data = await compService.deleteCompetition(
      params.id,
      auth.user.id,
      auth.user.institutionId
    );
    return { data };
  });
