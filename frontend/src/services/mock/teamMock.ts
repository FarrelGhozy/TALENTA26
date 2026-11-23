import teamsData from '../../mocks/teams.json';
import usersData from '../../mocks/users.json';
import competitionsData from '../../mocks/competitions.json';
import { Competition, Team, TeamDirectoryItem, TeamJoinRequestItem, TeamReadiness, User } from '../../types';
import { getItem, setItem } from '../../lib/storage';
import { CreateTeamOptions, ITeamService, TeamDirectoryResponse, UpdateTeamOptions } from '../types';

const TEAMS_KEY = 'talenta-teams-v2';
const REQUESTS_KEY = 'talenta-team-join-requests-v2';
const ACTIVE_USER_KEY = 'talenta-demo-user-id';

function randomDemoCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TLN-${out.slice(0, 4)}-${out.slice(4, 8)}`;
}

function getAllUsers(): User[] {
  return usersData as User[];
}

function getCompetitions(): Competition[] {
  return getItem<Competition[]>('talenta-competitions-v3', competitionsData as Competition[]);
}

function enrichTeam(team: Team, currentUserId?: string): Team {
  const users = getAllUsers();
  const comps = getCompetitions();
  const comp = comps.find((c) => c.slug === team.competitionSlug);
  const leaderId = team.leaderId || team.anggota[0]?.userId || '';
  const leaderUser = users.find((u) => u.id === leaderId);

  const enrichedMembers = team.anggota.map((m) => {
    const u = users.find((x) => x.id === m.userId);
    return {
      ...m,
      roleInTeam: m.roleInTeam || (m.userId === leaderId ? 'Ketua Tim' : 'Anggota'),
      nama: m.nama || u?.nama || m.userId,
      prodi: m.prodi || u?.prodi || '',
      fakultas: m.fakultas || u?.fakultas || '',
      angkatan: m.angkatan ?? u?.angkatan ?? null,
      peranBisa: m.peranBisa || u?.peranBisa || [],
      skill: m.skill || u?.skill || [],
    };
  });

  const minReq = comp?.komposisi.min ?? 2;
  const maxAllowed = Math.min(team.targetMaxMembers ?? comp?.komposisi.max ?? 5, comp?.komposisi.max ?? 5);
  const activeCount = enrichedMembers.filter((m) => m.status === 'diterima').length;
  const hasEnough = activeCount >= minReq && activeCount <= maxAllowed;
  const uniqueProdis = Array.from(new Set(enrichedMembers.map((m) => m.prodi).filter(Boolean) as string[]));
  const unmetCriteria: string[] = [];
  if (!hasEnough) unmetCriteria.push(`Tim baru memiliki ${activeCount} dari minimal ${minReq} anggota`);
  if (comp?.registrationStatus === 'tutup') unmetCriteria.push('Pendaftaran internal sedang ditutup');
  if (comp?.requireCrossStudyProgram && uniqueProdis.length < 2) {
    unmetCriteria.push('Kompetisi mensyaratkan anggota lintas program studi');
  }

  const isSelectionReady = team.status !== 'terkunci_seleksi' && team.status !== 'arsip' && unmetCriteria.length === 0;
  const readiness: TeamReadiness = {
    level:
      team.status === 'terkunci_seleksi'
        ? 'terkunci_seleksi'
        : isSelectionReady
        ? 'siap_seleksi'
        : hasEnough
        ? 'anggota_cukup'
        : 'dibuat',
    activeMemberCount: activeCount,
    minRequired: minReq,
    maxAllowed,
    hasEnoughMembers: hasEnough,
    isFull: activeCount >= maxAllowed,
    isRegistrationOpen: comp?.registrationStatus !== 'tutup',
    uniqueStudyPrograms: uniqueProdis,
    missingRequiredRoles: [],
    crossStudyProgramSatisfied: uniqueProdis.length >= 2,
    isSelectionReady,
    canAccessRoadmap: activeCount >= 1 && team.status !== 'arsip',
    unmetCriteria,
    advisoryNotes: [],
    statusLabel:
      team.status === 'terkunci_seleksi'
        ? 'Terkunci Seleksi'
        : isSelectionReady
        ? 'Siap Seleksi Internal'
        : hasEnough
        ? 'Anggota Cukup'
        : 'Mencari Anggota',
    selectionStatusLabel:
      team.status === 'terkunci_seleksi'
        ? 'Terkonfirmasi Seleksi'
        : isSelectionReady
        ? 'Siap daftar seleksi'
        : hasEnough
        ? 'Jumlah anggota sesuai'
        : 'Belum memenuhi syarat',
  };

  const requests = getJoinRequests().filter((r) => r.teamId === team.id && r.status === 'menunggu');
  const isLeader = currentUserId ? leaderId === currentUserId : false;

  return {
    ...team,
    leaderId,
    leaderName: leaderUser?.nama || enrichedMembers[0]?.nama || 'Ketua Tim',
    isLeader,
    recruitmentType: team.recruitmentType || 'terbuka',
    isRecruiting: team.isRecruiting ?? (team.recruitmentType !== 'privat' && activeCount < maxAllowed),
    neededRoles: team.neededRoles || ['Penulis Proposal', 'Analis Data'],
    inviteCode: isLeader ? team.inviteCode || 'TLN-DEMO-2026' : null,
    pendingJoinRequestsCount: requests.length,
    joinRequests: isLeader ? requests : [],
    readiness,
    anggota: enrichedMembers,
    isFormed: hasEnough || team.status === 'terbentuk' || team.status === 'terkunci_seleksi',
  };
}

function getTeams(): Team[] {
  const initial = (teamsData as Team[]).map((t, idx) => ({
    ...t,
    leaderId: t.leaderId || t.anggota[0]?.userId,
    description: t.description || 'Tim pembinaan lomba kampus UNIDA Gontor.',
    recruitmentType: t.recruitmentType || 'terbuka',
    isRecruiting: t.isRecruiting ?? true,
    neededRoles: t.neededRoles || ['Penulis Proposal', 'Analis Data'],
    inviteCode: t.inviteCode || `TLN-DM0${idx + 1}-842K`,
  }));
  return getItem<Team[]>(TEAMS_KEY, initial);
}

function getJoinRequests(): TeamJoinRequestItem[] {
  return getItem<TeamJoinRequestItem[]>(REQUESTS_KEY, []);
}

export const teamMockService: ITeamService = {
  async getTeamByUserId(userId: string): Promise<Team | null> {
    setItem(ACTIVE_USER_KEY, userId);
    const teams = getTeams();
    const found = teams.find(
      (t) => t.status !== 'arsip' && t.anggota.some((m) => m.userId === userId)
    );
    return found ? enrichTeam(found, userId) : null;
  },

  async leaveTeam(userId: string, teamId: string): Promise<void> {
    const teams = getTeams();
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;

    team.anggota = team.anggota.filter((m) => m.userId !== userId);
    if (team.anggota.length === 0) {
      team.status = 'arsip';
      team.isRecruiting = false;
    } else {
      if (team.leaderId === userId) {
        team.leaderId = team.anggota[0].userId;
      }
      team.status = 'mencari';
      team.isFormed = false;
      if (team.recruitmentType === 'terbuka') team.isRecruiting = true;
    }
    setItem(TEAMS_KEY, teams);
  },

  async createTeam(
    competitionSlug: string,
    creatorId: string,
    teamName: string,
    options?: CreateTeamOptions
  ): Promise<Team> {
    const teams = getTeams();
    const recType = options?.recruitmentType || 'terbuka';
    const newTeam: Team = {
      id: `t-${Date.now()}`,
      institutionId: 'inst-01',
      competitionSlug,
      nama: teamName || 'Tim Baru',
      leaderId: creatorId,
      description: options?.description || '',
      recruitmentType: recType,
      isRecruiting: recType === 'terbuka',
      neededRoles: options?.neededRoles || [],
      targetMaxMembers: options?.targetMaxMembers ?? null,
      inviteCode: randomDemoCode(),
      inviteCodeUpdatedAt: new Date().toISOString(),
      anggota: [{ userId: creatorId, status: 'diterima', roleInTeam: 'Ketua Tim' }],
      isFormed: false,
      status: 'mencari',
    };
    teams.push(newTeam);
    setItem(TEAMS_KEY, teams);
    return enrichTeam(newTeam, creatorId);
  },

  async getDirectory(filters): Promise<TeamDirectoryResponse> {
    const currentUserId = getItem<string>(ACTIVE_USER_KEY, 'u1');
    const comps = getCompetitions();
    const comp =
      comps.find((c) => c.slug === filters?.competitionSlug) ||
      comps.find((c) => c.format !== 'individu') ||
      null;
    if (!comp) return { competition: null, teams: [], myActiveTeamId: null };

    const allTeams = getTeams();
    const myTeam = allTeams.find(
      (t) => t.competitionSlug === comp.slug && t.status !== 'arsip' && t.anggota.some((m) => m.userId === currentUserId)
    );
    const reqs = getJoinRequests().filter((r) => r.userId === currentUserId);
    const users = getAllUsers();
    const qLower = (filters?.q || '').trim().toLowerCase();
    const roleLower = (filters?.role || '').trim().toLowerCase();

    const items: TeamDirectoryItem[] = allTeams
      .filter(
        (t) =>
          t.competitionSlug === comp.slug &&
          t.status !== 'arsip' &&
          t.status !== 'terkunci_seleksi' &&
          (t.recruitmentType || 'terbuka') === 'terbuka' &&
          t.isRecruiting !== false
      )
      .map((t) => {
        const leaderId = t.leaderId || t.anggota[0]?.userId || '';
        const leader = users.find((u) => u.id === leaderId);
        const maxAllowed = Math.min(t.targetMaxMembers ?? comp.komposisi.max, comp.komposisi.max);
        const activeCount = t.anggota.filter((m) => m.status === 'diterima').length;
        const myReq = reqs.find((r) => r.teamId === t.id);
        return {
          id: t.id,
          competitionId: comp.id || comp.slug,
          competitionSlug: comp.slug,
          competitionName: comp.namaResmi,
          name: t.nama,
          description: t.description || '',
          recruitmentType: t.recruitmentType || 'terbuka',
          isRecruiting: true,
          status: t.status,
          activeMemberCount: activeCount,
          minRequired: comp.komposisi.min,
          maxAllowed,
          slotsRemaining: Math.max(0, maxAllowed - activeCount),
          neededRoles: t.neededRoles || [],
          leader: {
            id: leaderId,
            fullName: leader?.nama || 'Ketua Tim',
            studyProgram: leader?.prodi || '',
          },
          isMyTeam: t.anggota.some((m) => m.userId === currentUserId),
          myRequestId: myReq?.id || null,
          myRequestStatus: myReq?.status || null,
          createdAt: new Date().toISOString(),
        };
      })
      .filter((item) => item.activeMemberCount < item.maxAllowed)
      .filter((item) => {
        if (roleLower && roleLower !== 'semua') {
          if (!item.neededRoles.some((r) => r.toLowerCase().includes(roleLower))) return false;
        }
        if (qLower) {
          const hay = [item.name, item.description, ...item.neededRoles].join(' ').toLowerCase();
          if (!hay.includes(qLower)) return false;
        }
        return true;
      });

    return { competition: comp, teams: items, myActiveTeamId: myTeam?.id || null };
  },

  async getMyJoinRequests(): Promise<TeamJoinRequestItem[]> {
    const currentUserId = getItem<string>(ACTIVE_USER_KEY, 'u1');
    return getJoinRequests().filter((r) => r.userId === currentUserId);
  },

  async updateTeam(teamId: string, options: UpdateTeamOptions): Promise<Team> {
    const currentUserId = getItem<string>(ACTIVE_USER_KEY, 'u1');
    const teams = getTeams();
    const team = teams.find((t) => t.id === teamId);
    if (!team) throw new Error('Tim tidak ditemukan');
    if (options.teamName !== undefined) team.nama = options.teamName;
    if (options.description !== undefined) team.description = options.description;
    if (options.neededRoles !== undefined) team.neededRoles = options.neededRoles;
    if (options.recruitmentType !== undefined) team.recruitmentType = options.recruitmentType;
    if (options.isRecruiting !== undefined) team.isRecruiting = options.isRecruiting;
    if (options.targetMaxMembers !== undefined) team.targetMaxMembers = options.targetMaxMembers;
    setItem(TEAMS_KEY, teams);
    return enrichTeam(team, currentUserId);
  },

  async rotateInviteCode(teamId: string) {
    const teams = getTeams();
    const team = teams.find((t) => t.id === teamId);
    if (!team) throw new Error('Tim tidak ditemukan');
    const code = randomDemoCode();
    const now = new Date().toISOString();
    team.inviteCode = code;
    team.inviteCodeUpdatedAt = now;
    setItem(TEAMS_KEY, teams);
    return { inviteCode: code, inviteCodeUpdatedAt: now };
  },

  async requestJoin(teamId: string, payload) {
    const currentUserId = getItem<string>(ACTIVE_USER_KEY, 'u1');
    const users = getAllUsers();
    const me = users.find((u) => u.id === currentUserId);
    const teams = getTeams();
    const team = teams.find((t) => t.id === teamId);
    if (!team) throw new Error('Tim tidak ditemukan');

    const reqs = getJoinRequests();
    const newReq: TeamJoinRequestItem = {
      id: `jr-${Date.now()}`,
      teamId,
      userId: currentUserId,
      preferredRole: payload?.preferredRole || null,
      note: payload?.note || null,
      status: 'menunggu',
      createdAt: new Date().toISOString(),
      applicant: me
        ? {
            id: me.id,
            nama: me.nama,
            prodi: me.prodi,
            fakultas: me.fakultas,
            angkatan: me.angkatan,
            peranBisa: me.peranBisa,
            skill: me.skill,
          }
        : undefined,
      team: {
        id: team.id,
        name: team.nama,
        description: team.description,
        status: team.status,
        recruitmentType: team.recruitmentType || 'terbuka',
        activeMemberCount: team.anggota.length,
        maxAllowed: team.targetMaxMembers || 5,
        competitionSlug: team.competitionSlug,
        competitionName: team.competitionSlug,
      },
    };
    reqs.unshift(newReq);
    setItem(REQUESTS_KEY, reqs);
    return newReq;
  },

  async cancelJoinRequest(requestId: string) {
    const reqs = getJoinRequests().map((r) =>
      r.id === requestId ? { ...r, status: 'dibatalkan' as const } : r
    );
    setItem(REQUESTS_KEY, reqs);
  },

  async decideJoinRequest(requestId: string, action) {
    const reqs = getJoinRequests();
    const req = reqs.find((r) => r.id === requestId);
    if (!req) throw new Error('Pengajuan tidak ditemukan');
    req.status = action;
    req.reviewedAt = new Date().toISOString();
    if (action === 'disetujui') {
      const teams = getTeams();
      const team = teams.find((t) => t.id === req.teamId);
      if (team && !team.anggota.some((m) => m.userId === req.userId)) {
        team.anggota.push({ userId: req.userId, status: 'diterima', roleInTeam: req.preferredRole || 'Anggota' });
        setItem(TEAMS_KEY, teams);
      }
    }
    setItem(REQUESTS_KEY, reqs);
    return { message: action === 'disetujui' ? 'Anggota disetujui' : 'Pengajuan ditolak' };
  },

  async joinByCode(inviteCode: string) {
    const currentUserId = getItem<string>(ACTIVE_USER_KEY, 'u1');
    const code = inviteCode.trim().toUpperCase();
    const teams = getTeams();
    const team = teams.find((t) => (t.inviteCode || '').toUpperCase() === code && t.status !== 'arsip');
    if (!team) throw new Error('Kode undangan tim tidak ditemukan');
    if (!team.anggota.some((m) => m.userId === currentUserId)) {
      team.anggota.push({ userId: currentUserId, status: 'diterima', roleInTeam: 'Anggota' });
      setItem(TEAMS_KEY, teams);
    }
    return { teamId: team.id, teamName: team.nama, message: `Berhasil bergabung dengan ${team.nama}` };
  },

  async removeMember(teamId: string, targetUserId: string) {
    const teams = getTeams();
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    team.anggota = team.anggota.filter((m) => m.userId !== targetUserId);
    setItem(TEAMS_KEY, teams);
  },

  async registerSelection(teamId: string) {
    const teams = getTeams();
    const team = teams.find((t) => t.id === teamId);
    if (team) {
      team.latestSelection = {
        id: `sel-${Date.now()}`,
        stage: 'Pendaftaran Internal',
        result: 'menunggu',
        organizerVerified: false,
      };
      setItem(TEAMS_KEY, teams);
    }
    return team?.latestSelection;
  },
};
