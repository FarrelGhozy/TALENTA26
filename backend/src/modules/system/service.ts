import { prisma } from '../../lib/prisma';
import { recordAuditEvent } from '../../lib/audit';
import { hashPassword } from '../../lib/password';
import { getStorageDriverName, getStorageService } from '../../lib/storage';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../app/middleware/error';
import type { Role, UserStatus, AchievementLevel, AchievementResult, Prisma } from '@prisma/client';

const VALID_ROLES = new Set<string>(['mahasiswa', 'validator', 'super_admin']);
const VALID_USER_STATUSES = new Set<string>(['active', 'suspended', 'pending_verification']);
const VALID_LEVELS = new Set<string>(['lokal', 'nasional', 'internasional']);
const VALID_RESULTS = new Set<string>([
  'partisipasi',
  'finalis',
  'juara_3',
  'juara_2',
  'juara_1',
  'penghargaan_khusus',
]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface UserFilterParams {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getUsers(institutionId: string, params: UserFilterParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    institutionId,
  };

  if (params.role === 'admin') {
    where.role = { in: ['validator', 'super_admin'] };
  } else if (params.role && params.role !== 'semua') {
    if (!VALID_ROLES.has(params.role)) {
      throw new ValidationError('Filter peran pengguna tidak valid');
    }
    where.role = params.role as Role;
  }

  if (params.status && params.status !== 'semua') {
    if (!VALID_USER_STATUSES.has(params.status)) {
      throw new ValidationError('Filter status pengguna tidak valid');
    }
    where.status = params.status as UserStatus;
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { email: { contains: q } },
      { fullName: { contains: q } },
      { studentProfile: { fullName: { contains: q } } },
      { studentProfile: { nim: { contains: q } } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        institutionId: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        studentProfile: {
          select: {
            id: true,
            nim: true,
            fullName: true,
            studyProgram: true,
            faculty: true,
            phone: true,
            avatarObjectKey: true,
            updatedAt: true,
          },
        },
      },
    }),
  ]);

  const sanitizedUsers = users.map((u) => {
    if (!u.studentProfile) {
      return { ...u, avatarUrl: null };
    }
    const { avatarObjectKey, updatedAt, ...safeProfile } = u.studentProfile;
    const avatarUrl = avatarObjectKey
      ? `/api/v1/users/${u.id}/avatar?v=${updatedAt ? updatedAt.getTime() : 1}`
      : null;
    return {
      ...u,
      avatarUrl,
      studentProfile: {
        ...safeProfile,
        avatarUrl,
      },
    };
  });

  return {
    users: sanitizedUsers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateUserStatus(
  userId: string,
  status: UserStatus,
  actorId: string,
  institutionId: string
) {
  if (!VALID_USER_STATUSES.has(status)) {
    throw new ValidationError('Status pengguna tidak valid');
  }

  const { updated, target } = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM institutions WHERE id = ${institutionId} FOR UPDATE`;

    const found = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true, institutionId: true },
    });

    if (!found || found.institutionId !== institutionId) {
      throw new NotFoundError('Pengguna tidak ditemukan');
    }

    if (userId === actorId && status !== 'active') {
      throw new ForbiddenError('Anda tidak dapat menangguhkan atau menonaktifkan akun Anda sendiri');
    }

    if (found.role === 'super_admin' && found.status === 'active' && status !== 'active') {
      const activeSuperAdminCount = await tx.user.count({
        where: { institutionId, role: 'super_admin', status: 'active' },
      });
      if (activeSuperAdminCount <= 1) {
        throw new ConflictError('Harus ada minimal satu super admin aktif di institusi');
      }
    }

    const upd = await tx.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        institutionId: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Jika akun tidak aktif (suspended / pending_verification), cabut semua sesi aktif secara atomik
    if (status !== 'active') {
      await tx.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return { updated: upd, target: found };
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'USER_STATUS_UPDATED',
    targetType: 'User',
    targetId: userId,
    metadata: {
      email: target.email,
      previousStatus: target.status,
      newStatus: status,
      sessionsRevoked: status !== 'active',
    },
  });

  return updated;
}

export async function createStaff(
  data: {
    email: string;
    password: string;
    fullName?: string;
    role?: 'admin' | 'validator' | 'super_admin';
  },
  actorId: string,
  institutionId: string
) {
  const email = data.email?.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    throw new ValidationError('Format email tidak valid');
  }

  if (!data.password || data.password.length < 8 || data.password.length > 128) {
    throw new ValidationError('Password harus 8–128 karakter');
  }

  // Default aman ke 'validator' bila peran tidak dispesifikasikan
  const normalizedRole: 'validator' | 'super_admin' =
    !data.role || data.role === 'admin' ? 'validator' : data.role;

  if (!['validator', 'super_admin'].includes(normalizedRole)) {
    throw new ValidationError('Peran admin tidak valid');
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new ConflictError('Email sudah terdaftar dalam sistem');
  }

  const passwordHash = await hashPassword(data.password);
  const displayName = (data.fullName?.trim() || email.split('@')[0]).slice(0, 150);

  const newUser = await prisma.user.create({
    data: {
      institutionId,
      email,
      fullName: displayName,
      passwordHash,
      role: normalizedRole,
      status: 'active',
    },
    select: {
      id: true,
      institutionId: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'STAFF_CREATED',
    targetType: 'User',
    targetId: newUser.id,
    metadata: {
      email: newUser.email,
      fullName: displayName,
      role: newUser.role,
    },
  });

  return newUser;
}

export async function updateUserName(
  userId: string,
  fullName: string,
  actorId: string,
  institutionId: string
) {
  const cleanName = fullName?.trim();
  if (!cleanName || cleanName.length < 2 || cleanName.length > 150) {
    throw new ValidationError('Nama lengkap harus 2–150 karakter');
  }
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      institutionId: true,
      fullName: true,
      role: true,
      studentProfile: { select: { id: true } },
    },
  });
  if (!target || target.institutionId !== institutionId) {
    throw new NotFoundError('Pengguna tidak ditemukan');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const upd = await tx.user.update({
      where: { id: userId },
      data: { fullName: cleanName },
      select: {
        id: true,
        institutionId: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
      },
    });
    if (target.studentProfile) {
      await tx.studentProfile.update({
        where: { userId },
        data: { fullName: cleanName },
      });
    }
    return upd;
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'USER_NAME_UPDATED',
    targetType: 'User',
    targetId: userId,
    metadata: { previousName: target.fullName, newName: cleanName },
  });

  return updated;
}

export async function updateStaffRole(
  userId: string,
  role: 'validator' | 'super_admin',
  actorId: string,
  institutionId: string
) {
  if (!['validator', 'super_admin'].includes(role)) {
    throw new ValidationError('Peran hanya boleh validator atau super_admin');
  }

  const { updated, target } = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM institutions WHERE id = ${institutionId} FOR UPDATE`;

    const found = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true, institutionId: true },
    });

    if (!found || found.institutionId !== institutionId) {
      throw new NotFoundError('Pengguna tidak ditemukan');
    }

    if (found.role === 'mahasiswa') {
      throw new ForbiddenError('Akun mahasiswa tidak dapat diubah menjadi akun staf secara langsung');
    }

    if (userId === actorId) {
      throw new ForbiddenError('Anda tidak dapat mengubah peran akun Anda sendiri');
    }

    if (found.role === 'super_admin' && role !== 'super_admin') {
      const activeSuperAdminCount = await tx.user.count({
        where: { institutionId, role: 'super_admin', status: 'active' },
      });
      if (activeSuperAdminCount <= 1) {
        throw new ConflictError('Harus ada minimal satu super admin aktif di institusi');
      }
    }

    const upd = await tx.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        institutionId: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (found.role !== role) {
      await tx.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return { updated: upd, target: found };
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'STAFF_ROLE_UPDATED',
    targetType: 'User',
    targetId: userId,
    metadata: {
      email: target.email,
      previousRole: target.role,
      newRole: role,
    },
  });

  return updated;
}

