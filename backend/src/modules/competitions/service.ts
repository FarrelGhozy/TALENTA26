import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { ConflictError, NotFoundError, ValidationError } from '../../app/middleware/error';
import { recordAuditEvent } from '../../lib/audit';
import { appReadCache, invalidateCompetitionCache } from '../../lib/cache';
import type { Competition, AcademicPeriod, CompetitionFormat, CompetitionStatus, RegistrationStatus, Prisma } from '@prisma/client';

const VALID_COMPETITION_FORMATS = new Set<string>(['individu', 'beregu']);

function parseDeadlineInput(val?: string | null): Date | null {
  if (!val || !val.trim()) return null;
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T23:59:59+07:00`);
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError('Format tanggal tenggat tidak valid');
  }
  return d;
}

export interface CompetitionFilterParams {
  category?: string;
  level?: string;
  format?: string;
  periodId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateCompetitionDto {
  name: string;
  organizer: string;
  category: string;
  level?: string;
  format: CompetitionFormat;
  minTeamMembers?: number;
  maxTeamMembers?: number;
  requiredRoles?: string[];
  registrationDeadline?: string | null;
  competitionDate?: string | null;
  registrationStatus?: RegistrationStatus;
  internalSelectionDeadline?: string | null;
  requireRoles?: boolean;
  requireCrossStudyProgram?: boolean;
  singleTeamPerCompetition?: boolean;
  description: string;
  requirements?: string[];
  scheduleTimeline?: Array<{ label: string; tanggal: string }>;
  competitionCategoryId?: string | null;
  pointTemplateId?: string | null;
  pointDescription?: string | null;
  sourceUrl?: string | null;
}

export interface UpdateCompetitionDto extends Partial<CreateCompetitionDto> {
  status?: CompetitionStatus;
}

export interface CompetitionDeletePreview {
  competition: {
    id: string;
    name: string;
    slug: string;
    status: CompetitionStatus;
  };
  counts: {
    targets: number;
    activeTargets: number;
    teams: number;
    lockedSelectionTeams: number;
    teamMembers: number;
    teamJoinRequests: number;
    teamInvites: number;
    roadmaps: number;
    roadmapPhases: number;
    roadmapTasks: number;
    roadmapProgress: number;
    consultants: number;
    selections: number;
    customPointRules: number;
    preservedAchievements: number;
  };
  requiresTypedConfirmation: boolean;
}

export interface CompetitionDeleteResult {
  deletedId: string;
  name: string;
  slug: string;
  previousStatus: CompetitionStatus;
  deletedSummary: Omit<CompetitionDeletePreview['counts'], 'preservedAchievements'>;
  preservedAchievementsCount: number;
}

export async function getDefaultInstitutionId(): Promise<string> {
  const inst = await prisma.institution.upsert({
    where: { code: 'unida-gontor' },
    update: {},
    create: { code: 'unida-gontor', name: 'Universitas Darussalam Gontor' },
  });
  return inst.id;
}

function normalizePagination(page?: number, limit?: number): { page: number; limit: number; skip: number } {
  const safePage = Number.isFinite(page) && (page as number) >= 1 ? Math.floor(page as number) : 1;
  const safeLimit =
    Number.isFinite(limit) && (limit as number) >= 1
      ? Math.min(100, Math.floor(limit as number))
      : 100;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export async function getPublishedCompetitions(filters: CompetitionFilterParams = {}) {
  const whereClause: Prisma.CompetitionWhereInput = {
    status: 'published',
  };

  if (filters.category && filters.category !== 'semua') {
    whereClause.category = filters.category;
  }

  if (filters.level && filters.level !== 'semua') {
    whereClause.level = filters.level;
  }

  if (filters.format && filters.format !== 'semua') {
    if (!VALID_COMPETITION_FORMATS.has(filters.format)) {
      throw new ValidationError('Filter format kompetisi tidak valid');
    }
    whereClause.format = filters.format as CompetitionFormat;
  }

  if (filters.periodId && filters.periodId !== 'semua') {
    whereClause.academicPeriodId = filters.periodId;
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    whereClause.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
      { organizer: { contains: q } },
    ];
  }

  const { page, limit, skip } = normalizePagination(filters.page, filters.limit);
  const cacheKey = `competitions:pub:${filters.category || ''}:${filters.level || ''}:${filters.format || ''}:${filters.periodId || ''}:${(filters.search || '').trim().toLowerCase()}:${page}:${limit}`;

  return appReadCache.getOrSet(cacheKey, async () => {
    const [items, total] = await Promise.all([
      prisma.competition.findMany({
        where: whereClause,
        include: {
          academicPeriod: { select: { id: true, name: true, year: true, semester: true } },
          competitionCategory: {
            include: { subCategories: { where: { isActive: true } } },
          },
          pointTemplate: { select: { id: true, name: true, version: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.competition.count({ where: whereClause }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  });
}

export async function getCompetitionBySlug(slug: string): Promise<Competition | null> {
  return prisma.competition.findFirst({
    where: { slug, status: 'published' },
    include: {
      academicPeriod: true,
      competitionCategory: {
        include: { subCategories: { where: { isActive: true } } },
      },
      pointTemplate: {
        include: { rules: true },
      },
      competitionPointRules: {
        where: { isActive: true },
        include: { subCategory: { select: { id: true, name: true, code: true } } },
      },
      consultantContacts: {
        where: { isApproved: true, status: 'published' },
      },
      roadmaps: {
        where: { status: 'published' },
        include: {
          phases: {
            orderBy: { orderIndex: 'asc' },
            include: {
              tasks: {
                orderBy: { orderIndex: 'asc' },
              },
            },
          },
        },
      },
    },
  });
}

export async function getCurrentAcademicPeriod(institutionId?: string): Promise<AcademicPeriod | null> {
  const resolvedInstitutionId = institutionId || (await getDefaultInstitutionId());
  return appReadCache.getOrSet(`period:current:${resolvedInstitutionId}`, () =>
    prisma.academicPeriod.findFirst({
      where: { institutionId: resolvedInstitutionId, isActive: true },
    })
  );
}

const ADMIN_COMPETITION_INCLUDE = {
  academicPeriod: true,
  competitionCategory: { select: { id: true, name: true, code: true } },
  pointTemplate: { select: { id: true, name: true, version: true } },
  roadmaps: {
    select: {
      id: true,
      status: true,
      version: true,
      _count: { select: { phases: true } },
    },
    orderBy: { version: 'desc' as const },
    take: 1,
  },
  _count: {
    select: {
      competitionPointRules: true,
      teams: true,
      studentTargets: true,
      consultantContacts: true,
      selections: true,
      roadmaps: true,
    },
  },
} satisfies Prisma.CompetitionInclude;

export async function getAllCompetitionsAdmin(
  institutionId?: string,
  pagination?: { page?: number; limit?: number }
) {
  const whereClause = institutionId ? { institutionId } : undefined;
  const { page, limit, skip } = normalizePagination(pagination?.page, pagination?.limit);

  const [items, total] = await Promise.all([
    prisma.competition.findMany({
      where: whereClause,
      include: ADMIN_COMPETITION_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.competition.count({ where: whereClause }),
  ]);

  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getCompetitionByIdAdmin(id: string, institutionId: string) {
  const comp = await prisma.competition.findUnique({
    where: { id },
    include: ADMIN_COMPETITION_INCLUDE,
  });
  if (!comp || comp.institutionId !== institutionId) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }
  return comp;
}

function normalizeTeamBounds(
  format: CompetitionFormat,
  minInput?: number,
  maxInput?: number
): { minTeamMembers: number; maxTeamMembers: number } {
  if (format === 'individu') {
    return { minTeamMembers: 1, maxTeamMembers: 1 };
  }
  const min = Math.max(1, minInput ?? 2);
  const max = Math.max(min, maxInput ?? 5);
  return { minTeamMembers: min, maxTeamMembers: max };
}

export async function createCompetition(
  institutionId: string,
  actorId: string,
  dto: CreateCompetitionDto
): Promise<Competition> {
  if (!dto.name || !dto.organizer || !dto.category || !dto.description) {
    throw new ValidationError('Nama, penyelenggara, kategori, dan deskripsi wajib diisi');
  }

  const baseSlug =
    dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'kompetisi';

  if (dto.competitionCategoryId) {
    const cat = await prisma.competitionCategory.findUnique({
      where: { id: dto.competitionCategoryId },
    });
    if (!cat || cat.institutionId !== institutionId) {
      throw new ValidationError('Jenis lomba tidak ditemukan di institusi Anda');
    }
  }
  if (dto.pointTemplateId) {
    const tpl = await prisma.pointTemplate.findUnique({
      where: { id: dto.pointTemplateId },
    });
    if (!tpl || tpl.institutionId !== institutionId) {
      throw new ValidationError('Template poin tidak ditemukan di institusi Anda');
    }
  }

  const activePeriod = await getCurrentAcademicPeriod(institutionId);
  const { minTeamMembers, maxTeamMembers } = normalizeTeamBounds(
    dto.format,
    dto.minTeamMembers,
    dto.maxTeamMembers
  );

  const uniqueSuffix = crypto.randomBytes(3).toString('hex');
  const trimmedSourceUrl = dto.sourceUrl?.trim() || null;

  const comp = await prisma.competition.create({
    data: {
      institutionId,
      academicPeriodId: activePeriod?.id || null,
      competitionCategoryId: dto.competitionCategoryId || null,
      pointTemplateId: dto.pointTemplateId || null,
      pointDescription: dto.pointDescription?.trim() || null,
      sourceUrl: trimmedSourceUrl,
      sourceUpdatedAt: trimmedSourceUrl ? new Date() : null,
      slug: `${baseSlug.slice(0, 120)}-${uniqueSuffix}`,
      name: dto.name.trim(),
      organizer: dto.organizer.trim(),
      category: dto.category.trim(),
      level: dto.level || 'nasional',
      format: dto.format,
      minTeamMembers,
      maxTeamMembers,
      requiredRoles: dto.requiredRoles || [],
      registrationDeadline: parseDeadlineInput(dto.registrationDeadline),
      competitionDate: parseDeadlineInput(dto.competitionDate),
      registrationStatus: dto.registrationStatus || 'buka',
      internalSelectionDeadline: parseDeadlineInput(dto.internalSelectionDeadline),
      requireRoles: dto.format === 'individu' ? false : Boolean(dto.requireRoles),
      requireCrossStudyProgram: dto.format === 'individu' ? false : Boolean(dto.requireCrossStudyProgram),
      // Rilis pertama menerapkan 1 tim aktif per kompetisi per mahasiswa (Keputusan #3)
      singleTeamPerCompetition: true,
      description: dto.description.trim(),
      requirements: dto.requirements || [],
      scheduleTimeline: dto.scheduleTimeline || [],
      status: 'draft',
      version: 1,
    },
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'COMPETITION_CREATED',
    targetType: 'Competition',
    targetId: comp.id,
    metadata: { name: comp.name, slug: comp.slug },
  });

  invalidateCompetitionCache();
  return comp;
}

export async function updateCompetition(
  id: string,
  actorId: string,
  dto: UpdateCompetitionDto,
  institutionId?: string
): Promise<Competition> {
  const existing = await prisma.competition.findUnique({ where: { id } });
  if (!existing || (institutionId && existing.institutionId !== institutionId)) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  const nextFormat = dto.format || existing.format;
  const bounds = normalizeTeamBounds(
    nextFormat,
    dto.minTeamMembers ?? existing.minTeamMembers,
    dto.maxTeamMembers ?? existing.maxTeamMembers
  );

  if (dto.competitionCategoryId) {
    const cat = await prisma.competitionCategory.findUnique({
      where: { id: dto.competitionCategoryId },
    });
    if (!cat || cat.institutionId !== existing.institutionId) {
      throw new ValidationError('Jenis lomba tidak ditemukan di institusi Anda');
    }
  }
  if (dto.pointTemplateId) {
    const tpl = await prisma.pointTemplate.findUnique({
      where: { id: dto.pointTemplateId },
    });
    if (!tpl || tpl.institutionId !== existing.institutionId) {
      throw new ValidationError('Template poin tidak ditemukan di institusi Anda');
    }
  }

  // Cegah perubahan format beregu -> individu atau penurunan maxTeamMembers yang merusak tim aktif
  if (
    (existing.format === 'beregu' && nextFormat === 'individu') ||
    bounds.maxTeamMembers < existing.maxTeamMembers
  ) {
    const activeTeams = await prisma.team.findMany({
      where: {
        competitionId: id,
        status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
      },
      select: {
        id: true,
        name: true,
        _count: { select: { members: { where: { status: 'active' } } } },
      },
    });
    if (existing.format === 'beregu' && nextFormat === 'individu' && activeTeams.length > 0) {
      throw new ConflictError(
        `Tidak dapat mengubah format ke individu karena masih terdapat ${activeTeams.length} tim aktif pada lomba ini`
      );
    }
    const oversizedTeam = activeTeams.find((t) => t._count.members > bounds.maxTeamMembers);
    if (oversizedTeam) {
      throw new ConflictError(
        `Batas maksimal anggota (${bounds.maxTeamMembers}) lebih kecil dari jumlah anggota aktif tim '${oversizedTeam.name}' (${oversizedTeam._count.members})`
      );
    }
  }

  const updateData: Prisma.CompetitionUpdateInput = {
    version: { increment: 1 },
    minTeamMembers: bounds.minTeamMembers,
    maxTeamMembers: bounds.maxTeamMembers,
  };

  if (dto.name !== undefined) updateData.name = dto.name.trim();
  if (dto.organizer !== undefined) updateData.organizer = dto.organizer.trim();
  if (dto.category !== undefined) updateData.category = dto.category.trim();
  if (dto.level !== undefined) updateData.level = dto.level;
  if (dto.format !== undefined) updateData.format = dto.format;
  if (dto.requiredRoles !== undefined) updateData.requiredRoles = dto.requiredRoles;
  if (dto.description !== undefined) updateData.description = dto.description.trim();
  if (dto.requirements !== undefined) updateData.requirements = dto.requirements;
  if (dto.scheduleTimeline !== undefined) updateData.scheduleTimeline = dto.scheduleTimeline;
  if (dto.registrationDeadline !== undefined) {
    updateData.registrationDeadline = parseDeadlineInput(dto.registrationDeadline);
  }
  if (dto.competitionDate !== undefined) {
    updateData.competitionDate = parseDeadlineInput(dto.competitionDate);
  }
  if (dto.registrationStatus !== undefined) {
    updateData.registrationStatus = dto.registrationStatus;
  }
  if (dto.internalSelectionDeadline !== undefined) {
    updateData.internalSelectionDeadline = parseDeadlineInput(dto.internalSelectionDeadline);
  }
  if (nextFormat === 'individu') {
    updateData.requireRoles = false;
    updateData.requireCrossStudyProgram = false;
  } else {
    if (dto.requireRoles !== undefined) updateData.requireRoles = Boolean(dto.requireRoles);
    if (dto.requireCrossStudyProgram !== undefined) {
      updateData.requireCrossStudyProgram = Boolean(dto.requireCrossStudyProgram);
    }
  }
  // Rilis pertama menerapkan 1 tim aktif per kompetisi per mahasiswa (Keputusan #3)
  updateData.singleTeamPerCompetition = true;
  if (dto.pointDescription !== undefined) {
    updateData.pointDescription = dto.pointDescription?.trim() || null;
  }
  if (dto.sourceUrl !== undefined) {
    const trimmedSource = dto.sourceUrl?.trim() || null;
    updateData.sourceUrl = trimmedSource;
    updateData.sourceUpdatedAt = trimmedSource ? new Date() : null;
  }
  if (dto.competitionCategoryId !== undefined) {
    updateData.competitionCategory = dto.competitionCategoryId
      ? { connect: { id: dto.competitionCategoryId } }
      : { disconnect: true };
  }
  if (dto.pointTemplateId !== undefined) {
    updateData.pointTemplate = dto.pointTemplateId
      ? { connect: { id: dto.pointTemplateId } }
      : { disconnect: true };
  }
  if (dto.status !== undefined) updateData.status = dto.status;

  const updated = await prisma.competition.update({
    where: { id },
    data: updateData,
  });

  await recordAuditEvent({
    institutionId: existing.institutionId,
    actorId,
    action: 'COMPETITION_UPDATED',
    targetType: 'Competition',
    targetId: id,
    metadata: { updatedFields: Object.keys(dto) },
  });

  invalidateCompetitionCache();
  return updated;
}

export async function setCompetitionStatus(
  id: string,
  actorId: string,
  status: CompetitionStatus,
  institutionId?: string
): Promise<Competition> {
  const existing = await prisma.competition.findUnique({ where: { id } });
  if (!existing || (institutionId && existing.institutionId !== institutionId)) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  const updated = await prisma.competition.update({
    where: { id },
    data: { status, version: { increment: 1 } },
  });

  await recordAuditEvent({
    institutionId: existing.institutionId,
    actorId,
    action: `COMPETITION_${status.toUpperCase()}`,
    targetType: 'Competition',
    targetId: id,
    metadata: { previousStatus: existing.status, newStatus: status },
  });

  invalidateCompetitionCache();
  return updated;
}

export async function getCompetitionParticipantsAdmin(competitionId: string, institutionId: string) {
  const comp = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { id: true, institutionId: true, format: true, name: true },
  });
  if (!comp || comp.institutionId !== institutionId) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  const [teams, targets] = await Promise.all([
    prisma.team.findMany({
      where: { competitionId, status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] } },
      select: {
        id: true,
        name: true,
        status: true,
        members: {
          where: { status: 'active' },
          select: {
            userId: true,
            user: { select: { studentProfile: { select: { fullName: true, studyProgram: true } } } },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.studentTarget.findMany({
      where: { competitionId, status: 'active' },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            studentProfile: { select: { fullName: true, nim: true, studyProgram: true } },
          },
        },
      },
    }),
  ]);

  const mappedStudents = targets
    .filter((t) => t.user.studentProfile)
    .map((t) => ({
      id: t.user.id,
      userId: t.user.id,
      fullName: t.user.studentProfile!.fullName,
      nim: t.user.studentProfile!.nim,
      studyProgram: t.user.studentProfile!.studyProgram,
    }));

  return {
    competitionId: comp.id,
    format: comp.format,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      memberCount: t.members.length,
      memberNames: t.members
        .map((m) => m.user.studentProfile?.fullName)
        .filter((n): n is string => Boolean(n)),
    })),
    individuals: mappedStudents,
    students: mappedStudents,
  };
}

async function collectCompetitionImpact(
  db: Prisma.TransactionClient | typeof prisma,
  competitionId: string,
  institutionId: string
): Promise<{
  counts: CompetitionDeletePreview['counts'];
}> {
  // Gunakan relational COUNT langsung di MySQL tanpa memuat ribuan ID ke memori Node
  const [
    targets,
    activeTargets,
    teams,
    lockedSelectionTeams,
    teamMembers,
    teamJoinRequests,
    teamInvites,
  ] = await Promise.all([
    db.studentTarget.count({ where: { competitionId } }),
    db.studentTarget.count({ where: { competitionId, status: 'active' } }),
    db.team.count({ where: { competitionId } }),
    db.team.count({ where: { competitionId, status: 'terkunci_seleksi' } }),
    db.teamMember.count({ where: { team: { competitionId } } }),
    db.teamJoinRequest.count({ where: { team: { competitionId } } }),
    db.teamInvite.count({ where: { team: { competitionId } } }),
  ]);

  const [
    roadmaps,
    roadmapPhases,
    roadmapTasks,
    roadmapProgress,
    consultants,
    selections,
    customPointRules,
    preservedAchievements,
  ] = await Promise.all([
    db.roadmap.count({ where: { competitionId } }),
    db.roadmapPhase.count({ where: { roadmap: { competitionId } } }),
    db.roadmapTask.count({ where: { phase: { roadmap: { competitionId } } } }),
    db.roadmapProgress.count({ where: { task: { phase: { roadmap: { competitionId } } } } }),
    db.consultantContact.count({ where: { competitionId } }),
    db.internalSelection.count({ where: { competitionId } }),
    db.competitionPointRule.count({ where: { competitionId } }),
    db.achievement.count({
      where: {
        institutionId,
        OR: [{ competitionId }, { team: { competitionId } }],
      },
    }),
  ]);

  return {
    counts: {
      targets,
      activeTargets,
      teams,
      lockedSelectionTeams,
      teamMembers,
      teamJoinRequests,
      teamInvites,
      roadmaps,
      roadmapPhases,
      roadmapTasks,
      roadmapProgress,
      consultants,
      selections,
      customPointRules,
      preservedAchievements,
    },
  };
}

export async function getCompetitionDeletePreview(
  id: string,
  institutionId: string
): Promise<CompetitionDeletePreview> {
  const comp = await prisma.competition.findUnique({
    where: { id },
    select: { id: true, institutionId: true, name: true, slug: true, status: true },
  });

  if (!comp || comp.institutionId !== institutionId) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  const { counts } = await collectCompetitionImpact(prisma, id, institutionId);
  const requiresTypedConfirmation =
    comp.status === 'published' ||
    counts.activeTargets > 0 ||
    counts.teams > 0 ||
    counts.selections > 0;

  return {
    competition: {
      id: comp.id,
      name: comp.name,
      slug: comp.slug,
      status: comp.status,
    },
    counts,
    requiresTypedConfirmation,
  };
}

export async function deleteCompetition(
  id: string,
  actorId: string,
  institutionId: string
): Promise<CompetitionDeleteResult> {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.competition.findUnique({
      where: { id },
      select: { id: true, institutionId: true, name: true, slug: true, status: true },
    });

    if (!existing || existing.institutionId !== institutionId) {
      throw new NotFoundError('Kompetisi tidak ditemukan');
    }

    const { counts } = await collectCompetitionImpact(tx, id, institutionId);

    // Pastikan seluruh input prestasi mahasiswa (termasuk berkas bukti, keputusan, & buku poin)
    // tetap utuh dengan melepas tautan ke kompetisi dan tim sebelum menghapus kompetisi.
    await tx.achievement.updateMany({
      where: { institutionId, competitionId: id },
      data: { competitionId: null },
    });

    if (counts.teams > 0) {
      await tx.achievement.updateMany({
        where: { institutionId, team: { competitionId: id } },
        data: { teamId: null },
      });
    }

    // Hapus kompetisi; Prisma/MySQL cascade menghapus target, tim + anggota/undangan/permohonan,
    // roadmap + fase/tugas/progres, kontak konsultasi, seleksi internal, dan aturan poin khusus lomba.
    await tx.competition.delete({ where: { id } });

    const { preservedAchievements, ...deletedSummary } = counts;
    return {
      deletedId: existing.id,
      name: existing.name,
      slug: existing.slug,
      previousStatus: existing.status,
      deletedSummary,
      preservedAchievementsCount: preservedAchievements,
    };
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'COMPETITION_DELETED',
    targetType: 'Competition',
    targetId: result.deletedId,
    metadata: {
      name: result.name,
      slug: result.slug,
      previousStatus: result.previousStatus,
      deletedSummary: result.deletedSummary,
      preservedAchievementsCount: result.preservedAchievementsCount,
    },
  });

  invalidateCompetitionCache();
  return result;
}
