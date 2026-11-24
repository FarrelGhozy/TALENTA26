import crypto from 'node:crypto';
import path from 'node:path';
import { prisma } from '../../lib/prisma';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../app/middleware/error';
import { recordAuditEvent } from '../../lib/audit';
import { getStorageService } from '../../lib/storage';
import { resolveAchievementPoints } from '../points/service';
import { getDefaultInstitutionId } from '../competitions/service';
import type {
  AchievementCategory,
  AchievementLevel,
  AchievementResult,
  AchievementStatus,
  ParticipationType,
  Prisma,
} from '@prisma/client';

export const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB batas maksimal sesuai arahan user
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

export interface UploadedFileItem {
  name: string;
  size: number;
  type: string;
  buffer: Buffer;
}

export interface CreateAchievementInput {
  name: string;
  organizer: string;
  category: AchievementCategory;
  level: AchievementLevel;
  result: AchievementResult;
  eventDate: string;
  description?: string;
  isFromInternalSelection?: boolean;
  competitionId?: string;
  competitionSlug?: string;
  participationType?: ParticipationType;
  teamId?: string;
  participantUserIds?: string[];
  competitionCategoryId?: string;
  subCategoryId?: string;
  subCompetitionName?: string;
}

export interface UpdateAchievementInput extends Partial<CreateAchievementInput> {
  status?: AchievementStatus;
}

export interface RevisionInput {
  name?: string;
  organizer?: string;
  category?: AchievementCategory;
  level?: AchievementLevel;
  result?: AchievementResult;
  eventDate?: string;
  description?: string;
  note?: string;
  participationType?: ParticipationType;
  teamId?: string | null;
  participantUserIds?: string[];
  competitionCategoryId?: string | null;
  subCategoryId?: string | null;
  subCompetitionName?: string | null;
  replaceEvidenceIds?: string[];
}

export interface AdminAchievementFilter {
  institutionId?: string;
  status?: string;
  periodId?: string;
  category?: string;
  level?: string;
  q?: string;
}

const VALID_CATEGORIES = new Set<string>([
  'kompetisi',
  'konferensi',
  'olahraga',
  'seni',
  'nominasi',
  'lain',
  'seleksi_internal',
]);
const VALID_LEVELS = new Set<string>(['lokal', 'nasional', 'internasional']);
const VALID_RESULTS = new Set<string>([
  'partisipasi',
  'finalis',
  'juara_3',
  'juara_2',
  'juara_1',
  'penghargaan_khusus',
]);

const VALID_STATUSES = new Set<string>([
  'draft',
  'menunggu',
  'perlu_perbaikan',
  'disetujui',
  'ditolak',
  'dibatalkan',
]);
const MAX_PARTICIPANTS = 20;

function formatJakartaDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getTodayJakartaDateStr(): string {
  return formatJakartaDateStr(new Date());
}

export function validateAchievementInput(data: CreateAchievementInput) {
  if (!data.name || data.name.trim().length < 3 || data.name.trim().length > 200) {
    throw new ValidationError('Nama kegiatan capaian harus 3–200 karakter', {
      name: 'Nama kegiatan capaian harus 3–200 karakter',
    });
  }
  if (!data.organizer || data.organizer.trim().length < 2 || data.organizer.trim().length > 150) {
    throw new ValidationError('Penyelenggara kegiatan harus 2–150 karakter', {
      organizer: 'Penyelenggara kegiatan harus 2–150 karakter',
    });
  }
  if (data.description && data.description.trim().length > 3000) {
    throw new ValidationError('Deskripsi capaian maksimal 3000 karakter', {
      description: 'Deskripsi maksimal 3000 karakter',
    });
  }
  if (!VALID_CATEGORIES.has(data.category)) {
    throw new ValidationError('Kategori kegiatan tidak valid', {
      category: 'Kategori kegiatan tidak valid',
    });
  }
  if (!VALID_LEVELS.has(data.level)) {
    throw new ValidationError('Tingkat capaian tidak valid', {
      level: 'Tingkat capaian tidak valid',
    });
  }
  if (!VALID_RESULTS.has(data.result)) {
    throw new ValidationError('Hasil capaian tidak valid', {
      result: 'Hasil capaian tidak valid',
    });
  }
  if (!data.eventDate) {
    throw new ValidationError('Tanggal capaian wajib diisi', {
      eventDate: 'Tanggal capaian wajib diisi',
    });
  }
  const dateObj = new Date(data.eventDate);
  if (isNaN(dateObj.getTime())) {
    throw new ValidationError('Format tanggal capaian tidak valid', {
      eventDate: 'Format tanggal capaian tidak valid',
    });
  }
  const inputJakartaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
  const todayJakarta = getTodayJakartaDateStr();
  if (inputJakartaDate > todayJakarta) {
    throw new ValidationError('Tanggal capaian tidak boleh berada di masa depan', {
      eventDate: 'Tanggal capaian tidak boleh berada di masa depan',
    });
  }
}

export function validateFileItem(file: UploadedFileItem) {
  const realSize = file.buffer.byteLength;
  if (realSize === 0 || realSize > MAX_FILE_SIZE) {
    throw new ValidationError(
      `Ukuran berkas '${file.name}' tidak valid atau melebihi batas maksimal 8 MB`,
      { file: 'Ukuran berkas harus antara 1 byte hingga 8 MB' }
    );
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new ValidationError(
      `Format berkas '${file.name}' tidak didukung. Gunakan PDF, JPG, atau PNG`,
      { file: 'Format berkas harus PDF, JPG, atau PNG' }
    );
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ValidationError(
      `Tipe MIME berkas '${file.name}' tidak valid (${file.type})`,
      { file: 'Tipe MIME berkas tidak valid' }
    );
  }

  const signatures: Record<string, (buffer: Buffer) => boolean> = {
    'application/pdf': (buffer) => buffer.subarray(0, 5).toString('ascii') === '%PDF-',
    'image/jpeg': (buffer) =>
      buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    'image/png': (buffer) =>
      buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  };
  if (!signatures[file.type]?.(file.buffer)) {
    throw new ValidationError(`Isi berkas '${file.name}' tidak sesuai dengan formatnya`, {
      file: 'Isi berkas tidak sesuai dengan PDF, JPG, atau PNG yang dipilih',
    });
  }
}

export async function cleanupUploadedFiles(
  storage: { deleteFile(key: string): Promise<void> },
  keys: string[]
): Promise<void> {
  const results = await Promise.allSettled(keys.map((key) => storage.deleteFile(key)));
  results.forEach((res, idx) => {
    if (res.status === 'rejected') {
      console.warn(`[STORAGE_DELETE_WARN] Gagal menghapus objek storage ${keys[idx]}:`, res.reason);
    }
  });
}

