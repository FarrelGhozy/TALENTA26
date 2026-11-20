import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { loadConfig } from './config';

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (prismaInstance) return prismaInstance;

  const currentConfig = loadConfig();
  const rawUrl = currentConfig.databaseUrl;
  const parsedUrl = new URL(
    rawUrl.replace(/^mysql:/, 'http:').replace(/^mariadb:/, 'http:')
  );

  const adapter = new PrismaMariaDb({
    host: parsedUrl.hostname,
    port: parseInt(parsedUrl.port || '3306', 10),
    user: parsedUrl.username || 'root',
    password: parsedUrl.password || '',
    database: parsedUrl.pathname.replace(/^\//, ''),
    connectionLimit: currentConfig.nodeEnv === 'test' ? 5 : 15,
  });

  prismaInstance = new PrismaClient({ adapter });
  return prismaInstance;
}

export async function closeDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

export const prisma = getPrisma();
