import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { loadConfig } from '../lib/config';
import { authPlugin } from './middleware/auth';
import { formatErrorResponse } from './middleware/error';
import { healthRoutes } from '../modules/health';
import { authRoutes } from '../modules/auth';
import { profileRoutes, userRoutes } from '../modules/profile';
import { competitionRoutes } from '../modules/competitions';
import { targetRoutes } from '../modules/targets';
import { matchingRoutes } from '../modules/matching';
import { teamRoutes } from '../modules/teams';
import { roadmapRoutes } from '../modules/roadmaps';
import { achievementRoutes } from '../modules/achievements';
import { systemRoutes } from '../modules/system';
import { dashboardRoutes } from '../modules/dashboard';
import { assertSameOrigin } from './middleware/csrf';
import { selectionRoutes } from '../modules/selections';

export function createServer() {
  const currentConfig = loadConfig();

  const app = new Elysia()
    .use(
      cors({
        origin: [currentConfig.publicOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      })
    )
    .onError(({ error, set }) => {
      const { status, body } = formatErrorResponse(error);
      set.status = status;
      return body;
    })
    .onBeforeHandle(({ request }) => assertSameOrigin(request))
    .use(authPlugin)
    .use(healthRoutes)
    .use(authRoutes)
    .use(profileRoutes)
    .use(userRoutes)
    .use(competitionRoutes)
    .use(targetRoutes)
    .use(matchingRoutes)
    .use(teamRoutes)
    .use(roadmapRoutes)
    .use(achievementRoutes)
    .use(systemRoutes)
    .use(dashboardRoutes)
    .use(selectionRoutes);

  return app;
}
