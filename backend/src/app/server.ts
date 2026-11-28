import crypto from 'node:crypto';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { assertProductionConfig, loadConfig, safeOrigin } from '../lib/config';
import { authPlugin } from './middleware/auth';
import { formatErrorResponse } from './middleware/error';
import { healthRoutes } from '../modules/health';
import { authRoutes } from '../modules/auth';
import { profileRoutes, userRoutes } from '../modules/profile';
import { competitionRoutes } from '../modules/competitions';
import { targetRoutes } from '../modules/targets';
import { teamRoutes } from '../modules/teams';
import { roadmapRoutes } from '../modules/roadmaps';
import { achievementRoutes } from '../modules/achievements';
import { systemRoutes } from '../modules/system';
import { dashboardRoutes } from '../modules/dashboard';
import { assertSameOrigin } from './middleware/csrf';
import { selectionRoutes } from '../modules/selections';
import { pointRoutes } from '../modules/points';
import { seoRoutes } from '../modules/seo';
import { resolveClientIp } from './middleware/client-ip';
import {
  applyRateLimitHeaders,
  globalApiLimiter,
  mutationUserLimiter,
} from './middleware/rate-limit';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PRIVATE_PREFIXES = ['/api/v1/auth/', '/api/v1/me/', '/api/v1/admin/', '/api/v1/system/'];

export function createServer() {
  const currentConfig = loadConfig();
  assertProductionConfig(currentConfig);

  const primaryOrigin = safeOrigin(currentConfig.publicOrigin) || currentConfig.publicOrigin;
  const allowedOrigins =
    currentConfig.nodeEnv === 'production'
      ? [primaryOrigin]
      : [primaryOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'];

  const app = new Elysia()
    .use(
      cors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key'],
        exposeHeaders: ['Retry-After', 'X-Request-Id', 'Content-Disposition'],
      })
    )
    .derive({ as: 'global' }, ({ request, set }) => {
      const incomingId = request.headers.get('x-request-id');
      const requestId =
        incomingId && /^[a-zA-Z0-9._-]{8,64}$/.test(incomingId)
          ? incomingId
          : crypto.randomUUID();
      set.headers['x-request-id'] = requestId;
      set.headers['x-content-type-options'] = 'nosniff';
      set.headers['referrer-policy'] = 'strict-origin-when-cross-origin';

      const pathname = new URL(request.url).pathname;
      if (PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        set.headers['cache-control'] = 'no-store';
      }

      return { requestId };
    })
    .onError(({ error, set, request }) => {
      const headerReqId =
        typeof set.headers['x-request-id'] === 'string'
          ? set.headers['x-request-id']
          : request.headers.get('x-request-id') || crypto.randomUUID();
      const { status, body, headers } = formatErrorResponse(error, headerReqId);
      set.status = status;
      set.headers['x-request-id'] = headerReqId;
      if (headers) {
        for (const [k, v] of Object.entries(headers)) {
          set.headers[k.toLowerCase()] = v;
        }
      }
      return body;
    })
    .use(authPlugin)
    .onBeforeHandle(({ request, headers, set, server, auth }) => {
      assertSameOrigin(request);

      const pathname = new URL(request.url).pathname;
      if (pathname.startsWith('/api/v1/')) {
        const remoteAddress = server?.requestIP?.(request)?.address;
        const clientIp = resolveClientIp(headers, remoteAddress);
        const rl = globalApiLimiter.check(`api:${clientIp}`);
        applyRateLimitHeaders(set.headers as Record<string, string | number>, rl);

        if (
          auth?.user &&
          !SAFE_METHODS.has(request.method.toUpperCase()) &&
          !pathname.startsWith('/api/v1/auth/')
        ) {
          mutationUserLimiter.check(`mut:${auth.user.id}`);
        }
      }
    })
    .use(healthRoutes)
    .use(authRoutes)
    .use(profileRoutes)
    .use(userRoutes)
    .use(competitionRoutes)
    .use(targetRoutes)
    .use(teamRoutes)
    .use(roadmapRoutes)
    .use(achievementRoutes)
    .use(systemRoutes)
    .use(dashboardRoutes)
    .use(selectionRoutes)
    .use(pointRoutes)
    .use(seoRoutes);

  return app;
}
