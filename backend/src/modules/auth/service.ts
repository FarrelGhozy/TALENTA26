import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../lib/password';
import {
  createSession,
  revokeSession,
  generateSecureToken,
  hashToken,
} from '../../lib/session';
import { recordAuditEvent } from '../../lib/audit';
import { MailerUnavailableError, sendPasswordResetEmail } from '../../lib/mailer';
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  AppError,
} from '../../app/middleware/error';
import type { User, StudentProfile, Role } from '@prisma/client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let dummyPasswordHashPromise: Promise<string> | null = null;

function getDummyPasswordHash(): Promise<string> {
  if (!dummyPasswordHashPromise) {
    dummyPasswordHashPromise = hashPassword('TalentaTimingGuardDummy!2026');
  }
  return dummyPasswordHashPromise;
}

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
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    fieldErrors.email = 'Format email tidak valid (maksimal 254 karakter)';
  }
  if (!nim || nim.length < 5 || nim.length > 32) {
    fieldErrors.nim = 'NIM harus 5–32 karakter';
  }
  if (!fullName || fullName.length < 2 || fullName.length > 150) {
    fieldErrors.fullName = 'Nama lengkap harus 2–150 karakter';
  }
  if (!studyProgram || studyProgram.length > 120) {
    fieldErrors.studyProgram = 'Program studi wajib diisi (maksimal 120 karakter)';
  }
  if (!faculty || faculty.length > 120) {
    fieldErrors.faculty = 'Fakultas wajib diisi (maksimal 120 karakter)';
  }
  if (!dto.password || dto.password.length < 8 || dto.password.length > 128) {
    fieldErrors.password = 'Password harus 8–128 karakter';
  }
  if (dto.phone !== undefined && dto.phone.trim().length > 30) {
    fieldErrors.phone = 'Nomor telepon maksimal 30 karakter';
  }
  if (dto.enrollmentYear !== undefined && dto.enrollmentYear !== null) {
    const currentYear = Number(
      new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(new Date())
    );
    if (
      !Number.isInteger(dto.enrollmentYear) ||
      dto.enrollmentYear < 1900 ||
      dto.enrollmentYear > currentYear + 1
    ) {
      fieldErrors.enrollmentYear = 'Tahun angkatan tidak valid';
    }
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

  if (!email || email.length > 254 || !password || password.length > 128) {
    throw new ValidationError('Email dan password wajib diisi dengan panjang yang valid');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      studentProfile: true,
      institution: true,
    },
  });

  // Pesan error seragam + verifikasi dummy konstan untuk mencegah timing enumeration
  if (!user) {
    const dummyHash = await getDummyPasswordHash();
    await verifyPassword(password, dummyHash);
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

  if (!normalizedEmail || normalizedEmail.length > 254 || !EMAIL_RE.test(normalizedEmail)) {
    return genericResponse;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || user.status !== 'active') {
    // Tetap kembalikan respons generik agar tidak membocorkan status email
    return genericResponse;
  }

  const plainToken = generateSecureToken(32);
  const tokenHash = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

  // Nonaktifkan token reset sebelumnya yang belum dipakai agar hanya 1 token aktif per akun
  const resetRecord = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  });

  let mailResult;
  try {
    mailResult = await sendPasswordResetEmail(user.email, plainToken);
  } catch (err: any) {
    await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } }).catch(() => undefined);
    console.error('[MAILER] Pengiriman email pemulihan akun gagal:', err?.message || 'Unknown error');
    if (
      process.env.NODE_ENV === 'production' &&
      (err instanceof MailerUnavailableError || err?.message?.includes('SMTP'))
    ) {
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

  if (newPassword.length < 8 || newPassword.length > 128) {
    throw new ValidationError('Password baru harus 8–128 karakter');
  }

  const tokenHash = hashToken(token.trim());
  const now = new Date();

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !resetRecord ||
    resetRecord.usedAt !== null ||
    resetRecord.expiresAt.getTime() < now.getTime() ||
    resetRecord.user.status !== 'active'
  ) {
    throw new AppError(
      400,
      'INVALID_RESET_TOKEN',
      'Token reset password tidak valid atau telah kedaluwarsa. Silakan minta instruksi baru.'
    );
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    // Konsumsi token secara atomik untuk mencegah TOCTOU replay race
    const claimed = await tx.passwordResetToken.updateMany({
      where: {
        id: resetRecord.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new AppError(
        400,
        'INVALID_RESET_TOKEN',
        'Token reset password tidak valid atau telah digunakan. Silakan minta instruksi baru.'
      );
    }

    // Batalkan seluruh token reset lain milik pengguna yang belum terpakai
    await tx.passwordResetToken.updateMany({
      where: { userId: resetRecord.userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await tx.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash: newPasswordHash },
    });

    // Cabut semua sesi aktif secara atomik di dalam transaksi yang sama
    await tx.authSession.updateMany({
      where: { userId: resetRecord.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

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
