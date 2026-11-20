import { Elysia } from 'elysia';
import { validateSession, type SessionData } from '../../lib/session';
import { UnauthorizedError } from './error';

export function extractToken(
  authHeader?: string | null,
  cookieToken?: string | null,
  queryToken?: string | null
): string | null {
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (cookieToken) {
    return cookieToken.trim();
  }
  if (queryToken) {
    return queryToken.trim();
  }
  return null;
}

export async function resolveAuth(
  authHeader?: string | null,
  cookieToken?: string | null,
  queryToken?: string | null
): Promise<SessionData | null> {
  const token = extractToken(authHeader, cookieToken, queryToken);
  if (!token) return null;
  return validateSession(token);
}

export function assertAuthenticated(auth: SessionData | null): asserts auth is SessionData {
  if (!auth || !auth.user) {
    throw new UnauthorizedError('Sesi Anda tidak valid atau telah berakhir. Silakan masuk kembali.');
  }
}

export const authPlugin = new Elysia({ name: 'auth-plugin' }).derive(
  { as: 'scoped' },
  async ({ headers, cookie, query }) => {
    const rawCookie = cookie.talenta_session?.value;
    const cookieStr = typeof rawCookie === 'string' ? rawCookie : null;
    const queryToken = (query as any)?.token;
    const auth = await resolveAuth(headers['authorization'], cookieStr, queryToken);
    return { auth };
  }
);
