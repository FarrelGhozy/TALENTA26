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
  const expectedOrigin = new URL(loadConfig().publicOrigin).origin;
  if (origin !== expectedOrigin) {
    throw new ForbiddenError('Permintaan lintas situs ditolak');
  }
}
