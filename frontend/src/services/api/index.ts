import { API_BASE_URL } from '../../config/env';
import type {
  Achievement,
  AchievementProof,
  Competition,
  Consultant,
  Profile,
  RankingResponse,
  Role,
  Team,
  TeamJoinRequestItem,
  User,
} from '../../types';
import {
  AcademicPeriodActivationPreview,
  AcademicPeriodItem,
  AuditLogItem,
  CompetitionParticipantOption,
  CreateTeamOptions,
  IAchievementService,
  ICompetitionService,
  IConsultantService,
  IDashboardService,
  IRoadmapService,
  IStatsService,
  ISystemService,
  ITeamService,
  IValidatorContentService,
  IUserService,
  PointRuleItem,
  PointTemplateItem,
  StudentDashboardData,
  SystemHealthSummary,
  TeamDirectoryResponse,
  UpdateTeamOptions,
  ValidatorCompetitionItem,
  ValidatorConsultantItem,
  ValidatorRoadmapDetail,
} from '../types';

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
  retryAfterSeconds?: number;
}

export class ApiRequestError extends Error {
  public code: string;
  public fieldErrors?: Record<string, string>;
  public status: number;
  public retryAfterSeconds?: number;

  constructor(status: number, error: ApiError) {
    super(error.message || `API Error ${status}`);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = error.code || 'UNKNOWN_ERROR';
    this.fieldErrors = error.fieldErrors;
    this.retryAfterSeconds = error.retryAfterSeconds;
  }
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

function generateIdempotencyKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseRetryAfterSeconds(res: Response, body: any): number | undefined {
  const fromBody = Number(body?.error?.retryAfterSeconds);
  if (Number.isFinite(fromBody) && fromBody > 0) return Math.ceil(fromBody);
  const headerVal = res.headers.get('Retry-After');
  if (!headerVal) return undefined;
  const num = Number.parseInt(headerVal, 10);
  if (Number.isFinite(num) && num > 0) return num;
  const parsedDate = Date.parse(headerVal);
  if (Number.isFinite(parsedDate)) {
    const diff = Math.ceil((parsedDate - Date.now()) / 1000);
    return diff > 0 ? diff : undefined;
  }
  return undefined;
}

function isAuthBootstrapEndpoint(endpoint: string): boolean {
  return endpoint.startsWith('/auth/');
}

// Helper fetcher terpadu dengan standar docs/16, AbortController timeout, & penanganan 429/413/401/offline
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});

  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const effectiveTimeout = timeoutMs ?? (fetchOptions.body instanceof FormData ? 60_000 : 20_000);
  const controller = new AbortController();
  const externalSignal = fetchOptions.signal;
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timer = window.setTimeout(() => controller.abort(), effectiveTimeout);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiRequestError(408, {
        code: 'REQUEST_TIMEOUT',
        message: 'Permintaan melebihi batas waktu. Periksa koneksi Anda lalu coba lagi.',
      });
    }
    throw new ApiRequestError(0, {
      code: 'NETWORK_ERROR',
      message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.',
    });
  } finally {
    window.clearTimeout(timer);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && !isAuthBootstrapEndpoint(endpoint)) {
      unauthorizedHandler?.();
    }

    if (res.status === 429) {
      const retryAfterSeconds = parseRetryAfterSeconds(res, body);
      const waitMsg = retryAfterSeconds
        ? `Terlalu banyak permintaan. Coba lagi dalam ${retryAfterSeconds} detik.`
        : 'Terlalu banyak permintaan. Silakan tunggu sebentar lalu coba lagi.';
      throw new ApiRequestError(429, {
        code: body?.error?.code || 'RATE_LIMITED',
        message: waitMsg,
        retryAfterSeconds,
      });
    }

    if (res.status === 413) {
      throw new ApiRequestError(413, {
        code: body?.error?.code || 'PAYLOAD_TOO_LARGE',
        message: body?.error?.message || 'Ukuran total berkas melebihi batas unggah server.',
      });
    }

    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new ApiRequestError(res.status, {
        code: body?.error?.code || 'SERVICE_UNAVAILABLE',
        message:
          body?.error?.message ||
          'Layanan sedang sibuk atau dalam pemeliharaan sementara. Silakan coba lagi sebentar.',
      });
    }

    const apiError: ApiError = body?.error || {
      code: 'HTTP_ERROR',
      message: body?.message || `Terjadi kesalahan pada server (${res.status}).`,
    };
    throw new ApiRequestError(res.status, apiError);
  }

  return body?.data !== undefined ? body.data : body;
}

function mapBackendUserToFrontend(raw: any): User {
  const role = (raw.role || 'mahasiswa') as Role;
  const profile = raw.studentProfile;
  let nama = profile?.fullName || raw.fullName;
  if (!nama) {
    if (role === 'super_admin') {
      nama = 'Super Administrator';
    } else if (role === 'validator') {
      nama = 'Tim Validator';
    } else {
      nama = raw.email?.split('@')[0] || 'Pengguna';
    }
  }

  return {
    id: raw.id,
    institutionId: raw.institutionId || 'unida-gontor',
    nama,
    email: raw.email || '',
    nim: profile?.nim ?? undefined,
    prodi: profile?.studyProgram || '',
    fakultas: profile?.faculty ?? undefined,
    angkatan: profile?.enrollmentYear ?? undefined,
    phone: profile?.phone ?? undefined,
    bio: profile?.bio ?? undefined,
    pengalaman: profile?.experience ?? undefined,
    avatar: profile?.avatarUrl || raw?.avatarUrl || raw?.avatar || undefined,
    role: [role],
    skill: Array.isArray(profile?.skills) ? profile.skills : [],
    minat: Array.isArray(profile?.interests) ? profile.interests : [],
    ketersediaan: profile?.availability || { hari: [], jam: 0 },
    peranBisa: Array.isArray(profile?.rolesCapable) ? profile.rolesCapable : [],
  };
}

