import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../lib/password';
import {
  createSession,
  revokeSession,
  revokeAllUserSessions,
  generateSecureToken,
  hashToken,
} from '../../lib/session';
import { recordAuditEvent } from '../../lib/audit';
import { sendPasswordResetEmail } from '../../lib/mailer';
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  AppError,
} from '../../app/middleware/error';
import type { User, StudentProfile, Role } from '@prisma/client';

export interface RegisterDto {
  email: string;
  password: string;
  nim: string;
  fullName: string;
  studyProgram: string;
  faculty: string;
  enrollmentYear?: number;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    fullName?: string | null;
    role: Role;
    status: string;
    studentProfile: StudentProfile | null;
  };
  token: string;
  expiresAt: Date;
}

export async function getOrCreateDefaultInstitution(): Promise<string> {
  const institution = await prisma.institution.upsert({
    where: { code: 'unida-gontor' },
    update: {},
    create: {
      code: 'unida-gontor',
      name: 'Universitas Darussalam Gontor',
    },
  });
  return institution.id;
}

export async function registerMahasiswa(
  dto: RegisterDto,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResult> {
  const email = dto.email?.trim().toLowerCase();
  const nim = dto.nim?.trim().toUpperCase();
  const fullName = dto.fullName?.trim();
  const studyProgram = dto.studyProgram?.trim();
  const faculty = dto.faculty?.trim();

  // Validasi input
  const fieldErrors: Record<string, string> = {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = 'Format email tidak valid';
  }
  if (!nim || nim.length < 5) {
    fieldErrors.nim = 'NIM minimal 5 karakter';
  }
  if (!fullName || fullName.length < 2) {
    fieldErrors.fullName = 'Nama lengkap minimal 2 karakter';
  }
  if (!studyProgram) {
    fieldErrors.studyProgram = 'Program studi wajib diisi';
  }
  if (!faculty) {
    fieldErrors.faculty = 'Fakultas wajib diisi';
  }
  if (!dto.password || dto.password.length < 8) {
    fieldErrors.password = 'Password minimal 8 karakter';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError('Validasi formulir pendaftaran gagal', fieldErrors);
  }

  // Cek keunikan email & NIM
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    throw new ConflictError('Email sudah terdaftar', { email: 'Email sudah terdaftar di sistem' });
  }

  const existingNim = await prisma.studentProfile.findUnique({
    where: { nim },
  });
  if (existingNim) {
    throw new ConflictError('NIM sudah terdaftar', { nim: 'NIM sudah terdaftar di sistem' });
  }

  const institutionId = await getOrCreateDefaultInstitution();
  const passwordHash = await hashPassword(dto.password);

  // Transaksi atomik pembuatan User dan StudentProfile
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        institutionId,
        email,
        fullName,
        passwordHash,
        role: 'mahasiswa',
        status: 'active',
      },
    });

    const profile = await tx.studentProfile.create({
      data: {
        userId: user.id,
        nim,
        fullName,
        studyProgram,
        faculty,
        enrollmentYear: dto.enrollmentYear ?? null,
        phone: dto.phone?.trim() || null,
      },
    });

    return { user, profile };
  });

  const { token, expiresAt } = await createSession(result.user.id, ipAddress, userAgent);

  await recordAuditEvent({
    institutionId,
    actorId: result.user.id,
    action: 'AUTH_REGISTER',
    targetType: 'User',
    targetId: result.user.id,
    metadata: { email, nim, role: 'mahasiswa' },
    ipAddress,
    userAgent,
  });

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
      status: result.user.status,
      studentProfile: result.profile,
    },
    token,
    expiresAt,
  };
}

