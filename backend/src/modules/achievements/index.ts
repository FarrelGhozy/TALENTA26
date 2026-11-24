import { Elysia, t } from 'elysia';
import * as achService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';
import { ValidationError } from '../../app/middleware/error';
import { resolveClientIp } from '../../app/middleware/client-ip';
import { uploadIpLimiter, uploadUserLimiter } from '../../app/middleware/rate-limit';
import { loadConfig } from '../../lib/config';
import type {
  AchievementCategory,
  AchievementLevel,
  AchievementResult,
  ParticipationType,
} from '@prisma/client';

function readOptionalString(
  body: Record<string, unknown>,
  rawFormData: FormData | null,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined) {
      const val = body[key];
      if (val === null) return undefined;
      if (typeof val !== 'string') {
        throw new ValidationError(`Kolom '${key}' harus berupa teks`, {
          [key]: 'Harus berupa teks',
        });
      }
      return val;
    }
  }
  if (rawFormData) {
    for (const key of keys) {
      if (rawFormData.has(key)) {
        const val = rawFormData.get(key);
        if (typeof val === 'string') return val;
      }
    }
  }
  return undefined;
}

function readNullableString(
  body: Record<string, unknown>,
  rawFormData: FormData | null,
  ...keys: string[]
): string | null | undefined {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined) {
      const val = body[key];
      if (val === null) return null;
      if (typeof val !== 'string') {
        throw new ValidationError(`Kolom '${key}' harus berupa teks atau kosong`, {
          [key]: 'Harus berupa teks',
        });
      }
      return val.trim() === '' ? null : val;
    }
  }
  if (rawFormData) {
    for (const key of keys) {
      if (rawFormData.has(key)) {
        const val = rawFormData.get(key);
        if (val === null) return null;
        if (typeof val === 'string') {
          return val.trim() === '' ? null : val;
        }
      }
    }
  }
  return undefined;
}

function parseStringArrayField(
  bodyVal: unknown,
  rawFormData: FormData | null,
  ...keys: string[]
): string[] | undefined {
  if (Array.isArray(bodyVal)) {
    return bodyVal.map((v) => String(v)).filter(Boolean);
  }
  if (typeof bodyVal === 'string' && bodyVal.trim()) {
    try {
      const parsed = JSON.parse(bodyVal);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v)).filter(Boolean);
    } catch {
      return bodyVal.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  if (rawFormData) {
    for (const k of keys) {
      const all = rawFormData.getAll(k).map((v) => String(v).trim()).filter(Boolean);
      if (all.length === 1 && all[0].startsWith('[')) {
        try {
          const parsed = JSON.parse(all[0]);
          if (Array.isArray(parsed)) return parsed.map((v) => String(v)).filter(Boolean);
        } catch {}
      }
      if (all.length > 0) return all;
    }
  }
  return undefined;
}

async function extractUploadedFiles(rawItems: any[]): Promise<achService.UploadedFileItem[]> {
  const nonEmpty = rawItems.filter(Boolean);
  if (nonEmpty.length > 3) {
    throw new ValidationError('Maksimal berkas bukti yang diizinkan adalah 3 berkas', {
      evidence: 'Maksimal 3 berkas bukti',
    });
  }

  const maxBytes = loadConfig().uploadMaxBytes;
  const maxMb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
  const result: achService.UploadedFileItem[] = [];

  for (const item of nonEmpty) {
    if (item instanceof File) {
      // Validasi ukuran SEBELUM mengalokasikan Buffer di RAM (anti OOM DoS)
      if (item.size <= 0) continue;
      if (item.size > maxBytes) {
        throw new ValidationError(
          `Ukuran berkas '${item.name}' melampaui batas maksimal ${maxMb} MB`,
          { evidence: `Maksimal ukuran per berkas ${maxMb} MB` }
        );
      }
      const buffer = Buffer.from(await item.arrayBuffer());
      result.push({
        name: item.name,
        size: buffer.byteLength,
        type: item.type,
        buffer,
      });
    } else if (item && typeof item === 'object' && item.buffer) {
      if (typeof item.buffer === 'string') {
        const estimatedBytes = Math.ceil((item.buffer.length * 3) / 4);
        if (estimatedBytes > maxBytes + 64) {
          throw new ValidationError(
            `Ukuran berkas '${item.name || item.fileName || 'berkas'}' melampaui batas maksimal ${maxMb} MB`,
            { evidence: `Maksimal ukuran per berkas ${maxMb} MB` }
          );
        }
      }
      const buffer = Buffer.isBuffer(item.buffer)
        ? item.buffer
        : Buffer.from(item.buffer, 'base64');
      if (buffer.byteLength > maxBytes) {
        throw new ValidationError(
          `Ukuran berkas '${item.name || item.fileName || 'berkas'}' melampaui batas maksimal ${maxMb} MB`,
          { evidence: `Maksimal ukuran per berkas ${maxMb} MB` }
        );
      }
      result.push({
        name: item.name || item.fileName || 'berkas.pdf',
        size: buffer.byteLength,
        type: item.type || item.mimeType || 'application/pdf',
        buffer,
      });
    }
  }

  return result;
}