function mapBackendCompetitionToFrontend(raw: any): Competition {
  const roadmapPhases = Array.isArray(raw.roadmaps?.[0]?.phases) ? raw.roadmaps[0].phases : [];
  const derivedTahapan =
    Array.isArray(raw.tahapan) && raw.tahapan.length > 0
      ? raw.tahapan
      : roadmapPhases.map((phase: any, idx: number) => ({
          nomor: String(idx + 1).padStart(2, '0'),
          judul: phase.title || `Tahap ${idx + 1}`,
          kategori: phase.targetDays ? `Target ${phase.targetDays} hari` : 'Pembinaan',
          deskripsi:
            phase.description ||
            (Array.isArray(phase.tasks) && phase.tasks.length > 0
              ? `${phase.tasks.length} agenda persiapan terstruktur.`
              : ''),
        }));

  return {
    id: raw.id,
    slug: raw.slug,
    institutionId: raw.institutionId || 'unida-gontor',
    namaResmi: raw.name || raw.namaResmi || '',
    penyelenggara: raw.organizer || raw.penyelenggara || '',
    kategori: raw.category || raw.kategori || '',
    tingkat: raw.level || raw.tingkat || '',
    format: raw.format,
    registrationStatus: raw.registrationStatus || 'buka',
    internalSelectionDeadline: raw.internalSelectionDeadline || null,
    requireRoles: Boolean(raw.requireRoles),
    requireCrossStudyProgram: Boolean(raw.requireCrossStudyProgram),
    singleTeamPerCompetition: raw.singleTeamPerCompetition !== false,
    sourceUrl: raw.sourceUrl || null,
    deskripsi: raw.description || raw.deskripsi || '',
    syarat: Array.isArray(raw.requirements) ? raw.requirements : raw.syarat || [],
    komposisi: {
      min: raw.minTeamMembers ?? raw.komposisi?.min ?? 1,
      max: raw.maxTeamMembers ?? raw.komposisi?.max ?? 3,
      peranWajib: Array.isArray(raw.requiredRoles) ? raw.requiredRoles : raw.komposisi?.peranWajib || [],
    },
    tahapan: derivedTahapan,
    jadwal: Array.isArray(raw.scheduleTimeline) ? raw.scheduleTimeline : raw.jadwal || [],
    seleksiInternal: raw.seleksiInternal || [],
    competitionCategoryId: raw.competitionCategoryId,
    pointTemplateId: raw.pointTemplateId,
    pointDescription: raw.pointDescription,
  };
}

function mapBackendJoinRequestToFrontend(raw: any): TeamJoinRequestItem {
  const applicantProfile = raw.user?.studentProfile;
  const maxAllowed =
    raw.team?.targetMaxMembers && raw.team?.competition?.maxTeamMembers
      ? Math.min(raw.team.targetMaxMembers, raw.team.competition.maxTeamMembers)
      : raw.team?.competition?.maxTeamMembers ?? 5;

  return {
    id: raw.id,
    teamId: raw.teamId,
    userId: raw.userId,
    preferredRole: raw.preferredRole || null,
    note: raw.note || null,
    status: raw.status,
    createdAt: raw.createdAt || '',
    reviewedAt: raw.reviewedAt || null,
    applicant: raw.user
      ? {
          id: raw.user.id || raw.userId,
          nama: applicantProfile?.fullName || 'Mahasiswa',
          prodi: applicantProfile?.studyProgram || '',
          fakultas: applicantProfile?.faculty || '',
          angkatan: applicantProfile?.enrollmentYear ?? null,
          avatarUrl: applicantProfile?.avatarUrl || null,
          bio: applicantProfile?.bio || null,
          pengalaman: applicantProfile?.experience || null,
          peranBisa: Array.isArray(applicantProfile?.rolesCapable) ? applicantProfile.rolesCapable : [],
          skill: Array.isArray(applicantProfile?.skills) ? applicantProfile.skills : [],
        }
      : undefined,
    team: raw.team
      ? {
          id: raw.team.id,
          name: raw.team.name,
          description: raw.team.description || null,
          status: raw.team.status,
          recruitmentType: raw.team.recruitmentType || 'terbuka',
          activeMemberCount: Array.isArray(raw.team.members) ? raw.team.members.length : 0,
          maxAllowed,
          competitionSlug: raw.team.competition?.slug || '',
          competitionName: raw.team.competition?.name || '',
          leaderName: raw.team.leader?.studentProfile?.fullName || undefined,
          leaderAvatarUrl: raw.team.leader?.studentProfile?.avatarUrl || null,
        }
      : undefined,
  };
}

