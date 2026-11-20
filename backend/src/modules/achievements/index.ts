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
    let payload: achService.CreateAchievementInput;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const name = (formData.get('nama') || formData.get('name') || '') as string;
      const organizer = (formData.get('penyelenggara') || formData.get('organizer') || '') as string;
      const category = (formData.get('kategori') || formData.get('category') || 'kompetisi') as AchievementCategory;
      const level = (formData.get('tingkat') || formData.get('level') || 'nasional') as AchievementLevel;
      const result = (formData.get('jenisCapaian') || formData.get('result') || 'juara_1') as AchievementResult;
      const eventDate = (formData.get('tanggal') || formData.get('eventDate') || '') as string;
      const description = (formData.get('deskripsi') || formData.get('description') || '') as string;
      const competitionSlug = (formData.get('competitionSlug') || '') as string;
      const isFromInternalSelection = formData.get('dariSeleksiInternal') === 'true';

      payload = {
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

      const rawFiles = formData.getAll('evidence').concat(formData.getAll('files'));
      for (const item of rawFiles) {
        if (item instanceof File && item.size > 0) {
          const buffer = Buffer.from(await item.arrayBuffer());
          filesToUpload.push({
            name: item.name,
            size: item.size,
            type: item.type,
            buffer,
          });
        }
      }
    } else {
      const b = body as any;
      payload = {
        name: b.name || b.nama,
        organizer: b.organizer || b.penyelenggara,
        category: (b.category || b.kategori || 'kompetisi') as AchievementCategory,
        level: (b.level || b.tingkat || 'nasional') as AchievementLevel,
        result: (b.result || b.jenisCapaian || 'juara_1') as AchievementResult,
        eventDate: b.eventDate || b.tanggal,
        description: b.description || b.deskripsi,
        competitionSlug: b.competitionSlug,
        isFromInternalSelection: Boolean(b.isFromInternalSelection || b.dariSeleksiInternal),
      };

      if (Array.isArray(b.files)) {
        for (const f of b.files) {
          if (f.buffer) {
            filesToUpload.push({
              name: f.name || f.fileName,
              size: f.size || f.fileSize || 1000,
              type: f.type || f.mimeType || 'application/pdf',
              buffer: Buffer.isBuffer(f.buffer) ? f.buffer : Buffer.from(f.buffer, 'base64'),
            });
          }
        }
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
      let payload: achService.RevisionInput;

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        payload = {
          name: (formData.get('nama') || formData.get('name') || undefined) as string | undefined,
          organizer: (formData.get('penyelenggara') || formData.get('organizer') || undefined) as string | undefined,
          category: (formData.get('kategori') || formData.get('category') || undefined) as AchievementCategory | undefined,
          level: (formData.get('tingkat') || formData.get('level') || undefined) as AchievementLevel | undefined,
          result: (formData.get('jenisCapaian') || formData.get('result') || undefined) as AchievementResult | undefined,
          eventDate: (formData.get('tanggal') || formData.get('eventDate') || undefined) as string | undefined,
          description: (formData.get('deskripsi') || formData.get('description') || undefined) as string | undefined,
          note: (formData.get('catatan') || formData.get('note') || undefined) as string | undefined,
        };

        const rawFiles = formData.getAll('evidence').concat(formData.getAll('files'));
        for (const item of rawFiles) {
          if (item instanceof File && item.size > 0) {
            const buffer = Buffer.from(await item.arrayBuffer());
            newFiles.push({
              name: item.name,
              size: item.size,
              type: item.type,
              buffer,
            });
          }
        }
      } else {
        const b = body as any;
        payload = {
          name: b.name || b.nama,
          organizer: b.organizer || b.penyelenggara,
          category: b.category || b.kategori,
          level: b.level || b.tingkat,
          result: b.result || b.jenisCapaian,
          eventDate: b.eventDate || b.tanggal,
          description: b.description || b.deskripsi,
          note: b.note || b.catatan,
        };

        if (Array.isArray(b.files)) {
          for (const f of b.files) {
            if (f.buffer) {
              newFiles.push({
                name: f.name || f.fileName,
                size: f.size || f.fileSize || 1000,
                type: f.type || f.mimeType || 'application/pdf',
                buffer: Buffer.isBuffer(f.buffer) ? f.buffer : Buffer.from(f.buffer, 'base64'),
              });
            }
          }
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