export async function getAcademicPeriods(institutionId: string) {
  return prisma.academicPeriod.findMany({
    where: { institutionId },
    orderBy: [{ year: 'desc' }, { semester: 'desc' }],
    include: {
      _count: {
        select: {
          competitions: true,
          achievements: true,
        },
      },
    },
  });
}

export async function createAcademicPeriod(
  data: { name: string; year: number; semester: string; startDate?: string; endDate?: string },
  actorId: string,
  institutionId: string
) {
  if (!data.name?.trim()) {
    throw new ValidationError('Nama periode akademik wajib diisi');
  }
  if (!data.year || data.year < 2000 || data.year > 2100) {
    throw new ValidationError('Tahun akademik tidak valid');
  }
  if (!['ganjil', 'genap'].includes(data.semester)) {
    throw new ValidationError('Semester harus ganjil atau genap');
  }

  const start = data.startDate ? new Date(data.startDate) : null;
  const end = data.endDate ? new Date(data.endDate) : null;
  if (start && end && start > end) {
    throw new ValidationError('Tanggal mulai periode tidak boleh melewati tanggal selesai');
  }

  const period = await prisma.academicPeriod.create({
    data: {
      institutionId,
      name: data.name.trim(),
      year: data.year,
      semester: data.semester,
      startDate: start,
      endDate: end,
      isActive: false,
    },
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'ACADEMIC_PERIOD_CREATED',
    targetType: 'AcademicPeriod',
    targetId: period.id,
    metadata: {
      name: period.name,
      year: period.year,
      semester: period.semester,
    },
  });

  return period;
}