function mapBackendTeamToFrontend(raw: any): Team | null {
  if (!raw) return null;
  const membersRaw = raw.members || raw.anggota || [];
  return {
    id: raw.id,
    institutionId: raw.institutionId || 'unida-gontor',
    competitionSlug: raw.competition?.slug || raw.competitionSlug || '',
    nama: raw.name || raw.nama || '',
    leaderId: raw.leaderId || raw.creatorId,
    leaderName: raw.leader?.studentProfile?.fullName || undefined,
    isLeader: raw.isLeader,
    description: raw.description ?? null,
    recruitmentType: raw.recruitmentType || 'terbuka',
    isRecruiting: raw.isRecruiting !== false,
    neededRoles: Array.isArray(raw.neededRoles) ? raw.neededRoles : [],
    targetMaxMembers: raw.targetMaxMembers ?? null,
    inviteCode: raw.inviteCode ?? null,
    inviteCodeUpdatedAt: raw.inviteCodeUpdatedAt ?? null,
    pendingJoinRequestsCount:
      typeof raw.pendingJoinRequestsCount === 'number'
        ? raw.pendingJoinRequestsCount
        : Array.isArray(raw.joinRequests)
        ? raw.joinRequests.length
        : 0,
    joinRequests: Array.isArray(raw.joinRequests)
      ? raw.joinRequests.map(mapBackendJoinRequestToFrontend)
      : [],
    readiness: raw.readiness || null,
    latestSelection: raw.latestSelection || null,
    anggota: membersRaw.map((m: any) => {
      const sp = m.user?.studentProfile;
      return {
        userId: m.userId,
        status: m.status === 'active' || m.status === 'diterima' ? 'diterima' : 'diajukan',
        roleInTeam: m.roleInTeam || 'Anggota',
        joinedAt: m.joinedAt,
        nama: sp?.fullName || m.nama || 'Mahasiswa',
        prodi: sp?.studyProgram || m.prodi || '',
        fakultas: sp?.faculty || m.fakultas || '',
        angkatan: sp?.enrollmentYear ?? m.angkatan ?? null,
        avatarUrl: sp?.avatarUrl ?? m.avatarUrl ?? null,
        bio: sp?.bio ?? null,
        peranBisa: Array.isArray(sp?.rolesCapable) ? sp.rolesCapable : m.peranBisa || [],
        skill: Array.isArray(sp?.skills) ? sp.skills : m.skill || [],
      };
    }),
    competitionDetail: raw.competition ? mapBackendCompetitionToFrontend(raw.competition) : null,
    isFormed: raw.status === 'terbentuk' || raw.status === 'terkunci_seleksi',
    status: raw.status,
  };
}

function mapBackendConsultantToFrontend(c: any): Consultant {
  return {
    id: c.id,
    institutionId: c.institutionId || 'unida-gontor',
    nama: c.nama || c.name || '',
    bidang: Array.isArray(c.bidang) ? c.bidang : [c.field || 'Konsultan'],
    assignmentApproved: Boolean(c.assignmentApproved ?? c.isApproved),
    isVerifiedContact: Boolean(c.isVerifiedContact ?? c.isApproved),
    waMock: c.waMock || c.whatsappNumber || '',
  };
}

export const competitionApiService: ICompetitionService = {
  getAll: async () => {
    const list = await apiFetch<any[]>('/competitions');
    return Array.isArray(list) ? list.map(mapBackendCompetitionToFrontend) : [];
  },
  getBySlug: async (slug) => {
    const raw = await apiFetch<any>(`/competitions/${encodeURIComponent(slug)}`);
    return raw ? mapBackendCompetitionToFrontend(raw) : null;
  },
};

