import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { loadConfig } from './config';

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (prismaInstance) return prismaInstance;

  const currentConfig = loadConfig();
  const db = currentConfig.database;

  const adapter = new PrismaMariaDb({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.name,
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
