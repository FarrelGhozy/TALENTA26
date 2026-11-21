import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../app/middleware/error';
import { recordAuditEvent } from '../../lib/audit';
import type { Competition, AcademicPeriod, CompetitionFormat, CompetitionStatus, Prisma } from '@prisma/client';

export interface CompetitionFilterParams {
  category?: string;
  level?: string;
  format?: string;
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
}

export interface UpdateCompetitionDto extends Partial<CreateCompetitionDto> {
  status?: CompetitionStatus;
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
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCompetitionBySlug(slug: string): Promise<Competition | null> {
  return prisma.competition.findFirst({
    where: { slug, status: 'published' },
    include: {
      academicPeriod: true,
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

export async function getAllCompetitionsAdmin(): Promise<Competition[]> {
  return prisma.competition.findMany({
    include: { academicPeriod: true },
    orderBy: { createdAt: 'desc' },
  });
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

  const comp = await prisma.competition.create({
    data: {
      institutionId,
      academicPeriodId: activePeriod?.id || null,
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      name: dto.name,
      organizer: dto.organizer,
      category: dto.category,
      level: dto.level || 'nasional',
      format: dto.format,
      minTeamMembers: dto.minTeamMembers || (dto.format === 'individu' ? 1 : 2),
      maxTeamMembers: dto.maxTeamMembers || (dto.format === 'individu' ? 1 : 5),
      requiredRoles: dto.requiredRoles || [],
      registrationDeadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : null,
      competitionDate: dto.competitionDate ? new Date(dto.competitionDate) : null,
      description: dto.description,
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
  dto: UpdateCompetitionDto
): Promise<Competition> {
  const existing = await prisma.competition.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Kompetisi tidak ditemukan');

  const updateData: Prisma.CompetitionUpdateInput = {
    version: { increment: 1 },
  };

  if (dto.name) updateData.name = dto.name;
  if (dto.organizer) updateData.organizer = dto.organizer;
  if (dto.category) updateData.category = dto.category;
  if (dto.level) updateData.level = dto.level;
  if (dto.format) updateData.format = dto.format;
  if (dto.minTeamMembers !== undefined) updateData.minTeamMembers = dto.minTeamMembers;
  if (dto.maxTeamMembers !== undefined) updateData.maxTeamMembers = dto.maxTeamMembers;
  if (dto.requiredRoles !== undefined) updateData.requiredRoles = dto.requiredRoles;
  if (dto.description) updateData.description = dto.description;
  if (dto.requirements !== undefined) updateData.requirements = dto.requirements;
  if (dto.scheduleTimeline !== undefined) updateData.scheduleTimeline = dto.scheduleTimeline;
  if (dto.registrationDeadline) updateData.registrationDeadline = new Date(dto.registrationDeadline);
  if (dto.competitionDate) updateData.competitionDate = new Date(dto.competitionDate);
  if (dto.status) updateData.status = dto.status;

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
  status: CompetitionStatus
): Promise<Competition> {
  const existing = await prisma.competition.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Kompetisi tidak ditemukan');

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