export const userApiService: IUserService & {
  login?: (email: string, pass: string) => Promise<{ user: User; token: string }>;
  register?: (data: any) => Promise<{ user: User; token: string }>;
  logout?: () => Promise<void>;
  forgotPassword?: (email: string) => Promise<{ message: string }>;
  resetPassword?: (token: string, pass: string) => Promise<{ message: string }>;
} = {
  getAll: async () => {
    try {
      const res = await apiFetch<any[]>('/users');
      return Array.isArray(res) ? res.map(mapBackendUserToFrontend) : [];
    } catch {
      return [];
    }
  },
  getById: async (id: string) => {
    try {
      const res = await apiFetch<any>(`/users/${id}`);
      return mapBackendUserToFrontend(res);
    } catch {
      return null;
    }
  },
  getCurrentUser: async () => {
    const raw = await apiFetch<any>('/auth/me');
    return mapBackendUserToFrontend(raw);
  },
  login: async (email: string, password: string) => {
    const res = await apiFetch<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return {
      user: mapBackendUserToFrontend(res.user),
      token: res.token,
    };
  },
  register: async (payload: any) => {
    const res = await apiFetch<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      user: mapBackendUserToFrontend(res.user),
      token: res.token,
    };
  },
  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      // Cookie HttpOnly dihapus oleh backend.
    }
  },
  forgotPassword: (email: string) =>
    apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  updateProfile: async (_userId, data) => {
    const payload: Record<string, unknown> = {};
    if (data.nama !== undefined) payload.fullName = data.nama;
    if (data.prodi !== undefined) payload.studyProgram = data.prodi;
    if (data.fakultas !== undefined && data.fakultas !== '') payload.faculty = data.fakultas;
    if (typeof data.angkatan === 'number' && Number.isFinite(data.angkatan)) {
      payload.enrollmentYear = data.angkatan;
    }
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.bio !== undefined) payload.bio = data.bio;
    if (data.pengalaman !== undefined) payload.experience = data.pengalaman;
    if (data.skill !== undefined) payload.skills = data.skill;
    if (data.minat !== undefined) payload.interests = data.minat;
    if (data.ketersediaan !== undefined) payload.availability = data.ketersediaan;
    if (data.peranBisa !== undefined) payload.rolesCapable = data.peranBisa;

    const res = await apiFetch<any>('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapBackendUserToFrontend({
      id: res.userId || _userId,
      role: 'mahasiswa',
      studentProfile: res,
      email: data.email,
    });
  },
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiFetch<{ avatarUrl: string }>('/me/profile/avatar', {
      method: 'POST',
      body: formData,
    });
  },
  deleteAvatar: async () => {
    await apiFetch('/me/profile/avatar', { method: 'DELETE' });
  },
  getTargetHistory: () => apiFetch('/me/targets/history'),
  searchStudents: (q?: string) =>
    apiFetch(`/students/directory${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getProfile: async (userId: string): Promise<Profile | null> => {
    try {
      const [raw, target] = await Promise.all([
        apiFetch<any>('/me/profile').catch(() => null),
        apiFetch<any>('/me/target').catch(() => null),
      ]);
      if (!raw && !target) return null;
      const checks = [
        Boolean(raw?.nim),
        Boolean(raw?.fullName),
        Boolean(raw?.studyProgram),
        Boolean(raw?.faculty),
        Boolean(raw?.phone),
        Boolean(raw?.bio),
        Array.isArray(raw?.skills) && raw.skills.length > 0,
        Array.isArray(raw?.interests) && raw.interests.length > 0,
        Boolean(raw?.availability),
        Boolean(raw?.experience),
      ];
      const kelengkapan = raw ? Math.round((checks.filter(Boolean).length / checks.length) * 100) : 0;
      return {
        userId: raw?.userId || userId,
        institutionId: 'unida-gontor',
        targetKompetisiSlug: target?.competition?.slug || target?.competitionSlug || raw?.targetKompetisiSlug || '',
        kelengkapan,
      };
    } catch {
      return null;
    }
  },
  setTargetCompetition: async (userId: string, slug: string): Promise<Profile> => {
    await apiFetch('/me/target', { method: 'POST', body: JSON.stringify({ slug }) });
    return {
      userId,
      institutionId: 'unida-gontor',
      targetKompetisiSlug: slug,
      kelengkapan: 0,
    };
  },
};

export const teamApiService: ITeamService = {
  getTeamByUserId: async (): Promise<Team | null> => {
    const raw = await apiFetch<any>('/teams/my');
    return mapBackendTeamToFrontend(raw);
  },
  leaveTeam: async (_userId: string, teamId: string): Promise<void> => {
    await apiFetch(`/teams/${teamId}/leave`, {
      method: 'POST',
    });
  },
  createTeam: async (
    competitionSlug: string,
    _creatorId: string,
    teamName: string,
    options?: CreateTeamOptions
  ): Promise<Team> => {
    const raw = await apiFetch<any>('/teams', {
      method: 'POST',
      body: JSON.stringify({
        competitionSlug,
        teamName,
        ...options,
      }),
    });
    return mapBackendTeamToFrontend(raw)!;
  },
  getDirectory: async (filters): Promise<TeamDirectoryResponse> => {
    const qs = new URLSearchParams();
    if (filters?.competitionSlug) qs.set('competitionSlug', filters.competitionSlug);
    if (filters?.q) qs.set('q', filters.q);
    if (filters?.role && filters.role !== 'semua') qs.set('role', filters.role);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const raw = await apiFetch<any>(`/teams/directory${query}`);
    return {
      competition: raw?.competition ? mapBackendCompetitionToFrontend(raw.competition) : null,
      teams: Array.isArray(raw?.teams) ? raw.teams : [],
      myActiveTeamId: raw?.myActiveTeamId || null,
    };
  },
  getMyJoinRequests: async (): Promise<TeamJoinRequestItem[]> => {
    const list = await apiFetch<any[]>('/me/join-requests');
    return Array.isArray(list) ? list.map(mapBackendJoinRequestToFrontend) : [];
  },
  updateTeam: async (teamId: string, options: UpdateTeamOptions): Promise<Team> => {
    const raw = await apiFetch<any>(`/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify(options),
    });
    return mapBackendTeamToFrontend(raw)!;
  },
  rotateInviteCode: (teamId: string) =>
    apiFetch<{ inviteCode: string; inviteCodeUpdatedAt: string }>(
      `/teams/${teamId}/invite-code/rotate`,
      { method: 'POST' }
    ),
  requestJoin: async (teamId: string, payload?: { preferredRole?: string; note?: string }) => {
    const raw = await apiFetch<any>(`/teams/${teamId}/join-requests`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    return mapBackendJoinRequestToFrontend(raw);
  },
  cancelJoinRequest: async (requestId: string) => {
    await apiFetch(`/join-requests/${requestId}/cancel`, { method: 'POST' });
  },
  decideJoinRequest: (requestId: string, action: 'disetujui' | 'ditolak') =>
    apiFetch<{ message: string }>(`/join-requests/${requestId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  joinByCode: (inviteCode: string) =>
    apiFetch<{ teamId: string; teamName: string; message: string }>('/teams/join-by-code', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    }),
  removeMember: async (teamId: string, targetUserId: string) => {
    await apiFetch(`/teams/${teamId}/members/${targetUserId}/remove`, { method: 'POST' });
  },
  registerSelection: (teamId: string) =>
    apiFetch(`/teams/${teamId}/register-selection`, { method: 'POST' }),
};

export const roadmapApiService: IRoadmapService = {
  getByCompetition: async (slug: string) => {
    const raw = await apiFetch<any>(`/roadmaps/${encodeURIComponent(slug)}`);
    if (!raw) return null;
    return {
      competitionSlug: slug,
      institutionId: raw.institutionId || 'unida-gontor',
      fase: raw.fase || [],
    };
  },
  getChecklist: (_userId, slug) => apiFetch(`/roadmaps/${encodeURIComponent(slug)}/checklist`),
  toggleChecklist: (_userId, slug, taskId) =>
    apiFetch(`/roadmaps/${encodeURIComponent(slug)}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    }),
};

