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
  logLevel: string;
  uploadMaxBytes: number;
  timezoneDisplay: string;
  dbPoolLimit: number;
  userStorageQuotaBytes: number;
  maxRevisionsPerAchievement: number;
  maxAchievementsPerPeriod: number;
  maxSessionsPerUser: number;
  auditRetentionDays: number;
  storageRetentionInactiveDays: number;
  maintenanceIntervalMinutes: number;
  database: DatabaseConfig;
  sessionSecret: string;
  cookieSecret: string;
  publicOrigin: string;
  apiPublicOrigin?: string;
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

  if (host && user && name) {
    const auth = password
      ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
      : encodeURIComponent(user);
    const url = `mysql://${auth}@${host}:${port}/${name}`;
    return { host, port, user, password, name, url };
  }

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

function parsePositiveInt(raw: string | undefined, fallback: number, min = 1, max = Number.MAX_SAFE_INTEGER): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

function parseNonNegativeInt(raw: string | undefined, fallback: number, max = 36500): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) return fallback;
  return parsed;
}

export function loadConfig(): AppConfig {
  const database = resolveDatabaseConfig();
  const nodeEnv = (process.env.NODE_ENV || 'development') as
    | 'development'
    | 'production'
    | 'test';
  const port = parsePositiveInt(process.env.PORT, 3001, 1, 65535);
  const logLevel = process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug');
  const uploadMaxBytes = parsePositiveInt(
    process.env.UPLOAD_MAX_BYTES,
    8 * 1024 * 1024,
    1024,
    25 * 1024 * 1024
  );
  const timezoneDisplay = process.env.TIMEZONE_DISPLAY || 'Asia/Jakarta';
  const dbPoolLimit = parsePositiveInt(
    process.env.DB_POOL_LIMIT,
    nodeEnv === 'test' ? 5 : 15,
    2,
    100
  );
  const userStorageQuotaMb = parsePositiveInt(process.env.USER_STORAGE_QUOTA_MB, 100, 10, 5000);
  const userStorageQuotaBytes = userStorageQuotaMb * 1024 * 1024;
  const maxRevisionsPerAchievement = parsePositiveInt(process.env.MAX_REVISIONS_PER_ACHIEVEMENT, 5, 1, 50);
  const maxAchievementsPerPeriod = parsePositiveInt(process.env.MAX_ACHIEVEMENTS_PER_PERIOD, 30, 5, 500);
  const maxSessionsPerUser = parsePositiveInt(process.env.MAX_SESSIONS_PER_USER, 10, 2, 100);
  const auditRetentionDays = parseNonNegativeInt(process.env.AUDIT_RETENTION_DAYS, 365);
  const storageRetentionInactiveDays = parseNonNegativeInt(process.env.STORAGE_RETENTION_INACTIVE_DAYS, 90);
  const maintenanceIntervalMinutes = parsePositiveInt(process.env.MAINTENANCE_INTERVAL_MINUTES, 360, 5, 10080);

  const sessionSecret =
    process.env.SESSION_SECRET || 'dev-session-secret-min-32-chars-long-12345';
  const cookieSecret =
    process.env.COOKIE_SECRET || 'dev-cookie-secret-min-32-chars-long-12345';
  const publicOrigin =
    (process.env.PUBLIC_ORIGIN || 'http://localhost:5173').trim().replace(/\/+$/, '');
  const rawApiPublicOrigin = process.env.API_PUBLIC_ORIGIN?.trim();
  const apiPublicOrigin = rawApiPublicOrigin ? rawApiPublicOrigin.replace(/\/+$/, '') : undefined;
  const trustProxy = process.env.TRUST_PROXY === 'true';

  const superAdminBootstrapEmail =
    process.env.SUPER_ADMIN_BOOTSTRAP_EMAIL?.trim() || undefined;
  const superAdminBootstrapPassword =
    process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD;

  const smtp =
    process.env.SMTP_HOST && process.env.SMTP_USER
      ? {
          host: process.env.SMTP_HOST,
          port: parsePositiveInt(process.env.SMTP_PORT, 587, 1, 65535),
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
    logLevel,
    uploadMaxBytes,
    timezoneDisplay,
    dbPoolLimit,
    userStorageQuotaBytes,
    maxRevisionsPerAchievement,
    maxAchievementsPerPeriod,
    maxSessionsPerUser,
    auditRetentionDays,
    storageRetentionInactiveDays,
    maintenanceIntervalMinutes,
    database,
    sessionSecret,
    cookieSecret,
    publicOrigin,
    apiPublicOrigin,
    trustProxy,
    superAdminBootstrapEmail,
    superAdminBootstrapPassword,
    smtp,
    s3,
  };
}

