import { Elysia, t } from 'elysia';
import * as pointsService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { ADMIN_ROLES, assertRole } from '../../app/middleware/rbac';
import { getDefaultInstitutionId } from '../competitions/service';
import type { AchievementLevel, AchievementResult } from '@prisma/client';

export const pointRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authPlugin)
  // Publik: daftar jenis/sub-lomba aktif & aturan poin kompetisi terbit
  .get('/competition-categories', async ({ auth }) => {
    const institutionId = auth?.user?.institutionId || (await getDefaultInstitutionId());
    const data = await pointsService.getCompetitionCategories(institutionId, false);
    return { data };
  })
  .get('/competitions/:slug/point-rules', async ({ params }) => {
    const data = await pointsService.getCompetitionPointConfig(params.slug, true);
    return { data };
  })

  // Template Poin Berversi (Read: validator & super_admin; Mutasi: khusus super_admin)
  .get('/system/point-templates', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ADMIN_ROLES);
    const data = await pointsService.getPointTemplates(auth.user.institutionId);
    return { data };
  })
  .post(
    '/system/point-templates',
    async ({ auth, body, set }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['super_admin']);
      const data = await pointsService.createPointTemplate(auth.user.institutionId, auth.user.id, {
        name: body.name,
        description: body.description,
        activateAsDefault: body.activateAsDefault,
        rules: body.rules as Array<{
          level: AchievementLevel;
          result: AchievementResult;
          points: number;
        }>,
      });
      set.status = 201;
      return { data };
    },
    {
      body: t.Object({
        name: t.String({ maxLength: 150 }),
        description: t.Optional(t.String({ maxLength: 1000 })),
        activateAsDefault: t.Optional(t.Boolean()),
        rules: t.Array(
          t.Object({
            level: t.String({ maxLength: 32 }),
            result: t.String({ maxLength: 32 }),
            points: t.Number({ minimum: 0, maximum: 10000 }),
          }),
          { maxItems: 60 }
        ),
      }),
    }
  )
  .post('/system/point-templates/:id/activate', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['super_admin']);
    const data = await pointsService.activatePointTemplate(
      auth.user.institutionId,
      params.id,
      auth.user.id
    );
    return { data };
  })

  // Validator & Super Admin: Jenis, Sub-Lomba, dan Poin Perlombaan
  .get('/admin/competition-categories', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const data = await pointsService.getCompetitionCategories(auth.user.institutionId, true);
    return { data };
  })
  .post(
    '/admin/competition-categories',
    async ({ auth, body, set }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);
      const data = await pointsService.createCompetitionCategory(
        auth.user.institutionId,
        auth.user.id,
        body
      );
      set.status = 201;
      return { data };
    },
    {
      body: t.Object({
        code: t.String(),
        name: t.String(),
        description: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    '/admin/competition-categories/:id',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);
      const data = await pointsService.updateCompetitionCategory(
        auth.user.institutionId,
        params.id,
        auth.user.id,
        body
      );
      return { data };
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .post(
    '/admin/competition-subcategories',
    async ({ auth, body, set }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);
      const data = await pointsService.createCompetitionSubCategory(
        auth.user.institutionId,
        auth.user.id,
        body as any
      );
      set.status = 201;
      return { data };
    },
    {
      body: t.Object({
        categoryId: t.String(),
        code: t.String(),
        name: t.String(),
        description: t.Optional(t.String()),
        defaultPointsNote: t.Optional(t.String()),
        rules: t.Optional(
          t.Array(
            t.Object({
              level: t.String(),
              result: t.String(),
              points: t.Number({ minimum: 0 }),
              description: t.Optional(t.String()),
            })
          )
        ),
      }),
    }
  )
  .patch(
    '/admin/competition-subcategories/:id',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);
      const data = await pointsService.updateCompetitionSubCategory(
        auth.user.institutionId,
        params.id,
        auth.user.id,
        body as any
      );
      return { data };
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        defaultPointsNote: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
        rules: t.Optional(
          t.Array(
            t.Object({
              level: t.String(),
              result: t.String(),
              points: t.Number({ minimum: 0 }),
              description: t.Optional(t.String()),
            })
          )
        ),
      }),
    }
  )
  .get('/admin/competitions/:id/point-rules', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const data = await pointsService.getCompetitionPointConfig(
      params.id,
      false,
      auth.user.institutionId
    );
    return { data };
  })
  .put(
    '/admin/competitions/:id/point-rules',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);
      const data = await pointsService.saveCompetitionPointConfig(
        auth.user.institutionId,
        params.id,
        auth.user.id,
        body as any
      );
      return { data };
    },
    {
      body: t.Object({
        pointTemplateId: t.Optional(t.Nullable(t.String())),
        competitionCategoryId: t.Optional(t.Nullable(t.String())),
        pointDescription: t.Optional(t.Nullable(t.String())),
        customRules: t.Optional(
          t.Array(
            t.Object({
              subCategoryId: t.Optional(t.Nullable(t.String())),
              level: t.String(),
              result: t.String(),
              points: t.Number({ minimum: 0 }),
              description: t.Optional(t.String()),
            })
          )
        ),
      }),
    }
  );
