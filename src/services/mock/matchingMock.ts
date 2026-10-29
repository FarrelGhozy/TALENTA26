import invitesData from '../../mocks/invites.json';
import { Invite, MatchCandidate } from '../../types';
import { getItem, setItem } from '../../lib/storage';
import { calculateMatchScore } from '../../lib/matchScore';
import { IMatchingService } from '../types';
import { userMockService } from './userMock';
import { competitionMockService } from './competitionMock';
import { teamMockService } from './teamMock';

const INVITES_KEY = 'talenta-invites';

function getInvitesList(): Invite[] {
  return getItem<Invite[]>(INVITES_KEY, invitesData as Invite[]);
}

export const matchingMockService: IMatchingService = {
  async getMatchCandidates(userId: string): Promise<MatchCandidate[]> {
    const me = await userMockService.getById(userId);
    if (!me) return [];

    const myProfile = await userMockService.getProfile(userId);
    if (!myProfile || !myProfile.targetKompetisiSlug) return [];

    const competition = await competitionMockService.getBySlug(myProfile.targetKompetisiSlug);
    if (!competition) return [];

    // Individual competition doesn't need matching
    if (competition.komposisi.max <= 1) return [];

    const allUsers = await userMockService.getAll();
    const myTeam = await teamMockService.getTeamByUserId(userId);

    const candidates: MatchCandidate[] = [];
    for (const cand of allUsers) {
      if (cand.id === userId || !cand.role.includes('mahasiswa')) continue;

      // Don't recommend someone already in my team
      if (myTeam && myTeam.anggota.some((m) => m.userId === cand.id)) continue;

      // Check candidate's target
      const candProfile = await userMockService.getProfile(cand.id);
      if (candProfile?.targetKompetisiSlug !== myProfile.targetKompetisiSlug) continue;

      const match = calculateMatchScore(me, cand, competition, me.peranBisa);
      if (match) {
        candidates.push(match);
      }
    }

    return candidates.sort((a, b) => b.matchScore - a.matchScore);
  },

  async getInvites(userId: string): Promise<Invite[]> {
    const list = getInvitesList();
    return list.filter((inv) => inv.dari === userId || inv.ke === userId);
  },

  async sendInvite(dari: string, ke: string, teamId: string): Promise<Invite> {
    const list = getInvitesList();
    const newInv: Invite = {
      id: `inv-${Date.now()}`,
      institutionId: 'inst-01',
      dari,
      ke,
      teamId,
      status: 'diajukan',
      createdAt: new Date().toISOString().split('T')[0],
    };
    list.push(newInv);
    setItem(INVITES_KEY, list);
    return newInv;
  },

  async respondInvite(inviteId: string, status: 'diterima' | 'ditolak'): Promise<void> {
    const list = getInvitesList();
    const inv = list.find((i) => i.id === inviteId);
    if (!inv) return;

    inv.status = status;
    setItem(INVITES_KEY, list);

    // If accepted, add to team
    if (status === 'diterima') {
      const myTeam = await teamMockService.getTeamByUserId(inv.dari);
      if (myTeam && !myTeam.anggota.some((m) => m.userId === inv.ke)) {
        myTeam.anggota.push({ userId: inv.ke, status: 'diterima' });
        // Update team storage
        const currentTeams = getItem<any[]>('talenta-teams', []);
        const idx = currentTeams.findIndex((t) => t.id === myTeam.id);
        if (idx >= 0) {
          currentTeams[idx] = myTeam;
          setItem('talenta-teams', currentTeams);
        }
      }
    }
  },
};
