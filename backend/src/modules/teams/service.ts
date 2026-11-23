import { randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '../../app/middleware/error';
import { recordAuditEvent } from '../../lib/audit';
import { evaluateTeamReadiness, type TeamReadinessResult } from './readiness';
import type { Team, TeamInvite, TeamJoinRequest, TeamRecruitmentType } from '@prisma/client';

const SAFE_MEMBER_USER_SELECT = {
  id: true,
  role: true,
  studentProfile: {
    select: {
      fullName: true,
      studyProgram: true,
      faculty: true,
      enrollmentYear: true,
      avatarObjectKey: true,
      updatedAt: true,
      bio: true,
      experience: true,
      rolesCapable: true,
      skills: true,
      interests: true,
      availability: true,
    },
  },
} as const;

function resolveSafeAvatarUrl(
  userId: string,
  profile?: { avatarObjectKey?: string | null; updatedAt?: Date } | null
): string | null {
  if (!profile?.avatarObjectKey) return null;
  const ver = profile.updatedAt ? profile.updatedAt.getTime() : 1;
  return `/api/v1/users/${userId}/avatar?v=${ver}`;
}

function sanitizeMemberUser<
  T extends {
    id: string;
    role: string;
    studentProfile: {
      fullName: string;
      studyProgram: string;
      faculty: string;
      enrollmentYear: number | null;
      avatarObjectKey?: string | null;
      updatedAt?: Date;
      bio: string | null;
      experience: string | null;
      rolesCapable: unknown;
      skills: unknown;
      interests: unknown;
      availability: unknown;
    } | null;
  },
>(user: T) {
  if (!user.studentProfile) {
    return { id: user.id, role: user.role, studentProfile: null };
  }
  const { avatarObjectKey, updatedAt, ...restProfile } = user.studentProfile;
  return {
    id: user.id,
    role: user.role,
    studentProfile: {
      ...restProfile,
      avatarUrl: resolveSafeAvatarUrl(user.id, { avatarObjectKey, updatedAt }),
    },
  };
}

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCodeCandidate(): string {
  const bytes = randomBytes(8);
  let chars = '';
  for (let i = 0; i < 8; i++) {
    chars += INVITE_CODE_ALPHABET[bytes[i] % INVITE_CODE_ALPHABET.length];
  }
  return `TLN-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateInviteCodeCandidate();
    const exists = await prisma.team.findUnique({
      where: { inviteCode: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `TLN-${randomBytes(5).toString('hex').toUpperCase()}`;
}

function resolveEffectiveMax(
  team: { targetMaxMembers?: number | null },
  comp: { minTeamMembers: number; maxTeamMembers: number }
): number {
  const min = Math.max(1, comp.minTeamMembers || 1);
  const compMax = Math.max(min, comp.maxTeamMembers || min);
  if (typeof team.targetMaxMembers === 'number' && team.targetMaxMembers >= min) {
    return Math.min(team.targetMaxMembers, compMax);
  }
  return compMax;
}

function normalizeNeededRoles(raw?: string[]): string[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string') {
      const cleaned = item.trim();
      if (cleaned) unique.add(cleaned.slice(0, 80));
    }
  }
  return Array.from(unique).slice(0, 10);
}

function isCompetitionRegistrationOpen(comp: {
  registrationStatus?: string | null;
  internalSelectionDeadline?: Date | null;
}): { open: boolean; reason?: string } {
  if ((comp.registrationStatus ?? 'buka') !== 'buka') {
    return { open: false, reason: 'Pendaftaran / rekrutmen internal untuk kompetisi ini sedang ditutup' };
  }
  if (comp.internalSelectionDeadline && Date.now() > comp.internalSelectionDeadline.getTime()) {
    return { open: false, reason: 'Tenggat seleksi internal untuk kompetisi ini telah berakhir' };
  }
  return { open: true };
}

export interface CreateTeamDto {
  competitionSlug: string;
  teamName: string;
  roleInTeam?: string;
  description?: string;
  neededRoles?: string[];
  recruitmentType?: TeamRecruitmentType;
  targetMaxMembers?: number;
}

export interface UpdateTeamDto {
  teamName?: string;
  description?: string | null;
  neededRoles?: string[];
  recruitmentType?: TeamRecruitmentType;
  isRecruiting?: boolean;
  targetMaxMembers?: number;
}

export interface CreateJoinRequestDto {
  preferredRole?: string;
  note?: string;
}

export interface TeamDirectoryFilters {
  competitionSlug?: string;
  q?: string;
  role?: string;
}

export async function getMyTeam(userId: string) {
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      status: 'active',
      team: {
        status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
      },
    },
    include: {
      team: {
        include: {
          competition: true,
          leader: {
            select: SAFE_MEMBER_USER_SELECT,
          },
          members: {
            where: { status: 'active' },
            orderBy: { joinedAt: 'asc' },
            include: {
              user: {
                select: SAFE_MEMBER_USER_SELECT,
              },
            },
          },
          invites: {
            where: { status: 'diajukan', expiresAt: { gt: new Date() } },
            include: {
              receiver: {
                select: SAFE_MEMBER_USER_SELECT,
              },
            },
          },
          joinRequests: {
            where: { status: 'menunggu' },
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: SAFE_MEMBER_USER_SELECT,
              },
            },
          },
          selections: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!membership?.team) return null;

  const team = membership.team;
  const isLeader = team.leaderId === userId;

  const readiness: TeamReadinessResult = evaluateTeamReadiness({
    teamStatus: team.status,
    targetMaxMembers: team.targetMaxMembers,
    competition: team.competition,
    members: team.members.map((m) => ({
      userId: m.userId,
      roleInTeam: m.roleInTeam,
      studyProgram: m.user.studentProfile?.studyProgram ?? null,
      rolesCapable: m.user.studentProfile?.rolesCapable ?? [],
    })),
  });

  const latestSelection = team.selections[0] || null;

  const sanitizedMembers = team.members.map((m) => ({
    ...m,
    user: sanitizeMemberUser(m.user),
  }));
  const sanitizedInvites = team.invites.map((inv) => ({
    ...inv,
    receiver: sanitizeMemberUser(inv.receiver),
  }));
  const sanitizedJoinRequests = team.joinRequests.map((req) => ({
    ...req,
    user: sanitizeMemberUser(req.user),
  }));

  return {
    ...team,
    leader: sanitizeMemberUser(team.leader),
    members: sanitizedMembers,
    invites: sanitizedInvites,
    isLeader,
    readiness,
    latestSelection,
    pendingJoinRequestsCount: sanitizedJoinRequests.length,
    inviteCode: isLeader ? team.inviteCode : null,
    joinRequests: isLeader ? sanitizedJoinRequests : [],
  };
}

export async function getOpenTeamsDirectory(
  userId: string,
  institutionId: string,
  filters: TeamDirectoryFilters = {}
) {
  let competition = null;
  if (filters.competitionSlug) {
    competition = await prisma.competition.findFirst({
      where: { slug: filters.competitionSlug, institutionId, status: 'published' },
    });
  } else {
    const activeTarget = await prisma.studentTarget.findFirst({
      where: { userId, status: 'active' },
      include: { competition: true },
      orderBy: { createdAt: 'desc' },
    });
    if (
      activeTarget?.competition &&
      activeTarget.competition.institutionId === institutionId &&
      activeTarget.competition.status === 'published'
    ) {
      competition = activeTarget.competition;
    }
  }

  if (!competition) {
    return { competition: null, teams: [], myActiveTeamId: null };
  }

  const myMembership = await prisma.teamMember.findFirst({
    where: {
      userId,
      status: 'active',
      team: {
        competitionId: competition.id,
        status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
      },
    },
    select: { teamId: true },
  });

  if (competition.format === 'individu') {
    return {
      competition,
      teams: [],
      myActiveTeamId: myMembership?.teamId || null,
    };
  }

  const rawTeams = await prisma.team.findMany({
    where: {
      competitionId: competition.id,
      recruitmentType: 'terbuka',
      isRecruiting: true,
      status: { in: ['mencari', 'terbentuk'] },
    },
    include: {
      leader: { select: SAFE_MEMBER_USER_SELECT },
      members: {
        where: { status: 'active' },
        select: { userId: true },
      },
      joinRequests: {
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, status: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const qLower = (filters.q || '').trim().toLowerCase();
  const roleLower = (filters.role || '').trim().toLowerCase();

  const items = rawTeams
    .map((t) => {
      const maxAllowed = resolveEffectiveMax(t, competition);
      const activeMemberCount = t.members.length;
      const neededRoles = Array.isArray(t.neededRoles)
        ? (t.neededRoles as unknown[]).filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
        : [];
      const myLatestRequest = t.joinRequests[0] || null;
      const isMyTeam = t.members.some((m) => m.userId === userId);

      return {
        id: t.id,
        competitionId: t.competitionId,
        competitionSlug: competition.slug,
        competitionName: competition.name,
        name: t.name,
        description: t.description || '',
        recruitmentType: t.recruitmentType,
        isRecruiting: t.isRecruiting,
        status: t.status,
        activeMemberCount,
        minRequired: competition.minTeamMembers,
        maxAllowed,
        slotsRemaining: Math.max(0, maxAllowed - activeMemberCount),
        neededRoles,
        leader: {
          id: t.leader.id,
          fullName: t.leader.studentProfile?.fullName || 'Mahasiswa',
          studyProgram: t.leader.studentProfile?.studyProgram || '',
          avatarUrl: resolveSafeAvatarUrl(t.leader.id, t.leader.studentProfile),
        },
        isMyTeam,
        myRequestId: myLatestRequest?.id || null,
        myRequestStatus: myLatestRequest?.status || null,
        createdAt: t.createdAt,
      };
    })
    .filter((item) => item.activeMemberCount < item.maxAllowed)
    .filter((item) => {
      if (roleLower && roleLower !== 'semua') {
        const hasRole = item.neededRoles.some((r) => r.toLowerCase().includes(roleLower));
        if (!hasRole) return false;
      }
      if (qLower) {
        const haystack = [
          item.name,
          item.description,
          item.leader.fullName,
          item.leader.studyProgram,
          ...item.neededRoles,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(qLower)) return false;
      }
      return true;
    });

  return {
    competition,
    teams: items,
    myActiveTeamId: myMembership?.teamId || null,
  };
}

export async function getMyJoinRequests(userId: string, institutionId: string) {
  const list = await prisma.teamJoinRequest.findMany({
    where: {
      userId,
      team: {
        competition: { institutionId },
      },
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          recruitmentType: true,
          isRecruiting: true,
          neededRoles: true,
          targetMaxMembers: true,
          leader: { select: SAFE_MEMBER_USER_SELECT },
          competition: {
            select: {
              id: true,
              slug: true,
              name: true,
              format: true,
              minTeamMembers: true,
              maxTeamMembers: true,
            },
          },
          members: {
            where: { status: 'active' },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return list.map((req) => ({
    ...req,
    team: req.team
      ? {
          ...req.team,
          leader: sanitizeMemberUser(req.team.leader),
        }
      : req.team,
  }));
}

export async function createTeam(
  userId: string,
  dto: CreateTeamDto,
  institutionId: string
): Promise<Team> {
  if (!dto.teamName || dto.teamName.trim().length < 3) {
    throw new ValidationError('Nama tim minimal 3 karakter');
  }

  const comp = await prisma.competition.findFirst({
    where: { slug: dto.competitionSlug, institutionId, status: 'published' },
  });

  if (!comp) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  if (comp.format === 'individu') {
    throw new ValidationError('Kompetisi format individu tidak memerlukan pembentukan tim');
  }

  const regCheck = isCompetitionRegistrationOpen(comp);
  if (!regCheck.open) {
    throw new ForbiddenError(regCheck.reason || 'Pendaftaran kompetisi sedang ditutup');
  }

  const recruitmentType: TeamRecruitmentType =
    dto.recruitmentType === 'privat' ? 'privat' : 'terbuka';

  let targetMaxMembers = comp.maxTeamMembers;
  if (dto.targetMaxMembers !== undefined) {
    if (
      !Number.isInteger(dto.targetMaxMembers) ||
      dto.targetMaxMembers < comp.minTeamMembers ||
      dto.targetMaxMembers > comp.maxTeamMembers
    ) {
      throw new ValidationError(
        `Jumlah anggota maksimal tim harus berada di rentang ${comp.minTeamMembers}–${comp.maxTeamMembers} sesuai aturan lomba`
      );
    }
    targetMaxMembers = dto.targetMaxMembers;
  }

  const existingMembership = await prisma.teamMember.findFirst({
    where: {
      userId,
      status: 'active',
      team: {
        competitionId: comp.id,
        status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
      },
    },
  });

  if (existingMembership) {
    throw new ConflictError('Anda sudah memiliki tim aktif pada kompetisi ini');
  }

  const inviteCode = await generateUniqueInviteCode();
  const neededRoles = normalizeNeededRoles(dto.neededRoles);
  const description = dto.description?.trim() ? dto.description.trim().slice(0, 1000) : null;

  return prisma.$transaction(async (tx) => {
    // Pastikan mahasiswa memiliki target aktif bila belum memilih target sebelumnya
    const currentTarget = await tx.studentTarget.findFirst({
      where: { userId, status: 'active' },
    });
    if (!currentTarget) {
      await tx.studentTarget.create({
        data: {
          userId,
          competitionId: comp.id,
          academicPeriodId: comp.academicPeriodId,
          status: 'active',
        },
      });
    }

    const initialStatus = 1 >= comp.minTeamMembers ? 'terbentuk' : 'mencari';

    const team = await tx.team.create({
      data: {
        competitionId: comp.id,
        name: dto.teamName.trim(),
        creatorId: userId,
        leaderId: userId,
        description,
        recruitmentType,
        isRecruiting: recruitmentType === 'terbuka' && targetMaxMembers > 1,
        neededRoles,
        targetMaxMembers,
        inviteCode,
        inviteCodeUpdatedAt: new Date(),
        status: initialStatus,
        version: 1,
      },
    });

    await tx.teamMember.create({
      data: {
        teamId: team.id,
        userId,
        roleInTeam: dto.roleInTeam?.trim() || 'Ketua Tim',
        status: 'active',
      },
    });

    // Batalkan pengajuan gabung menunggu milik pembuat di kompetisi yang sama
    await tx.teamJoinRequest.updateMany({
      where: {
        userId,
        status: 'menunggu',
        team: { competitionId: comp.id },
      },
      data: { status: 'dibatalkan' },
    });

    await recordAuditEvent({
      institutionId,
      actorId: userId,
      action: 'TEAM_CREATED',
      targetType: 'Team',
      targetId: team.id,
      metadata: {
        teamName: team.name,
        competitionSlug: comp.slug,
        recruitmentType,
        targetMaxMembers,
      },
    });

    return team;
  });
}

export async function updateTeam(
  leaderUserId: string,
  teamId: string,
  dto: UpdateTeamDto,
  institutionId: string
): Promise<Team> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      competition: true,
      members: { where: { status: 'active' } },
    },
  });

  if (!team || team.competition.institutionId !== institutionId) {
    throw new NotFoundError('Tim tidak ditemukan');
  }

  if (team.leaderId !== leaderUserId) {
    throw new ForbiddenError('Hanya ketua tim yang berwenang mengubah pengaturan tim');
  }

  if (team.status === 'terkunci_seleksi' || team.status === 'arsip') {
    throw new ForbiddenError('Pengaturan tim tidak dapat diubah karena tim sudah terkunci seleksi atau diarsipkan');
  }

  if (dto.teamName !== undefined && dto.teamName.trim().length < 3) {
    throw new ValidationError('Nama tim minimal 3 karakter');
  }

  const nextTargetMax =
    dto.targetMaxMembers !== undefined
      ? dto.targetMaxMembers
      : resolveEffectiveMax(team, team.competition);

  if (
    !Number.isInteger(nextTargetMax) ||
    nextTargetMax < team.competition.minTeamMembers ||
    nextTargetMax > team.competition.maxTeamMembers
  ) {
    throw new ValidationError(
      `Jumlah anggota maksimal harus berada di rentang ${team.competition.minTeamMembers}–${team.competition.maxTeamMembers}`
    );
  }

  if (nextTargetMax < team.members.length) {
    throw new ValidationError(
      `Batas maksimal (${nextTargetMax}) tidak boleh lebih kecil dari jumlah anggota aktif saat ini (${team.members.length})`
    );
  }

  const nextRecruitmentType = dto.recruitmentType ?? team.recruitmentType;
  const isFull = team.members.length >= nextTargetMax;
  let nextIsRecruiting =
    dto.isRecruiting !== undefined ? dto.isRecruiting : team.isRecruiting;
  if (nextRecruitmentType === 'privat' || isFull) {
    nextIsRecruiting = false;
  } else if (dto.recruitmentType === 'terbuka' && dto.isRecruiting === undefined && !isFull) {
    nextIsRecruiting = true;
  }

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: {
      name: dto.teamName !== undefined ? dto.teamName.trim() : undefined,
      description:
        dto.description !== undefined
          ? dto.description?.trim()
            ? dto.description.trim().slice(0, 1000)
            : null
          : undefined,
      neededRoles: dto.neededRoles !== undefined ? normalizeNeededRoles(dto.neededRoles) : undefined,
      recruitmentType: nextRecruitmentType,
      isRecruiting: nextIsRecruiting,
      targetMaxMembers: nextTargetMax,
      version: { increment: 1 },
    },
  });

  await recordAuditEvent({
    institutionId,
    actorId: leaderUserId,
    action: 'TEAM_UPDATED',
    targetType: 'Team',
    targetId: teamId,
    metadata: {
      recruitmentType: nextRecruitmentType,
      isRecruiting: nextIsRecruiting,
      targetMaxMembers: nextTargetMax,
    },
  });

  return updated;
}

export async function rotateInviteCode(
  leaderUserId: string,
  teamId: string,
  institutionId: string
): Promise<{ inviteCode: string; inviteCodeUpdatedAt: Date }> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { competition: true },
  });

  if (!team || team.competition.institutionId !== institutionId) {
    throw new NotFoundError('Tim tidak ditemukan');
  }

  if (team.leaderId !== leaderUserId) {
    throw new ForbiddenError('Hanya ketua tim yang berwenang memperbarui kode undangan tim');
  }

  if (team.status === 'terkunci_seleksi' || team.status === 'arsip') {
    throw new ForbiddenError('Kode undangan tidak dapat diubah pada tim yang sudah terkunci atau diarsipkan');
  }

  const newCode = await generateUniqueInviteCode();
  const now = new Date();

  await prisma.team.update({
    where: { id: teamId },
    data: {
      inviteCode: newCode,
      inviteCodeUpdatedAt: now,
      version: { increment: 1 },
    },
  });

  await recordAuditEvent({
    institutionId,
    actorId: leaderUserId,
    action: 'TEAM_INVITE_CODE_ROTATED',
    targetType: 'Team',
    targetId: teamId,
  });

  return { inviteCode: newCode, inviteCodeUpdatedAt: now };
}

export async function createJoinRequest(
  userId: string,
  teamId: string,
  dto: CreateJoinRequestDto,
  institutionId: string
): Promise<TeamJoinRequest> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      competition: true,
      members: { where: { status: 'active' } },
    },
  });

  if (!team || team.competition.institutionId !== institutionId || team.competition.status !== 'published') {
    throw new NotFoundError('Tim tidak ditemukan');
  }

  if (team.competition.format === 'individu') {
    throw new ValidationError('Kompetisi individu tidak mendukung pengajuan gabung tim');
  }

  const regCheck = isCompetitionRegistrationOpen(team.competition);
  if (!regCheck.open) {
    throw new ForbiddenError(regCheck.reason || 'Pendaftaran kompetisi sedang ditutup');
  }

  if (team.status === 'terkunci_seleksi' || team.status === 'arsip') {
    throw new ForbiddenError('Tim tidak lagi menerima pengajuan anggota baru');
  }

  if (team.recruitmentType !== 'terbuka' || !team.isRecruiting) {
    throw new ForbiddenError('Tim ini tidak membuka rekrutmen publik');
  }

  const effectiveMax = resolveEffectiveMax(team, team.competition);
  if (team.members.length >= effectiveMax) {
    throw new ConflictError('Kapasitas anggota tim sudah penuh');
  }

  // Cek target aktif mahasiswa (wajib sama, atau otomatis disetel bila belum ada target)
  const activeTarget = await prisma.studentTarget.findFirst({
    where: { userId, status: 'active' },
  });
  if (activeTarget && activeTarget.competitionId !== team.competitionId) {
    throw new ConflictError(
      'Target kompetisi aktif Anda berbeda dengan tim ini. Ubah target kompetisi di halaman Profil terlebih dahulu.'
    );
  }

  // Cegah keanggotaan aktif ganda pada kompetisi yang sama
  const existingMembership = await prisma.teamMember.findFirst({
    where: {
      userId,
      status: 'active',
      team: {
        competitionId: team.competitionId,
        status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
      },
    },
  });
  if (existingMembership) {
    throw new ConflictError('Anda sudah terdaftar pada tim aktif di kompetisi ini');
  }

  const duplicatePending = await prisma.teamJoinRequest.findFirst({
    where: {
      teamId,
      userId,
      status: 'menunggu',
    },
  });
  if (duplicatePending) {
    throw new ConflictError('Pengajuan bergabung Anda ke tim ini masih menunggu persetujuan ketua');
  }

  const created = await prisma.$transaction(async (tx) => {
    if (!activeTarget) {
      await tx.studentTarget.create({
        data: {
          userId,
          competitionId: team.competitionId,
          academicPeriodId: team.competition.academicPeriodId,
          status: 'active',
        },
      });
    }

    return tx.teamJoinRequest.create({
      data: {
        teamId,
        userId,
        preferredRole: dto.preferredRole?.trim() ? dto.preferredRole.trim().slice(0, 80) : null,
        note: dto.note?.trim() ? dto.note.trim().slice(0, 500) : null,
        status: 'menunggu',
      },
    });
  });

  await recordAuditEvent({
    institutionId,
    actorId: userId,
    action: 'TEAM_JOIN_REQUEST_CREATED',
    targetType: 'TeamJoinRequest',
    targetId: created.id,
    metadata: { teamId, preferredRole: created.preferredRole },
  });

  return created;
}

export async function cancelJoinRequest(
  userId: string,
  requestId: string,
  institutionId: string
): Promise<{ message: string }> {
  const req = await prisma.teamJoinRequest.findFirst({
    where: { id: requestId, userId },
    include: { team: { include: { competition: true } } },
  });

  if (!req || req.team.competition.institutionId !== institutionId) {
    throw new NotFoundError('Pengajuan bergabung tidak ditemukan');
  }

  if (req.status !== 'menunggu') {
    throw new ConflictError('Hanya pengajuan berstatus menunggu yang dapat dibatalkan');
  }

  await prisma.teamJoinRequest.update({
    where: { id: req.id },
    data: { status: 'dibatalkan' },
  });

  await recordAuditEvent({
    institutionId,
    actorId: userId,
    action: 'TEAM_JOIN_REQUEST_CANCELLED',
    targetType: 'TeamJoinRequest',
    targetId: req.id,
    metadata: { teamId: req.teamId },
  });

  return { message: 'Pengajuan bergabung berhasil dibatalkan' };
}

export async function decideJoinRequest(
  leaderUserId: string,
  requestId: string,
  action: 'disetujui' | 'ditolak',
  institutionId: string
): Promise<{ message: string }> {
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    let markExpiredOutsideTx = false;
    try {
      return await prisma.$transaction(async (tx) => {
        const req = await tx.teamJoinRequest.findUnique({
          where: { id: requestId },
          include: {
            team: {
              include: { competition: true },
            },
          },
        });

        if (!req || req.team.competition.institutionId !== institutionId) {
          throw new NotFoundError('Pengajuan bergabung tidak ditemukan');
        }

        if (req.team.leaderId !== leaderUserId) {
          throw new ForbiddenError('Hanya ketua tim yang berwenang memutuskan pengajuan bergabung');
        }

        if (req.status !== 'menunggu') {
          throw new ConflictError('Pengajuan ini sudah diproses sebelumnya');
        }

        if (action === 'ditolak') {
          await tx.teamJoinRequest.update({
            where: { id: req.id },
            data: {
              status: 'ditolak',
              reviewedById: leaderUserId,
              reviewedAt: new Date(),
            },
          });

          await recordAuditEvent({
            institutionId,
            actorId: leaderUserId,
            action: 'TEAM_JOIN_REQUEST_REJECTED',
            targetType: 'TeamJoinRequest',
            targetId: req.id,
            metadata: { teamId: req.teamId, applicantId: req.userId },
          });

          return { message: 'Pengajuan bergabung telah ditolak' };
        }

        if (req.team.status === 'terkunci_seleksi' || req.team.status === 'arsip') {
          throw new ForbiddenError('Tim tidak dapat menerima anggota baru karena sudah terkunci seleksi atau diarsipkan');
        }

        const regCheck = isCompetitionRegistrationOpen(req.team.competition);
        if (!regCheck.open) {
          throw new ForbiddenError(regCheck.reason || 'Pendaftaran kompetisi sedang ditutup');
        }

        // Row lock untuk mencegah race condition kapasitas maksimal
        await tx.$executeRaw`SELECT id FROM teams WHERE id = ${req.teamId} FOR UPDATE`;

        const countRes = await tx.$queryRaw<Array<{ total: bigint | number }>>`
          SELECT COUNT(*) as total FROM team_members WHERE teamId = ${req.teamId} AND status = 'active' FOR UPDATE
        `;
        const activeMembersCount = Number(countRes[0]?.total ?? 0);
        const effectiveMax = resolveEffectiveMax(req.team, req.team.competition);

        if (activeMembersCount >= effectiveMax) {
          markExpiredOutsideTx = true;
          throw new ConflictError('Kapasitas anggota tim telah mencapai batas maksimal');
        }

        const existingMembership = await tx.teamMember.findFirst({
          where: {
            userId: req.userId,
            status: 'active',
            team: {
              competitionId: req.team.competitionId,
              status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
            },
          },
        });

        if (existingMembership) {
          markExpiredOutsideTx = true;
          throw new ConflictError('Pelamar sudah terdaftar pada tim aktif lain di kompetisi ini');
        }

        const previousMemberRecord = await tx.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: req.teamId,
              userId: req.userId,
            },
          },
        });

        const assignedRole = req.preferredRole || 'Anggota';
        if (previousMemberRecord) {
          await tx.teamMember.update({
            where: { id: previousMemberRecord.id },
            data: { status: 'active', roleInTeam: assignedRole, joinedAt: new Date() },
          });
        } else {
          await tx.teamMember.create({
            data: {
              teamId: req.teamId,
              userId: req.userId,
              roleInTeam: assignedRole,
              status: 'active',
            },
          });
        }

        await tx.teamJoinRequest.update({
          where: { id: req.id },
          data: {
            status: 'disetujui',
            reviewedById: leaderUserId,
            reviewedAt: new Date(),
          },
        });

        // Batalkan pengajuan menunggu lain milik pelamar pada kompetisi sama
        await tx.teamJoinRequest.updateMany({
          where: {
            id: { not: req.id },
            userId: req.userId,
            status: 'menunggu',
            team: { competitionId: req.team.competitionId },
          },
          data: { status: 'dibatalkan' },
        });

        const newTotalMembers = activeMembersCount + 1;
        const reachedMax = newTotalMembers >= effectiveMax;
        const newStatus =
          newTotalMembers >= req.team.competition.minTeamMembers ? 'terbentuk' : 'mencari';

        await tx.team.update({
          where: { id: req.teamId },
          data: {
            status: newStatus,
            isRecruiting: reachedMax ? false : req.team.isRecruiting,
            version: { increment: 1 },
          },
        });

        // Jika kapasitas penuh, tutup semua pengajuan tersisa di tim ini
        if (reachedMax) {
          await tx.teamJoinRequest.updateMany({
            where: {
              teamId: req.teamId,
              status: 'menunggu',
            },
            data: { status: 'kedaluwarsa' },
          });
        }

        await recordAuditEvent({
          institutionId,
          actorId: leaderUserId,
          action: 'TEAM_JOIN_REQUEST_APPROVED',
          targetType: 'TeamJoinRequest',
          targetId: req.id,
          metadata: {
            teamId: req.teamId,
            applicantId: req.userId,
            newTotalMembers,
            reachedMax,
          },
        });

        return { message: 'Permintaan telah diproses. Anggota baru berhasil ditambahkan ke tim.' };
      });
    } catch (err: any) {
      if (markExpiredOutsideTx) {
        await prisma.teamJoinRequest.updateMany({
          where: { id: requestId, status: 'menunggu' },
          data: { status: 'kedaluwarsa', reviewedAt: new Date() },
        });
      }
      if (
        (err?.code === 'P2034' ||
          err?.cause?.originalCode === '1213' ||
          err?.message?.includes('Deadlock')) &&
        attempts < 3
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50 * attempts));
        continue;
      }
      throw err;
    }
  }

  throw new ConflictError('Terjadi konflik konkurensi pada tim, silakan ulangi persetujuan.');
}

export async function joinTeamByCode(
  userId: string,
  inviteCodeRaw: string,
  institutionId: string
): Promise<{ teamId: string; teamName: string; message: string }> {
  const code = (inviteCodeRaw || '').trim().toUpperCase();
  if (!code || code.length < 4) {
    throw new ValidationError('Masukkan kode undangan tim yang valid');
  }

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      return await prisma.$transaction(async (tx) => {
        const team = await tx.team.findUnique({
          where: { inviteCode: code },
          include: { competition: true },
        });

        if (!team || team.competition.institutionId !== institutionId) {
          throw new NotFoundError('Kode undangan tim tidak ditemukan atau sudah diperbarui ketua');
        }

        if (team.competition.status !== 'published') {
          throw new NotFoundError('Kompetisi untuk tim ini belum atau tidak lagi diterbitkan');
        }

        if (team.competition.format === 'individu') {
          throw new ValidationError('Kompetisi individu tidak mendukung keanggotaan tim');
        }

        const regCheck = isCompetitionRegistrationOpen(team.competition);
        if (!regCheck.open) {
          throw new ForbiddenError(regCheck.reason || 'Pendaftaran kompetisi sedang ditutup');
        }

        if (team.status === 'terkunci_seleksi' || team.status === 'arsip') {
          throw new ForbiddenError('Tim tidak lagi menerima anggota baru karena sudah terkunci seleksi atau diarsipkan');
        }

        // Validasi target aktif pengguna
        const activeTarget = await tx.studentTarget.findFirst({
          where: { userId, status: 'active' },
        });
        if (activeTarget && activeTarget.competitionId !== team.competitionId) {
          throw new ConflictError(
            `Kode ini milik tim untuk lomba ${team.competition.name}, sedangkan target aktif Anda berbeda. Ganti target terlebih dahulu di halaman Profil.`
          );
        }

        // Row lock tim untuk menjamin batas maksimal
        await tx.$executeRaw`SELECT id FROM teams WHERE id = ${team.id} FOR UPDATE`;

        const countRes = await tx.$queryRaw<Array<{ total: bigint | number }>>`
          SELECT COUNT(*) as total FROM team_members WHERE teamId = ${team.id} AND status = 'active' FOR UPDATE
        `;
        const activeMembersCount = Number(countRes[0]?.total ?? 0);
        const effectiveMax = resolveEffectiveMax(team, team.competition);

        const existingMembership = await tx.teamMember.findFirst({
          where: {
            userId,
            status: 'active',
            team: {
              competitionId: team.competitionId,
              status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
            },
          },
        });

        if (existingMembership) {
          if (existingMembership.teamId === team.id) {
            throw new ConflictError('Anda sudah menjadi anggota aktif di tim ini');
          }
          throw new ConflictError('Anda sudah terdaftar pada tim aktif lain di kompetisi ini');
        }

        if (activeMembersCount >= effectiveMax) {
          throw new ConflictError('Kapasitas anggota tim telah penuh');
        }

        if (!activeTarget) {
          await tx.studentTarget.create({
            data: {
              userId,
              competitionId: team.competitionId,
              academicPeriodId: team.competition.academicPeriodId,
              status: 'active',
            },
          });
        }

        const previousRecord = await tx.teamMember.findUnique({
          where: {
            teamId_userId: { teamId: team.id, userId },
          },
        });

        if (previousRecord) {
          await tx.teamMember.update({
            where: { id: previousRecord.id },
            data: { status: 'active', roleInTeam: 'Anggota', joinedAt: new Date() },
          });
        } else {
          await tx.teamMember.create({
            data: {
              teamId: team.id,
              userId,
              roleInTeam: 'Anggota',
              status: 'active',
            },
          });
        }

        // Batalkan pengajuan gabung menunggu user ini pada kompetisi yang sama
        await tx.teamJoinRequest.updateMany({
          where: {
            userId,
            status: 'menunggu',
            team: { competitionId: team.competitionId },
          },
          data: { status: 'dibatalkan' },
        });

        const newTotal = activeMembersCount + 1;
        const reachedMax = newTotal >= effectiveMax;
        const nextStatus = newTotal >= team.competition.minTeamMembers ? 'terbentuk' : 'mencari';

        await tx.team.update({
          where: { id: team.id },
          data: {
            status: nextStatus,
            isRecruiting: reachedMax ? false : team.isRecruiting,
            version: { increment: 1 },
          },
        });

        if (reachedMax) {
          await tx.teamJoinRequest.updateMany({
            where: { teamId: team.id, status: 'menunggu' },
            data: { status: 'kedaluwarsa' },
          });
        }

        await recordAuditEvent({
          institutionId,
          actorId: userId,
          action: 'TEAM_JOINED_BY_CODE',
          targetType: 'Team',
          targetId: team.id,
          metadata: { teamName: team.name, newTotal, reachedMax },
        });

        return {
          teamId: team.id,
          teamName: team.name,
          message: `Berhasil bergabung dengan ${team.name}`,
        };
      });
    } catch (err: any) {
      if (
        (err?.code === 'P2034' ||
          err?.cause?.originalCode === '1213' ||
          err?.message?.includes('Deadlock')) &&
        attempts < 3
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50 * attempts));
        continue;
      }
      throw err;
    }
  }

  throw new ConflictError('Terjadi konflik konkurensi pada tim, silakan ulangi.');
}

export async function removeMember(
  leaderUserId: string,
  teamId: string,
  targetUserId: string,
  institutionId: string
): Promise<{ message: string }> {
  if (leaderUserId === targetUserId) {
    throw new ValidationError('Gunakan aksi keluar tim untuk meninggalkan tim sendiri');
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      competition: true,
      members: { where: { status: 'active' } },
    },
  });

  if (!team || team.competition.institutionId !== institutionId) {
    throw new NotFoundError('Tim tidak ditemukan');
  }

  if (team.leaderId !== leaderUserId) {
    throw new ForbiddenError('Hanya ketua tim yang berwenang mengeluarkan anggota');
  }

  if (team.status === 'terkunci_seleksi' || team.status === 'arsip') {
    throw new ForbiddenError('Anggota tidak dapat dikeluarkan karena tim sudah terkunci seleksi atau diarsipkan');
  }

  const targetMembership = team.members.find((m) => m.userId === targetUserId);
  if (!targetMembership) {
    throw new NotFoundError('Anggota tersebut tidak ditemukan di tim ini');
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.update({
      where: { id: targetMembership.id },
      data: { status: 'left' },
    });

    const remainingCount = team.members.length - 1;
    const effectiveMax = resolveEffectiveMax(team, team.competition);
    const nextStatus =
      remainingCount >= team.competition.minTeamMembers ? 'terbentuk' : 'mencari';

    await tx.team.update({
      where: { id: teamId },
      data: {
        status: nextStatus,
        isRecruiting:
          team.recruitmentType === 'terbuka' && remainingCount < effectiveMax
            ? true
            : team.isRecruiting,
        version: { increment: 1 },
      },
    });

    await recordAuditEvent({
      institutionId,
      actorId: leaderUserId,
      action: 'TEAM_MEMBER_REMOVED',
      targetType: 'Team',
      targetId: teamId,
      metadata: { removedUserId: targetUserId, remainingCount },
    });
  });

  return { message: 'Anggota berhasil dikeluarkan dari tim' };
}

export async function leaveTeam(
  userId: string,
  teamId: string,
  institutionId: string
): Promise<{ message: string; newLeaderId?: string | null }> {
  const membership = await prisma.teamMember.findFirst({
    where: { teamId, userId, status: 'active' },
    include: {
      team: {
        include: {
          members: {
            where: { status: 'active' },
            orderBy: { joinedAt: 'asc' },
          },
          competition: true,
        },
      },
    },
  });

  if (!membership || membership.team.competition.institutionId !== institutionId) {
    throw new NotFoundError('Keanggotaan tim tidak ditemukan');
  }

  if (membership.team.status === 'terkunci_seleksi') {
    throw new ForbiddenError('Tim telah terkunci untuk tahap seleksi dan tidak dapat ditinggalkan mandiri');
  }

  let promotedLeaderId: string | null = null;

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.update({
      where: { id: membership.id },
      data: { status: 'left' },
    });

    const remainingActive = membership.team.members.filter((m) => m.id !== membership.id);

    if (remainingActive.length === 0) {
      await tx.team.update({
        where: { id: teamId },
        data: { status: 'arsip', isRecruiting: false, version: { increment: 1 } },
      });
      await tx.teamJoinRequest.updateMany({
        where: { teamId, status: 'menunggu' },
        data: { status: 'kedaluwarsa' },
      });
    } else {
      const effectiveMax = resolveEffectiveMax(membership.team, membership.team.competition);
      const newStatus =
        remainingActive.length >= membership.team.competition.minTeamMembers
          ? 'terbentuk'
          : 'mencari';

      const wasLeader = membership.team.leaderId === userId;
      if (wasLeader) {
        const nextLeader = remainingActive[0];
        promotedLeaderId = nextLeader.userId;
        await tx.teamMember.update({
          where: { id: nextLeader.id },
          data: { roleInTeam: 'Ketua Tim' },
        });
      }

      await tx.team.update({
        where: { id: teamId },
        data: {
          status: newStatus,
          leaderId: promotedLeaderId || membership.team.leaderId,
          isRecruiting:
            membership.team.recruitmentType === 'terbuka' && remainingActive.length < effectiveMax
              ? true
              : membership.team.isRecruiting,
          version: { increment: 1 },
        },
      });
    }

    await recordAuditEvent({
      institutionId,
      actorId: userId,
      action: 'TEAM_LEFT',
      targetType: 'Team',
      targetId: teamId,
      metadata: {
        teamName: membership.team.name,
        promotedLeaderId,
      },
    });
  });

  return {
    message: promotedLeaderId
      ? 'Berhasil keluar dari tim. Kepemimpinan dialihkan otomatis ke anggota terlama.'
      : 'Berhasil keluar dari tim',
    newLeaderId: promotedLeaderId,
  };
}

export async function registerForInternalSelection(
  leaderUserId: string,
  teamId: string,
  institutionId: string
) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      competition: true,
      members: {
        where: { status: 'active' },
        include: {
          user: { select: SAFE_MEMBER_USER_SELECT },
        },
      },
    },
  });

  if (!team || team.competition.institutionId !== institutionId) {
    throw new NotFoundError('Tim tidak ditemukan');
  }

  if (team.leaderId !== leaderUserId) {
    throw new ForbiddenError('Hanya ketua tim yang berwenang mengajukan pendaftaran seleksi internal');
  }

  if (team.status === 'terkunci_seleksi') {
    throw new ConflictError('Tim Anda sudah terkonfirmasi dalam proses seleksi internal');
  }

  if (team.status === 'arsip') {
    throw new ForbiddenError('Tim yang diarsipkan tidak dapat mendaftar seleksi');
  }

  const readiness = evaluateTeamReadiness({
    teamStatus: team.status,
    targetMaxMembers: team.targetMaxMembers,
    competition: team.competition,
    members: team.members.map((m) => ({
      userId: m.userId,
      roleInTeam: m.roleInTeam,
      studyProgram: m.user.studentProfile?.studyProgram ?? null,
      rolesCapable: m.user.studentProfile?.rolesCapable ?? [],
    })),
  });

  if (!readiness.isSelectionReady) {
    throw new ValidationError(
      `Tim belum memenuhi syarat seleksi internal: ${readiness.unmetCriteria.join('; ')}`
    );
  }

  const stage = 'Pendaftaran Internal';
  const selection = await prisma.internalSelection.upsert({
    where: {
      competitionId_teamId_stage: {
        competitionId: team.competitionId,
        teamId: team.id,
        stage,
      },
    },
    update: {
      notes: 'Diajukan oleh ketua tim melalui Ruang Tim',
    },
    create: {
      institutionId,
      competitionId: team.competitionId,
      teamId: team.id,
      stage,
      result: 'menunggu',
      organizerVerified: false,
      notes: 'Diajukan oleh ketua tim melalui Ruang Tim',
    },
  });

  await recordAuditEvent({
    institutionId,
    actorId: leaderUserId,
    action: 'TEAM_REGISTERED_INTERNAL_SELECTION',
    targetType: 'InternalSelection',
    targetId: selection.id,
    metadata: { teamId: team.id, competitionId: team.competitionId, stage },
  });

  return selection;
}

// =============================================================================
// Endpoint undangan lama (dipertahankan sementara untuk kompatibilitas riwayat/tes)
// =============================================================================

export async function sendInvite(
  senderId: string,
  teamId: string,
  receiverId: string,
  institutionId: string
): Promise<TeamInvite> {
  if (senderId === receiverId) {
    throw new ValidationError('Anda tidak dapat mengundang diri sendiri');
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      competition: true,
      members: { where: { status: 'active' } },
    },
  });

  if (!team || team.competition.institutionId !== institutionId) {
    throw new NotFoundError('Tim tidak ditemukan');
  }

  const isMember = team.members.some((m) => m.userId === senderId);
  if (!isMember) {
    throw new ForbiddenError('Hanya anggota tim yang dapat mengirimkan undangan');
  }

  if (team.status === 'terkunci_seleksi' || team.status === 'arsip') {
    throw new ForbiddenError('Tim tidak dapat menerima anggota baru');
  }

  const effectiveMax = resolveEffectiveMax(team, team.competition);
  if (team.members.length >= effectiveMax) {
    throw new ConflictError('Kapasitas anggota tim telah penuh');
  }

  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, institutionId: true, role: true, status: true },
  });
  if (!receiver || receiver.institutionId !== institutionId || receiver.role !== 'mahasiswa' || receiver.status !== 'active') {
    throw new NotFoundError('Mahasiswa calon rekan tidak ditemukan atau tidak aktif');
  }

  const receiverActiveMember = await prisma.teamMember.findFirst({
    where: {
      userId: receiverId,
      status: 'active',
      team: {
        competitionId: team.competitionId,
        status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
      },
    },
  });
  if (receiverActiveMember) {
    throw new ConflictError('Mahasiswa tersebut sudah berada dalam tim aktif pada kompetisi ini');
  }

  const activeInvitesCount = await prisma.teamInvite.count({
    where: {
      teamId,
      status: 'diajukan',
      expiresAt: { gt: new Date() },
    },
  });

  if (activeInvitesCount >= 5) {
    throw new ConflictError('Batas maksimal 5 undangan aktif untuk tim ini telah tercapai');
  }

  const existingInvite = await prisma.teamInvite.findFirst({
    where: {
      teamId,
      receiverId,
      status: 'diajukan',
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    throw new ConflictError('Undangan untuk mahasiswa ini masih aktif menunggu respon');
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const invite = await prisma.teamInvite.create({
    data: {
      teamId,
      senderId,
      receiverId,
      status: 'diajukan',
      expiresAt,
    },
  });

  await recordAuditEvent({
    institutionId,
    actorId: senderId,
    action: 'TEAM_INVITE_SENT',
    targetType: 'TeamInvite',
    targetId: invite.id,
    metadata: { teamId, receiverId },
  });

  return invite;
}

export async function getMyInvites(userId: string) {
  const incoming = await prisma.teamInvite.findMany({
    where: {
      receiverId: userId,
      status: 'diajukan',
      expiresAt: { gt: new Date() },
    },
    include: {
      team: {
        include: {
          competition: true,
          members: {
            where: { status: 'active' },
            include: { user: { select: SAFE_MEMBER_USER_SELECT } },
          },
        },
      },
      sender: {
        select: SAFE_MEMBER_USER_SELECT,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const outgoing = await prisma.teamInvite.findMany({
    where: {
      senderId: userId,
      status: { in: ['diajukan', 'diterima', 'ditolak', 'dibatalkan'] },
    },
    include: {
      team: {
        include: { competition: true },
      },
      receiver: {
        select: SAFE_MEMBER_USER_SELECT,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    incoming: incoming.map((inv) => ({
      ...inv,
      sender: sanitizeMemberUser(inv.sender),
      team: {
        ...inv.team,
        members: inv.team.members.map((m) => ({
          ...m,
          user: sanitizeMemberUser(m.user),
        })),
      },
    })),
    outgoing: outgoing.map((inv) => ({
      ...inv,
      receiver: sanitizeMemberUser(inv.receiver),
    })),
  };
}

export async function cancelInvite(
  senderId: string,
  inviteId: string,
  institutionId: string
): Promise<{ message: string }> {
  const invite = await prisma.teamInvite.findFirst({
    where: {
      id: inviteId,
      senderId,
    },
    include: {
      team: { include: { competition: true } },
    },
  });

  if (!invite || invite.team.competition.institutionId !== institutionId) {
    throw new NotFoundError('Undangan tidak ditemukan atau Anda tidak berwenang membatalkannya');
  }

  if (invite.status !== 'diajukan') {
    throw new ConflictError('Hanya undangan berstatus diajukan yang dapat dibatalkan');
  }

  await prisma.teamInvite.update({
    where: { id: invite.id },
    data: { status: 'dibatalkan', respondedAt: new Date() },
  });

  await recordAuditEvent({
    institutionId,
    actorId: senderId,
    action: 'TEAM_INVITE_CANCELLED',
    targetType: 'TeamInvite',
    targetId: invite.id,
    metadata: { teamId: invite.teamId, receiverId: invite.receiverId },
  });

  return { message: 'Undangan berhasil dibatalkan' };
}

export async function respondInvite(
  userId: string,
  inviteId: string,
  action: 'diterima' | 'ditolak',
  institutionId: string
): Promise<{ message: string }> {
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    let markExpiredOutsideTx = false;
    try {
      return await prisma.$transaction(async (tx) => {
        const invite = await tx.teamInvite.findFirst({
          where: {
            id: inviteId,
            receiverId: userId,
          },
          include: {
            team: {
              include: {
                competition: true,
              },
            },
          },
        });

        if (!invite || invite.team.competition.institutionId !== institutionId) {
          throw new NotFoundError('Undangan tidak ditemukan atau Anda tidak berwenang meresponnya');
        }

        if (invite.status !== 'diajukan' || invite.expiresAt.getTime() < Date.now()) {
          throw new ValidationError('Undangan ini sudah tidak aktif atau telah kedaluwarsa');
        }

        if (action === 'ditolak') {
          await tx.teamInvite.update({
            where: { id: invite.id },
            data: { status: 'ditolak', respondedAt: new Date() },
          });

          await recordAuditEvent({
            institutionId,
            actorId: userId,
            action: 'TEAM_INVITE_REJECTED',
            targetType: 'TeamInvite',
            targetId: invite.id,
          });

          return { message: 'Undangan telah ditolak' };
        }

        if (invite.team.status === 'terkunci_seleksi' || invite.team.status === 'arsip') {
          throw new ForbiddenError('Tim tidak dapat menerima anggota baru karena sudah terkunci atau diarsipkan');
        }

        await tx.$executeRaw`SELECT id FROM teams WHERE id = ${invite.teamId} FOR UPDATE`;

        const countRes = await tx.$queryRaw<Array<{ total: bigint | number }>>`
          SELECT COUNT(*) as total FROM team_members WHERE teamId = ${invite.teamId} AND status = 'active' FOR UPDATE
        `;
        const activeMembersCount = Number(countRes[0]?.total ?? 0);
        const effectiveMax = resolveEffectiveMax(invite.team, invite.team.competition);

        if (activeMembersCount >= effectiveMax) {
          markExpiredOutsideTx = true;
          throw new ConflictError('Kapasitas anggota tim telah penuh oleh rekan lain');
        }

        const existingMembership = await tx.teamMember.findFirst({
          where: {
            userId,
            status: 'active',
            team: {
              competitionId: invite.team.competitionId,
              status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
            },
          },
        });

        if (existingMembership) {
          throw new ConflictError('Anda sudah berada dalam tim aktif lain untuk kompetisi ini');
        }

        const previousMemberRecord = await tx.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: invite.teamId,
              userId,
            },
          },
        });

        if (previousMemberRecord) {
          await tx.teamMember.update({
            where: { id: previousMemberRecord.id },
            data: { status: 'active', roleInTeam: 'Anggota', joinedAt: new Date() },
          });
        } else {
          await tx.teamMember.create({
            data: {
              teamId: invite.teamId,
              userId,
              roleInTeam: 'Anggota',
              status: 'active',
            },
          });
        }

        await tx.teamInvite.update({
          where: { id: invite.id },
          data: { status: 'diterima', respondedAt: new Date() },
        });

        const newTotalMembers = activeMembersCount + 1;
        const reachedMax = newTotalMembers >= effectiveMax;
        const newStatus =
          newTotalMembers >= invite.team.competition.minTeamMembers ? 'terbentuk' : 'mencari';

        await tx.team.update({
          where: { id: invite.teamId },
          data: {
            status: newStatus,
            isRecruiting: reachedMax ? false : invite.team.isRecruiting,
            version: { increment: 1 },
          },
        });

        await recordAuditEvent({
          institutionId,
          actorId: userId,
          action: 'TEAM_INVITE_ACCEPTED',
          targetType: 'TeamInvite',
          targetId: invite.id,
          metadata: { teamId: invite.teamId },
        });

        return { message: 'Berhasil bergabung dengan tim' };
      });
    } catch (err: any) {
      if (markExpiredOutsideTx) {
        await prisma.teamInvite.updateMany({
          where: { id: inviteId, status: 'diajukan' },
          data: { status: 'kedaluwarsa', respondedAt: new Date() },
        });
      }
      if (
        (err?.code === 'P2034' ||
          err?.cause?.originalCode === '1213' ||
          err?.message?.includes('Deadlock')) &&
        attempts < 3
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50 * attempts));
        continue;
      }
      throw err;
    }
  }

  throw new ConflictError('Terjadi konflik konkurensi pada tim, silakan ulangi respon undangan.');
}
