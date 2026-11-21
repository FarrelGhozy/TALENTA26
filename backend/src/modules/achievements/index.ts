import { Elysia, t } from 'elysia';
import * as achService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';
import { ValidationError } from '../../app/middleware/error';
import type {
  AchievementCategory,
  AchievementLevel,
  AchievementResult,
} from '@prisma/client';

export const achievementRoutes = new Elysia()
  .use(authPlugin)

  // ==========================================
  // Rute Publik: Ranking Prestasi
  // ==========================================
  .get(
    '/api/v1/ranking',
    async ({ query }) => {
      const data = await achService.getPublicRanking(query.periodId);
      return { data };
    },
    {
      query: t.Object({
        periodId: t.Optional(t.String()),
      }),
    }
  )
  .get('/api/v1/ranking/lifetime', async () => {
    const data = await achService.getLifetimeRanking();
    return { data };
  })

  // ==========================================
  // Rute Mahasiswa: Prestasi Mandiri & Berkas
  // ==========================================
  .get(
    '/api/v1/me/achievements',
    async ({ auth, query }) => {
      assertAuthenticated(auth);
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
    const data = await achService.getAchievementById(
      params.id,
      auth.user.id,
      auth.user.role
    );
    return { data };
  })

  .post('/api/v1/me/achievements', async ({ auth, request, body }) => {
    assertAuthenticated(auth);

    const contentType = request.headers.get('content-type') || '';
    const filesToUpload: achService.UploadedFileItem[] = [];
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
    const competitionSlug = (b.competitionSlug || rawFormData?.get('competitionSlug') || '') as string;
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
      competitionSlug: competitionSlug || undefined,
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

    for (const item of rawItems) {
      if (item instanceof File && item.size > 0) {
        const buffer = Buffer.from(await item.arrayBuffer());
        filesToUpload.push({
          name: item.name,
          size: item.size,
          type: item.type,
          buffer,
        });
      } else if (item && typeof item === 'object' && item.buffer) {
        filesToUpload.push({
          name: item.name || item.fileName || 'berkas.pdf',
          size: item.size || item.fileSize || 1000,
          type: item.type || item.mimeType || 'application/pdf',
          buffer: Buffer.isBuffer(item.buffer) ? item.buffer : Buffer.from(item.buffer, 'base64'),
        });
      }
    }

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

      const contentType = request.headers.get('content-type') || '';
      const newFiles: achService.UploadedFileItem[] = [];
      const b = (body || {}) as any;

      let rawFormData: any = null;
      if (contentType.includes('multipart/form-data') && (!b || Object.keys(b).length === 0)) {
        try {
          rawFormData = await request.formData();
        } catch {}
      }

      const payload: achService.RevisionInput = {
        name: (b.name || b.nama || rawFormData?.get('nama') || rawFormData?.get('name') || undefined) as string | undefined,
        organizer: (b.organizer || b.penyelenggara || rawFormData?.get('penyelenggara') || rawFormData?.get('organizer') || undefined) as string | undefined,
        category: (b.category || b.kategori || rawFormData?.get('kategori') || rawFormData?.get('category') || undefined) as AchievementCategory | undefined,
        level: (b.level || b.tingkat || rawFormData?.get('tingkat') || rawFormData?.get('level') || undefined) as AchievementLevel | undefined,
        result: (b.result || b.jenisCapaian || rawFormData?.get('jenisCapaian') || rawFormData?.get('result') || undefined) as AchievementResult | undefined,
        eventDate: (b.eventDate || b.tanggal || rawFormData?.get('tanggal') || rawFormData?.get('eventDate') || undefined) as string | undefined,
        description: (b.description || b.deskripsi || rawFormData?.get('deskripsi') || rawFormData?.get('description') || undefined) as string | undefined,
        note: (b.note || b.catatan || rawFormData?.get('catatan') || rawFormData?.get('note') || undefined) as string | undefined,
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

      for (const item of rawItems) {
        if (item instanceof File && item.size > 0) {
          const buffer = Buffer.from(await item.arrayBuffer());
          newFiles.push({
            name: item.name,
            size: item.size,
            type: item.type,
            buffer,
          });
        } else if (item && typeof item === 'object' && item.buffer) {
          newFiles.push({
            name: item.name || item.fileName || 'berkas.pdf',
            size: item.size || item.fileSize || 1000,
            type: item.type || item.mimeType || 'application/pdf',
            buffer: Buffer.isBuffer(item.buffer) ? item.buffer : Buffer.from(item.buffer, 'base64'),
          });
        }
      }

      const updated = await achService.submitRevision(
        params.id,
        auth.user.id,
        payload,
        newFiles
      );

      return { data: updated };
    }
  )

  // ==========================================
  // Unduh Berkas Bukti Terotorisasi (Anti-IDOR)
  // ==========================================
  .get('/api/v1/evidence/:id/download', async ({ auth, params }) => {
    assertAuthenticated(auth);
    const file = await achService.getEvidenceFile(
      params.id,
      auth.user.id,
      auth.user.role
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
      auth.user.role
    );
    return { data };
  })

  .post(
    '/api/v1/admin/achievements/:id/decisions',
    async ({ auth, params, body }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['validator', 'super_admin']);

      const b = body as {
        action: 'approve' | 'request_changes' | 'reject';
        reason?: string;
        version?: number;
      };

      if (!b.action || !['approve', 'request_changes', 'reject'].includes(b.action)) {
        throw new ValidationError('Aksi keputusan tidak valid');
      }

      const updated = await achService.decideAchievement(
        params.id,
        auth.user.id,
        b.action,
        b.reason,
        b.version
      );

      return { data: updated };
    },
    {
      body: t.Object({
        action: t.String(),
        reason: t.Optional(t.String()),
        version: t.Optional(t.Number()),
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
        b.targetStatus
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
