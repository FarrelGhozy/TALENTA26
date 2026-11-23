import { Elysia, t } from 'elysia';
import * as profileService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';
import { resolveClientIp } from '../../app/middleware/client-ip';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../app/middleware/error';

export const profileRoutes = new Elysia({ prefix: '/api/v1/me/profile' })
  .use(authPlugin)
  .get('/', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);

    const profile = await profileService.getStudentProfile(auth.user.id);
    return { data: profile };
  })
  .patch(
    '/',
    async ({ auth, body, headers, request, server }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const remoteAddress = server?.requestIP?.(request)?.address;
      const clientIp = resolveClientIp(headers, remoteAddress);
      const userAgent = headers['user-agent'] || '';

      const updated = await profileService.updateStudentProfile(
        auth.user.id,
        body,
        clientIp,
        userAgent
      );

      return { data: updated };
    },
    {
      body: t.Object({
        fullName: t.Optional(t.Nullable(t.String())),
        studyProgram: t.Optional(t.Nullable(t.String())),
        faculty: t.Optional(t.Nullable(t.String())),
        enrollmentYear: t.Optional(t.Nullable(t.Number())),
        avatarUrl: t.Optional(t.Nullable(t.String())),
        phone: t.Optional(t.Nullable(t.String())),
        bio: t.Optional(t.Nullable(t.String())),
        skills: t.Optional(t.Any()),
        interests: t.Optional(t.Any()),
        availability: t.Optional(t.Any()),
        rolesCapable: t.Optional(t.Any()),
        experience: t.Optional(t.Nullable(t.String())),
      }),
    }
  )
  .post('/avatar', async ({ auth, request, body, headers, server }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);

    const b = (body || {}) as any;
    let fileItem: File | null = null;
    if (b.avatar instanceof File) {
      fileItem = b.avatar;
    } else {
      const formData = await request.formData().catch(() => null);
      const fromForm = formData?.get('avatar');
      if (fromForm instanceof File) {
        fileItem = fromForm;
      }
    }

    if (!fileItem) {
      throw new ValidationError('Berkas foto profil (field avatar) wajib dipilih');
    }

    const buffer = Buffer.from(await fileItem.arrayBuffer());
    const remoteAddress = server?.requestIP?.(request)?.address;
    const result = await profileService.uploadStudentAvatar(
      auth.user.id,
      auth.user.institutionId,
      { name: fileItem.name, type: fileItem.type, buffer },
      resolveClientIp(headers, remoteAddress),
      headers['user-agent'] || ''
    );
    return { data: result };
  })
  .delete('/avatar', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);
    const result = await profileService.deleteStudentAvatar(auth.user.id, auth.user.institutionId);
    return { data: result };
  });

export const userRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authPlugin)
  .get(
    '/students/directory',
    async ({ auth, query }) => {
      assertAuthenticated(auth);
      const list = await profileService.searchStudentDirectory(auth.user.institutionId, query.q);
      return { data: list };
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
      }),
    }
  )
  .get('/users/:userId/avatar', async ({ auth, params }) => {
    assertAuthenticated(auth);
    const file = await profileService.getAuthorizedUserAvatar(
      params.userId,
      auth.user.institutionId
    );
    return new Response(file.buffer, {
      headers: {
        'Content-Type': file.contentType,
        'Cache-Control': 'private, max-age=300',
        'Content-Length': file.buffer.byteLength.toString(),
      },
    });
  })
  .get('/users/:userId', async ({ auth, params }) => {
    assertAuthenticated(auth);
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        institutionId: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        studentProfile: {
          select: {
            id: true,
            userId: true,
            nim: true,
            fullName: true,
            studyProgram: true,
            faculty: true,
            enrollmentYear: true,
            avatarUrl: true,
            avatarObjectKey: true,
            phone: true,
            bio: true,
            skills: true,
            interests: true,
            availability: true,
            rolesCapable: true,
            experience: true,
          },
        },
      },
    });
    if (!user || user.institutionId !== auth.user.institutionId) {
      throw new NotFoundError('Pengguna tidak ditemukan');
    }

    const isSelf = auth.user.id === params.userId;
    const isStaff = auth.user.role === 'validator' || auth.user.role === 'super_admin';

    if (!isSelf && !isStaff) {
      return {
        data: {
          id: user.id,
          institutionId: user.institutionId,
          fullName: user.fullName || user.studentProfile?.fullName || null,
          role: user.role,
          email: '',
          studentProfile: user.studentProfile
            ? {
                fullName: user.studentProfile.fullName,
                studyProgram: user.studentProfile.studyProgram,
                faculty: user.studentProfile.faculty,
                enrollmentYear: user.studentProfile.enrollmentYear,
                skills: user.studentProfile.skills,
                interests: user.studentProfile.interests,
                availability: user.studentProfile.availability,
                rolesCapable: user.studentProfile.rolesCapable,
              }
            : null,
        },
      };
    }

    return { data: user };
  })
  .get('/users', async ({ auth }) => {
    assertAuthenticated(auth);
    const users = await prisma.user.findMany({
      where: {
        institutionId: auth.user.institutionId,
        role: 'mahasiswa',
        status: 'active',
      },
      select: {
        id: true,
        institutionId: true,
        email: true,
        fullName: true,
        role: true,
        studentProfile: {
          select: {
            fullName: true,
            studyProgram: true,
            faculty: true,
            enrollmentYear: true,
            skills: true,
            interests: true,
            availability: true,
            rolesCapable: true,
          },
        },
      },
      take: 100,
    });
    const isStaff = auth.user.role === 'validator' || auth.user.role === 'super_admin';
    return {
      data: users.map((u) => ({
        id: u.id,
        institutionId: u.institutionId,
        fullName: u.fullName || u.studentProfile?.fullName || null,
        role: u.role,
        email: isStaff || auth.user.id === u.id ? u.email : '',
        studentProfile: u.studentProfile,
      })),
    };
  });