function buildOldTargetsWhere(institutionId: string, periodId: string): Prisma.StudentTargetWhereInput {
  return {
    status: 'active',
    user: { institutionId },
    OR: [
      { academicPeriodId: { not: periodId } },
      {
        academicPeriodId: null,
        competition: {
          OR: [{ academicPeriodId: null }, { academicPeriodId: { not: periodId } }],
        },
      },
    ],
  };
}

function buildOldTeamsWhere(institutionId: string, periodId: string): Prisma.TeamWhereInput {
  return {
    status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
    competition: {
      institutionId,
      OR: [{ academicPeriodId: null }, { academicPeriodId: { not: periodId } }],
    },
  };
}

export async function getAcademicPeriodActivationPreview(
  periodId: string,
  institutionId: string
) {
  const targetPeriod = await prisma.academicPeriod.findUnique({ where: { id: periodId } });
  if (!targetPeriod || targetPeriod.institutionId !== institutionId) {
    throw new NotFoundError('Periode akademik tidak ditemukan');
  }

  const currentActive = await prisma.academicPeriod.findFirst({
    where: { institutionId, isActive: true, id: { not: periodId } },
  });

  const [activeTargetsToArchive, activeTeamsToArchive] = await Promise.all([
    prisma.studentTarget.count({
      where: buildOldTargetsWhere(institutionId, periodId),
    }),
    prisma.team.count({
      where: buildOldTeamsWhere(institutionId, periodId),
    }),
  ]);

  return {
    targetPeriod,
    currentActivePeriod: currentActive,
    activeTargetsToArchive,
    activeTeamsToArchive,
  };
}

