import { Elysia } from 'elysia';
import * as matchingService from './service';
import { assertAuthenticated, authPlugin } from '../../app/middleware/auth';
import { assertRole } from '../../app/middleware/rbac';

export const matchingRoutes = new Elysia({ prefix: '/api/v1/matching' })
  .use(authPlugin)
  .get('/candidates', async ({ auth }) => {
    assertAuthenticated(auth);
    assertRole(auth, ['mahasiswa']);

    const candidates = await matchingService.getMatchCandidates(
      auth.user.id,
      auth.user.institutionId
    );
    return { data: candidates };
  });
