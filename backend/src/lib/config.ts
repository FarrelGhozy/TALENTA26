export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
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
  trustProxy: boolean;
  superAdminBootstrapEmail?: string;
  superAdminBootstrapPassword?: string;
  smtp?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    secure: boolean;
  };
  s3: {
    endpoint?: string;
    region: string;
    bucket: string;
    accessKey?: string;
    secretKey?: string;
    forcePathStyle: boolean;
  };
}

export function resolveDatabaseConfig(): DatabaseConfig {
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD ? process.env.DB_PASSWORD : undefined;
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
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      name: parsed.pathname.replace(/^\//, '') || 'talenta_dev',
      url: rawUrl,
    };
  } catch {
    return {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: undefined,
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
  const trustProxy = process.env.TRUST_PROXY === 'true';

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
          secure: process.env.SMTP_SECURE === 'true',
        }
      : undefined;

  const s3 = {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'talentadevtest',
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  };

  return {
    port,
    nodeEnv,
    database,
    sessionSecret,
    cookieSecret,
    publicOrigin,
    trustProxy,
    superAdminBootstrapEmail,
    superAdminBootstrapPassword,
    smtp,
    s3,
  };
}

export const config = loadConfig();
