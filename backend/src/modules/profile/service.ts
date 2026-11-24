import crypto from 'node:crypto';
import path from 'node:path';
import { prisma } from '../../lib/prisma';
import { recordAuditEvent } from '../../lib/audit';
import { invalidateRankingCache } from '../../lib/cache';
import { getStorageService } from '../../lib/storage';
import { NotFoundError, ValidationError } from '../../app/middleware/error';
import type { StudentProfile } from '@prisma/client';

export const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_AVATAR_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export interface UpdateStudentProfileDto {
  fullName?: string | null;
  studyProgram?: string | null;
  faculty?: string | null;
  enrollmentYear?: number | null;
  avatarUrl?: string | null;
  phone?: string | null;
  bio?: string | null;
  skills?: any;
  interests?: any;
  availability?: any;
  rolesCapable?: any;
  experience?: string | null;
}

function validateAvatarBuffer(fileName: string, mimeType: string, buffer: Buffer): void {
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_AVATAR_SIZE) {
    throw new ValidationError('Ukuran foto profil harus antara 1 byte hingga 2 MB');
  }
  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_AVATAR_EXT.has(ext) || !ALLOWED_AVATAR_MIME.has(mimeType)) {
    throw new ValidationError('Format foto profil harus JPG, PNG, atau WebP');
  }

  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  if (
    (mimeType === 'image/jpeg' && !isJpeg) ||
    (mimeType === 'image/png' && !isPng) ||
    (mimeType === 'image/webp' && !isWebp)
  ) {
    throw new ValidationError('Isi berkas foto tidak sesuai dengan format gambar yang dipilih');
  }
}

const MAX_PROFILE_JSON_BYTES = 8 * 1024;
const MAX_PROFILE_LIST_ITEMS = 30;

function validateBoundedJsonField(fieldName: string, value: unknown): any {
  if (value === null) return null;
  if (Array.isArray(value)) {
    if (value.length > MAX_PROFILE_LIST_ITEMS) {
      throw new ValidationError(`Kolom ${fieldName} maksimal ${MAX_PROFILE_LIST_ITEMS} item`);
    }
  } else if (typeof value !== 'object' && typeof value !== 'string') {
    throw new ValidationError(`Format kolom ${fieldName} tidak valid`);
  }
  const serialized = JSON.stringify(value);
  if (!serialized || Buffer.byteLength(serialized, 'utf8') > MAX_PROFILE_JSON_BYTES) {
    throw new ValidationError(`Ukuran data kolom ${fieldName} melebihi batas yang diizinkan`);
  }
  return value;
}

export async function getStudentProfile(userId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new NotFoundError('Profil mahasiswa tidak ditemukan.');
  }

  const activeTarget = await prisma.studentTarget.findFirst({
    where: { userId, status: 'active' },
    include: { competition: true },
  });

  const { avatarObjectKey, ...safeProfile } = profile;

  return {
    ...safeProfile,
    avatarUrl: avatarObjectKey
      ? `/api/v1/users/${userId}/avatar?v=${profile.updatedAt.getTime()}`
      : profile.avatarUrl,
    targetKompetisiSlug: activeTarget?.competition.slug || null,
    targetKompetisiNama: activeTarget?.competition.name || null,
  };
}

