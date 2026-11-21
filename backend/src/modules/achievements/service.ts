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
import type {
  AchievementCategory,
  AchievementLevel,
  AchievementResult,
  AchievementStatus,
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

function getTodayJakartaDateStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function validateAchievementInput(data: CreateAchievementInput) {
  if (!data.name || data.name.trim().length < 3) {
    throw new ValidationError('Nama kegiatan capaian minimal 3 karakter', {
      name: 'Nama kegiatan capaian minimal 3 karakter',
    });
  }
  if (!data.organizer || data.organizer.trim().length < 2) {
    throw new ValidationError('Penyelenggara kegiatan minimal 2 karakter', {
      organizer: 'Penyelenggara kegiatan minimal 2 karakter',
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
  await Promise.allSettled(keys.map((key) => storage.deleteFile(key)));
}

// 1. Ambil daftar prestasi milik mahasiswa login
export async function getStudentAchievements(userId: string, status?: string) {
  const whereClause: Prisma.AchievementWhereInput = { userId };
  if (status && status !== 'semua') {
    whereClause.status = status as AchievementStatus;
  }

  return prisma.achievement.findMany({
    where: whereClause,
    include: {
      evidences: {
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
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
          email: true,
          studentProfile: {
            select: {
              fullName: true,
              nim: true,
              studyProgram: true,
              faculty: true,
            },
          },
        },
      },
      evidences: {
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
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

  // Anti-IDOR: Mahasiswa hanya boleh melihat miliknya sendiri
  if (role === 'mahasiswa' && achievement.userId !== userId) {
    throw new ForbiddenError('Anda tidak berhak mengakses data prestasi ini');
  }

  return achievement;
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

  // Deteksi kemungkinan duplikat (nama dan tanggal capaian sama oleh pengguna yang sama)
  const eventDateObj = new Date(input.eventDate);
  const potentialDuplicate = await prisma.achievement.findFirst({
    where: {
      userId,
      name: input.name.trim(),
      eventDate: eventDateObj,
    },
  });

  // Ambil periode akademik aktif
  const activePeriod = await prisma.academicPeriod.findFirst({
    where: { institutionId, isActive: true },
  });
  if (!activePeriod) {
    throw new ConflictError('Belum ada periode akademik aktif untuk pengajuan prestasi');
  }

  // Hubungkan dengan kompetisi jika ada slug / ID
  let competitionId = input.competitionId;
  if (!competitionId && input.competitionSlug) {
    const comp = await prisma.competition.findUnique({
      where: { slug: input.competitionSlug },
    });
    if (comp) competitionId = comp.id;
  }

  const storage = getStorageService();
  const uploadedKeys: string[] = [];

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
    const ach = await tx.achievement.create({
      data: {
        institutionId,
        userId,
        academicPeriodId: activePeriod.id,
        competitionId,
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

    // Simpan berkas ke storage privat dan buat record metadata
    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();
      const randomKey = `institutions/${institutionId}/achievements/${ach.id}/${crypto.randomUUID()}${ext}`;
      await storage.uploadFile(randomKey, file.buffer, file.type);
      uploadedKeys.push(randomKey);

      await tx.achievementEvidence.create({
        data: {
          achievementId: ach.id,
          uploaderId: userId,
          objectKey: randomKey,
          fileName: file.name,
          fileSize: file.buffer.byteLength,
          mimeType: file.type,
        },
      });
    }

    return ach;
    });
  } catch (error) {
    await cleanupUploadedFiles(storage, uploadedKeys);
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
      filesCount: files.length,
      potentialDuplicate: Boolean(potentialDuplicate),
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
    include: { evidences: true },
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

  const totalFiles = current.evidences.length + newFiles.length;
  if (totalFiles > 3) {
    throw new ValidationError(
      `Total berkas bukti (${totalFiles}) melampaui batas maksimal 3 berkas`,
      { evidence: 'Maksimal total 3 berkas bukti' }
    );
  }

  const storage = getStorageService();
  const uploadedKeys: string[] = [];

  const mergedEventDate = input.eventDate || current.eventDate.toISOString().split('T')[0];
  validateAchievementInput({
    name: input.name !== undefined ? input.name : current.name,
    organizer: input.organizer !== undefined ? input.organizer : current.organizer,
    category: input.category || current.category,
    level: input.level || current.level,
    result: input.result || current.result,
    eventDate: mergedEventDate,
    description: input.description !== undefined ? input.description : (current.description || undefined),
  });

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
    // 1. Simpan snapshot versi lama ke achievement_revisions
    await tx.achievementRevision.create({
      data: {
        achievementId: current.id,
        versionNumber: current.version,
        snapshotJson: {
          name: current.name,
          organizer: current.organizer,
          category: current.category,
          level: current.level,
          result: current.result,
          eventDate: current.eventDate.toISOString(),
          description: current.description,
          reviewNote: current.reviewNote,
        },
        note: input.note || 'Pengiriman revisi oleh mahasiswa',
      },
    });

    // 2. Unggah berkas baru bila ada
    for (const file of newFiles) {
      const ext = path.extname(file.name).toLowerCase();
      const randomKey = `institutions/${current.institutionId}/achievements/${current.id}/${crypto.randomUUID()}${ext}`;
      await storage.uploadFile(randomKey, file.buffer, file.type);
      uploadedKeys.push(randomKey);

      await tx.achievementEvidence.create({
        data: {
          achievementId: current.id,
          uploaderId: userId,
          objectKey: randomKey,
          fileName: file.name,
          fileSize: file.buffer.byteLength,
          mimeType: file.type,
        },
      });
    }

    // 3. Update field data dan status menjadi 'menunggu'
    const eventDateObj = input.eventDate ? new Date(input.eventDate) : current.eventDate;
    const achUpdated = await tx.achievement.update({
      where: { id: current.id },
      data: {
        name: input.name ? input.name.trim() : current.name,
        organizer: input.organizer ? input.organizer.trim() : current.organizer,
        category: input.category || current.category,
        level: input.level || current.level,
        result: input.result || current.result,
        eventDate: eventDateObj,
        description: input.description !== undefined ? input.description?.trim() : current.description,
        status: 'menunggu',
        version: current.version + 1,
        reviewNote: null,
      },
      include: {
        evidences: true,
      },
    });

    return achUpdated;
    });
  } catch (error) {
    await cleanupUploadedFiles(storage, uploadedKeys);
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
    },
  });

  return updated;
}

// 4B. Mahasiswa membatalkan pengajuan yang masih menunggu
export async function cancelAchievement(
  achievementId: string,
  userId: string,
  institutionId: string
) {
  const current = await prisma.achievement.findUnique({
    where: { id: achievementId },
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

  const cancelled = await prisma.achievement.update({
    where: { id: current.id },
    data: {
      status: 'dibatalkan',
      version: { increment: 1 },
    },
  });

  await recordAuditEvent({
    institutionId,
    actorId: userId,
    action: 'ACHIEVEMENT_CANCELLED',
    targetType: 'Achievement',
    targetId: current.id,
    metadata: { previousStatus: current.status },
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
    include: { achievement: true },
  });

  if (!evidence || (institutionId && evidence.achievement.institutionId !== institutionId)) {
    throw new NotFoundError('Berkas bukti tidak ditemukan');
  }

  // Anti-IDOR: Mahasiswa hanya boleh unduh berkas miliknya sendiri
  if (role === 'mahasiswa' && evidence.uploaderId !== userId && evidence.achievement.userId !== userId) {
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
    whereClause.status = filters.status as AchievementStatus;
  }
  if (filters.category && filters.category !== 'semua') {
    whereClause.category = filters.category as AchievementCategory;
  }
  if (filters.level && filters.level !== 'semua') {
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

  return prisma.achievement.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          studentProfile: {
            select: {
              fullName: true,
              nim: true,
              studyProgram: true,
              faculty: true,
            },
          },
        },
      },
      evidences: {
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          uploadedAt: true,
        },
      },
      decisions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// 7. Keputusan validator (approve, request_changes, reject) dengan Concurrency Lock
export async function decideAchievement(
  achievementId: string,
  validatorId: string,
  action: 'approve' | 'request_changes' | 'reject',
  reason?: string,
  clientVersion?: number,
  institutionId?: string
) {
  if ((action === 'request_changes' || action === 'reject') && (!reason || reason.trim().length < 3)) {
    throw new ValidationError('Alasan keputusan wajib diisi minimal 3 karakter', {
      reason: 'Alasan keputusan wajib diisi',
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM achievements WHERE id = ${achievementId} FOR UPDATE`;

    const ach = await tx.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!ach || (institutionId && ach.institutionId !== institutionId)) {
      throw new NotFoundError('Data pengajuan prestasi tidak ditemukan');
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

    let newStatus: AchievementStatus;
    if (action === 'approve') newStatus = 'disetujui';
    else if (action === 'request_changes') newStatus = 'perlu_perbaikan';
    else newStatus = 'ditolak';

    // 1. Rekam riwayat keputusan validator
    await tx.achievementDecision.create({
      data: {
        achievementId: ach.id,
        decidedById: validatorId,
        action,
        previousStatus: ach.status,
        newStatus,
        reason: reason?.trim() || null,
        version: ach.version,
      },
    });

    // 2. Jika disetujui dan merupakan prestasi lomba (kategori 'kompetisi'):
    // Hitung poin berdasar PointRule versi aktif terbaru dan catat ke PointLedger
    if (newStatus === 'disetujui' && ach.category === 'kompetisi') {
      const pointRule = await tx.pointRule.findFirst({
        where: {
          institutionId: ach.institutionId,
          level: ach.level,
          result: ach.result,
          isActive: true,
        },
        orderBy: { version: 'desc' },
      });

      const awardedPoints = pointRule?.points || 0;
      if (awardedPoints > 0) {
        await tx.pointLedger.create({
          data: {
            institutionId: ach.institutionId,
            userId: ach.userId,
            achievementId: ach.id,
            academicPeriodId: ach.academicPeriodId,
            ruleVersion: pointRule?.version || 1,
            points: awardedPoints,
            type: 'award',
            reason: `Persetujuan prestasi kompetisi (${ach.level} - ${ach.result})`,
          },
        });
      }
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

    return { updated, previousStatus: ach.status };
  });

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
    },
  });

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

    // 2. Catat pembalikan poin (reversal) hanya sebesar net poin positif yang masih aktif
    for (const bucket of netByUserAndRule.values()) {
      if (bucket.net > 0) {
        await tx.pointLedger.create({
          data: {
            institutionId: ach.institutionId,
            userId: bucket.userId,
            achievementId: ach.id,
            academicPeriodId: ach.academicPeriodId,
            ruleVersion: bucket.ruleVersion,
            points: -bucket.net,
            type: 'reversal',
            reason: `Koreksi pembatalan persetujuan: ${reason.trim()}`,
          },
        });
      }
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

// Helper agregasi ranking deterministik (menghindari double-count achievementId)
function aggregateRankingEntries(
  ledgerEntries: Array<{
    userId: string;
    points: number;
    type: string;
    user: {
      studentProfile: {
        fullName: string;
        studyProgram: string;
      } | null;
    };
    achievement: {
      id: string;
      result: string;
      status: string;
    } | null;
  }>
) {
  const userStats = new Map<
    string,
    {
      userId: string;
      fullName: string;
      studyProgram: string;
      points: number;
      approvedIds: Set<string>;
      juara1Ids: Set<string>;
    }
  >();

  for (const entry of ledgerEntries) {
    const uId = entry.userId;
    const existing = userStats.get(uId) || {
      userId: uId,
      fullName: entry.user.studentProfile?.fullName || 'Mahasiswa',
      studyProgram: entry.user.studentProfile?.studyProgram || '-',
      points: 0,
      approvedIds: new Set<string>(),
      juara1Ids: new Set<string>(),
    };

    existing.points += entry.points;
    if (entry.type === 'award' && entry.achievement?.status === 'disetujui') {
      existing.approvedIds.add(entry.achievement.id);
      if (entry.achievement.result === 'juara_1') {
        existing.juara1Ids.add(entry.achievement.id);
      }
    }
    userStats.set(uId, existing);
  }

  return Array.from(userStats.values())
    .filter((s) => s.points > 0)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.juara1Ids.size !== a.juara1Ids.size) return b.juara1Ids.size - a.juara1Ids.size;
      if (b.approvedIds.size !== a.approvedIds.size) return b.approvedIds.size - a.approvedIds.size;
      const nameCmp = a.fullName.localeCompare(b.fullName);
      if (nameCmp !== 0) return nameCmp;
      return a.userId.localeCompare(b.userId);
    })
    .map((item, index) => ({
      rank: index + 1,
      userId: item.userId,
      fullName: item.fullName,
      studyProgram: item.studyProgram,
      points: item.points,
      approvedCount: item.approvedIds.size,
      juara1Count: item.juara1Ids.size,
    }));
}

// 9. Mesin Ranking Publik — Bebas PII & Stabil
export async function getPublicRanking(periodId?: string) {
  let activePeriodId = periodId;

  if (!activePeriodId) {
    const activePeriod = await prisma.academicPeriod.findFirst({
      where: { isActive: true },
    });
    activePeriodId = activePeriod?.id;
  }

  if (!activePeriodId) {
    return { period: null, ranking: [] };
  }

  const periodData = await prisma.academicPeriod.findUnique({ where: { id: activePeriodId } });

  const ledgerEntries = await prisma.pointLedger.findMany({
    where: {
      academicPeriodId: activePeriodId,
    },
    include: {
      user: {
        select: {
          id: true,
          studentProfile: {
            select: {
              fullName: true,
              studyProgram: true,
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

  const ranking = aggregateRankingEntries(ledgerEntries);

  return {
    period: periodData
      ? {
          id: periodData.id,
          name: periodData.name,
          year: periodData.year,
          semester: periodData.semester,
        }
      : null,
    ranking,
  };
}

// 10. Ranking Sepanjang Waktu (Lifetime Ranking)
export async function getLifetimeRanking() {
  const ledgerEntries = await prisma.pointLedger.findMany({
    include: {
      user: {
        select: {
          id: true,
          studentProfile: {
            select: {
              fullName: true,
              studyProgram: true,
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

  const ranking = aggregateRankingEntries(ledgerEntries);

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
