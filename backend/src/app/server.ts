import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { loadConfig } from '../lib/config';
import { authPlugin } from './middleware/auth';
import { formatErrorResponse } from './middleware/error';
import { healthRoutes } from '../modules/health';
import { authRoutes } from '../modules/auth';
import { profileRoutes } from '../modules/profile';

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
    .use(authPlugin)
    .use(healthRoutes)
    .use(authRoutes)
    .use(profileRoutes);

  return app;
}
