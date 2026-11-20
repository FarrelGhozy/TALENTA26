import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

export interface AuditParams {
  institutionId: string;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const REDACTED_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'tokenHash',
  'sessionToken',
  'cookieSecret',
  'sessionSecret',
]);

function redactMetadata(obj?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!obj) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactMetadata(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function recordAuditEvent(params: AuditParams): Promise<void> {
  try {
    const safeMetadata = redactMetadata(params.metadata);
    await prisma.auditEvent.create({
      data: {
        institutionId: params.institutionId,
        actorId: params.actorId || null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId || null,
        metadata: safeMetadata as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    // Audit failure should not crash main transaction but should be logged to stderr
    console.error('[AUDIT_ERROR] Failed to record audit event:', error);
  }
}
