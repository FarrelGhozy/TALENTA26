import { Elysia, t } from 'elysia';
import * as systemService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';
import type { UserStatus, AchievementLevel, AchievementResult } from '@prisma/client';

export const systemRoutes = new Elysia()
  .use(authPlugin)
  // Pengguna & Staf
  .get(
    '/api/v1/system/users',
    async ({ auth, query }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['super_admin']);
      const institutionId = auth.user.institutionId;

      const data = await systemService.getUsers(institutionId, {
        role: query.role,
        status: query.status,
        search: query.q || query.search,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
      });

      return { data };
    },
    {
      query: t.Object({
        role: t.Optional(t.String()),
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        q: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    '/api/v1/system/users/:id/status',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['super_admin']);
      const institutionId = auth.user.institutionId;

      const data = await systemService.updateUserStatus(
        params.id,
        body.status as UserStatus,
        auth.user.id,
        institutionId
      );

      return {
        message: `Status akun berhasil diperbarui menjadi ${body.status}`,
        data,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        status: t.Union([
          t.Literal('active'),
          t.Literal('suspended'),
          t.Literal('pending_verification'),
        ]),
      }),
    }
  )
  .post(
    '/api/v1/system/users/staff',
    async ({ auth, body, set }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['super_admin']);
      const institutionId = auth.user.institutionId;

      const data = await systemService.createStaff(
        {
          email: body.email,
          password: body.password,
          fullName: body.fullName,
          role: body.role,
        },
        auth.user.id,
        institutionId
      );

      set.status = 201;
      return {
        message: 'Akun staf berhasil dibuat',
        data,
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String({ minLength: 8 }),
        fullName: t.Optional(t.String()),
        role: t.Optional(t.Union([t.Literal('admin'), t.Literal('validator'), t.Literal('super_admin')])),
      }),
    }
  )
  .patch(
    '/api/v1/system/users/:id/role',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['super_admin']);
      const institutionId = auth.user.institutionId;

      const data = await systemService.updateStaffRole(
        params.id,
        body.role,
        auth.user.id,
        institutionId
      );

      return {
        message: `Peran akun staf berhasil diperbarui menjadi ${body.role}`,
        data,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        role: t.Union([t.Literal('validator'), t.Literal('super_admin')]),
      }),
    }
  )

  .patch(
    '/api/v1/system/users/:id/name',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['super_admin']);
      const data = await systemService.updateUserName(
        params.id,
        body.fullName,
        auth.user.id,
        auth.user.institutionId
      );
      return { message: 'Nama akun berhasil diperbarui', data };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ fullName: t.String() }),
    }
  )

  // Periode Akademik
  .get('/api/v1/system/academic-periods', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['super_admin']);
    const institutionId = auth.user.institutionId;

    const data = await systemService.getAcademicPeriods(institutionId);
    return { data };
  })
  .post(
    '/api/v1/system/academic-periods',
    async ({ auth, body, set }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['super_admin']);
      const institutionId = auth.user.institutionId;

      const data = await systemService.createAcademicPeriod(
        {
          name: body.name,
          year: body.year,
          semester: body.semester,
          startDate: body.startDate,
          endDate: body.endDate,
        },
        auth.user.id,
        institutionId
      );

      set.status = 201;
      return {
        message: 'Periode akademik berhasil dibuat',
        data,
      };
    },
    {
      body: t.Object({
        name: t.String(),
        year: t.Number(),
        semester: t.Union([t.Literal('ganjil'), t.Literal('genap')]),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
    }
  )
  .get(
    '/api/v1/system/academic-periods/:id/activation-preview',
    async ({ auth, params }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['super_admin']);
      const data = await systemService.getAcademicPeriodActivationPreview(
        params.id,
        auth.user.institutionId
      );
      return { data };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  .post(
    '/api/v1/system/academic-periods/:id/activate',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['super_admin']);
      const institutionId = auth.user.institutionId;

      const data = await systemService.activateAcademicPeriod(
        params.id,
        auth.user.id,
        institutionId,
        body?.archiveOldTargets ?? true
      );

      return {
        message: `Periode akademik ${data.name} berhasil diaktifkan`,
        data,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Optional(
        t.Object({
          archiveOldTargets: t.Optional(t.Boolean()),
        })
      ),
    }
  )

  // Aturan Poin
  .get('/api/v1/system/point-rules', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['super_admin']);
    const institutionId = auth.user.institutionId;

    const data = await systemService.getPointRules(institutionId);
    return { data };
  })
  .post(
    '/api/v1/system/point-rules/version',
    async ({ auth, body, set }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['super_admin']);
      const institutionId = auth.user.institutionId;

      const data = await systemService.createPointRuleVersion(
        body.rules as Array<{
          level: AchievementLevel;
          result: AchievementResult;
          points: number;
        }>,
        auth.user.id,
        institutionId
      );

      set.status = 201;
      return {
        message: `Versi aturan poin v${data.version} berhasil diterbitkan dan diaktifkan`,
        data,
      };
    },
    {
      body: t.Object({
        rules: t.Array(
          t.Object({
            level: t.Union([
              t.Literal('lokal'),
              t.Literal('nasional'),
              t.Literal('internasional'),
            ]),
            result: t.Union([
              t.Literal('partisipasi'),
              t.Literal('finalis'),
              t.Literal('juara_3'),
              t.Literal('juara_2'),
              t.Literal('juara_1'),
              t.Literal('penghargaan_khusus'),
            ]),
            points: t.Number({ minimum: 0, maximum: 10000 }),
          }),
          { maxItems: 60 }
        ),
      }),
    }
  )

  // Jejak Audit
  .get(
    '/api/v1/system/audit-logs',
    async ({ auth, query }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['super_admin']);
      const institutionId = auth.user.institutionId;

      const data = await systemService.getAuditLogs(institutionId, {
        action: query.action,
        actorId: query.actorId,
        targetType: query.targetType,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
      });

      return { data };
    },
    {
      query: t.Object({
        action: t.Optional(t.String()),
        actorId: t.Optional(t.String()),
        targetType: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // Kesehatan & Telemetri Sistem
  .get('/api/v1/system/health', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['super_admin']);
    const institutionId = auth.user.institutionId;

    const data = await systemService.getHealthSummary(institutionId);
    return { data };
  });