export async function updateStudentProfile(
  userId: string,
  dto: UpdateStudentProfileDto,
  ipAddress?: string,
  userAgent?: string
): Promise<Omit<StudentProfile, 'avatarObjectKey'>> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!profile) {
    throw new NotFoundError('Profil mahasiswa tidak ditemukan.');
  }

  const updateData: {
    fullName?: string;
    studyProgram?: string;
    faculty?: string;
    enrollmentYear?: number | null;
    avatarUrl?: string | null;
    avatarObjectKey?: string | null;
    phone?: string | null;
    bio?: string | null;
  } = {};

  if (dto.fullName !== undefined && dto.fullName !== null) {
    const trimmed = dto.fullName.trim();
    if (trimmed.length < 2 || trimmed.length > 150) {
      throw new ValidationError('Nama lengkap harus 2–150 karakter');
    }
    updateData.fullName = trimmed;
  }

  if (dto.studyProgram !== undefined && dto.studyProgram !== null) {
    const trimmed = dto.studyProgram.trim();
    if (!trimmed || trimmed.length > 120) {
      throw new ValidationError('Program studi wajib diisi (maksimal 120 karakter)');
    }
    updateData.studyProgram = trimmed;
  }

  if (dto.faculty !== undefined && dto.faculty !== null) {
    const trimmed = dto.faculty.trim();
    if (trimmed) {
      if (trimmed.length > 120) {
        throw new ValidationError('Fakultas maksimal 120 karakter');
      }
      updateData.faculty = trimmed;
    }
  }

  if (dto.enrollmentYear !== undefined) {
    if (dto.enrollmentYear === null) {
      updateData.enrollmentYear = null;
    } else {
      const currentYear = Number(
        new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(new Date())
      );
      if (!Number.isInteger(dto.enrollmentYear) || dto.enrollmentYear < 1900 || dto.enrollmentYear > currentYear + 1) {
        throw new ValidationError('Tahun angkatan tidak valid');
      }
      updateData.enrollmentYear = dto.enrollmentYear;
    }
  }

  if (dto.phone !== undefined) {
    const trimmed = dto.phone ? dto.phone.trim() : '';
    if (trimmed.length > 30) {
      throw new ValidationError('Nomor telepon maksimal 30 karakter');
    }
    updateData.phone = trimmed || null;
  }

  if (dto.bio !== undefined) {
    const trimmed = dto.bio ? dto.bio.trim() : '';
    if (trimmed.length > 2000) {
      throw new ValidationError('Bio maksimal 2000 karakter');
    }
    updateData.bio = trimmed || null;
  }

  let shouldDeleteOldAvatar = false;
  if (dto.avatarUrl !== undefined) {
    const val = (dto.avatarUrl || '').trim();
    if (!val) {
      updateData.avatarUrl = null;
      updateData.avatarObjectKey = null;
      shouldDeleteOldAvatar = true;
    } else if (val.startsWith('data:') || val.length > 512) {
      throw new ValidationError('Unggah foto profil melalui endpoint multipart /me/profile/avatar, bukan Base64.');
    } else if (val.startsWith(`/api/v1/users/${userId}/avatar`)) {
      updateData.avatarUrl = val;
    } else {
      throw new ValidationError('URL avatar tidak valid atau tidak milik akun Anda');
    }
  }

  const jsonUpdateData: any = { ...updateData };

  if (dto.skills !== undefined) {
    jsonUpdateData.skills = validateBoundedJsonField('skills', dto.skills);
  }
  if (dto.interests !== undefined) {
    jsonUpdateData.interests = validateBoundedJsonField('interests', dto.interests);
  }
  if (dto.availability !== undefined) {
    jsonUpdateData.availability = validateBoundedJsonField('availability', dto.availability);
  }
  if (dto.rolesCapable !== undefined) {
    jsonUpdateData.rolesCapable = validateBoundedJsonField('rolesCapable', dto.rolesCapable);
  }
  if (dto.experience !== undefined) {
    const trimmed = dto.experience ? dto.experience.trim() : '';
    if (trimmed.length > 3000) {
      throw new ValidationError('Pengalaman maksimal 3000 karakter');
    }
    jsonUpdateData.experience = trimmed || null;
  }

  const { updatedProfile, previousAvatarObjectKey } = await prisma.$transaction(async (tx) => {
    let oldKey: string | null = null;
    if (shouldDeleteOldAvatar) {
      await tx.$executeRaw`SELECT id FROM student_profiles WHERE userId = ${userId} FOR UPDATE`;
      const locked = await tx.studentProfile.findUnique({
        where: { userId },
        select: { avatarObjectKey: true },
      });
      oldKey = locked?.avatarObjectKey || null;
    }
    const prof = await tx.studentProfile.update({
      where: { userId },
      data: jsonUpdateData,
    });
    if (updateData.fullName) {
      await tx.user.update({
        where: { id: userId },
        data: { fullName: updateData.fullName },
      });
    }
    return { updatedProfile: prof, previousAvatarObjectKey: oldKey };
  });

  if (shouldDeleteOldAvatar && previousAvatarObjectKey) {
    const storage = getStorageService();
    await storage.deleteFile(previousAvatarObjectKey).catch((err) => {
      console.warn(`[STORAGE_DELETE_WARN] Gagal menghapus avatar lama ${previousAvatarObjectKey}:`, err);
    });
  }

  await recordAuditEvent({
    institutionId: profile.user.institutionId,
    actorId: userId,
    action: 'PROFILE_UPDATED',
    targetType: 'StudentProfile',
    targetId: profile.id,
    metadata: updateData,
    ipAddress,
    userAgent,
  });

  if (updateData.fullName || updateData.studyProgram || shouldDeleteOldAvatar) {
    invalidateRankingCache();
  }

  const { avatarObjectKey: _omit, ...safeUpdated } = updatedProfile;
  return safeUpdated;
}