export async function activateAcademicPeriod(
  periodId: string,
  actorId: string,
  institutionId: string,
  archiveOldTargets = true
) {
  const period = await prisma.academicPeriod.findUnique({
    where: { id: periodId },
  });

  if (!period || period.institutionId !== institutionId) {
    throw new NotFoundError('Periode akademik tidak ditemukan');
  }

  const result = await prisma.$transaction(async (tx) => {
    // Kunci baris institusi agar aktivasi periode paralel tidak menghasilkan 2 periode aktif
    await tx.$executeRaw`SELECT id FROM institutions WHERE id = ${institutionId} FOR UPDATE`;

    await tx.academicPeriod.updateMany({
      where: { institutionId, isActive: true, id: { not: periodId } },
      data: { isActive: false, archivedAt: new Date() },
    });

    const activated = await tx.academicPeriod.update({
      where: { id: periodId },
      data: { isActive: true, archivedAt: null },
    });

    let archivedTargetsCount = 0;
    let archivedTeamsCount = 0;

    if (archiveOldTargets) {
      const targetRes = await tx.studentTarget.updateMany({
        where: buildOldTargetsWhere(institutionId, periodId),
        data: { status: 'archived' },
      });
      archivedTargetsCount = targetRes.count;

      const oldTeamCompetitionWhere: Prisma.CompetitionWhereInput = {
        institutionId,
        OR: [{ academicPeriodId: null }, { academicPeriodId: { not: periodId } }],
      };

      const teamRes = await tx.team.updateMany({
        where: buildOldTeamsWhere(institutionId, periodId),
        data: { status: 'arsip', isRecruiting: false, version: { increment: 1 } },
      });
      archivedTeamsCount = teamRes.count;

      await tx.teamJoinRequest.updateMany({
        where: {
          status: 'menunggu',
          team: { competition: oldTeamCompetitionWhere },
        },
        data: { status: 'kedaluwarsa' },
      });

      await tx.teamInvite.updateMany({
        where: {
          status: 'diajukan',
          team: { competition: oldTeamCompetitionWhere },
        },
        data: { status: 'kedaluwarsa', respondedAt: new Date() },
      });

      await tx.internalSelection.updateMany({
        where: {
          institutionId,
          result: 'menunggu',
          competition: oldTeamCompetitionWhere,
        },
        data: {
          result: 'tidak',
          notes: 'Ditutup otomatis saat pergantian periode akademik',
        },
      });
    }

    return { activated, archivedTargetsCount, archivedTeamsCount };
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'ACADEMIC_PERIOD_ACTIVATED',
    targetType: 'AcademicPeriod',
    targetId: periodId,
    metadata: {
      periodName: result.activated.name,
      year: result.activated.year,
      semester: result.activated.semester,
      archivedTargetsCount: result.archivedTargetsCount,
      archivedTeamsCount: result.archivedTeamsCount,
    },
  });

  return result.activated;
}

export async function getPointRules(institutionId: string) {
  const allRules = await prisma.pointRule.findMany({
    where: { institutionId },
    orderBy: [{ version: 'desc' }, { level: 'asc' }, { points: 'desc' }],
  });

  // Kelompokkan per versi
  const versionsMap = new Map<number, typeof allRules>();
  for (const rule of allRules) {
    if (!versionsMap.has(rule.version)) {
      versionsMap.set(rule.version, []);
    }
    versionsMap.get(rule.version)!.push(rule);
  }

  const versions = Array.from(versionsMap.entries()).map(([version, rules]) => ({
    version,
    isActive: rules.some((r) => r.isActive),
    rulesCount: rules.length,
    rules,
  }));

  const activeRules = allRules.filter((r) => r.isActive);

  return {
    activeVersion: activeRules.length > 0 ? activeRules[0].version : null,
    activeRules,
    versions,
  };
}

export interface NewPointRuleItem {
  level: AchievementLevel;
  result: AchievementResult;
  points: number;
}

