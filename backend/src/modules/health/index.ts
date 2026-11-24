import { Elysia } from 'elysia';
import { prisma } from '../../lib/prisma';
import { resolveClientIp } from '../../app/middleware/client-ip';
import { healthReadyIpLimiter } from '../../app/middleware/rate-limit';

export const healthRoutes = new Elysia({ prefix: '/health' })
  .get('/', () => {
    return {
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  })
  .get('/live', () => {
    return {
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  })
  .get('/ready', async ({ set, headers, request, server }) => {
    const remoteAddress = server?.requestIP?.(request)?.address;
    const clientIp = resolveClientIp(headers, remoteAddress);
    healthReadyIpLimiter.check(`health:${clientIp}`);

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