export const achievementRoutes = new Elysia()
  .use(authPlugin)

  // ==========================================
  // Rute Publik & Terotorisasi: Ranking Prestasi
  // ==========================================
  .get(
    '/api/v1/ranking',
    async ({ auth, query, set }) => {
      const isAuthenticated = Boolean(auth?.user);
      set.headers['vary'] = 'Cookie, Authorization';
      set.headers['cache-control'] = isAuthenticated ? 'private, no-store' : 'public, max-age=30';
      const data = await achService.getPublicRanking(query.periodId, {
        includeAvatar: isAuthenticated,
        viewerInstitutionId: auth?.user?.institutionId,
      });
      return { data };
    },
    {
      query: t.Object({
        periodId: t.Optional(t.String()),
      }),
    }
  )
  .get('/api/v1/ranking/lifetime', async ({ auth, set }) => {
    const isAuthenticated = Boolean(auth?.user);
    set.headers['vary'] = 'Cookie, Authorization';
    set.headers['cache-control'] = isAuthenticated ? 'private, no-store' : 'public, max-age=30';
    const data = await achService.getLifetimeRanking({
      includeAvatar: isAuthenticated,
      viewerInstitutionId: auth?.user?.institutionId,
    });
    return { data };
  })

  // ==========================================
  // Rute Mahasiswa: Prestasi Mandiri & Berkas
  // ==========================================
  .get(
    '/api/v1/me/achievements',
    async ({ auth, query }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);
      const result = await achService.getStudentAchievements(
        auth.user.id,
        query.status,
        {
          page: query.page ? Number(query.page) : undefined,
          limit: query.limit ? Number(query.limit) : undefined,
        }
      );
      return { data: result.items, meta: result.meta };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  .get('/api/v1/me/achievements/:id', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);
    const data = await achService.getAchievementById(
      params.id,
      auth.user.id,
      auth.user.role,
      auth.user.institutionId
    );
    return { data };
  })

  .post('/api/v1/me/achievements', async ({ auth, request, body, headers, server }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);

    const remoteAddress = server?.requestIP?.(request)?.address;
    const clientIp = resolveClientIp(headers, remoteAddress);
    uploadIpLimiter.check(`upip:${clientIp}`);
    uploadUserLimiter.check(`upuser:${auth.user.id}`);

    const contentType = request.headers.get('content-type') || '';
    const b = (body || {}) as any;

    let rawFormData: any = null;
    if (contentType.includes('multipart/form-data') && (!b || Object.keys(b).length === 0)) {
      try {
        rawFormData = await request.formData();
      } catch {}
    }

    const name = readOptionalString(b, rawFormData, 'name', 'nama') ?? '';
    const organizer = readOptionalString(b, rawFormData, 'organizer', 'penyelenggara') ?? '';
    const category = (readOptionalString(b, rawFormData, 'category', 'kategori') || 'kompetisi') as AchievementCategory;
    const level = (readOptionalString(b, rawFormData, 'level', 'tingkat') || 'nasional') as AchievementLevel;
    const result = (readOptionalString(b, rawFormData, 'result', 'jenisCapaian') || 'juara_1') as AchievementResult;
    const eventDate = readOptionalString(b, rawFormData, 'eventDate', 'tanggal') ?? '';
    const description = readOptionalString(b, rawFormData, 'description', 'deskripsi') ?? '';
    const competitionId = readOptionalString(b, rawFormData, 'competitionId') ?? '';
    const competitionSlug = readOptionalString(b, rawFormData, 'competitionSlug') ?? '';
    const competitionCategoryId = readOptionalString(b, rawFormData, 'competitionCategoryId') ?? '';
    const subCategoryId = readOptionalString(b, rawFormData, 'subCategoryId') ?? '';
    const subCompetitionName = readOptionalString(b, rawFormData, 'subCompetitionName') ?? '';
    const participationTypeRaw = readOptionalString(b, rawFormData, 'participationType') || 'individu';
    const participationType: ParticipationType =
      participationTypeRaw === 'kelompok' ? 'kelompok' : 'individu';
    const teamId = readOptionalString(b, rawFormData, 'teamId') ?? '';
    const participantUserIds = parseStringArrayField(
      b.participantUserIds,
      rawFormData,
      'participantUserIds',
      'participantUserIds[]'
    );
    const isFromInternalSelection =
      b.isFromInternalSelection === true ||
      b.isFromInternalSelection === 'true' ||
      b.dariSeleksiInternal === true ||
      b.dariSeleksiInternal === 'true' ||
      rawFormData?.get('dariSeleksiInternal') === 'true';

    const payload: achService.CreateAchievementInput = {
      name,
      organizer,
      category,
      level,
      result,
      eventDate,
      description,
      competitionId: competitionId || undefined,
      competitionSlug: competitionSlug || undefined,
      competitionCategoryId: competitionCategoryId || undefined,
      subCategoryId: subCategoryId || undefined,
      subCompetitionName: subCompetitionName || undefined,
      participationType,
      teamId: teamId || undefined,
      participantUserIds,
      isFromInternalSelection,
    };

    const rawItems: any[] = [];
    if (rawFormData) {
      rawItems.push(...rawFormData.getAll('evidence'), ...rawFormData.getAll('files'));
    }
    if (b.evidence) {
      if (Array.isArray(b.evidence)) rawItems.push(...b.evidence);
      else rawItems.push(b.evidence);
    }
    if (b.files) {
      if (Array.isArray(b.files)) rawItems.push(...b.files);
      else rawItems.push(b.files);
    }

    const filesToUpload = await extractUploadedFiles(rawItems);

    const created = await achService.createAchievement(
      auth.user.institutionId,
      auth.user.id,
      payload,
      filesToUpload
    );

    return { data: created };
  })

  .post(
    '/api/v1/me/achievements/:id/revisions',
    async ({ auth, params, request, body, headers, server }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const contentType = request.headers.get('content-type') || '';
      const b = (body || {}) as any;

      let rawFormData: any = null;
      if (contentType.includes('multipart/form-data') && (!b || Object.keys(b).length === 0)) {
        try {
          rawFormData = await request.formData();
        } catch {}
      }

      const participationTypeRaw = readOptionalString(b, rawFormData, 'participationType');
      const replaceEvidenceIds = parseStringArrayField(
        b.replaceEvidenceIds,
        rawFormData,
        'replaceEvidenceIds',
        'replaceEvidenceIds[]'
      );
      const participantUserIds = parseStringArrayField(
        b.participantUserIds,
        rawFormData,
        'participantUserIds',
        'participantUserIds[]'
      );

      const payload: achService.RevisionInput = {
        name: readOptionalString(b, rawFormData, 'name', 'nama'),
        organizer: readOptionalString(b, rawFormData, 'organizer', 'penyelenggara'),
        category: readOptionalString(b, rawFormData, 'category', 'kategori') as AchievementCategory | undefined,
        level: readOptionalString(b, rawFormData, 'level', 'tingkat') as AchievementLevel | undefined,
        result: readOptionalString(b, rawFormData, 'result', 'jenisCapaian') as AchievementResult | undefined,
        eventDate: readOptionalString(b, rawFormData, 'eventDate', 'tanggal'),
        description: readOptionalString(b, rawFormData, 'description', 'deskripsi'),
        note: readOptionalString(b, rawFormData, 'note', 'catatan'),
        participationType:
          participationTypeRaw === 'kelompok'
            ? 'kelompok'
            : participationTypeRaw === 'individu'
              ? 'individu'
              : undefined,
        teamId: readNullableString(b, rawFormData, 'teamId'),
        participantUserIds,
        competitionCategoryId: readNullableString(b, rawFormData, 'competitionCategoryId'),
        subCategoryId: readNullableString(b, rawFormData, 'subCategoryId'),
        subCompetitionName: readNullableString(b, rawFormData, 'subCompetitionName'),
        replaceEvidenceIds,
      };

      const rawItems: any[] = [];
      if (rawFormData) {
        rawItems.push(...rawFormData.getAll('evidence'), ...rawFormData.getAll('files'));
      }
      if (b.evidence) {
        if (Array.isArray(b.evidence)) rawItems.push(...b.evidence);
        else rawItems.push(b.evidence);
      }
      if (b.files) {
        if (Array.isArray(b.files)) rawItems.push(...b.files);
        else rawItems.push(b.files);
      }

      if (rawItems.length > 0) {
        const remoteAddress = server?.requestIP?.(request)?.address;
        const clientIp = resolveClientIp(headers, remoteAddress);
        uploadIpLimiter.check(`upip:${clientIp}`);
        uploadUserLimiter.check(`upuser:${auth.user.id}`);
      }

      const newFiles = await extractUploadedFiles(rawItems);

      const updated = await achService.submitRevision(
        params.id,
        auth.user.id,
        payload,
        newFiles
      );

      return { data: updated };
    }
  )

  .post('/api/v1/me/achievements/:id/cancel', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);
    const cancelled = await achService.cancelAchievement(
      params.id,
      auth.user.id,
      auth.user.institutionId
    );
    return { data: cancelled };
  })

  // ==========================================
  // Unduh Berkas Bukti Terotorisasi (Anti-IDOR, Streaming + ETag)
  // ==========================================
  .get('/api/v1/evidence/:id/download', async ({ auth, params, headers }) => {
    assertAuthenticated(auth);
    const file = await achService.getEvidenceFileStream(
      params.id,
      auth.user.id,
      auth.user.role,
      auth.user.institutionId
    );

    const ifNoneMatch = headers['if-none-match']?.trim();
    if (
      file.etag &&
      ifNoneMatch &&
      (ifNoneMatch === file.etag || ifNoneMatch === `W/${file.etag}` || ifNoneMatch === '*')
    ) {
      await file.stream.cancel().catch(() => {});
      return new Response(null, {
        status: 304,
        headers: {
          ETag: file.etag,
          'Cache-Control': 'private, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    const resHeaders: Record<string, string> = {
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.fileName)}"`,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    };
    if (file.etag) resHeaders['ETag'] = file.etag;
    if (typeof file.contentLength === 'number') {
      resHeaders['Content-Length'] = file.contentLength.toString();
    }

    return new Response(file.stream, { headers: resHeaders });
  })

  // ==========================================
  // Rute Verifikator & Super Admin
  // ==========================================
  .get(
    '/api/v1/admin/achievements',
    async ({ auth, query }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);

      const result = await achService.getAdminAchievements({
        institutionId: auth.user.institutionId,
        status: query.status,
        periodId: query.periodId,
        category: query.category,
        level: query.level,
        q: query.q,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      });

      return { data: result.items, meta: result.meta };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        periodId: t.Optional(t.String()),
        category: t.Optional(t.String()),
        level: t.Optional(t.String()),
        q: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  .get('/api/v1/admin/achievements/:id', async ({ auth, params }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['validator', 'super_admin']);

    const data = await achService.getAchievementById(
      params.id,
      auth.user.id,
      auth.user.role,
      auth.user.institutionId
    );
    return { data };
  })

  .post(
    '/api/v1/admin/achievements/:id/decisions',
    async ({ auth, params, body, request }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);

      const b = body as {
        action: 'approve' | 'request_changes' | 'reject';
        reason?: string;
        version?: number;
        overridePoints?: number;
        overrideReason?: string;
        idempotencyKey?: string;
      };

      if (!b.action || !['approve', 'request_changes', 'reject'].includes(b.action)) {
        throw new ValidationError('Aksi keputusan tidak valid');
      }

      const headerIdempotencyKey = request.headers.get('idempotency-key') || undefined;
      const updated = await achService.decideAchievement(
        params.id,
        auth.user.id,
        b.action,
        b.reason,
        b.version,
        auth.user.institutionId,
        {
          overridePoints: b.overridePoints,
          overrideReason: b.overrideReason,
          idempotencyKey: b.idempotencyKey || headerIdempotencyKey,
        }
      );

      return { data: updated };
    },
    {
      body: t.Object({
        action: t.String(),
        reason: t.Optional(t.String()),
        version: t.Optional(t.Number()),
        overridePoints: t.Optional(t.Number()),
        overrideReason: t.Optional(t.String()),
        idempotencyKey: t.Optional(t.String()),
      }),
    }
  )

  .post(
    '/api/v1/admin/achievements/:id/corrections',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);

      const b = body as {
        reason: string;
        version?: number;
        targetStatus?: 'ditolak' | 'perlu_perbaikan';
      };

      const updated = await achService.correctAchievement(
        params.id,
        auth.user.id,
        b.reason,
        b.version,
        b.targetStatus,
        auth.user.institutionId
      );

      return { data: updated };
    },
    {
      body: t.Object({
        reason: t.String(),
        version: t.Optional(t.Number()),
        targetStatus: t.Optional(t.String()),
      }),
    }
  );
