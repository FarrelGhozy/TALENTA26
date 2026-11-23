import { Elysia, t } from 'elysia';
import * as achService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';
import { ValidationError } from '../../app/middleware/error';
import type {
  AchievementCategory,
  AchievementLevel,
  AchievementResult,
  ParticipationType,
} from '@prisma/client';

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

function extractUploadedFiles(rawItems: any[]): Promise<achService.UploadedFileItem[]> {
  return Promise.all(
    rawItems
      .filter(Boolean)
      .map(async (item) => {
        if (item instanceof File && item.size > 0) {
          const buffer = Buffer.from(await item.arrayBuffer());
          return {
            name: item.name,
            size: buffer.byteLength,
            type: item.type,
            buffer,
          };
        }
        if (item && typeof item === 'object' && item.buffer) {
          const buffer = Buffer.isBuffer(item.buffer)
            ? item.buffer
            : Buffer.from(item.buffer, 'base64');
          return {
            name: item.name || item.fileName || 'berkas.pdf',
            size: buffer.byteLength,
            type: item.type || item.mimeType || 'application/pdf',
            buffer,
          };
        }
        return null;
      })
  ).then((arr) => arr.filter((x): x is achService.UploadedFileItem => x !== null));
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
      const data = await achService.getStudentAchievements(
        auth.user.id,
        query.status
      );
      return { data };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
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

  .post('/api/v1/me/achievements', async ({ auth, request, body }) => {
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

    const name = (b.name || b.nama || rawFormData?.get('nama') || rawFormData?.get('name') || '') as string;
    const organizer = (b.organizer || b.penyelenggara || rawFormData?.get('penyelenggara') || rawFormData?.get('organizer') || '') as string;
    const category = (b.category || b.kategori || rawFormData?.get('kategori') || rawFormData?.get('category') || 'kompetisi') as AchievementCategory;
    const level = (b.level || b.tingkat || rawFormData?.get('tingkat') || rawFormData?.get('level') || 'nasional') as AchievementLevel;
    const result = (b.result || b.jenisCapaian || rawFormData?.get('jenisCapaian') || rawFormData?.get('result') || 'juara_1') as AchievementResult;
    const eventDate = (b.eventDate || b.tanggal || rawFormData?.get('tanggal') || rawFormData?.get('eventDate') || '') as string;
    const description = (b.description || b.deskripsi || rawFormData?.get('deskripsi') || rawFormData?.get('description') || '') as string;
    const competitionId = (b.competitionId || rawFormData?.get('competitionId') || '') as string;
    const competitionSlug = (b.competitionSlug || rawFormData?.get('competitionSlug') || '') as string;
    const competitionCategoryId = (b.competitionCategoryId || rawFormData?.get('competitionCategoryId') || '') as string;
    const subCategoryId = (b.subCategoryId || rawFormData?.get('subCategoryId') || '') as string;
    const subCompetitionName = (b.subCompetitionName || rawFormData?.get('subCompetitionName') || '') as string;
    const participationTypeRaw = (b.participationType || rawFormData?.get('participationType') || 'individu') as string;
    const participationType: ParticipationType =
      participationTypeRaw === 'kelompok' ? 'kelompok' : 'individu';
    const teamId = (b.teamId || rawFormData?.get('teamId') || '') as string;
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
    async ({ auth, params, request, body }) => {
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

      const participationTypeRaw = (b.participationType || rawFormData?.get('participationType') || undefined) as
        | string
        | undefined;
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
        name: (b.name || b.nama || rawFormData?.get('nama') || rawFormData?.get('name') || undefined) as string | undefined,
        organizer: (b.organizer || b.penyelenggara || rawFormData?.get('penyelenggara') || rawFormData?.get('organizer') || undefined) as string | undefined,
        category: (b.category || b.kategori || rawFormData?.get('kategori') || rawFormData?.get('category') || undefined) as AchievementCategory | undefined,
        level: (b.level || b.tingkat || rawFormData?.get('tingkat') || rawFormData?.get('level') || undefined) as AchievementLevel | undefined,
        result: (b.result || b.jenisCapaian || rawFormData?.get('jenisCapaian') || rawFormData?.get('result') || undefined) as AchievementResult | undefined,
        eventDate: (b.eventDate || b.tanggal || rawFormData?.get('tanggal') || rawFormData?.get('eventDate') || undefined) as string | undefined,
        description: (b.description || b.deskripsi || rawFormData?.get('deskripsi') || rawFormData?.get('description') || undefined) as string | undefined,
        note: (b.note || b.catatan || rawFormData?.get('catatan') || rawFormData?.get('note') || undefined) as string | undefined,
        participationType:
          participationTypeRaw === 'kelompok'
            ? 'kelompok'
            : participationTypeRaw === 'individu'
              ? 'individu'
              : undefined,
        teamId: (b.teamId !== undefined ? b.teamId : rawFormData?.get('teamId')) as string | null | undefined,
        participantUserIds,
        competitionCategoryId: (b.competitionCategoryId !== undefined
          ? b.competitionCategoryId
          : rawFormData?.get('competitionCategoryId')) as string | null | undefined,
        subCategoryId: (b.subCategoryId !== undefined
          ? b.subCategoryId
          : rawFormData?.get('subCategoryId')) as string | null | undefined,
        subCompetitionName: (b.subCompetitionName !== undefined
          ? b.subCompetitionName
          : rawFormData?.get('subCompetitionName')) as string | null | undefined,
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
  // Unduh Berkas Bukti Terotorisasi (Anti-IDOR)
  // ==========================================
  .get('/api/v1/evidence/:id/download', async ({ auth, params }) => {
    assertAuthenticated(auth);
    const file = await achService.getEvidenceFile(
      params.id,
      auth.user.id,
      auth.user.role,
      auth.user.institutionId
    );

    return new Response(file.buffer, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.fileName)}"`,
        'Content-Length': file.buffer.length.toString(),
      },
    });
  })

  // ==========================================
  // Rute Verifikator & Super Admin
  // ==========================================
  .get(
    '/api/v1/admin/achievements',
    async ({ auth, query }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);

      const data = await achService.getAdminAchievements({
        institutionId: auth.user.institutionId,
        status: query.status,
        periodId: query.periodId,
        category: query.category,
        level: query.level,
        q: query.q,
      });

      return { data };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        periodId: t.Optional(t.String()),
        category: t.Optional(t.String()),
        level: t.Optional(t.String()),
        q: t.Optional(t.String()),
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