function mapBackendAchievementToFrontend(raw: any): Achievement {
  const evidences: AchievementProof[] = Array.isArray(raw.evidences)
    ? raw.evidences.map((e: any) => ({
        id: e.id,
        nama: e.fileName || e.name || 'berkas.pdf',
        size: e.fileSize || e.size || 0,
        mimeType: e.mimeType,
        uploadedAt: e.uploadedAt,
        isActive: e.isActive !== false,
        supersededByRevisionId: e.supersededByRevisionId || null,
      }))
    : Array.isArray(raw.bukti)
    ? raw.bukti
    : [];

  return {
    id: raw.id,
    institutionId: raw.institutionId || 'unida-gontor',
    userId: raw.userId,
    nama: raw.name || raw.nama || '',
    penyelenggara: raw.organizer || raw.penyelenggara || '',
    kategori: raw.category || raw.kategori || 'kompetisi',
    tanggal: raw.eventDate ? new Date(raw.eventDate).toISOString().split('T')[0] : (raw.tanggal || ''),
    tingkat: raw.level || raw.tingkat || 'nasional',
    jenisCapaian: raw.result || raw.jenisCapaian || 'juara_1',
    deskripsi: raw.description || raw.deskripsi,
    bukti: evidences,
    status: raw.status || 'menunggu',
    version: raw.version || 1,
    catatan: raw.reviewNote || raw.catatan,
    dariSeleksiInternal: Boolean(raw.isFromInternalSelection || raw.dariSeleksiInternal),
    competitionId: raw.competitionId || raw.competition?.id || null,
    competitionSlug: raw.competition?.slug || raw.competitionSlug,
    competitionName: raw.competition?.name,
    participationType: raw.participationType || 'individu',
    teamId: raw.teamId || raw.team?.id || null,
    teamName: raw.team?.name || null,
    competitionCategoryId: raw.competitionCategoryId || raw.competitionCategory?.id || null,
    competitionCategoryName: raw.competitionCategory?.name || null,
    subCategoryId: raw.subCategoryId || raw.subCategory?.id || null,
    subCategoryName: raw.subCategory?.name || null,
    subCompetitionName: raw.subCompetitionName || null,
    potentialDuplicateOfId: raw.potentialDuplicateOfId || null,
    pointRecommendation: raw.pointRecommendation || null,
    participants: Array.isArray(raw.participants)
      ? raw.participants.map((p: any) => ({
          id: p.id,
          userId: p.userId,
          fullName: p.user?.studentProfile?.fullName || p.user?.fullName || 'Mahasiswa',
          nim: p.user?.studentProfile?.nim,
          studyProgram: p.user?.studentProfile?.studyProgram,
          avatarUrl: p.user?.studentProfile?.avatarUrl ?? null,
          roleInTeam: p.roleInTeam,
          isSubmitter: Boolean(p.isSubmitter),
        }))
      : undefined,
    decisions: Array.isArray(raw.decisions)
      ? raw.decisions.map((d: any) => ({
          id: d.id,
          action: d.action,
          previousStatus: d.previousStatus,
          newStatus: d.newStatus,
          reason: d.reason,
          calculatedPoints: d.calculatedPoints,
          awardedPoints: d.awardedPoints,
          pointSource: d.pointSource,
          overrideReason: d.overrideReason,
          version: d.version,
          createdAt: d.createdAt,
          decidedBy: d.decidedBy
            ? {
                id: d.decidedBy.id,
                fullName: d.decidedBy.fullName || d.decidedBy.email || 'Validator',
                role: d.decidedBy.role,
              }
            : null,
        }))
      : undefined,
    revisions: Array.isArray(raw.revisions) ? raw.revisions : undefined,
    submitterName: raw.user?.studentProfile?.fullName || raw.user?.fullName || undefined,
    submitterNim: raw.user?.studentProfile?.nim || undefined,
    submitterProdi: raw.user?.studentProfile?.studyProgram || undefined,
    submitterAvatarUrl: raw.user?.studentProfile?.avatarUrl ?? null,
  };
}

