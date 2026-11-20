import { prisma } from '../../lib/prisma';
import { recordAuditEvent } from '../../lib/audit';
import { NotFoundError, ValidationError } from '../../app/middleware/error';
import type { StudentProfile } from '@prisma/client';

export interface UpdateStudentProfileDto {
  fullName?: string;
  studyProgram?: string;
  faculty?: string;
  phone?: string;
  bio?: string;
}

export async function getStudentProfile(userId: string): Promise<StudentProfile> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new NotFoundError('Profil mahasiswa tidak ditemukan.');
  }

  return profile;
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
    phone?: string | null;
    bio?: string | null;
  } = {};

  if (dto.fullName !== undefined) {
    if (dto.fullName.trim().length < 2) {
      throw new ValidationError('Nama lengkap minimal 2 karakter');
    }
    updateData.fullName = dto.fullName.trim();
  }

  if (dto.studyProgram !== undefined) {
    if (!dto.studyProgram.trim()) {
      throw new ValidationError('Program studi tidak boleh kosong');
    }
    updateData.studyProgram = dto.studyProgram.trim();
  }

  if (dto.faculty !== undefined) {
    if (!dto.faculty.trim()) {
      throw new ValidationError('Fakultas tidak boleh kosong');
    }
    updateData.faculty = dto.faculty.trim();
  }

  if (dto.phone !== undefined) {
    updateData.phone = dto.phone ? dto.phone.trim() : null;
  }

  if (dto.bio !== undefined) {
    updateData.bio = dto.bio ? dto.bio.trim() : null;
  }

  const updatedProfile = await prisma.studentProfile.update({
    where: { userId },
    data: updateData,
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
