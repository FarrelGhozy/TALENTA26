import type { Role } from '@prisma/client';
import type { SessionData } from '../../lib/session';
import { ForbiddenError, UnauthorizedError } from './error';

export const ADMIN_ROLES: Role[] = ['validator', 'super_admin'];

export function assertRole(auth: SessionData | null, allowedRoles: Role[]): asserts auth is SessionData {
  if (!auth || !auth.user) {
    throw new UnauthorizedError();
  }
  if (!allowedRoles.includes(auth.user.role)) {
    throw new ForbiddenError(
      `Peran '${auth.user.role}' tidak memiliki izin untuk mengakses tindakan ini.`
    );
  }
}

export function isMahasiswa(auth: SessionData | null): boolean {
  return auth?.user?.role === 'mahasiswa';
}

export function isAdmin(auth: SessionData | null): boolean {
  return auth?.user?.role === 'validator' || auth?.user?.role === 'super_admin';
}

export function isValidator(auth: SessionData | null): boolean {
  return isAdmin(auth);
}

export function isSuperAdmin(auth: SessionData | null): boolean {
  return auth?.user?.role === 'super_admin';
}