export const achievementApiService: IAchievementService = {
  getAll: async (userId?: string, status?: string): Promise<Achievement[]> => {
    const statusParam =
      status && status !== 'semua' ? `?status=${encodeURIComponent(status)}` : '';
    const endpoint = userId
      ? `/me/achievements${statusParam}`
      : `/admin/achievements${statusParam}`;
    const res = await apiFetch<any[]>(endpoint);
    return Array.isArray(res) ? res.map(mapBackendAchievementToFrontend) : [];
  },

  getById: async (id: string, scope: 'student' | 'admin' = 'student'): Promise<Achievement | null> => {
    const encodedId = encodeURIComponent(id);
    const endpoint = scope === 'admin' ? `/admin/achievements/${encodedId}` : `/me/achievements/${encodedId}`;
    const res = await apiFetch<any>(endpoint);
    return mapBackendAchievementToFrontend(res);
  },

  create: async (data: any, files?: File[]): Promise<Achievement> => {
    const idempotencyKey = generateIdempotencyKey('ach-create');
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append('nama', data.nama || data.name);
      formData.append('penyelenggara', data.penyelenggara || data.organizer);
      formData.append('kategori', data.kategori || data.category);
      formData.append('tingkat', data.tingkat || data.level);
      formData.append('jenisCapaian', data.jenisCapaian || data.result);
      formData.append('tanggal', data.tanggal || data.eventDate);
      if (data.deskripsi || data.description) formData.append('deskripsi', data.deskripsi || data.description);
      if (data.competitionId) formData.append('competitionId', data.competitionId);
      if (data.competitionSlug) formData.append('competitionSlug', data.competitionSlug);
      if (data.competitionCategoryId) formData.append('competitionCategoryId', data.competitionCategoryId);
      if (data.subCategoryId) formData.append('subCategoryId', data.subCategoryId);
      if (data.subCompetitionName) formData.append('subCompetitionName', data.subCompetitionName);
      if (data.participationType) formData.append('participationType', data.participationType);
      if (data.teamId) formData.append('teamId', data.teamId);
      if (Array.isArray(data.participantUserIds) && data.participantUserIds.length > 0) {
        formData.append('participantUserIds', JSON.stringify(data.participantUserIds));
      }
      formData.append('dariSeleksiInternal', String(Boolean(data.dariSeleksiInternal)));
      for (const f of files) {
        formData.append('evidence', f);
      }
      const res = await apiFetch<any>('/me/achievements', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: formData,
      });
      return mapBackendAchievementToFrontend(res);
    }

    const res = await apiFetch<any>('/me/achievements', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(data),
    });
    return mapBackendAchievementToFrontend(res);
  },

  submitRevision: async (id: string, data: any, files?: File[]): Promise<Achievement> => {
    const encodedId = encodeURIComponent(id);
    const idempotencyKey = generateIdempotencyKey(`ach-rev-${id}`);
    if ((files && files.length > 0) || (Array.isArray(data.replaceEvidenceIds) && data.replaceEvidenceIds.length > 0)) {
      const formData = new FormData();
      if (data.nama || data.name) formData.append('nama', data.nama || data.name);
      if (data.penyelenggara || data.organizer) formData.append('penyelenggara', data.penyelenggara || data.organizer);
      if (data.kategori || data.category) formData.append('kategori', data.kategori || data.category);
      if (data.tingkat || data.level) formData.append('tingkat', data.tingkat || data.level);
      if (data.jenisCapaian || data.result) formData.append('jenisCapaian', data.jenisCapaian || data.result);
      if (data.tanggal || data.eventDate) formData.append('tanggal', data.tanggal || data.eventDate);
      if (data.deskripsi !== undefined || data.description !== undefined) {
        formData.append('deskripsi', data.deskripsi ?? data.description ?? '');
      }
      if (data.catatan || data.note) formData.append('catatan', data.catatan || data.note);
      if (data.competitionCategoryId !== undefined) formData.append('competitionCategoryId', data.competitionCategoryId || '');
      if (data.subCategoryId !== undefined) formData.append('subCategoryId', data.subCategoryId || '');
      if (data.subCompetitionName !== undefined) formData.append('subCompetitionName', data.subCompetitionName || '');
      if (data.participationType) formData.append('participationType', data.participationType);
      if (data.teamId !== undefined) formData.append('teamId', data.teamId || '');
      if (Array.isArray(data.participantUserIds)) {
        formData.append('participantUserIds', JSON.stringify(data.participantUserIds));
      }
      if (Array.isArray(data.replaceEvidenceIds) && data.replaceEvidenceIds.length > 0) {
        formData.append('replaceEvidenceIds', JSON.stringify(data.replaceEvidenceIds));
      }
      for (const f of files || []) {
        formData.append('evidence', f);
      }
      const res = await apiFetch<any>(`/me/achievements/${encodedId}/revisions`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: formData,
      });
      return mapBackendAchievementToFrontend(res);
    }

    const res = await apiFetch<any>(`/me/achievements/${encodedId}/revisions`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(data),
    });
    return mapBackendAchievementToFrontend(res);
  },

  cancel: async (id: string): Promise<Achievement> => {
    const res = await apiFetch<any>(`/me/achievements/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    });
    return mapBackendAchievementToFrontend(res);
  },

  verify: async (
    id: string,
    statusOrAction: any,
    catatan?: string,
    version?: number,
    options?: { overridePoints?: number; overrideReason?: string; idempotencyKey?: string }
  ): Promise<Achievement> => {
    let action = statusOrAction;
    if (statusOrAction === 'disetujui') action = 'approve';
    else if (statusOrAction === 'perlu_perbaikan') action = 'request_changes';
    else if (statusOrAction === 'ditolak') action = 'reject';

    const idemKey = options?.idempotencyKey || generateIdempotencyKey(`ach-dec-${id}`);
    const res = await apiFetch<any>(`/admin/achievements/${encodeURIComponent(id)}/decisions`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idemKey },
      body: JSON.stringify({
        action,
        reason: catatan,
        version,
        overridePoints: options?.overridePoints,
        overrideReason: options?.overrideReason,
        idempotencyKey: idemKey,
      }),
    });
    return mapBackendAchievementToFrontend(res);
  },

  correct: async (id: string, reason: string, version?: number, targetStatus?: string): Promise<Achievement> => {
    const idemKey = generateIdempotencyKey(`ach-cor-${id}`);
    const res = await apiFetch<any>(`/admin/achievements/${encodeURIComponent(id)}/corrections`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idemKey },
      body: JSON.stringify({ reason, version, targetStatus }),
    });
    return mapBackendAchievementToFrontend(res);
  },

  getEvidenceDownloadUrl: (evidenceId: string): string => {
    return `${API_BASE_URL}/evidence/${encodeURIComponent(evidenceId)}/download`;
  },

  getCompetitionCategories: () => apiFetch('/competition-categories'),
  getCompetitionPointConfig: (slug: string) =>
    apiFetch(`/competitions/${encodeURIComponent(slug)}/point-rules`),

  getRanking: async (periodId?: string): Promise<RankingResponse> => {
    return apiFetch<RankingResponse>(
      `/ranking${periodId ? `?periodId=${encodeURIComponent(periodId)}` : ''}`
    );
  },

  getLifetimeRanking: async (): Promise<RankingResponse> => {
    return apiFetch<RankingResponse>('/ranking/lifetime');
  },
};

export const consultantApiService: IConsultantService = {
  getByCompetition: async (slug: string): Promise<Consultant[]> => {
    const res = await apiFetch<any[]>(`/consultants?slug=${encodeURIComponent(slug)}`);
    return Array.isArray(res) ? res.map(mapBackendConsultantToFrontend) : [];
  },
};

export const validatorContentApiService: IValidatorContentService = {
  getCompetitions: () => apiFetch<ValidatorCompetitionItem[]>('/admin/competitions'),
  getCompetitionById: (id) => apiFetch<ValidatorCompetitionItem>(`/admin/competitions/${id}`),
  createCompetition: (data) =>
    apiFetch<ValidatorCompetitionItem>('/admin/competitions', { method: 'POST', body: JSON.stringify(data) }),
  updateCompetition: (id, data) =>
    apiFetch<ValidatorCompetitionItem>(`/admin/competitions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  setCompetitionStatus: (id, status) =>
    apiFetch<ValidatorCompetitionItem>(`/admin/competitions/${id}/${status === 'published' ? 'publish' : 'archive'}`, { method: 'POST' }),
  getCompetitionDeletePreview: (id) =>
    apiFetch(`/admin/competitions/${id}/delete-preview`),
  deleteCompetition: (id) =>
    apiFetch(`/admin/competitions/${id}`, { method: 'DELETE' }),
  getRoadmap: (competitionSlug) =>
    apiFetch<ValidatorRoadmapDetail>(`/admin/roadmaps/${competitionSlug}`),
  saveRoadmap: (competitionSlug, phases) =>
    apiFetch(`/admin/roadmaps/${competitionSlug}`, { method: 'POST', body: JSON.stringify({ phases }) }),
  getConsultants: () => apiFetch<ValidatorConsultantItem[]>('/admin/consultants'),
  createConsultant: (data) =>
    apiFetch<ValidatorConsultantItem>('/admin/consultants', { method: 'POST', body: JSON.stringify(data) }),
  updateConsultant: (id, data) =>
    apiFetch<ValidatorConsultantItem>(`/admin/consultants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteConsultant: async (id) => {
    await apiFetch(`/admin/consultants/${id}`, { method: 'DELETE' });
  },
  getCompetitionParticipants: (competitionId) =>
    apiFetch<CompetitionParticipantOption>(`/admin/competitions/${competitionId}/participants`),
  getSelections: () => apiFetch('/admin/selections'),
  saveSelection: (data) => apiFetch('/admin/selections', { method: 'POST', body: JSON.stringify(data) }),
  getCompetitionCategories: () => apiFetch('/admin/competition-categories'),
  createCompetitionCategory: (data) =>
    apiFetch('/admin/competition-categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCompetitionCategory: (id, data) =>
    apiFetch(`/admin/competition-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createCompetitionSubCategory: (data) =>
    apiFetch('/admin/competition-subcategories', { method: 'POST', body: JSON.stringify(data) }),
  updateCompetitionSubCategory: (id, data) =>
    apiFetch(`/admin/competition-subcategories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getCompetitionPointConfig: (competitionId) =>
    apiFetch(`/admin/competitions/${competitionId}/point-rules`),
  saveCompetitionPointConfig: (competitionId, data) =>
    apiFetch(`/admin/competitions/${competitionId}/point-rules`, { method: 'PUT', body: JSON.stringify(data) }),
  getPointTemplates: () => apiFetch<PointTemplateItem[]>('/system/point-templates').catch(() => []),
};

export const statsApiService: IStatsService = {
  getAdminStats: async (): Promise<any> => {
    const raw = await apiFetch<any>('/stats/admin');
    const queue = raw?.queue || {};
    const teams = raw?.teams || {};
    const users = raw?.users || {};
    const totalPengajuan =
      (queue.pendingVerifications || 0) +
      (queue.revisionNeededCount || 0) +
      (queue.approvedCount || 0) +
      (queue.rejectedCount || 0);

    return {
      totalMahasiswa: users.totalStudents || 0,
      pesertaPerKompetisi: raw?.distribution?.participantsByCompetition || {},
      totalTimTerbentuk: teams.terbentuk || 0,
      pengajuanPrestasi: {
        total: totalPengajuan,
        menunggu: queue.pendingVerifications || 0,
        perluPerbaikan: queue.revisionNeededCount || 0,
        disetujui: queue.approvedCount || 0,
        ditolak: queue.rejectedCount || 0,
      },
      delegasiTerkonfirmasi: raw?.selections?.confirmedPassed ?? 0,
    };
  },
};

export const systemApiService: ISystemService = {
  getUsers: (params) => {
    const qs = new URLSearchParams();
    if (params?.role) qs.set('role', params.role);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{ users: any[]; total: number; page: number; totalPages: number }>(`/system/users${query}`);
  },
  updateUserStatus: (userId, status) => {
    return apiFetch(`/system/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  createStaff: (data) => {
    return apiFetch('/system/users/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateUserName: (userId, fullName) => {
    return apiFetch(`/system/users/${userId}/name`, {
      method: 'PATCH',
      body: JSON.stringify({ fullName }),
    });
  },
  updateStaffRole: (userId, role) => {
    return apiFetch(`/system/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
  getAcademicPeriods: () => {
    return apiFetch<AcademicPeriodItem[]>('/system/academic-periods');
  },
  createAcademicPeriod: (data) => {
    return apiFetch<AcademicPeriodItem>('/system/academic-periods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getAcademicPeriodPreview: (id) => {
    return apiFetch<AcademicPeriodActivationPreview>(`/system/academic-periods/${id}/activation-preview`);
  },
  activateAcademicPeriod: (id, archiveOldTargets = true) => {
    return apiFetch<AcademicPeriodItem>(`/system/academic-periods/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify({ archiveOldTargets }),
    });
  },
  getPointRules: () => {
    return apiFetch<{ activeVersion: number | null; activeRules: PointRuleItem[]; versions: any[] }>('/system/point-rules');
  },
  createPointRuleVersion: (rules) => {
    return apiFetch('/system/point-rules/version', {
      method: 'POST',
      body: JSON.stringify({ rules }),
    });
  },
  getPointTemplates: () => apiFetch<PointTemplateItem[]>('/system/point-templates'),
  createPointTemplate: (data) =>
    apiFetch<PointTemplateItem>('/system/point-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  activatePointTemplate: (id) =>
    apiFetch<PointTemplateItem>(`/system/point-templates/${id}/activate`, {
      method: 'POST',
    }),
  getAuditLogs: (params) => {
    const qs = new URLSearchParams();
    if (params?.action) qs.set('action', params.action);
    if (params?.actorId) qs.set('actorId', params.actorId);
    if (params?.targetType) qs.set('targetType', params.targetType);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{ logs: AuditLogItem[]; total: number; page: number; totalPages: number }>(`/system/audit-logs${query}`);
  },
  getHealth: () => {
    return apiFetch<SystemHealthSummary>('/system/health');
  },
};

export const dashboardApiService: IDashboardService = {
  getStudentDashboard: () => apiFetch<StudentDashboardData>('/me/dashboard'),
  getAdminDashboard: () => apiFetch<any>('/admin/dashboard'),
  downloadAchievementsCsv: async (filters): Promise<void> => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.academicPeriodId) params.set('academicPeriodId', filters.academicPeriodId);
    if (filters?.category) params.set('category', filters.category);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 60_000);
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/admin/export${qs}`, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new ApiRequestError(408, {
          code: 'REQUEST_TIMEOUT',
          message: 'Pengunduhan CSV melebihi batas waktu. Silakan coba lagi.',
        });
      }
      throw new ApiRequestError(0, {
        code: 'NETWORK_ERROR',
        message: 'Tidak dapat terhubung ke server saat mengunduh CSV.',
      });
    } finally {
      window.clearTimeout(timer);
    }

    if (!res.ok) {
      if (res.status === 401) {
        unauthorizedHandler?.();
      }
      const errBody = await res.json().catch(() => null);
      if (res.status === 429) {
        const retrySec = parseRetryAfterSeconds(res, errBody);
        throw new ApiRequestError(429, {
          code: 'RATE_LIMITED',
          message: retrySec
            ? `Terlalu banyak permintaan ekspor CSV. Coba lagi dalam ${retrySec} detik.`
            : 'Terlalu banyak permintaan ekspor CSV. Silakan tunggu sebentar.',
          retryAfterSeconds: retrySec,
        });
      }
      throw new ApiRequestError(res.status, {
        code: errBody?.error?.code || 'CSV_EXPORT_ERROR',
        message: errBody?.error?.message || `Gagal mengunduh CSV (status ${res.status}).`,
      });
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-prestasi-talenta-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