export async function createPointRuleVersion(
  rules: NewPointRuleItem[],
  actorId: string,
  institutionId: string
) {
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    throw new ValidationError('Daftar aturan poin tidak boleh kosong');
  }

  const seenPairs = new Set<string>();
  for (const item of rules) {
    if (!VALID_LEVELS.has(item.level) || !VALID_RESULTS.has(item.result)) {
      throw new ValidationError('Level atau hasil capaian pada aturan poin tidak valid');
    }
    if (!Number.isInteger(item.points) || item.points < 0 || item.points > 10000) {
      throw new ValidationError(
        `Poin untuk level ${item.level} dan capaian ${item.result} harus berupa bilangan bulat 0–10000`
      );
    }
    const pairKey = `${item.level}::${item.result}`;
    if (seenPairs.has(pairKey)) {
      throw new ValidationError(`Kombinasi duplikat ${item.level} / ${item.result} tidak diizinkan`);
    }
    seenPairs.add(pairKey);
  }

  const { nextVersion, createdRules } = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM institutions WHERE id = ${institutionId} FOR UPDATE`;

    const latestRule = await tx.pointRule.findFirst({
      where: { institutionId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const ver = (latestRule?.version ?? 0) + 1;

    await tx.pointRule.updateMany({
      where: { institutionId },
      data: { isActive: false },
    });
    // Sinkronkan PointTemplate aktif dengan versi baru aturan poin
    await tx.pointTemplate.updateMany({
      where: { institutionId },
      data: { isActive: false },
    });

    const newTemplate = await tx.pointTemplate.create({
      data: {
        institutionId,
        name: `Standar Institusi v${ver}`,
        description: 'Versi aturan poin standar institusi',
        version: ver,
        isActive: true,
      },
    });

    await tx.pointRule.createMany({
      data: rules.map((r) => ({
        institutionId,
        pointTemplateId: newTemplate.id,
        version: ver,
        level: r.level,
        result: r.result,
        points: r.points,
        isActive: true,
      })),
    });

    const rows = await tx.pointRule.findMany({
      where: { institutionId, version: ver },
      orderBy: [{ level: 'asc' }, { points: 'desc' }],
    });

    return { nextVersion: ver, createdRules: rows };
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'POINT_RULE_VERSION_CREATED',
    targetType: 'PointRule',
    targetId: `v${nextVersion}`,
    metadata: {
      version: nextVersion,
      rulesCount: createdRules.length,
    },
  });

  return {
    version: nextVersion,
    rules: createdRules,
  };
}

export interface AuditLogFilterParams {
  action?: string;
  actorId?: string;
  targetType?: string;
  page?: number;
  limit?: number;
}

export async function getAuditLogs(institutionId: string, params: AuditLogFilterParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.AuditEventWhereInput = {
    institutionId,
  };

  if (params.action) {
    where.action = params.action;
  }
  if (params.actorId) {
    where.actorId = params.actorId;
  }
  if (params.targetType) {
    where.targetType = params.targetType;
  }

  const [total, logs] = await Promise.all([
    prisma.auditEvent.count({ where }),
    prisma.auditEvent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            studentProfile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getHealthSummary(institutionId: string) {
  // 1. Cek koneksi basis data MySQL
  let dbStatus = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'disconnected';
  }

  // 2. Cek koneksi S3 RustFS Storage
  let storageStatus = 'connected';
  try {
    const storage = getStorageService();
    const available = await storage.isAvailable();
    if (!available) {
      storageStatus = 'disconnected';
    }
  } catch {
    storageStatus = 'disconnected';
  }

  // 3. Hitung metrik sistem
  const [totalUsers, pendingVerifications, auditLogsCount] = await Promise.all([
    prisma.user.count({ where: { institutionId } }),
    prisma.achievement.count({ where: { institutionId, status: 'menunggu' } }),
    prisma.auditEvent.count({ where: { institutionId } }),
  ]);

  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  return {
    status: dbStatus === 'connected' && storageStatus === 'connected' ? 'healthy' : 'degraded',
    database: {
      status: dbStatus,
      type: 'MySQL / MariaDB',
    },
    storage: {
      status: storageStatus,
      type: getStorageDriverName(),
    },
    system: {
      uptimeSeconds,
      memory: {
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      },
    },
    metrics: {
      totalUsers,
      pendingVerifications,
      auditLogsCount,
    },
  };
}
