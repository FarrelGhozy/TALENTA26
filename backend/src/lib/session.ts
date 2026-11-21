import crypto from 'node:crypto';
import { prisma } from './prisma';
import { loadConfig } from './config';
import type { User, StudentProfile } from '@prisma/client';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function hashSessionToken(token: string): string {
  const secret = loadConfig().sessionSecret;
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

export interface SessionData {
  session: {
    id: string;
    expiresAt: Date;
    userId: string;
  };
  user: Omit<User, 'passwordHash'> & {
    studentProfile: StudentProfile | null;
  };
}

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSecureToken(32);
  const tokenDigest = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.authSession.create({
    data: {
      userId,
      sessionToken: tokenDigest,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function validateSession(token: string): Promise<SessionData | null> {
  if (!token) return null;
  const tokenDigest = hashSessionToken(token);

  const session = await prisma.authSession.findUnique({
    where: { sessionToken: tokenDigest },
    include: {
      user: {
        select: {
          id: true,
          institutionId: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
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
      expiresAt: session.expiresAt,
      userId: session.userId,
    },
    user: session.user,
  };
}

export async function revokeSession(token: string): Promise<boolean> {
  if (!token) return false;
  const tokenDigest = hashSessionToken(token);
  try {
    await prisma.authSession.updateMany({
      where: { sessionToken: tokenDigest, revokedAt: null },
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