async function resolveParticipants(
  institutionId: string,
  submitterId: string,
  participationType: ParticipationType,
  teamId?: string | null,
  participantUserIds?: string[],
  expectedCompetitionId?: string | null
): Promise<Array<{ userId: string; roleInTeam: string | null; isSubmitter: boolean }>> {
  if (participationType === 'individu') {
    return [{ userId: submitterId, roleInTeam: null, isSubmitter: true }];
  }

  const memberMap = new Map<string, { userId: string; roleInTeam: string | null; isSubmitter: boolean }>();
  memberMap.set(submitterId, { userId: submitterId, roleInTeam: null, isSubmitter: true });

  if (teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        competition: {
          select: { institutionId: true },
        },
        members: {
          where: { status: 'active' },
          select: { userId: true, roleInTeam: true },
        },
      },
    });
    if (!team || team.competition.institutionId !== institutionId) {
      throw new NotFoundError('Tim tidak ditemukan');
    }
    if (expectedCompetitionId && team.competitionId !== expectedCompetitionId) {
      throw new ValidationError('Tim yang dipilih tidak berasal dari kompetisi yang sama', {
        teamId: 'Tim tidak sesuai dengan kompetisi yang dipilih',
      });
    }
    const isMember = team.members.some((m) => m.userId === submitterId);
    if (!isMember) {
      throw new ForbiddenError('Anda bukan anggota aktif tim yang dipilih');
    }
    for (const m of team.members) {
      memberMap.set(m.userId, {
        userId: m.userId,
        roleInTeam: m.roleInTeam,
        isSubmitter: m.userId === submitterId,
      });
    }
  }

  if (Array.isArray(participantUserIds) && participantUserIds.length > 0) {
    const uniqueIds = Array.from(new Set(participantUserIds.filter(Boolean)));
    if (uniqueIds.length > MAX_PARTICIPANTS) {
      throw new ValidationError(`Jumlah anggota kelompok maksimal ${MAX_PARTICIPANTS} mahasiswa`, {
        participantUserIds: `Maksimal ${MAX_PARTICIPANTS} anggota kelompok`,
      });
    }
    const validUsers = await prisma.user.findMany({
      where: {
        id: { in: uniqueIds },
        institutionId,
        role: 'mahasiswa',
        status: 'active',
      },
      select: { id: true },
    });
    if (validUsers.length !== uniqueIds.length) {
      throw new ValidationError('Sebagian anggota kelompok yang dipilih tidak valid atau bukan mahasiswa aktif', {
        participantUserIds: 'Pastikan seluruh anggota adalah mahasiswa aktif satu kampus',
      });
    }
    for (const u of validUsers) {
      if (!memberMap.has(u.id)) {
        memberMap.set(u.id, {
          userId: u.id,
          roleInTeam: null,
          isSubmitter: u.id === submitterId,
        });
      }
    }
  }

  if (memberMap.size > MAX_PARTICIPANTS) {
    throw new ValidationError(`Jumlah total anggota kelompok maksimal ${MAX_PARTICIPANTS} mahasiswa`, {
      participantUserIds: `Maksimal ${MAX_PARTICIPANTS} anggota kelompok`,
    });
  }

  return Array.from(memberMap.values());
}

async function resolveCategoryAndSubCategory(
  institutionId: string,
  competitionCategoryId?: string | null,
  subCategoryId?: string | null
) {
  let validCatId: string | null = competitionCategoryId || null;
  let validSubId: string | null = subCategoryId || null;

  if (validSubId) {
    const sub = await prisma.competitionSubCategory.findUnique({
      where: { id: validSubId },
      include: { category: true },
    });
    if (!sub || sub.category.institutionId !== institutionId) {
      throw new ValidationError('Sub-lomba tidak ditemukan', { subCategoryId: 'Sub-lomba tidak valid' });
    }
    if (!validCatId) {
      validCatId = sub.categoryId;
    } else if (sub.categoryId !== validCatId) {
      throw new ValidationError('Sub-lomba tidak sesuai dengan jenis lomba yang dipilih', {
        subCategoryId: 'Sub-lomba harus berada dalam jenis lomba yang sama',
      });
    }
  } else if (validCatId) {
    const cat = await prisma.competitionCategory.findUnique({ where: { id: validCatId } });
    if (!cat || cat.institutionId !== institutionId) {
      throw new ValidationError('Jenis lomba tidak ditemukan', { competitionCategoryId: 'Jenis lomba tidak valid' });
    }
  }

  return { competitionCategoryId: validCatId, subCategoryId: validSubId };
}

function resolveSafeAvatarUrl(
  userId: string,
  profile?: { avatarObjectKey?: string | null; updatedAt?: Date | null } | null
): string | null {
  if (!profile?.avatarObjectKey) return null;
  const version = profile.updatedAt ? profile.updatedAt.getTime() : 1;
  return `/api/v1/users/${userId}/avatar?v=${version}`;
}

function sanitizeAchievementUser<
  T extends {
    id: string;
    studentProfile?: {
      avatarObjectKey?: string | null;
      updatedAt?: Date | null;
      [key: string]: any;
    } | null;
  },
>(user?: T | null) {
  if (!user) return user;
  if (!user.studentProfile) return user;
  const { avatarObjectKey, updatedAt, ...safeProfile } = user.studentProfile;
  return {
    ...user,
    studentProfile: {
      ...safeProfile,
      avatarUrl: resolveSafeAvatarUrl(user.id, { avatarObjectKey, updatedAt }),
    },
  };
}

function sanitizeAchievementParticipants<
  T extends {
    user?: {
      id: string;
      studentProfile?: {
        avatarObjectKey?: string | null;
        updatedAt?: Date | null;
        [key: string]: any;
      } | null;
    } | null;
  },
>(participants?: T[]) {
  if (!Array.isArray(participants)) return participants;
  return participants.map((p) => ({
    ...p,
    user: sanitizeAchievementUser(p.user),
  }));
}

