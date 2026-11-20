import { Elysia } from 'elysia';
import { prisma } from '../../lib/prisma';

export const healthRoutes = new Elysia({ prefix: '/health' })
  .get('/live', () => {
    return {
      data: {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    };
  })
  .get('/ready', async ({ set }) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        data: {
          status: 'ready',
          database: 'connected',
          timestamp: new Date().toISOString(),
        },
      };
    } catch {
      set.status = 503;
      return {
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Layanan basis data tidak dapat diakses saat ini.',
        },
      };
    }
  });
