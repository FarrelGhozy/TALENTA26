import { ForbiddenError } from './error';
import { loadConfig } from '../../lib/config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function assertSameOrigin(request: Request): void {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return;
  const origin = request.headers.get('origin');
  const usesSessionCookie = request.headers
    .get('cookie')
    ?.split(';')
    .some((cookie) => cookie.trim().startsWith('talenta_session='));
  if (!origin) {
    if (usesSessionCookie) {
      throw new ForbiddenError('Origin sesi tidak tersedia');
    }
    return;
  }
  const currentConfig = loadConfig();
  const expectedOrigin = new URL(currentConfig.publicOrigin).origin;
  const isDevOrigin =
    currentConfig.nodeEnv !== 'production' &&
    (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173');
  if (origin !== expectedOrigin && !isDevOrigin) {
    throw new ForbiddenError('Permintaan lintas situs ditolak');
  }
}