// 1. Ambil daftar prestasi milik mahasiswa login (termasuk anggota kelompok)
export async function getStudentAchievements(userId: string, status?: string) {
  const whereClause: Prisma.AchievementWhereInput = {
    OR: [{ userId }, { participants: { some: { userId } } }],
  };
  if (status && status !== 'semua') {
    if (!VALID_STATUSES.has(status)) {
      throw new ValidationError('Filter status prestasi tidak valid');
    }
    whereClause.status = status as AchievementStatus;
  }

  const rows = await prisma.achievement.findMany({
    where: whereClause,
    include: {
      competition: {
        select: { id: true, slug: true, name: true },
      },
      competitionCategory: {
        select: { id: true, code: true, name: true },
      },
      subCategory: {
        select: { id: true, code: true, name: true },
      },
      team: {
        select: { id: true, name: true },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              studentProfile: {
                select: {
                  fullName: true,
                  studyProgram: true,
                  avatarObjectKey: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      },
      evidences: {
        where: { isActive: true },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          isActive: true,
          uploadedAt: true,
        },
      },
      decisions: {
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
      revisions: {
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((row) => ({
    ...row,
    participants: sanitizeAchievementParticipants(row.participants),
  }));
}

// 2. Ambil detail prestasi
export async function getAchievementById(
  id: string,
  userId: string,
  role: string,
  institutionId?: string
) {
  const achievement = await prisma.achievement.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          studentProfile: {
            select: {
              fullName: true,
              nim: true,
              studyProgram: true,
              faculty: true,
              avatarObjectKey: true,
              updatedAt: true,
            },
          },
        },
      },
      competition: {
        select: {
          id: true,
          slug: true,
          name: true,
          pointDescription: true,
        },
      },
      competitionCategory: {
        select: { id: true, code: true, name: true },
      },
      subCategory: {
        select: { id: true, code: true, name: true },
      },
      team: {
        select: { id: true, name: true },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              studentProfile: {
                select: {
                  fullName: true,
                  nim: true,
                  studyProgram: true,
                  avatarObjectKey: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      },
      evidences: {
        orderBy: { uploadedAt: 'asc' },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          isActive: true,
          supersededByRevisionId: true,
          uploadedAt: true,
        },
      },
      revisions: {
        orderBy: { createdAt: 'desc' },
      },
      decisions: {
        orderBy: { createdAt: 'desc' },
        include: {
          decidedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!achievement || (institutionId && achievement.institutionId !== institutionId)) {
    throw new NotFoundError('Data prestasi tidak ditemukan');
  }

  // Anti-IDOR: Mahasiswa hanya boleh melihat miliknya sendiri atau prestasi kelompok di mana ia anggota
  const isParticipant = achievement.participants.some((p) => p.userId === userId);
  if (role === 'mahasiswa' && achievement.userId !== userId && !isParticipant) {
    throw new ForbiddenError('Anda tidak berhak mengakses data prestasi ini');
  }

  const pointRecommendation = await resolveAchievementPoints({
    institutionId: achievement.institutionId,
    category: achievement.category,
    level: achievement.level,
    result: achievement.result,
    competitionId: achievement.competitionId,
    subCategoryId: achievement.subCategoryId,
  });

  const sanitizedSubmitter = sanitizeAchievementUser(achievement.user);
  const sanitizedParticipants = sanitizeAchievementParticipants(achievement.participants);

  const isStaff = role === 'validator' || role === 'super_admin';
  const isSubmitter = achievement.userId === userId;

  // Hilangkan PII lintas pengguna (email/NIM rekan tim & email validator) bagi penampil mahasiswa
  const maskedUser =
    !isStaff && !isSubmitter && sanitizedSubmitter
      ? {
          ...sanitizedSubmitter,
          email: undefined,
          studentProfile: sanitizedSubmitter.studentProfile
            ? {
                ...sanitizedSubmitter.studentProfile,
                nim: undefined,
              }
            : null,
        }
      : sanitizedSubmitter;

  const maskedParticipants =
    !isStaff && Array.isArray(sanitizedParticipants)
      ? sanitizedParticipants.map((p) => {
          if (p.userId === userId || !p.user?.studentProfile) return p;
          return {
            ...p,
            user: {
              ...p.user,
              studentProfile: {
                ...p.user.studentProfile,
                nim: undefined,
              },
            },
          };
        })
      : sanitizedParticipants;

  const maskedDecisions = !isStaff
    ? achievement.decisions.map((d) => ({
        ...d,
        decidedBy: d.decidedBy
          ? {
              id: d.decidedBy.id,
              fullName: d.decidedBy.fullName,
              role: d.decidedBy.role,
            }
          : null,
      }))
    : achievement.decisions;

  return {
    ...achievement,
    user: maskedUser,
    participants: maskedParticipants,
    decisions: maskedDecisions,
    pointRecommendation,
  };
}

// 3. Buat pengajuan prestasi baru
export async function createAchievement(
  institutionId: string,
  userId: string,
  input: CreateAchievementInput,
  files: UploadedFileItem[] = []
) {
  validateAchievementInput(input);

  if (files.length === 0) {
    throw new ValidationError('Wajib mengunggah minimal 1 berkas bukti (sertifikat/SK)', {
      evidence: 'Wajib mengunggah minimal 1 berkas bukti',
    });
  }
  if (files.length > 3) {
    throw new ValidationError('Maksimal berkas bukti yang diizinkan adalah 3 berkas', {
      evidence: 'Maksimal 3 berkas bukti',
    });
  }

  for (const f of files) {
    validateFileItem(f);
  }

  // Ambil periode akademik aktif
  const activePeriod = await prisma.academicPeriod.findFirst({
    where: { institutionId, isActive: true },
  });
  if (!activePeriod) {
    throw new ConflictError('Belum ada periode akademik aktif untuk pengajuan prestasi');
  }

  // Hubungkan dengan kompetisi jika ada slug / ID
  let competitionId = input.competitionId || null;
  let competitionCategoryIdInput = input.competitionCategoryId || null;
  if (!competitionId && input.competitionSlug) {
    const comp = await prisma.competition.findUnique({
      where: { slug: input.competitionSlug },
    });
    if (comp && comp.institutionId === institutionId) {
      competitionId = comp.id;
      if (!competitionCategoryIdInput && comp.competitionCategoryId) {
        competitionCategoryIdInput = comp.competitionCategoryId;
      }
    }
  } else if (competitionId) {
    const comp = await prisma.competition.findUnique({
      where: { id: competitionId },
    });
    if (!comp || comp.institutionId !== institutionId) {
      throw new NotFoundError('Kompetisi tidak ditemukan');
    }
    if (!competitionCategoryIdInput && comp.competitionCategoryId) {
      competitionCategoryIdInput = comp.competitionCategoryId;
    }
  }

  const participationType: ParticipationType =
    input.participationType === 'kelompok' ? 'kelompok' : 'individu';
  const participants = await resolveParticipants(
    institutionId,
    userId,
    participationType,
    input.teamId,
    input.participantUserIds,
    competitionId
  );

  const { competitionCategoryId, subCategoryId } = await resolveCategoryAndSubCategory(
    institutionId,
    competitionCategoryIdInput,
    input.subCategoryId
  );

  // Deteksi kemungkinan duplikat (nama & tanggal capaian sama oleh pengaju atau anggota kelompok)
  const eventDateObj = new Date(input.eventDate);
  const participantIds = participants.map((p) => p.userId);
  const potentialDuplicate = await prisma.achievement.findFirst({
    where: {
      institutionId,
      name: input.name.trim(),
      eventDate: eventDateObj,
      status: { not: 'dibatalkan' },
      OR: [
        { userId: { in: participantIds } },
        { participants: { some: { userId: { in: participantIds } } } },
      ],
    },
    select: { id: true },
  });

  // Unggah seluruh berkas ke RustFS DI LUAR transaksi MySQL agar koneksi pool tidak tertahan I/O jaringan
  const storage = getStorageService();
  const achievementId = `ach_${crypto.randomBytes(12).toString('hex')}`;
  const uploadedFiles: Array<{
    objectKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }> = [];

  let created;
  try {
    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();
      const randomKey = `institutions/${institutionId}/achievements/${achievementId}/${crypto.randomUUID()}${ext}`;
      await storage.uploadFile(randomKey, file.buffer, file.type);
      uploadedFiles.push({
        objectKey: randomKey,
        fileName: file.name,
        fileSize: file.buffer.byteLength,
        mimeType: file.type,
      });
    }

    created = await prisma.$transaction(async (tx) => {
      const ach = await tx.achievement.create({
        data: {
          id: achievementId,
          institutionId,
          userId,
          academicPeriodId: activePeriod.id,
          competitionId,
          competitionCategoryId,
          subCategoryId,
          subCompetitionName: input.subCompetitionName?.trim() || null,
          teamId: participationType === 'kelompok' ? (input.teamId || null) : null,
          participationType,
          potentialDuplicateOfId: potentialDuplicate?.id || null,
          name: input.name.trim(),
          organizer: input.organizer.trim(),
          category: input.category,
          level: input.level,
          result: input.result,
          eventDate: eventDateObj,
          description: input.description?.trim() || null,
          isFromInternalSelection: Boolean(input.isFromInternalSelection),
          status: 'menunggu',
          version: 1,
        },
      });

      await tx.achievementParticipant.createMany({
        data: participants.map((p) => ({
          achievementId: ach.id,
          userId: p.userId,
          roleInTeam: p.roleInTeam,
          isSubmitter: p.isSubmitter,
        })),
      });

      await tx.achievementEvidence.createMany({
        data: uploadedFiles.map((f) => ({
          achievementId: ach.id,
          uploaderId: userId,
          objectKey: f.objectKey,
          fileName: f.fileName,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
          isActive: true,
        })),
      });

      return tx.achievement.findUniqueOrThrow({
        where: { id: ach.id },
        include: {
          participants: true,
          evidences: { where: { isActive: true } },
        },
      });
    });
  } catch (error) {
    await cleanupUploadedFiles(
      storage,
      uploadedFiles.map((f) => f.objectKey)
    );
    throw error;
  }

  await recordAuditEvent({
    institutionId,
    actorId: userId,
    action: 'ACHIEVEMENT_SUBMITTED',
    targetType: 'Achievement',
    targetId: created.id,
    metadata: {
      name: created.name,
      category: created.category,
      participationType: created.participationType,
      participantsCount: participants.length,
      filesCount: files.length,
      potentialDuplicateOfId: potentialDuplicate?.id || null,
    },
  });

  return {
    ...created,
    warning: potentialDuplicate
      ? 'Terdeteksi pengajuan serupa yang pernah diajukan sebelumnya'
      : undefined,
  };
}

// 4. Mahasiswa mengirimkan revisi (perlu_perbaikan -> menunggu)
export async function submitRevision(
  achievementId: string,
  userId: string,
  input: RevisionInput,
  newFiles: UploadedFileItem[] = []
) {
  const current = await prisma.achievement.findUnique({
    where: { id: achievementId },
    include: { evidences: true, participants: true },
  });

  if (!current) throw new NotFoundError('Data prestasi tidak ditemukan');
  if (current.userId !== userId) {
    throw new ForbiddenError('Anda tidak berhak merevisi prestasi ini');
  }
  if (current.status !== 'perlu_perbaikan') {
    throw new ConflictError(
      `Pengajuan dalam status '${current.status}' tidak dapat direvisi`
    );
  }

  for (const f of newFiles) {
    validateFileItem(f);
  }

  const replaceIds = Array.from(new Set((input.replaceEvidenceIds || []).filter(Boolean)));
  const activeEvidences = current.evidences.filter((e) => e.isActive);
  for (const rId of replaceIds) {
    if (!activeEvidences.some((e) => e.id === rId)) {
      throw new ValidationError('ID berkas bukti yang ingin diganti tidak ditemukan atau sudah tidak aktif', {
        replaceEvidenceIds: 'Berkas bukti yang diganti tidak valid',
      });
    }
  }

  const remainingActiveCount = activeEvidences.filter((e) => !replaceIds.includes(e.id)).length;
  const finalActiveCount = remainingActiveCount + newFiles.length;
  if (finalActiveCount < 1) {
    throw new ValidationError('Pengajuan wajib memiliki minimal 1 berkas bukti aktif', {
      evidence: 'Minimal 1 berkas bukti aktif wajib tersedia',
    });
  }
  if (finalActiveCount > 3) {
    throw new ValidationError(
      `Total berkas bukti aktif (${finalActiveCount}) melampaui batas maksimal 3 berkas`,
      { evidence: 'Maksimal total 3 berkas bukti aktif' }
    );
  }

  const mergedEventDate = input.eventDate || formatJakartaDateStr(current.eventDate);
  validateAchievementInput({
    name: input.name !== undefined ? input.name : current.name,
    organizer: input.organizer !== undefined ? input.organizer : current.organizer,
    category: input.category || current.category,
    level: input.level || current.level,
    result: input.result || current.result,
    eventDate: mergedEventDate,
    description: input.description !== undefined ? input.description : (current.description || undefined),
  });

  const nextParticipationType: ParticipationType =
    input.participationType !== undefined
      ? input.participationType
      : current.participationType;
  const nextTeamId =
    input.teamId !== undefined
      ? input.teamId
      : (nextParticipationType === 'kelompok' ? current.teamId : null);

  let nextParticipants: Array<{ userId: string; roleInTeam: string | null; isSubmitter: boolean }> | null = null;
  if (
    input.participationType !== undefined ||
    input.teamId !== undefined ||
    input.participantUserIds !== undefined
  ) {
    nextParticipants = await resolveParticipants(
      current.institutionId,
      userId,
      nextParticipationType,
      nextTeamId,
      input.participantUserIds,
      current.competitionId
    );
  }

  const nextCategoryIdInput =
    input.competitionCategoryId !== undefined ? input.competitionCategoryId : current.competitionCategoryId;
  const nextSubIdInput =
    input.subCategoryId !== undefined ? input.subCategoryId : current.subCategoryId;
  const { competitionCategoryId, subCategoryId } = await resolveCategoryAndSubCategory(
    current.institutionId,
    nextCategoryIdInput,
    nextSubIdInput
  );

  // Unggah berkas baru ke RustFS DI LUAR transaksi MySQL agar koneksi pool tidak tertahan
  const storage = getStorageService();
  const uploadedFiles: Array<{
    objectKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }> = [];

  let updated;
  try {
    for (const file of newFiles) {
      const ext = path.extname(file.name).toLowerCase();
      const randomKey = `institutions/${current.institutionId}/achievements/${current.id}/${crypto.randomUUID()}${ext}`;
      await storage.uploadFile(randomKey, file.buffer, file.type);
      uploadedFiles.push({
        objectKey: randomKey,
        fileName: file.name,
        fileSize: file.buffer.byteLength,
        mimeType: file.type,
      });
    }

    updated = await prisma.$transaction(async (tx) => {
      // Kunci baris pengajuan untuk mencegah revisi serentak (double revision / >3 berkas)
      await tx.$executeRaw`SELECT id FROM achievements WHERE id = ${achievementId} FOR UPDATE`;

      const locked = await tx.achievement.findUnique({
        where: { id: achievementId },
        include: { evidences: { where: { isActive: true } } },
      });
      if (!locked) throw new NotFoundError('Data prestasi tidak ditemukan');
      if (locked.userId !== userId) {
        throw new ForbiddenError('Anda tidak berhak merevisi prestasi ini');
      }
      if (locked.status !== 'perlu_perbaikan') {
        throw new ConflictError(
          `Pengajuan dalam status '${locked.status}' tidak dapat direvisi`
        );
      }

      for (const rId of replaceIds) {
        if (!locked.evidences.some((e) => e.id === rId)) {
          throw new ConflictError('Berkas bukti yang ingin diganti sudah tidak aktif. Muat ulang halaman.');
        }
      }
      const lockedFinalActive =
        locked.evidences.filter((e) => !replaceIds.includes(e.id)).length + uploadedFiles.length;
      if (lockedFinalActive < 1 || lockedFinalActive > 3) {
        throw new ValidationError('Jumlah berkas bukti aktif harus antara 1 hingga 3 berkas');
      }

      // 1. Simpan snapshot versi lama ke achievement_revisions
      const revision = await tx.achievementRevision.create({
        data: {
          achievementId: locked.id,
          versionNumber: locked.version,
          snapshotJson: {
            name: locked.name,
            organizer: locked.organizer,
            category: locked.category,
            level: locked.level,
            result: locked.result,
            eventDate: locked.eventDate.toISOString(),
            description: locked.description,
            participationType: locked.participationType,
            teamId: locked.teamId,
            competitionCategoryId: locked.competitionCategoryId,
            subCategoryId: locked.subCategoryId,
            subCompetitionName: locked.subCompetitionName,
            reviewNote: locked.reviewNote,
            replacedEvidenceIds: replaceIds,
          },
          note: input.note?.trim().slice(0, 1000) || 'Pengiriman revisi oleh mahasiswa',
        },
      });

      // 2. Nonaktifkan berkas bukti lama yang dipilih untuk diganti (tetap tersimpan untuk jejak audit)
      if (replaceIds.length > 0) {
        await tx.achievementEvidence.updateMany({
          where: {
            achievementId: locked.id,
            id: { in: replaceIds },
          },
          data: {
            isActive: false,
            supersededByRevisionId: revision.id,
          },
        });
      }

      // 3. Catat metadata berkas baru bila ada
      if (uploadedFiles.length > 0) {
        await tx.achievementEvidence.createMany({
          data: uploadedFiles.map((f) => ({
            achievementId: locked.id,
            uploaderId: userId,
            objectKey: f.objectKey,
            fileName: f.fileName,
            fileSize: f.fileSize,
            mimeType: f.mimeType,
            isActive: true,
          })),
        });
      }

      // 4. Perbarui daftar anggota bila diubah
      if (nextParticipants) {
        await tx.achievementParticipant.deleteMany({
          where: { achievementId: locked.id },
        });
        await tx.achievementParticipant.createMany({
          data: nextParticipants.map((p) => ({
            achievementId: locked.id,
            userId: p.userId,
            roleInTeam: p.roleInTeam,
            isSubmitter: p.isSubmitter,
          })),
        });
      }

      // 5. Update field data dan status menjadi 'menunggu'
      const eventDateObj = input.eventDate ? new Date(input.eventDate) : locked.eventDate;
      const achUpdated = await tx.achievement.update({
        where: { id: locked.id },
        data: {
          name: input.name ? input.name.trim() : locked.name,
          organizer: input.organizer ? input.organizer.trim() : locked.organizer,
          category: input.category || locked.category,
          level: input.level || locked.level,
          result: input.result || locked.result,
          eventDate: eventDateObj,
          description: input.description !== undefined ? (input.description?.trim() || null) : locked.description,
          participationType: nextParticipationType,
          teamId: nextParticipationType === 'kelompok' ? (nextTeamId || null) : null,
          competitionCategoryId,
          subCategoryId,
          subCompetitionName:
            input.subCompetitionName !== undefined
              ? (input.subCompetitionName?.trim() || null)
              : locked.subCompetitionName,
          status: 'menunggu',
          version: locked.version + 1,
          reviewNote: null,
        },
        include: {
          evidences: { where: { isActive: true } },
          participants: true,
        },
      });

      return achUpdated;
    });
  } catch (error) {
    await cleanupUploadedFiles(
      storage,
      uploadedFiles.map((f) => f.objectKey)
    );
    throw error;
  }

  await recordAuditEvent({
    institutionId: current.institutionId,
    actorId: userId,
    action: 'ACHIEVEMENT_REVISED',
    targetType: 'Achievement',
    targetId: current.id,
    metadata: {
      newVersion: updated.version,
      newFilesCount: newFiles.length,
      replacedEvidenceCount: replaceIds.length,
    },
  });

  return updated;
}

// 4B. Mahasiswa membatalkan pengajuan yang masih menunggu (atomik + bersihkan berkas RustFS)
export async function cancelAchievement(
  achievementId: string,
  userId: string,
  institutionId: string
) {
  const { cancelled, evidenceKeysToDelete } = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM achievements WHERE id = ${achievementId} FOR UPDATE`;

    const current = await tx.achievement.findUnique({
      where: { id: achievementId },
      include: {
        evidences: {
          select: { id: true, objectKey: true },
        },
      },
    });

    if (!current || current.institutionId !== institutionId) {
      throw new NotFoundError('Data prestasi tidak ditemukan');
    }
    if (current.userId !== userId) {
      throw new ForbiddenError('Anda tidak berhak membatalkan prestasi ini');
    }
    if (current.status !== 'menunggu') {
      throw new ConflictError(
        `Pengajuan dalam status '${current.status}' tidak dapat dibatalkan`
      );
    }

    const keys = current.evidences.map((e) => e.objectKey);
    if (keys.length > 0) {
      await tx.achievementEvidence.updateMany({
        where: { achievementId: current.id },
        data: { isActive: false },
      });
    }

    const updated = await tx.achievement.update({
      where: { id: current.id },
      data: {
        status: 'dibatalkan',
        version: { increment: 1 },
      },
    });

    return { cancelled: updated, evidenceKeysToDelete: keys };
  });

  // Hapus berkas bukti dari RustFS untuk pengajuan yang dibatalkan sendiri sebelum dinilai
  if (evidenceKeysToDelete.length > 0) {
    const storage = getStorageService();
    await cleanupUploadedFiles(storage, evidenceKeysToDelete);
  }

  await recordAuditEvent({
    institutionId,
    actorId: userId,
    action: 'ACHIEVEMENT_CANCELLED',
    targetType: 'Achievement',
    targetId: cancelled.id,
    metadata: { previousStatus: 'menunggu', deletedFilesCount: evidenceKeysToDelete.length },
  });

  return cancelled;
}

// 5. Unduh berkas bukti privat secara terotorisasi (Anti-IDOR)
export async function getEvidenceFile(
  evidenceId: string,
  userId: string,
  role: string,
  institutionId?: string
) {
  const evidence = await prisma.achievementEvidence.findUnique({
    where: { id: evidenceId },
    include: {
      achievement: {
        include: {
          participants: { select: { userId: true } },
        },
      },
    },
  });

  if (!evidence || (institutionId && evidence.achievement.institutionId !== institutionId)) {
    throw new NotFoundError('Berkas bukti tidak ditemukan');
  }

  // Anti-IDOR: Mahasiswa hanya boleh unduh berkas miliknya sendiri atau prestasi kelompok di mana ia anggota
  const isParticipant = evidence.achievement.participants.some((p) => p.userId === userId);
  if (
    role === 'mahasiswa' &&
    evidence.uploaderId !== userId &&
    evidence.achievement.userId !== userId &&
    !isParticipant
  ) {
    throw new ForbiddenError('Anda tidak memiliki izin untuk mengunduh berkas bukti ini');
  }

  const storage = getStorageService();
  const fileData = await storage.getFile(evidence.objectKey);

  return {
    buffer: fileData.buffer,
    contentType: fileData.contentType || evidence.mimeType,
    fileName: evidence.fileName,
    size: fileData.buffer.byteLength,
  };
}

// 6. Antrean verifikasi validator
export async function getAdminAchievements(filters: AdminAchievementFilter = {}) {
  const whereClause: Prisma.AchievementWhereInput = {};

  if (filters.institutionId) {
    whereClause.institutionId = filters.institutionId;
  }

  if (filters.status && filters.status !== 'semua') {
    if (!VALID_STATUSES.has(filters.status)) {
      throw new ValidationError('Filter status pengajuan tidak valid');
    }
    whereClause.status = filters.status as AchievementStatus;
  }
  if (filters.category && filters.category !== 'semua') {
    if (!VALID_CATEGORIES.has(filters.category)) {
      throw new ValidationError('Filter kategori prestasi tidak valid');
    }
    whereClause.category = filters.category as AchievementCategory;
  }
  if (filters.level && filters.level !== 'semua') {
    if (!VALID_LEVELS.has(filters.level)) {
      throw new ValidationError('Filter tingkat prestasi tidak valid');
    }
    whereClause.level = filters.level as AchievementLevel;
  }
  if (filters.periodId) {
    whereClause.academicPeriodId = filters.periodId;
  }
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim();
    whereClause.OR = [
      { name: { contains: q } },
      { organizer: { contains: q } },
      { user: { studentProfile: { fullName: { contains: q } } } },
      { user: { studentProfile: { nim: { contains: q } } } },
    ];
  }

  const rows = await prisma.achievement.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          studentProfile: {
            select: {
              fullName: true,
              nim: true,
              studyProgram: true,
              faculty: true,
              avatarObjectKey: true,
              updatedAt: true,
            },
          },
        },
      },
      competition: {
        select: { id: true, slug: true, name: true },
      },
      competitionCategory: {
        select: { id: true, code: true, name: true },
      },
      subCategory: {
        select: { id: true, code: true, name: true },
      },
      team: {
        select: { id: true, name: true },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              studentProfile: {
                select: {
                  fullName: true,
                  nim: true,
                  studyProgram: true,
                  avatarObjectKey: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      },
      evidences: {
        where: { isActive: true },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          isActive: true,
          uploadedAt: true,
        },
      },
      decisions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          decidedBy: {
            select: { id: true, fullName: true, role: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((row) => ({
    ...row,
    user: sanitizeAchievementUser(row.user),
    participants: sanitizeAchievementParticipants(row.participants),
  }));
}

// 7. Keputusan validator (approve, request_changes, reject) dengan Concurrency Lock, 3-Lapis Poin, & Kelompok
export async function decideAchievement(
  achievementId: string,
  validatorId: string,
  action: 'approve' | 'request_changes' | 'reject',
  reason?: string,
  clientVersion?: number,
  institutionId?: string,
  options?: {
    overridePoints?: number;
    overrideReason?: string;
    idempotencyKey?: string;
  }
) {
  if ((action === 'request_changes' || action === 'reject') && (!reason || reason.trim().length < 3)) {
    throw new ValidationError('Alasan keputusan wajib diisi minimal 3 karakter', {
      reason: 'Alasan keputusan wajib diisi',
    });
  }

  const overridePoints = options?.overridePoints;
  const overrideReason = options?.overrideReason?.trim();

  if (overridePoints !== undefined) {
    if (action !== 'approve') {
      throw new ValidationError('Override poin hanya dapat diberikan saat menyetujui pengajuan', {
        overridePoints: 'Override poin hanya berlaku pada aksi approve',
      });
    }
    if (!Number.isInteger(overridePoints) || overridePoints < 0) {
      throw new ValidationError('Nilai override poin harus berupa bilangan bulat >= 0', {
        overridePoints: 'Nilai poin tidak valid',
      });
    }
    if (!overrideReason || overrideReason.length < 3) {
      throw new ValidationError('Alasan perubahan poin (override) wajib diisi minimal 3 karakter', {
        overrideReason: 'Alasan perubahan poin wajib diisi minimal 3 karakter',
      });
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM achievements WHERE id = ${achievementId} FOR UPDATE`;

    const ach = await tx.achievement.findUnique({
      where: { id: achievementId },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    if (!ach || (institutionId && ach.institutionId !== institutionId)) {
      throw new NotFoundError('Data pengajuan prestasi tidak ditemukan');
    }

    // Idempotent replay bila Idempotency-Key yang sama pernah berhasil pada pengajuan ini
    const rawIdemKey = options?.idempotencyKey?.trim();
    if (rawIdemKey && ach.status !== 'menunggu') {
      const existingReplay = await tx.pointLedger.findFirst({
        where: {
          achievementId: ach.id,
          idempotencyKey: { startsWith: `${rawIdemKey}:` },
        },
        select: { id: true, calculatedPoints: true, points: true, pointSource: true },
      });
      if (existingReplay && action === 'approve' && ach.status === 'disetujui') {
        return {
          updated: ach,
          previousStatus: ach.status,
          calculatedPoints: existingReplay.calculatedPoints ?? existingReplay.points,
          awardedPoints: existingReplay.points,
          pointSource: existingReplay.pointSource,
          recipientCount: ach.participants.length || 1,
          replayed: true,
        };
      }
    }

    // Concurrency control: Optimistic locking
    if (clientVersion !== undefined && ach.version !== clientVersion) {
      throw new ConflictError(
        'Status pengajuan telah diubah oleh validator lain. Silakan muat ulang halaman.'
      );
    }

    if (ach.status !== 'menunggu') {
      throw new ConflictError(
        `Pengajuan berstatus '${ach.status}' tidak dapat diputuskan ulang melalui endpoint keputusan.`
      );
    }

    if (overridePoints !== undefined && ach.category !== 'kompetisi' && overridePoints > 0) {
      throw new ValidationError('Override poin hanya berlaku untuk prestasi kategori kompetisi lomba', {
        overridePoints: 'Prestasi non-kompetisi tidak dapat diberi poin ranking',
      });
    }

    let newStatus: AchievementStatus;
    if (action === 'approve') newStatus = 'disetujui';
    else if (action === 'request_changes') newStatus = 'perlu_perbaikan';
    else newStatus = 'ditolak';

    let calculatedPoints = 0;
    let awardedPoints = 0;
    let pointSource = 'non_competition';
    let ruleVersion = 1;

    if (newStatus === 'disetujui') {
      const resolution = await resolveAchievementPoints(
        {
          institutionId: ach.institutionId,
          category: ach.category,
          level: ach.level,
          result: ach.result,
          competitionId: ach.competitionId,
          subCategoryId: ach.subCategoryId,
        },
        tx
      );
      ruleVersion = resolution.ruleVersion;
      calculatedPoints = ach.category === 'kompetisi' ? resolution.calculatedPoints : 0;

      if (ach.category === 'kompetisi') {
        if (overridePoints !== undefined) {
          awardedPoints = overridePoints;
          pointSource = 'validator_override';
        } else {
          awardedPoints = calculatedPoints;
          pointSource = resolution.pointSource;
        }
      } else {
        awardedPoints = 0;
        pointSource = 'non_competition';
      }
    }

    // 1. Rekam riwayat keputusan validator (termasuk poin otomatis / override)
    await tx.achievementDecision.create({
      data: {
        achievementId: ach.id,
        decidedById: validatorId,
        action,
        previousStatus: ach.status,
        newStatus,
        reason: reason?.trim() || null,
        calculatedPoints: newStatus === 'disetujui' ? calculatedPoints : null,
        awardedPoints: newStatus === 'disetujui' ? awardedPoints : null,
        pointSource: newStatus === 'disetujui' ? pointSource : null,
        overrideReason: overridePoints !== undefined ? overrideReason : null,
        version: ach.version,
      },
    });

    // 2. Jika disetujui dan merupakan prestasi lomba (kategori 'kompetisi'):
    // Berikan poin penuh ke seluruh anggota yang tercatat (atau pengaju bila individu)
    const recipientIds =
      ach.participants.length > 0
        ? Array.from(new Set(ach.participants.map((p) => p.userId)))
        : [ach.userId];

    if (newStatus === 'disetujui' && ach.category === 'kompetisi' && awardedPoints > 0) {
      const baseKey = rawIdemKey || `approve:${ach.id}:v${ach.version}`;
      const ledgerReason =
        overridePoints !== undefined
          ? `Persetujuan kompetisi (Override Validator: ${overrideReason})`
          : `Persetujuan prestasi kompetisi (${ach.level} - ${ach.result})`;

      await tx.pointLedger.createMany({
        data: recipientIds.map((recipientId) => ({
          institutionId: ach.institutionId,
          userId: recipientId,
          achievementId: ach.id,
          academicPeriodId: ach.academicPeriodId,
          ruleVersion,
          points: awardedPoints,
          type: 'award',
          pointSource,
          calculatedPoints,
          overrideReason: overridePoints !== undefined ? overrideReason : null,
          idempotencyKey: `${baseKey}:${recipientId}`,
          reason: ledgerReason,
        })),
      });
    }

    // 3. Update status prestasi dan naikkan version secara atomik
    const updated = await tx.achievement.update({
      where: { id: ach.id },
      data: {
        status: newStatus,
        reviewNote: reason?.trim() || null,
        version: ach.version + 1,
      },
    });

    return {
      updated,
      previousStatus: ach.status,
      calculatedPoints,
      awardedPoints,
      pointSource,
      recipientCount: recipientIds.length,
      replayed: false,
    };
  });

  if (!result.replayed) {
    await recordAuditEvent({
      institutionId: result.updated.institutionId,
      actorId: validatorId,
      action: `ACHIEVEMENT_DECISION_${action.toUpperCase()}`,
      targetType: 'Achievement',
      targetId: result.updated.id,
      metadata: {
        previousStatus: result.previousStatus,
        newStatus: result.updated.status,
        reason: reason?.trim() || null,
        version: result.updated.version,
        calculatedPoints: result.calculatedPoints,
        awardedPoints: result.awardedPoints,
        pointSource: result.pointSource,
        overrideReason: overridePoints !== undefined ? overrideReason : null,
        recipientCount: result.recipientCount,
      },
    });
  }

  return result.updated;
}

// 8. Koreksi keputusan prestasi disetujui (membalikkan poin di ledger secara atomik tanpa double-reversal)
export async function correctAchievement(
  achievementId: string,
  validatorId: string,
  reason: string,
  clientVersion?: number,
  targetStatus: 'ditolak' | 'perlu_perbaikan' = 'ditolak',
  institutionId?: string
) {
  if (!reason || reason.trim().length < 3) {
    throw new ValidationError('Alasan koreksi keputusan wajib diisi minimal 3 karakter', {
      reason: 'Alasan koreksi keputusan wajib diisi',
    });
  }
  if (!['ditolak', 'perlu_perbaikan'].includes(targetStatus)) {
    throw new ValidationError('Status tujuan koreksi tidak valid');
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM achievements WHERE id = ${achievementId} FOR UPDATE`;

    const ach = await tx.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!ach || (institutionId && ach.institutionId !== institutionId)) {
      throw new NotFoundError('Data prestasi tidak ditemukan');
    }

    if (clientVersion !== undefined && ach.version !== clientVersion) {
      throw new ConflictError(
        'Status pengajuan telah diubah sebelumnya. Silakan muat ulang halaman.'
      );
    }

    if (ach.status !== 'disetujui') {
      throw new ConflictError(
        `Koreksi keputusan hanya dapat dilakukan pada prestasi berstatus 'disetujui'`
      );
    }

    // 1. Hitung net poin aktif per (userId, ruleVersion) agar tidak terjadi double-reversal
    const allLedgers = await tx.pointLedger.findMany({
      where: { achievementId: ach.id },
    });

    const netByUserAndRule = new Map<string, { userId: string; ruleVersion: number; net: number }>();
    for (const entry of allLedgers) {
      const key = `${entry.userId}::${entry.ruleVersion}`;
      const existing = netByUserAndRule.get(key) || {
        userId: entry.userId,
        ruleVersion: entry.ruleVersion,
        net: 0,
      };
      existing.net += entry.points;
      netByUserAndRule.set(key, existing);
    }

    // 2. Catat pembalikan poin (reversal) hanya sebesar net poin positif yang masih aktif (bulk createMany)
    const reversals = Array.from(netByUserAndRule.values())
      .filter((bucket) => bucket.net > 0)
      .map((bucket) => ({
        institutionId: ach.institutionId,
        userId: bucket.userId,
        achievementId: ach.id,
        academicPeriodId: ach.academicPeriodId,
        ruleVersion: bucket.ruleVersion,
        points: -bucket.net,
        type: 'reversal' as const,
        pointSource: 'reversal',
        idempotencyKey: `correct:${ach.id}:v${ach.version}:${bucket.userId}:${bucket.ruleVersion}`,
        reason: `Koreksi pembatalan persetujuan: ${reason.trim()}`,
      }));
    if (reversals.length > 0) {
      await tx.pointLedger.createMany({ data: reversals });
    }

    // 3. Catat keputusan koreksi
    await tx.achievementDecision.create({
      data: {
        achievementId: ach.id,
        decidedById: validatorId,
        action: 'correct',
        previousStatus: ach.status,
        newStatus: targetStatus,
        reason: reason.trim(),
        version: ach.version,
      },
    });

    // 4. Update status prestasi
    const updated = await tx.achievement.update({
      where: { id: ach.id },
      data: {
        status: targetStatus,
        reviewNote: `[KOREKSI] ${reason.trim()}`,
        version: ach.version + 1,
      },
    });

    return { updated, previousStatus: ach.status };
  });

  await recordAuditEvent({
    institutionId: result.updated.institutionId,
    actorId: validatorId,
    action: 'ACHIEVEMENT_CORRECTED',
    targetType: 'Achievement',
    targetId: result.updated.id,
    metadata: {
      previousStatus: result.previousStatus,
      newStatus: result.updated.status,
      reason: reason.trim(),
      version: result.updated.version,
    },
  });

  return result.updated;
}

export interface RankingViewOptions {
  includeAvatar?: boolean;
  viewerInstitutionId?: string;
}

// Helper agregasi ranking deterministik (menghindari double-count achievementId)
function aggregateRankingEntries(
  ledgerEntries: Array<{
    userId: string;
    points: number;
    type: string;
    user: {
      institutionId?: string;
      studentProfile: {
        fullName: string;
        studyProgram: string;
        avatarObjectKey?: string | null;
        updatedAt?: Date;
      } | null;
    };
    achievement: {
      id: string;
      result: string;
      status: string;
    } | null;
  }>,
  options: RankingViewOptions = {}
) {
  const allowAvatar = Boolean(options.includeAvatar && options.viewerInstitutionId);

  const userStats = new Map<
    string,
    {
      userId: string;
      fullName: string;
      studyProgram: string;
      avatarUrl?: string;
      points: number;
      perAchievementNet: Map<string, { net: number; result: string; status: string }>;
    }
  >();

  for (const entry of ledgerEntries) {
    const uId = entry.userId;
    const profile = entry.user.studentProfile;
    const canExposeAvatar =
      allowAvatar &&
      entry.user.institutionId === options.viewerInstitutionId &&
      Boolean(profile?.avatarObjectKey);
    const resolvedAvatarUrl = canExposeAvatar
      ? `/api/v1/users/${uId}/avatar?v=${profile?.updatedAt ? profile.updatedAt.getTime() : 1}`
      : undefined;

    const existing = userStats.get(uId) || {
      userId: uId,
      fullName: profile?.fullName || 'Mahasiswa',
      studyProgram: profile?.studyProgram || '-',
      ...(resolvedAvatarUrl ? { avatarUrl: resolvedAvatarUrl } : {}),
      points: 0,
      perAchievementNet: new Map<string, { net: number; result: string; status: string }>(),
    };

    existing.points += entry.points;
    if (entry.achievement) {
      const achStat = existing.perAchievementNet.get(entry.achievement.id) || {
        net: 0,
        result: entry.achievement.result,
        status: entry.achievement.status,
      };
      achStat.net += entry.points;
      existing.perAchievementNet.set(entry.achievement.id, achStat);
    }
    userStats.set(uId, existing);
  }

  return Array.from(userStats.values())
    .map((item) => {
      let approvedCount = 0;
      let juara1Count = 0;
      for (const achStat of item.perAchievementNet.values()) {
        if (achStat.net > 0 && achStat.status === 'disetujui') {
          approvedCount += 1;
          if (achStat.result === 'juara_1') {
            juara1Count += 1;
          }
        }
      }
      return {
        userId: item.userId,
        fullName: item.fullName,
        studyProgram: item.studyProgram,
        avatarUrl: item.avatarUrl,
        points: item.points,
        approvedCount,
        juara1Count,
      };
    })
    .filter((s) => s.points > 0)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.juara1Count !== a.juara1Count) return b.juara1Count - a.juara1Count;
      if (b.approvedCount !== a.approvedCount) return b.approvedCount - a.approvedCount;
      const nameCmp = a.fullName.localeCompare(b.fullName);
      if (nameCmp !== 0) return nameCmp;
      return a.userId.localeCompare(b.userId);
    })
    .map((item, index) => ({
      rank: index + 1,
      userId: item.userId,
      fullName: item.fullName,
      studyProgram: item.studyProgram,
      ...(item.avatarUrl ? { avatarUrl: item.avatarUrl } : {}),
      points: item.points,
      approvedCount: item.approvedCount,
      juara1Count: item.juara1Count,
    }));
}

// 9. Mesin Ranking Publik & Internal Terotorisasi — Bebas PII & Stabil
export async function getPublicRanking(periodId?: string, options: RankingViewOptions = {}) {
  const institutionId = options.viewerInstitutionId || (await getDefaultInstitutionId());
  let activePeriodId = periodId;

  if (!activePeriodId) {
    const activePeriod = await prisma.academicPeriod.findFirst({
      where: { institutionId, isActive: true },
    });
    activePeriodId = activePeriod?.id;
  }

  if (!activePeriodId) {
    return { period: null, ranking: [] };
  }

  const periodData = await prisma.academicPeriod.findFirst({
    where: { id: activePeriodId, institutionId },
  });
  if (!periodData) {
    return { period: null, ranking: [] };
  }

  const includeAvatar = Boolean(options.includeAvatar && options.viewerInstitutionId);

  const ledgerEntries = await prisma.pointLedger.findMany({
    where: {
      institutionId,
      academicPeriodId: activePeriodId,
    },
    include: {
      user: {
        select: {
          id: true,
          ...(includeAvatar ? { institutionId: true } : {}),
          studentProfile: {
            select: {
              fullName: true,
              studyProgram: true,
              ...(includeAvatar ? { avatarObjectKey: true, updatedAt: true } : {}),
            },
          },
        },
      },
      achievement: {
        select: {
          id: true,
          result: true,
          status: true,
        },
      },
    },
  });

  const ranking = aggregateRankingEntries(ledgerEntries, options);

  return {
    period: {
      id: periodData.id,
      name: periodData.name,
      year: periodData.year,
      semester: periodData.semester,
    },
    ranking,
  };
}

// 10. Ranking Sepanjang Waktu (Lifetime Ranking)
export async function getLifetimeRanking(options: RankingViewOptions = {}) {
  const institutionId = options.viewerInstitutionId || (await getDefaultInstitutionId());
  const includeAvatar = Boolean(options.includeAvatar && options.viewerInstitutionId);

  const ledgerEntries = await prisma.pointLedger.findMany({
    where: { institutionId },
    include: {
      user: {
        select: {
          id: true,
          ...(includeAvatar ? { institutionId: true } : {}),
          studentProfile: {
            select: {
              fullName: true,
              studyProgram: true,
              ...(includeAvatar ? { avatarObjectKey: true, updatedAt: true } : {}),
            },
          },
        },
      },
      achievement: {
        select: {
          id: true,
          result: true,
          status: true,
        },
      },
    },
  });

  const ranking = aggregateRankingEntries(ledgerEntries, options);

  return {
    period: {
      id: 'lifetime',
      name: 'Sepanjang Waktu (Lifetime)',
      year: 0,
      semester: 'all',
    },
    ranking,
  };
}