export async function uploadStudentAvatar(
  userId: string,
  institutionId: string,
  file: { name: string; type: string; buffer: Buffer },
  ipAddress?: string,
  userAgent?: string
) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('Profil mahasiswa tidak ditemukan.');

  validateAvatarBuffer(file.name, file.type, file.buffer);

  const ext = path.extname(file.name).toLowerCase() || '.jpg';
  const newKey = `institutions/${institutionId}/avatars/${userId}/${crypto.randomUUID()}${ext}`;
  const storage = getStorageService();

  await storage.uploadFile(newKey, file.buffer, file.type);

  const avatarEndpoint = `/api/v1/users/${userId}/avatar?v=${Date.now()}`;
  let oldKey: string | null = null;

  try {
    oldKey = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM student_profiles WHERE userId = ${userId} FOR UPDATE`;
      const locked = await tx.studentProfile.findUnique({
        where: { userId },
        select: { avatarObjectKey: true },
      });
      await tx.studentProfile.update({
        where: { userId },
        data: {
          avatarObjectKey: newKey,
          avatarUrl: avatarEndpoint,
        },
      });
      return locked?.avatarObjectKey || null;
    });
  } catch (err) {
    await storage.deleteFile(newKey).catch((delErr) => {
      console.warn(`[STORAGE_DELETE_WARN] Gagal cleanup avatar gagal simpan ${newKey}:`, delErr);
    });
    throw err;
  }

  if (oldKey && oldKey !== newKey) {
    await storage.deleteFile(oldKey).catch((delErr) => {
      console.warn(`[STORAGE_DELETE_WARN] Gagal menghapus avatar sebelumnya ${oldKey}:`, delErr);
    });
  }

  await recordAuditEvent({
    institutionId,
    actorId: userId,
    action: 'PROFILE_AVATAR_UPDATED',
    targetType: 'StudentProfile',
    targetId: profile.id,
    metadata: { mimeType: file.type, size: file.buffer.byteLength },
    ipAddress,
    userAgent,
  });

  invalidateRankingCache();
  return { avatarUrl: avatarEndpoint };
}

export async function deleteStudentAvatar(userId: string, institutionId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('Profil mahasiswa tidak ditemukan.');

  const oldKey = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM student_profiles WHERE userId = ${userId} FOR UPDATE`;
    const locked = await tx.studentProfile.findUnique({
      where: { userId },
      select: { avatarObjectKey: true },
    });
    await tx.studentProfile.update({
      where: { userId },
      data: { avatarObjectKey: null, avatarUrl: null },
    });
    return locked?.avatarObjectKey || null;
  });

  if (oldKey) {
    const storage = getStorageService();
    await storage.deleteFile(oldKey).catch((delErr) => {
      console.warn(`[STORAGE_DELETE_WARN] Gagal menghapus avatar ${oldKey}:`, delErr);
    });
  }

  await recordAuditEvent({
    institutionId,
    actorId: userId,
    action: 'PROFILE_AVATAR_REMOVED',
    targetType: 'StudentProfile',
    targetId: profile.id,
  });

  invalidateRankingCache();
  return { avatarUrl: null };
}

export async function getAuthorizedUserAvatar(targetUserId: string, institutionId: string) {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      institutionId: true,
      status: true,
      studentProfile: {
        select: { avatarObjectKey: true },
      },
    },
  });

  if (
    !user ||
    user.institutionId !== institutionId ||
    user.status !== 'active' ||
    !user.studentProfile?.avatarObjectKey
  ) {
    throw new NotFoundError('Avatar tidak ditemukan');
  }

  const storage = getStorageService();
  try {
    return await storage.getFile(user.studentProfile.avatarObjectKey);
  } catch {
    throw new NotFoundError('Berkas avatar tidak ditemukan di penyimpanan');
  }
}

export async function getAuthorizedUserAvatarStream(targetUserId: string, institutionId: string) {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      institutionId: true,
      status: true,
      studentProfile: {
        select: { avatarObjectKey: true },
      },
    },
  });

  if (
    !user ||
    user.institutionId !== institutionId ||
    user.status !== 'active' ||
    !user.studentProfile?.avatarObjectKey
  ) {
    throw new NotFoundError('Avatar tidak ditemukan');
  }

  const storage = getStorageService();
  try {
    return await storage.getFileStream(user.studentProfile.avatarObjectKey);
  } catch {
    throw new NotFoundError('Berkas avatar tidak ditemukan di penyimpanan');
  }
}

export async function searchStudentDirectory(institutionId: string, query?: string) {
  const q = query?.trim();
  const students = await prisma.user.findMany({
    where: {
      institutionId,
      role: 'mahasiswa',
      status: 'active',
      studentProfile: q
        ? {
            OR: [
              { fullName: { contains: q } },
              { studyProgram: { contains: q } },
            ],
          }
        : { isNot: null },
    },
    select: {
      id: true,
      studentProfile: {
        select: {
          fullName: true,
          studyProgram: true,
          faculty: true,
          enrollmentYear: true,
          avatarObjectKey: true,
          updatedAt: true,
        },
      },
    },
    take: 30,
    orderBy: { createdAt: 'desc' },
  });

  return students
    .filter((s) => s.studentProfile)
    .map((s) => {
      const profile = s.studentProfile!;
      const avatarUrl = profile.avatarObjectKey
        ? `/api/v1/users/${s.id}/avatar?v=${profile.updatedAt ? profile.updatedAt.getTime() : 1}`
        : null;
      return {
        userId: s.id,
        fullName: profile.fullName,
        studyProgram: profile.studyProgram,
        faculty: profile.faculty,
        enrollmentYear: profile.enrollmentYear,
        avatarUrl,
      };
    });
}
