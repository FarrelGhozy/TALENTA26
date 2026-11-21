import { prisma } from '../../lib/prisma';
import { recordAuditEvent } from '../../lib/audit';
import { hashPassword } from '../../lib/password';
import { revokeAllUserSessions } from '../../lib/session';
import { getStorageDriverName, getStorageService } from '../../lib/storage';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../app/middleware/error';
import type { Role, UserStatus, AchievementLevel, AchievementResult, Prisma } from '@prisma/client';

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

  if (params.role) {
    where.role = params.role as Role;
  }

  if (params.status) {
    where.status = params.status as UserStatus;
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { email: { contains: q } },
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
          },
        },
      },
    }),
  ]);

  return {
    users,
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
  if (!['active', 'suspended', 'pending_verification'].includes(status)) {
    throw new ValidationError('Status pengguna tidak valid');
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, status: true, institutionId: true },
  });

  if (!target || target.institutionId !== institutionId) {
    throw new NotFoundError('Pengguna tidak ditemukan');
  }

  if (userId === actorId && status === 'suspended') {
    throw new ForbiddenError('Anda tidak dapat menangguhkan akun Anda sendiri');
  }

  const updated = await prisma.user.update({
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

  // Jika akun di-suspend, cabut semua sesi aktif secara instan
  if (status === 'suspended') {
    await revokeAllUserSessions(userId);
  }

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
      sessionsRevoked: status === 'suspended',
    },
  });

  return updated;
}

export async function createStaff(
  data: {
    email: string;
    password: string;
    fullName?: string;
    role: 'validator' | 'super_admin';
  },
  actorId: string,
  institutionId: string
) {
  const email = data.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new ValidationError('Format email tidak valid');
  }

  if (!data.password || data.password.length < 8) {
    throw new ValidationError('Password minimal 8 karakter');
  }

  if (!['validator', 'super_admin'].includes(data.role)) {
    throw new ValidationError('Peran staf hanya boleh validator atau super_admin');
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new ConflictError('Email sudah terdaftar dalam sistem');
  }

  const passwordHash = await hashPassword(data.password);

  const newUser = await prisma.user.create({
    data: {
      institutionId,
      email,
      passwordHash,
      role: data.role,
      status: 'active',
    },
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

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'STAFF_CREATED',
    targetType: 'User',
    targetId: newUser.id,
    metadata: {
      email: newUser.email,
      role: newUser.role,
    },
  });

  return newUser;
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

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, status: true, institutionId: true },
  });

  if (!target || target.institutionId !== institutionId) {
    throw new NotFoundError('Pengguna tidak ditemukan');
  }

  if (target.role === 'super_admin' && role !== 'super_admin') {
    if (userId === actorId) {
      throw new ForbiddenError('Anda tidak dapat menurunkan peran super admin milik Anda sendiri');
    }
    const activeSuperAdminCount = await prisma.user.count({
      where: { institutionId, role: 'super_admin', status: 'active' },
    });
    if (activeSuperAdminCount <= 1) {
      throw new ConflictError('Harus ada minimal satu super admin aktif di institusi');
    }
  }

  const updated = await prisma.user.update({
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

  if (target.role !== role) {
    await revokeAllUserSessions(userId);
  }

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
  data: { name: string; year: number; semester: string },
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

  const period = await prisma.academicPeriod.create({
    data: {
      institutionId,
      name: data.name.trim(),
      year: data.year,
      semester: data.semester,
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

export async function activateAcademicPeriod(
  periodId: string,
  actorId: string,
  institutionId: string
) {
  const period = await prisma.academicPeriod.findUnique({
    where: { id: periodId },
  });

  if (!period || period.institutionId !== institutionId) {
    throw new NotFoundError('Periode akademik tidak ditemukan');
  }

  // Atomik: nonaktifkan semua periode lain dan aktifkan yang dipilih
  const [, activated] = await prisma.$transaction([
    prisma.academicPeriod.updateMany({
      where: { institutionId },
      data: { isActive: false },
    }),
    prisma.academicPeriod.update({
      where: { id: periodId },
      data: { isActive: true },
    }),
  ]);

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'ACADEMIC_PERIOD_ACTIVATED',
    targetType: 'AcademicPeriod',
    targetId: periodId,
    metadata: {
      periodName: activated.name,
      year: activated.year,
      semester: activated.semester,
    },
  });

  return activated;
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

  for (const item of rules) {
    if (typeof item.points !== 'number' || item.points < 0) {
      throw new ValidationError(`Poin untuk level ${item.level} dan capaian ${item.result} harus berupa angka positif`);
    }
  }

  // Tentukan nomor versi baru
  const latestRule = await prisma.pointRule.findFirst({
    where: { institutionId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const nextVersion = (latestRule?.version ?? 0) + 1;

  // Atomik: nonaktifkan aturan versi sebelumnya dan masukkan versi baru
  await prisma.$transaction([
    prisma.pointRule.updateMany({
      where: { institutionId },
      data: { isActive: false },
    }),
    prisma.pointRule.createMany({
      data: rules.map((r) => ({
        institutionId,
        version: nextVersion,
        level: r.level,
        result: r.result,
        points: r.points,
        isActive: true,
      })),
    }),
  ]);

  const createdRules = await prisma.pointRule.findMany({
    where: { institutionId, version: nextVersion },
    orderBy: [{ level: 'asc' }, { points: 'desc' }],
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
