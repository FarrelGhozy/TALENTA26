import crypto from 'node:crypto';
import path from 'node:path';
import { prisma } from '../../lib/prisma';
import { recordAuditEvent } from '../../lib/audit';
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

  return {
    ...profile,
    avatarUrl: profile.avatarObjectKey
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
): Promise<StudentProfile> {
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
    if (dto.fullName.trim().length < 2) {
      throw new ValidationError('Nama lengkap minimal 2 karakter');
    }
    updateData.fullName = dto.fullName.trim();
  }

  if (dto.studyProgram !== undefined && dto.studyProgram !== null) {
    if (!dto.studyProgram.trim()) {
      throw new ValidationError('Program studi tidak boleh kosong');
    }
    updateData.studyProgram = dto.studyProgram.trim();
  }

  if (dto.faculty !== undefined && dto.faculty !== null) {
    if (dto.faculty.trim()) {
      updateData.faculty = dto.faculty.trim();
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
    updateData.phone = dto.phone && dto.phone.trim() ? dto.phone.trim() : null;
  }

  if (dto.bio !== undefined) {
    updateData.bio = dto.bio && dto.bio.trim() ? dto.bio.trim() : null;
  }

  if (dto.avatarUrl !== undefined) {
    const val = (dto.avatarUrl || '').trim();
    if (!val) {
      updateData.avatarUrl = null;
      updateData.avatarObjectKey = null;
    } else if (val.startsWith('data:') || val.length > 512) {
      throw new ValidationError('Unggah foto profil melalui endpoint multipart /me/profile/avatar, bukan Base64.');
    } else if (val.startsWith('/api/v1/users/')) {
      updateData.avatarUrl = val;
    } else {
      throw new ValidationError('URL avatar tidak valid');
    }
  }

  const jsonUpdateData: any = { ...updateData };

  if (dto.skills !== undefined) jsonUpdateData.skills = dto.skills;
  if (dto.interests !== undefined) jsonUpdateData.interests = dto.interests;
  if (dto.availability !== undefined) jsonUpdateData.availability = dto.availability;
  if (dto.rolesCapable !== undefined) jsonUpdateData.rolesCapable = dto.rolesCapable;
  if (dto.experience !== undefined) {
    jsonUpdateData.experience = dto.experience && dto.experience.trim() ? dto.experience.trim() : null;
  }

  const updatedProfile = await prisma.$transaction(async (tx) => {
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
    return prof;
  });

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

  return updatedProfile;
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

  const oldKey = profile.avatarObjectKey;
  const avatarEndpoint = `/api/v1/users/${userId}/avatar?v=${Date.now()}`;

  try {
    await prisma.studentProfile.update({
      where: { userId },
      data: {
        avatarObjectKey: newKey,
        avatarUrl: avatarEndpoint,
      },
    });
  } catch (err) {
    await storage.deleteFile(newKey).catch(() => undefined);
    throw err;
  }

  if (oldKey && oldKey !== newKey) {
    await storage.deleteFile(oldKey).catch(() => undefined);
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

  return { avatarUrl: avatarEndpoint };
}

export async function deleteStudentAvatar(userId: string, institutionId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('Profil mahasiswa tidak ditemukan.');

  const oldKey = profile.avatarObjectKey;
  await prisma.studentProfile.update({
    where: { userId },
    data: { avatarObjectKey: null, avatarUrl: null },
  });

  if (oldKey) {
    const storage = getStorageService();
    await storage.deleteFile(oldKey).catch(() => undefined);
  }

  await recordAuditEvent({
    institutionId,
    actorId: userId,
    action: 'PROFILE_AVATAR_REMOVED',
    targetType: 'StudentProfile',
    targetId: profile.id,
  });

  return { avatarUrl: null };
}

export async function getAuthorizedUserAvatar(targetUserId: string, institutionId: string) {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      institutionId: true,
      studentProfile: {
        select: { avatarObjectKey: true },
      },
    },
  });

  if (!user || user.institutionId !== institutionId || !user.studentProfile?.avatarObjectKey) {
    throw new NotFoundError('Avatar tidak ditemukan');
  }

  const storage = getStorageService();
  return storage.getFile(user.studentProfile.avatarObjectKey);
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
        },
      },
    },
    take: 30,
    orderBy: { createdAt: 'desc' },
  });

  return students
    .filter((s) => s.studentProfile)
    .map((s) => ({
      userId: s.id,
      fullName: s.studentProfile!.fullName,
      studyProgram: s.studentProfile!.studyProgram,
      faculty: s.studentProfile!.faculty,
      enrollmentYear: s.studentProfile!.enrollmentYear,
    }));
}
