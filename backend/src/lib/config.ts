export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
  url: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  database: DatabaseConfig;
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

export function resolveDatabaseConfig(): DatabaseConfig {
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD || '';
  const name = process.env.DB_NAME;

  // Prioritaskan variabel terpecah (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
  if (host && user && name) {
    const auth = password
      ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
      : encodeURIComponent(user);
    const url = `mysql://${auth}@${host}:${port}/${name}`;
    return {
      host,
      port,
      user,
      password,
      name,
      url,
    };
  }

  // Fallback ke DATABASE_URL bila ada atau default lokal dev
  const rawUrl =
    process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/talenta_dev';
  try {
    const parsed = new URL(
      rawUrl.replace(/^mysql:/, 'http:').replace(/^mariadb:/, 'http:')
    );
    return {
      host: parsed.hostname || '127.0.0.1',
      port: parseInt(parsed.port || '3306', 10),
      user: decodeURIComponent(parsed.username || 'root'),
      password: decodeURIComponent(parsed.password || ''),
      name: parsed.pathname.replace(/^\//, '') || 'talenta_dev',
      url: rawUrl,
    };
  } catch {
    return {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      name: 'talenta_dev',
      url: rawUrl,
    };
  }
}

export function loadConfig(): AppConfig {
  const database = resolveDatabaseConfig();
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
    database,
    sessionSecret,
    cookieSecret,
    publicOrigin,
    superAdminBootstrapEmail,
    superAdminBootstrapPassword,
    smtp,
  };
}

export const config = loadConfig();
