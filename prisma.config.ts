import { defineConfig } from '@prisma/config';

function resolveDatabaseUrl(): string {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME;

  if (host && user && database) {
    const auth = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}` : encodeURIComponent(user);
    return `mysql://${auth}@${host}:${port}/${database}`;
  }

  return process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/talenta_dev';
}

export default defineConfig({
  schema: 'backend/prisma/schema.prisma',
  datasource: {
    url: resolveDatabaseUrl(),
  },
  migrations: {
    path: 'backend/prisma/migrations',
    seed: 'bun backend/prisma/seed.ts',
  },
});
