export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  databaseUrl: string;
  sessionSecret: string;
  cookieSecret: string;
  publicOrigin: string;
  superAdminBootstrapEmail?: string;
  superAdminBootstrapPassword?: string;
  smtp?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
}

export function loadConfig(): AppConfig {
  const databaseUrl =
    process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/talenta_dev';
  const nodeEnv = (process.env.NODE_ENV || 'development') as
    | 'development'
    | 'production'
    | 'test';
  const port = parseInt(process.env.PORT || '3001', 10);
  const sessionSecret =
    process.env.SESSION_SECRET || 'dev-session-secret-min-32-chars-long-12345';
  const cookieSecret =
    process.env.COOKIE_SECRET || 'dev-cookie-secret-min-32-chars-long-12345';
  const publicOrigin =
    process.env.PUBLIC_ORIGIN || 'http://localhost:5173';

  const superAdminBootstrapEmail = process.env.SUPER_ADMIN_BOOTSTRAP_EMAIL;
  const superAdminBootstrapPassword =
    process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD;

  const smtp =
    process.env.SMTP_HOST && process.env.SMTP_USER
      ? {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || '',
          from: process.env.SMTP_FROM || 'no-reply@unida.gontor.ac.id',
        }
      : undefined;

  return {
    port,
    nodeEnv,
    databaseUrl,
    sessionSecret,
    cookieSecret,
    publicOrigin,
    superAdminBootstrapEmail,
    superAdminBootstrapPassword,
    smtp,
  };
}

export const config = loadConfig();
