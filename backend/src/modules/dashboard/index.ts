import { Elysia, t } from 'elysia';
import * as dashboardService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';

export const dashboardRoutes = new Elysia()
  .use(authPlugin)
  // Dashboard Mahasiswa
  .get('/api/v1/me/dashboard', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);
    const institutionId = auth.user.institutionId;

    const data = await dashboardService.getStudentDashboard(auth.user.id, institutionId);
    return { data };
  })

  // Dashboard Validator & Super Admin
  .get('/api/v1/admin/dashboard', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const institutionId = auth.user.institutionId;

    const data = await dashboardService.getAdminDashboardStats(institutionId);
    return { data };
  })
  .get('/api/v1/stats/admin', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);
    const institutionId = auth.user.institutionId;

    const data = await dashboardService.getAdminDashboardStats(institutionId);
    return { data };
  })

  // Export Rekap Prestasi CSV Resmi
  .get(
    '/api/v1/admin/export',
    async ({ auth, query }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);
      const institutionId = auth.user.institutionId;

      const csvContent = await dashboardService.generateAchievementsCsv(
        institutionId,
        {
          status: query.status,
          academicPeriodId: query.academicPeriodId,
          category: query.category,
        },
        auth.user.id
      );

      const todayStr = new Date().toISOString().split('T')[0];
      const filename = `rekap-prestasi-talenta-${todayStr}.csv`;

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        academicPeriodId: t.Optional(t.String()),
        category: t.Optional(t.String()),
      }),
    }
  );
