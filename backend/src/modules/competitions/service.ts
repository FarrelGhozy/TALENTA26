import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../app/middleware/error';
import { recordAuditEvent } from '../../lib/audit';
import type { Competition, AcademicPeriod, CompetitionFormat, CompetitionStatus, Prisma } from '@prisma/client';

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
  registrationDeadline?: string;
  competitionDate?: string;
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

export async function getAllCompetitionsAdmin(institutionId?: string): Promise<Competition[]> {
  return prisma.competition.findMany({
    where: institutionId ? { institutionId } : undefined,
    include: {
      academicPeriod: true,
      competitionCategory: { select: { id: true, name: true, code: true } },
      pointTemplate: { select: { id: true, name: true, version: true } },
      _count: { select: { competitionPointRules: true, teams: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
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
      registrationDeadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : null,
      competitionDate: dto.competitionDate ? new Date(dto.competitionDate) : null,
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
    updateData.registrationDeadline = dto.registrationDeadline ? new Date(dto.registrationDeadline) : null;
  }
  if (dto.competitionDate !== undefined) {
    updateData.competitionDate = dto.competitionDate ? new Date(dto.competitionDate) : null;
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

  return {
    competitionId: comp.id,
    format: comp.format,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      memberCount: t.members.length,
    })),
    students: targets
      .filter((t) => t.user.studentProfile)
      .map((t) => ({
        id: t.user.id,
        fullName: t.user.studentProfile!.fullName,
        nim: t.user.studentProfile!.nim,
        studyProgram: t.user.studentProfile!.studyProgram,
      })),
  };
}
