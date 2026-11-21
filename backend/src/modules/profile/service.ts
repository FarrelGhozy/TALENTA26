import { prisma } from '../../lib/prisma';
import { recordAuditEvent } from '../../lib/audit';
import { NotFoundError, ValidationError } from '../../app/middleware/error';
import type { StudentProfile } from '@prisma/client';

export interface UpdateStudentProfileDto {
  fullName?: string;
  studyProgram?: string;
  faculty?: string;
  enrollmentYear?: number;
  phone?: string;
  bio?: string;
  skills?: any;
  interests?: any;
  availability?: any;
  rolesCapable?: any;
  experience?: string;
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

  if (dto.enrollmentYear !== undefined) {
    const currentYear = Number(
      new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(new Date())
    );
    if (!Number.isInteger(dto.enrollmentYear) || dto.enrollmentYear < 1900 || dto.enrollmentYear > currentYear + 1) {
      throw new ValidationError('Tahun angkatan tidak valid');
    }
    updateData.enrollmentYear = dto.enrollmentYear;
  }

  if (dto.phone !== undefined) {
    updateData.phone = dto.phone ? dto.phone.trim() : null;
  }

  if (dto.bio !== undefined) {
    updateData.bio = dto.bio ? dto.bio.trim() : null;
  }

  const jsonUpdateData: any = { ...updateData };

  if (dto.skills !== undefined) {
    jsonUpdateData.skills = dto.skills;
  }
  if (dto.interests !== undefined) {
    jsonUpdateData.interests = dto.interests;
  }
  if (dto.availability !== undefined) {
    jsonUpdateData.availability = dto.availability;
  }
  if (dto.rolesCapable !== undefined) {
    jsonUpdateData.rolesCapable = dto.rolesCapable;
  }
  if (dto.experience !== undefined) {
    jsonUpdateData.experience = dto.experience;
  }

  const updatedProfile = await prisma.studentProfile.update({
    where: { userId },
    data: jsonUpdateData,
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
