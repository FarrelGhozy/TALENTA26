import { Elysia, t } from 'elysia';
import * as profileService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';
import { resolveClientIp } from '../../app/middleware/client-ip';
import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../app/middleware/error';

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
    async ({ auth, body, headers }) => {
      assertAuthenticated(auth);
      assertRole(auth, ['mahasiswa']);

      const clientIp = resolveClientIp(headers);
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
        fullName: t.Optional(t.String()),
        studyProgram: t.Optional(t.String()),
        faculty: t.Optional(t.String()),
        enrollmentYear: t.Optional(t.Number()),
        phone: t.Optional(t.String()),
        bio: t.Optional(t.String()),
        skills: t.Optional(t.Any()),
        interests: t.Optional(t.Any()),
        availability: t.Optional(t.Any()),
        rolesCapable: t.Optional(t.Any()),
        experience: t.Optional(t.String()),
      }),
    }
  );

export const userRoutes = new Elysia({ prefix: '/api/v1/users' })
  .use(authPlugin)
  .get('/:userId', async ({ auth, params }) => {
    assertAuthenticated(auth);
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      include: { studentProfile: true },
    });
    if (!user) throw new NotFoundError('Pengguna tidak ditemukan');

    if (auth.user.role === 'mahasiswa' && auth.user.id !== params.userId) {
      return {
        data: {
          id: user.id,
          institutionId: user.institutionId,
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
  .get('/', async ({ auth }) => {
    assertAuthenticated(auth);
    const users = await prisma.user.findMany({
      where: {
        institutionId: auth.user.institutionId,
        role: 'mahasiswa',
        status: 'active',
      },
      include: { studentProfile: true },
      take: 50,
    });
    return {
      data: users.map((u) => ({
        id: u.id,
        institutionId: u.institutionId,
        role: u.role,
        email: auth.user.role === 'mahasiswa' && auth.user.id !== u.id ? '' : u.email,
        studentProfile: u.studentProfile
          ? {
              fullName: u.studentProfile.fullName,
              studyProgram: u.studentProfile.studyProgram,
              faculty: u.studentProfile.faculty,
              enrollmentYear: u.studentProfile.enrollmentYear,
              skills: u.studentProfile.skills,
              interests: u.studentProfile.interests,
              availability: u.studentProfile.availability,
              rolesCapable: u.studentProfile.rolesCapable,
            }
          : null,
      })),
    };
  });
