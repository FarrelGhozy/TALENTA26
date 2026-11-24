import { prisma } from './prisma';
import { logger } from './logger';
import type { Prisma } from '@prisma/client';

const MAX_AUDIT_METADATA_BYTES = 8 * 1024;
const MAX_AUDIT_UA_LEN = 255;
const MAX_AUDIT_IP_LEN = 45;

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

function boundMetadata(obj?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!obj) return undefined;
  const redacted = redactMetadata(obj);
  if (!redacted) return undefined;
  const serialized = JSON.stringify(redacted);
  const bytes = Buffer.byteLength(serialized, 'utf8');
  if (bytes > MAX_AUDIT_METADATA_BYTES) {
    return {
      _truncated: true,
      originalBytes: bytes,
      keys: Object.keys(redacted).slice(0, 20),
    };
  }
  return redacted;
}

export async function recordAuditEvent(params: AuditParams): Promise<void> {
  try {
    const safeMetadata = boundMetadata(params.metadata);
    await prisma.auditEvent.create({
      data: {
        institutionId: params.institutionId,
        actorId: params.actorId || null,
        action: params.action.slice(0, 120),
        targetType: params.targetType.slice(0, 80),
        targetId: params.targetId ? params.targetId.slice(0, 120) : null,
        metadata: safeMetadata as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress ? params.ipAddress.slice(0, MAX_AUDIT_IP_LEN) : null,
        userAgent: params.userAgent ? params.userAgent.slice(0, MAX_AUDIT_UA_LEN) : null,
      },
    });
  } catch (error) {
    // Audit failure should not crash main transaction but should be logged to stderr
    logger.error('AUDIT', 'Failed to record audit event', {
      action: params.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
