import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  schema: 'backend/prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'backend/prisma/migrations',
    seed: 'bun backend/prisma/seed.ts',
  },
});
