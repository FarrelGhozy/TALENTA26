import { Elysia, t } from 'elysia';
import * as roadmapService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';

export const roadmapRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authPlugin)
  // Public / Mahasiswa Roadmap
  .get('/roadmaps/:competitionSlug', async ({ params }) => {
    const roadmap = await roadmapService.getRoadmapByCompetitionSlug(params.competitionSlug);
    return { data: roadmap };
  })
  .get(
    '/roadmaps/:competitionSlug/checklist',
    async ({ auth, params }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);
      const checklist = await roadmapService.getChecklistProgress(auth.user.id, params.competitionSlug);
      return { data: checklist };
    }
  )
  .post(
    '/roadmaps/:competitionSlug/checklist',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const checklist = await roadmapService.toggleChecklistTask(
        auth.user.id,
        params.competitionSlug,
        body.taskId,
        auth.user.institutionId
      );

      return { data: checklist };
    },
    {
      body: t.Object({
        taskId: t.String(),
      }),
    }
  )
  .put(
    '/me/roadmap-progress/:taskId',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);
      const result = await roadmapService.setRoadmapTaskProgress(
        auth.user.id,
        params.taskId,
        body?.completed,
        auth.user.institutionId
      );
      return { data: result };
    },
    {
      body: t.Optional(
        t.Object({
          completed: t.Optional(t.Boolean()),
        })
      ),
    }
  )
  // Consultants
  .get('/consultants', async ({ query }) => {
    const slug = (query as any)?.slug || (query as any)?.competitionSlug;
    if (!slug) {
      return { data: [] };
    }
    const consultants = await roadmapService.getConsultantsByCompetitionSlug(slug);
    return { data: consultants };
  })
  .get('/consultants/:competitionSlug', async ({ params }) => {
    const consultants = await roadmapService.getConsultantsByCompetitionSlug(params.competitionSlug);
    return { data: consultants };
  })
  // Validator & Admin Endpoints
  .get('/admin/roadmaps/:competitionSlug', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const result = await roadmapService.getRoadmapAdminBySlug(
      params.competitionSlug,
      auth.user.institutionId
    );
    return { data: result };
  })
  .post(
    '/admin/roadmaps/:competitionSlug',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);

      const result = await roadmapService.createOrUpdateRoadmap(
        auth.user.id,
        params.competitionSlug,
        body.phases,
        auth.user.institutionId
      );

      return { data: result };
    },
    {
      body: t.Object({
        phases: t.Array(
          t.Object({
            id: t.Optional(t.String()),
            orderIndex: t.Number(),
            title: t.String(),
            description: t.Optional(t.String()),
            targetDays: t.Optional(t.Number()),
            tasks: t.Array(
              t.Object({
                id: t.Optional(t.String()),
                orderIndex: t.Number(),
                title: t.String(),
                description: t.Optional(t.String()),
                isRequired: t.Optional(t.Boolean()),
                resourceUrl: t.Optional(t.String()),
                resourceTitle: t.Optional(t.String()),
              })
            ),
          })
        ),
      }),
    }
  )
  .get('/admin/consultants', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const result = await roadmapService.listConsultantsAdmin(auth.user.institutionId);
    return { data: result };
  })
  .post(
    '/admin/consultants',
    async ({ auth, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);

      const result = await roadmapService.createConsultantContact(
        auth.user.id,
        body,
        auth.user.institutionId
      );

      return { data: result };
    },
    {
      body: t.Object({
        competitionSlug: t.String(),
        name: t.String(),
        field: t.String(),
        whatsappNumber: t.String(),
        capacityNote: t.Optional(t.String()),
        isApproved: t.Optional(t.Boolean()),
        status: t.Optional(t.Union([t.Literal('draft'), t.Literal('published'), t.Literal('archived')])),
      }),
    }
  )
  .patch(
    '/admin/consultants/:id',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);
      const result = await roadmapService.updateConsultantContact(
        auth.user.id,
        params.id,
        body,
        auth.user.institutionId
      );
      return { data: result };
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        field: t.Optional(t.String()),
        whatsappNumber: t.Optional(t.String()),
        capacityNote: t.Optional(t.String()),
        isApproved: t.Optional(t.Boolean()),
        status: t.Optional(t.Union([t.Literal('draft'), t.Literal('published'), t.Literal('archived')])),
      }),
    }
  )
  .delete('/admin/consultants/:id', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const result = await roadmapService.deleteConsultantContact(
      auth.user.id,
      params.id,
      auth.user.institutionId
    );
    return { data: result };
  });