export async function login(
  dto: LoginDto,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResult> {
  const email = dto.email?.trim().toLowerCase();
  const password = dto.password;

  if (!email || !password) {
    throw new ValidationError('Email dan password wajib diisi');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      studentProfile: true,
      institution: true,
    },
  });

  // Pesan error seragam untuk mencegah enumerasi pengguna
  if (!user) {
    throw new UnauthorizedError('Email atau password yang Anda masukkan salah');
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    await recordAuditEvent({
      institutionId: user.institutionId,
      actorId: user.id,
      action: 'AUTH_LOGIN_FAILED',
      targetType: 'User',
      targetId: user.id,
      metadata: { reason: 'INVALID_PASSWORD' },
      ipAddress,
      userAgent,
    });
    throw new UnauthorizedError('Email atau password yang Anda masukkan salah');
  }

  if (user.status !== 'active') {
    throw new ForbiddenError('Akun Anda tidak aktif atau ditangguhkan. Silakan hubungi admin kampus.');
  }

  const { token, expiresAt } = await createSession(user.id, ipAddress, userAgent);

  await recordAuditEvent({
    institutionId: user.institutionId,
    actorId: user.id,
    action: 'AUTH_LOGIN_SUCCESS',
    targetType: 'User',
    targetId: user.id,
    metadata: { role: user.role },
    ipAddress,
    userAgent,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName || user.studentProfile?.fullName || null,
      role: user.role,
      status: user.status,
      studentProfile: user.studentProfile,
    },
    token,
    expiresAt,
  };
}

export async function logout(
  sessionToken: string,
  actorId?: string,
  institutionId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await revokeSession(sessionToken);
  if (actorId && institutionId) {
    await recordAuditEvent({
      institutionId,
      actorId,
      action: 'AUTH_LOGOUT',
      targetType: 'AuthSession',
      targetId: null,
      ipAddress,
      userAgent,
    });
  }
}

export async function getMe(userId: string): Promise<Omit<User, 'passwordHash'> & { studentProfile: StudentProfile | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      institutionId: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      studentProfile: true,
    },
  });
  if (!user) {
    throw new UnauthorizedError('Pengguna tidak ditemukan');
  }
  return user;
}

export async function getMeWithPeriod(userId: string, institutionId: string) {
  const [user, activePeriod] = await Promise.all([
    getMe(userId),
    prisma.academicPeriod.findFirst({
      where: { institutionId, isActive: true },
      select: { id: true, name: true, year: true, semester: true },
    }),
  ]);
  return { user, activePeriod };
}

export async function requestPasswordReset(
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ message: string; previewToken?: string }> {
  const normalizedEmail = email?.trim().toLowerCase();
  const genericResponse = {
    message: 'Jika email terdaftar, instruksi reset password telah dikirim ke alamat tersebut.',
  };

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return genericResponse;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || user.status === 'suspended') {
    // Tetap kembalikan respons generik agar tidak membocorkan status email
    return genericResponse;
  }

  const plainToken = generateSecureToken(32);
  const tokenHash = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

  // Simpan token reset ke database
  const resetRecord = await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  let mailResult;
  try {
    mailResult = await sendPasswordResetEmail(user.email, plainToken);
  } catch (err: any) {
    await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });
    console.error('[MAILER] Pengiriman email pemulihan akun gagal');
    if (process.env.NODE_ENV === 'production' && err?.message?.includes('SMTP')) {
      throw new AppError(
        503,
        'MAILER_UNAVAILABLE',
        'Layanan email pemulihan akun belum siap. Hubungi operator sistem.'
      );
    }
    return genericResponse;
  }

  await recordAuditEvent({
    institutionId: user.institutionId,
    actorId: user.id,
    action: 'AUTH_RESET_REQUESTED',
    targetType: 'PasswordResetToken',
    targetId: null,
    ipAddress,
    userAgent,
  });

  return {
    ...genericResponse,
    previewToken: mailResult.previewToken,
  };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ message: string }> {
  if (!token || !newPassword) {
    throw new ValidationError('Token dan password baru wajib diisi');
  }

  if (newPassword.length < 8) {
    throw new ValidationError('Password baru minimal 8 karakter');
  }

  const tokenHash = hashToken(token.trim());

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt.getTime() < Date.now()) {
    throw new AppError(
      400,
      'INVALID_RESET_TOKEN',
      'Token reset password tidak valid atau telah kedaluwarsa. Silakan minta instruksi baru.'
    );
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash: newPasswordHash },
    });

    await tx.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });
  });

  // Cabut semua sesi lama pengguna demi keamanan
  await revokeAllUserSessions(resetRecord.userId);

  await recordAuditEvent({
    institutionId: resetRecord.user.institutionId,
    actorId: resetRecord.userId,
    action: 'AUTH_PASSWORD_RESET_SUCCESS',
    targetType: 'User',
    targetId: resetRecord.userId,
    ipAddress,
    userAgent,
  });

  return { message: 'Password berhasil diubah. Silakan masuk menggunakan password baru.' };
}
