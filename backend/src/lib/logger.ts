import { loadConfig } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getConfiguredLevel(): LogLevel {
  const raw = (loadConfig().logLevel || 'info').toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw;
  }
  return 'info';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getConfiguredLevel()];
}

function formatLine(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>): string {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...(meta ? { meta } : {}),
  };
  return JSON.stringify(payload);
}

export const logger = {
  debug(scope: string, message: string, meta?: Record<string, unknown>) {
    if (shouldLog('debug')) {
      console.debug(formatLine('debug', scope, message, meta));
    }
  },
  info(scope: string, message: string, meta?: Record<string, unknown>) {
    if (shouldLog('info')) {
      console.log(formatLine('info', scope, message, meta));
    }
  },
  warn(scope: string, message: string, meta?: Record<string, unknown>) {
    if (shouldLog('warn')) {
      console.warn(formatLine('warn', scope, message, meta));
    }
  },
  error(scope: string, message: string, meta?: Record<string, unknown>) {
    if (shouldLog('error')) {
      console.error(formatLine('error', scope, message, meta));
    }
  },
};
