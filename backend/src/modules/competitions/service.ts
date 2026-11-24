import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../app/middleware/error';
import { recordAuditEvent } from '../../lib/audit';
import type { Competition, AcademicPeriod, CompetitionFormat, CompetitionStatus, RegistrationStatus, Prisma } from '@prisma/client';

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

export async function getPublishedCompetitions(filters: CompetitionFilterParams = {}): Promise<Competition[]> {
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

  return prisma.competition.findMany({
    where: whereClause,
    include: {
      academicPeriod: { select: { id: true, name: true, year: true, semester: true } },
      competitionCategory: {
        include: { subCategories: { where: { isActive: true } } },
      },
      pointTemplate: { select: { id: true, name: true, version: true } },
    },
    orderBy: { createdAt: 'desc' },
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

export async function getCurrentAcademicPeriod(): Promise<AcademicPeriod | null> {
  return prisma.academicPeriod.findFirst({
    where: { isActive: true },
  });
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

export async function getAllCompetitionsAdmin(institutionId?: string) {
  return prisma.competition.findMany({
    where: institutionId ? { institutionId } : undefined,
    include: ADMIN_COMPETITION_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
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

  const slug = dto.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  const activePeriod = await getCurrentAcademicPeriod();
  const { minTeamMembers, maxTeamMembers } = normalizeTeamBounds(
    dto.format,
    dto.minTeamMembers,
    dto.maxTeamMembers
  );

  const comp = await prisma.competition.create({
    data: {
      institutionId,
      academicPeriodId: activePeriod?.id || null,
      competitionCategoryId: dto.competitionCategoryId || null,
      pointTemplateId: dto.pointTemplateId || null,
      pointDescription: dto.pointDescription?.trim() || null,
      sourceUrl: dto.sourceUrl?.trim() || null,
      sourceUpdatedAt: dto.sourceUrl ? new Date() : null,
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
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
      singleTeamPerCompetition: dto.singleTeamPerCompetition ?? true,
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
  if (dto.singleTeamPerCompetition !== undefined) {
    updateData.singleTeamPerCompetition = Boolean(dto.singleTeamPerCompetition);
  }
  if (dto.pointDescription !== undefined) {
    updateData.pointDescription = dto.pointDescription?.trim() || null;
  }
  if (dto.sourceUrl !== undefined) {
    updateData.sourceUrl = dto.sourceUrl?.trim() || null;
    updateData.sourceUpdatedAt = new Date();
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
  teamIds: string[];
  counts: CompetitionDeletePreview['counts'];
}> {
  const [teamRows, roadmapRows] = await Promise.all([
    db.team.findMany({
      where: { competitionId },
      select: { id: true, status: true },
    }),
    db.roadmap.findMany({
      where: { competitionId },
      select: { id: true },
    }),
  ]);

  const teamIds = teamRows.map((t) => t.id);
  const lockedSelectionTeams = teamRows.filter((t) => t.status === 'terkunci_seleksi').length;
  const roadmapIds = roadmapRows.map((r) => r.id);

  const phaseIds =
    roadmapIds.length > 0
      ? (
          await db.roadmapPhase.findMany({
            where: { roadmapId: { in: roadmapIds } },
            select: { id: true },
          })
        ).map((p) => p.id)
      : [];

  const taskIds =
    phaseIds.length > 0
      ? (
          await db.roadmapTask.findMany({
            where: { phaseId: { in: phaseIds } },
            select: { id: true },
          })
        ).map((t) => t.id)
      : [];

  const [
    targets,
    activeTargets,
    teamMembers,
    teamJoinRequests,
    teamInvites,
    roadmapProgress,
    consultants,
    selections,
    customPointRules,
    preservedAchievements,
  ] = await Promise.all([
    db.studentTarget.count({ where: { competitionId } }),
    db.studentTarget.count({ where: { competitionId, status: 'active' } }),
    teamIds.length > 0 ? db.teamMember.count({ where: { teamId: { in: teamIds } } }) : Promise.resolve(0),
    teamIds.length > 0 ? db.teamJoinRequest.count({ where: { teamId: { in: teamIds } } }) : Promise.resolve(0),
    teamIds.length > 0 ? db.teamInvite.count({ where: { teamId: { in: teamIds } } }) : Promise.resolve(0),
    taskIds.length > 0 ? db.roadmapProgress.count({ where: { taskId: { in: taskIds } } }) : Promise.resolve(0),
    db.consultantContact.count({ where: { competitionId } }),
    db.internalSelection.count({ where: { competitionId } }),
    db.competitionPointRule.count({ where: { competitionId } }),
    db.achievement.count({
      where: {
        institutionId,
        OR: [
          { competitionId },
          ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
        ],
      },
    }),
  ]);

  return {
    teamIds,
    counts: {
      targets,
      activeTargets,
      teams: teamIds.length,
      lockedSelectionTeams,
      teamMembers,
      teamJoinRequests,
      teamInvites,
      roadmaps: roadmapIds.length,
      roadmapPhases: phaseIds.length,
      roadmapTasks: taskIds.length,
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

    const { teamIds, counts } = await collectCompetitionImpact(tx, id, institutionId);

    // Pastikan seluruh input prestasi mahasiswa (termasuk berkas bukti, keputusan, & buku poin)
    // tetap utuh dengan melepas tautan ke kompetisi dan tim sebelum menghapus kompetisi.
    await tx.achievement.updateMany({
      where: { institutionId, competitionId: id },
      data: { competitionId: null },
    });

    if (teamIds.length > 0) {
      await tx.achievement.updateMany({
        where: { institutionId, teamId: { in: teamIds } },
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

  return result;
}
