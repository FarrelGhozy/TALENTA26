import { prisma } from './prisma';
import { loadConfig } from './config';
import { getStorageService, type IStorageService } from './storage';
import { logger } from './logger';

export interface MaintenanceOptions {
  dryRun?: boolean;
  now?: Date;
  storage?: IStorageService;
  batchSize?: number;
  maxBatchesPerTable?: number;
  orphanGraceHours?: number;
  auditRetentionDays?: number;
  storageRetentionInactiveDays?: number;
}

export interface MaintenanceSummary {
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  skippedDueToLock: boolean;
  mysql: {
    authSessionsPruned: number;
    passwordResetTokensPruned: number;
    teamInvitesExpired: number;
    teamInvitesPruned: number;
    teamJoinRequestsPruned: number;
    auditEventsPruned: number;
  };
  storage: {
    retentionCandidates: number;
    retentionFilesDeleted: number;
    orphanObjectsScanned: number;
    orphanObjectsDeleted: number;
    deleteErrors: number;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

let isRunning = false;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let initialDelayTimer: ReturnType<typeof setTimeout> | null = null;

async function batchedDelete(
  dryRun: boolean,
  batchSize: number,
  maxBatches: number,
  countFn: () => Promise<number>,
  selectIdsFn: (take: number) => Promise<string[]>,
  deleteByIdsFn: (ids: string[]) => Promise<number>
): Promise<number> {
  if (dryRun) {
    return countFn();
  }
  let totalDeleted = 0;
  for (let i = 0; i < maxBatches; i++) {
    const ids = await selectIdsFn(batchSize);
    if (ids.length === 0) break;
    const deleted = await deleteByIdsFn(ids);
    totalDeleted += deleted;
    if (ids.length < batchSize) break;
  }
  return totalDeleted;
}

/**
 * Jalankan siklus pemeliharaan anti-bloat MySQL (batched TTL pruning) dan RustFS (retention + Orphan GC).
 * Dilindungi single-flight lock sehingga pemanggilan paralel tidak saling menabrak.
 */
export async function runMaintenance(options: MaintenanceOptions = {}): Promise<MaintenanceSummary> {
  const startedAtDate = new Date();
  const dryRun = Boolean(options.dryRun);

  const emptySummary = (skippedDueToLock: boolean): MaintenanceSummary => {
    const finishedAtDate = new Date();
    return {
      dryRun,
      startedAt: startedAtDate.toISOString(),
      finishedAt: finishedAtDate.toISOString(),
      durationMs: finishedAtDate.getTime() - startedAtDate.getTime(),
      skippedDueToLock,
      mysql: {
        authSessionsPruned: 0,
        passwordResetTokensPruned: 0,
        teamInvitesExpired: 0,
        teamInvitesPruned: 0,
        teamJoinRequestsPruned: 0,
        auditEventsPruned: 0,
      },
      storage: {
        retentionCandidates: 0,
        retentionFilesDeleted: 0,
        orphanObjectsScanned: 0,
        orphanObjectsDeleted: 0,
        deleteErrors: 0,
      },
    };
  };

  if (isRunning) {
    logger.warn('MAINTENANCE', 'Siklus pemeliharaan dilewati karena masih ada eksekusi aktif');
    return emptySummary(true);
  }

  isRunning = true;
  try {
    const conf = loadConfig();
    const now = options.now ?? new Date();
    const batchSize = Math.max(50, Math.min(2000, options.batchSize ?? 500));
    const maxBatches = Math.max(1, options.maxBatchesPerTable ?? 20);
    const orphanGraceHours = Math.max(0, options.orphanGraceHours ?? 24);
    const auditRetentionDays = options.auditRetentionDays ?? conf.auditRetentionDays;
    const storageRetentionInactiveDays =
      options.storageRetentionInactiveDays ?? conf.storageRetentionInactiveDays;

    const sessionCutoff = new Date(now.getTime() - 7 * DAY_MS);
    const resetTokenCutoff = new Date(now.getTime() - 24 * HOUR_MS);
    const terminalRequestCutoff = new Date(now.getTime() - 90 * DAY_MS);

    // 1. MySQL: AuthSession expired/revoked > 7 hari
    const sessionWhere = {
      OR: [
        { expiresAt: { lt: sessionCutoff } },
        { revokedAt: { lt: sessionCutoff } },
      ],
    };
    const authSessionsPruned = await batchedDelete(
      dryRun,
      batchSize,
      maxBatches,
      () => prisma.authSession.count({ where: sessionWhere }),
      async (take) =>
        (
          await prisma.authSession.findMany({
            where: sessionWhere,
            select: { id: true },
            take,
          })
        ).map((r) => r.id),
      async (ids) => (await prisma.authSession.deleteMany({ where: { id: { in: ids } } })).count
    );

    // 2. MySQL: PasswordResetToken used/expired > 24 jam
    const resetWhere = {
      OR: [
        { expiresAt: { lt: resetTokenCutoff } },
        { usedAt: { lt: resetTokenCutoff } },
      ],
    };
    const passwordResetTokensPruned = await batchedDelete(
      dryRun,
      batchSize,
      maxBatches,
      () => prisma.passwordResetToken.count({ where: resetWhere }),
      async (take) =>
        (
          await prisma.passwordResetToken.findMany({
            where: resetWhere,
            select: { id: true },
            take,
          })
        ).map((r) => r.id),
      async (ids) =>
        (await prisma.passwordResetToken.deleteMany({ where: { id: { in: ids } } })).count
    );

    // 3. MySQL: Auto-expire TeamInvite legacy yang sudah melewati expiresAt
    const overdueInviteWhere = {
      status: 'diajukan' as const,
      expiresAt: { lt: now },
    };
    let teamInvitesExpired = 0;
    if (dryRun) {
      teamInvitesExpired = await prisma.teamInvite.count({ where: overdueInviteWhere });
    } else {
      const expRes = await prisma.teamInvite.updateMany({
        where: overdueInviteWhere,
        data: { status: 'kedaluwarsa', respondedAt: now },
      });
      teamInvitesExpired = expRes.count;
    }

    // 4. MySQL: TeamInvite terminal > 90 hari
    const oldInviteWhere = {
      status: { in: ['dibatalkan', 'ditolak', 'kedaluwarsa'] as ('dibatalkan' | 'ditolak' | 'kedaluwarsa')[] },
      createdAt: { lt: terminalRequestCutoff },
    };
    const teamInvitesPruned = await batchedDelete(
      dryRun,
      batchSize,
      maxBatches,
      () => prisma.teamInvite.count({ where: oldInviteWhere }),
      async (take) =>
        (
          await prisma.teamInvite.findMany({
            where: oldInviteWhere,
            select: { id: true },
            take,
          })
        ).map((r) => r.id),
      async (ids) => (await prisma.teamInvite.deleteMany({ where: { id: { in: ids } } })).count
    );

    // 5. MySQL: TeamJoinRequest terminal > 90 hari
    const oldJoinReqWhere = {
      status: { in: ['dibatalkan', 'ditolak', 'kedaluwarsa'] as ('dibatalkan' | 'ditolak' | 'kedaluwarsa')[] },
      updatedAt: { lt: terminalRequestCutoff },
    };
    const teamJoinRequestsPruned = await batchedDelete(
      dryRun,
      batchSize,
      maxBatches,
      () => prisma.teamJoinRequest.count({ where: oldJoinReqWhere }),
      async (take) =>
        (
          await prisma.teamJoinRequest.findMany({
            where: oldJoinReqWhere,
            select: { id: true },
            take,
          })
        ).map((r) => r.id),
      async (ids) =>
        (await prisma.teamJoinRequest.deleteMany({ where: { id: { in: ids } } })).count
    );

    // 6. MySQL: AuditEvent > AUDIT_RETENTION_DAYS (0 = simpan permanen)
    let auditEventsPruned = 0;
    if (auditRetentionDays > 0) {
      const auditCutoff = new Date(now.getTime() - auditRetentionDays * DAY_MS);
      const auditWhere = { createdAt: { lt: auditCutoff } };
      auditEventsPruned = await batchedDelete(
        dryRun,
        batchSize,
        maxBatches,
        () => prisma.auditEvent.count({ where: auditWhere }),
        async (take) =>
          (
            await prisma.auditEvent.findMany({
              where: auditWhere,
              select: { id: true },
              take,
            })
          ).map((r) => r.id),
        async (ids) => (await prisma.auditEvent.deleteMany({ where: { id: { in: ids } } })).count
      );
    }

    // 7. RustFS: Retensi bukti tak aktif (isActive=false) / ditolak / dibatalkan > STORAGE_RETENTION_INACTIVE_DAYS
    const storage = options.storage ?? getStorageService();
    let retentionCandidates = 0;
    let retentionFilesDeleted = 0;
    let deleteErrors = 0;

    if (storageRetentionInactiveDays > 0) {
      const retentionCutoff = new Date(now.getTime() - storageRetentionInactiveDays * DAY_MS);
      const retentionWhere = {
        fileSize: { gt: 0 },
        uploadedAt: { lt: retentionCutoff },
        OR: [
          { isActive: false },
          { achievement: { status: { in: ['ditolak', 'dibatalkan'] as ('ditolak' | 'dibatalkan')[] } } },
        ],
      };

      if (dryRun) {
        retentionCandidates = await prisma.achievementEvidence.count({ where: retentionWhere });
      } else {
        const rows = await prisma.achievementEvidence.findMany({
          where: retentionWhere,
          select: { id: true, objectKey: true },
          take: batchSize,
        });
        retentionCandidates = rows.length;
        for (const row of rows) {
          try {
            await storage.deleteFile(row.objectKey);
            await prisma.achievementEvidence.update({
              where: { id: row.id },
              data: { isActive: false, fileSize: 0 },
            });
            retentionFilesDeleted += 1;
          } catch (err) {
            deleteErrors += 1;
            logger.warn('MAINTENANCE', 'Gagal menghapus berkas retensi dari storage', {
              evidenceId: row.id,
              objectKey: row.objectKey,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    }

    // 8. RustFS: Orphan Garbage Collection (objek di institutions/ tak dirujuk DB & umur > orphanGraceHours)
    let orphanObjectsScanned = 0;
    let orphanObjectsDeleted = 0;

    try {
      const allStorageObjects = await storage.listKeys('institutions/');
      orphanObjectsScanned = allStorageObjects.length;

      if (allStorageObjects.length > 0) {
        const orphanCutoffMs = now.getTime() - orphanGraceHours * HOUR_MS;
        const agedObjects = allStorageObjects.filter(
          (obj) => obj.lastModified.getTime() < orphanCutoffMs
        );

        if (agedObjects.length > 0) {
          const [avatarRefs, evidenceRefs] = await Promise.all([
            prisma.studentProfile.findMany({
              where: { avatarObjectKey: { not: null } },
              select: { avatarObjectKey: true },
            }),
            prisma.achievementEvidence.findMany({
              where: { fileSize: { gt: 0 } },
              select: { objectKey: true },
            }),
          ]);

          const referencedKeys = new Set<string>();
          for (const a of avatarRefs) {
            if (a.avatarObjectKey) referencedKeys.add(a.avatarObjectKey);
          }
          for (const e of evidenceRefs) {
            if (e.objectKey) referencedKeys.add(e.objectKey);
          }

          const orphanObjects = agedObjects.filter((obj) => !referencedKeys.has(obj.key));

          for (const orphan of orphanObjects) {
            if (dryRun) {
              orphanObjectsDeleted += 1;
            } else {
              try {
                await storage.deleteFile(orphan.key);
                orphanObjectsDeleted += 1;
              } catch (err) {
                deleteErrors += 1;
                logger.warn('MAINTENANCE', 'Gagal menghapus objek yatim dari storage', {
                  objectKey: orphan.key,
                  error: err instanceof Error ? err.message : String(err),
                });
              }
            }
          }
        }
      }
    } catch (err) {
      deleteErrors += 1;
      logger.warn('MAINTENANCE', 'Pemindaian Orphan GC storage gagal', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const finishedAtDate = new Date();
    const summary: MaintenanceSummary = {
      dryRun,
      startedAt: startedAtDate.toISOString(),
      finishedAt: finishedAtDate.toISOString(),
      durationMs: finishedAtDate.getTime() - startedAtDate.getTime(),
      skippedDueToLock: false,
      mysql: {
        authSessionsPruned,
        passwordResetTokensPruned,
        teamInvitesExpired,
        teamInvitesPruned,
        teamJoinRequestsPruned,
        auditEventsPruned,
      },
      storage: {
        retentionCandidates,
        retentionFilesDeleted,
        orphanObjectsScanned,
        orphanObjectsDeleted,
        deleteErrors,
      },
    };

    logger.info('MAINTENANCE', 'Siklus pemeliharaan anti-bloat selesai', {
      dryRun: summary.dryRun,
      durationMs: summary.durationMs,
      mysql: summary.mysql,
      storage: summary.storage,
    });

    return summary;
  } finally {
    isRunning = false;
  }
}

export function startMaintenanceScheduler(): void {
  const conf = loadConfig();
  if (conf.nodeEnv === 'test' || process.env.MAINTENANCE_SCHEDULER_DISABLED === 'true') {
    return;
  }
  if (schedulerTimer || initialDelayTimer) return;

  const intervalMs = conf.maintenanceIntervalMinutes * 60 * 1000;
  // Tunda 2 menit pasca startup agar tidak membebani boot/healthcheck awal
  initialDelayTimer = setTimeout(() => {
    initialDelayTimer = null;
    void runMaintenance().catch((err) => {
      logger.error('MAINTENANCE', 'Gagal menjalankan pemeliharaan awal', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, 2 * 60 * 1000);
  if (typeof initialDelayTimer.unref === 'function') {
    initialDelayTimer.unref();
  }

  schedulerTimer = setInterval(() => {
    void runMaintenance().catch((err) => {
      logger.error('MAINTENANCE', 'Gagal menjalankan pemeliharaan berkala', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, intervalMs);
  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }

  logger.info('MAINTENANCE', 'Penjadwal pemeliharaan anti-bloat aktif', {
    intervalMinutes: conf.maintenanceIntervalMinutes,
    auditRetentionDays: conf.auditRetentionDays,
    storageRetentionInactiveDays: conf.storageRetentionInactiveDays,
  });
}

export function stopMaintenanceScheduler(): void {
  if (initialDelayTimer) {
    clearTimeout(initialDelayTimer);
    initialDelayTimer = null;
  }
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