export function safeOrigin(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function assertNonLoopbackOrigin(envName: string, rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`${envName} produksi wajib berupa URL origin yang valid.`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${envName} produksi wajib berupa URL HTTP/HTTPS yang valid.`);
  }
  if (
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '::1'
  ) {
    throw new Error(`${envName} produksi tidak boleh menggunakan alamat localhost/loopback.`);
  }
}

/**
 * Menentukan opsi cookie sesi sesuai topologi same-origin atau lintas subdomain HTTPS.
 */
export function getSessionCookieOptions(
  conf: Pick<AppConfig, 'nodeEnv' | 'publicOrigin' | 'apiPublicOrigin'>
): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax' | 'none';
  path: '/';
} {
  const isProd = conf.nodeEnv === 'production';
  let sameSite: 'lax' | 'none' = 'lax';

  if (isProd && conf.apiPublicOrigin) {
    const feOrigin = safeOrigin(conf.publicOrigin);
    const beOrigin = safeOrigin(conf.apiPublicOrigin);
    if (feOrigin && beOrigin && beOrigin !== feOrigin && beOrigin.startsWith('https://')) {
      sameSite = 'none';
    }
  }

  return {
    httpOnly: true,
    secure: isProd,
    sameSite,
    path: '/',
  };
}

export function isSmtpConfigured(conf: Pick<AppConfig, 'smtp'>): boolean {
  const smtp = conf.smtp;
  return Boolean(
    smtp &&
      smtp.host.trim() &&
      smtp.host.trim() !== 'smtp.example.com' &&
      !smtp.host.trim().startsWith('change-with-') &&
      smtp.user.trim() &&
      !smtp.user.trim().startsWith('change-with-') &&
      smtp.pass &&
      !smtp.pass.startsWith('change-with-')
  );
}

export function assertProductionConfig(conf: AppConfig): void {
  if (conf.nodeEnv !== 'production') return;

  const isWeakSecret = (val?: string) =>
    !val ||
    val.length < 32 ||
    val.startsWith('dev-') ||
    val.startsWith('change-with-');

  if (isWeakSecret(process.env.SESSION_SECRET)) {
    throw new Error('SESSION_SECRET produksi wajib diset minimal 32 karakter acak yang aman.');
  }
  if (isWeakSecret(process.env.COOKIE_SECRET)) {
    throw new Error('COOKIE_SECRET produksi wajib diset minimal 32 karakter acak yang aman.');
  }

  assertNonLoopbackOrigin('PUBLIC_ORIGIN', conf.publicOrigin);
  if (conf.apiPublicOrigin) {
    assertNonLoopbackOrigin('API_PUBLIC_ORIGIN', conf.apiPublicOrigin);
  }

  if (
    !conf.s3.endpoint ||
    !conf.s3.bucket ||
    !conf.s3.accessKey ||
    !conf.s3.secretKey ||
    conf.s3.accessKey.startsWith('change-with-') ||
    conf.s3.secretKey.startsWith('change-with-')
  ) {
    throw new Error('Konfigurasi S3/RustFS produksi wajib lengkap (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY).');
  }

  if (!isSmtpConfigured(conf)) {
    console.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'warn',
        scope: 'config',
        message:
          'SMTP produksi belum dikonfigurasi atau masih placeholder; server tetap berjalan namun fitur pemulihan kata sandi (forgot-password) akan mencatat error log dan gagal saat digunakan (K-13).',
      })
    );
  }
}

export const config = loadConfig();
