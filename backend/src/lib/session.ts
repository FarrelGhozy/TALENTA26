import crypto from 'node:crypto';
import { prisma } from './prisma';
import type { User, StudentProfile } from '@prisma/client';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface SessionData {
  session: {
    id: string;
    sessionToken: string;
    expiresAt: Date;
    userId: string;
  };
  user: User & {
    studentProfile: StudentProfile | null;
  };
}

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.authSession.create({
    data: {
      userId,
      sessionToken: token,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function validateSession(token: string): Promise<SessionData | null> {
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { sessionToken: token },
    include: {
      user: {
        include: {
          studentProfile: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.revokedAt !== null) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (session.user.status !== 'active') return null;

  return {
    session: {
      id: session.id,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      userId: session.userId,
    },
    user: session.user,
  };
}

export async function revokeSession(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    await prisma.authSession.updateMany({
      where: { sessionToken: token, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
