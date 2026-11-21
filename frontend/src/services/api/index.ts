import { API_BASE_URL } from '../../config/env';
import type {
  Achievement,
  AchievementProof,
  Competition,
  Consultant,
  Invite,
  MatchCandidate,
  Profile,
  RankingResponse,
  Role,
  Team,
  User,
} from '../../types';
import {
  AcademicPeriodItem,
  AuditLogItem,
  IAchievementService,
  ICompetitionService,
  IConsultantService,
  IDashboardService,
  IMatchingService,
  IRoadmapService,
  IStatsService,
  ISystemService,
  ITeamService,
  IValidatorContentService,
  IUserService,
  PointRuleItem,
  StudentDashboardData,
  SystemHealthSummary,
} from '../types';

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
}

export class ApiRequestError extends Error {
  public code: string;
  public fieldErrors?: Record<string, string>;
  public status: number;

  constructor(status: number, error: ApiError) {
    super(error.message || `API Error ${status}`);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = error.code || 'UNKNOWN_ERROR';
    this.fieldErrors = error.fieldErrors;
  }
}

// Helper fetcher terpadu dengan standar docs/16
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const apiError: ApiError = body?.error || {
      code: 'HTTP_ERROR',
      message: body?.message || `API error ${res.status}: ${res.statusText}`,
    };
    throw new ApiRequestError(res.status, apiError);
  }

  return body?.data !== undefined ? body.data : body;
}

function mapBackendUserToFrontend(raw: any): User {
  const role = (raw.role || 'mahasiswa') as Role;
  const profile = raw.studentProfile;
  return {
    id: raw.id,
    institutionId: raw.institutionId || 'unida-gontor',
    nama: profile?.fullName || raw.fullName || raw.email?.split('@')[0] || 'Pengguna',
    email: raw.email || '',
    prodi: profile?.studyProgram || 'Teknik Informatika',
    angkatan: profile?.enrollmentYear,
    role: [role],
    skill: Array.isArray(profile?.skills) ? profile.skills : [],
    minat: Array.isArray(profile?.interests) ? profile.interests : [],
    ketersediaan: profile?.availability || { hari: ['Senin', 'Rabu'], jam: 4 },
    peranBisa: Array.isArray(profile?.rolesCapable) ? profile.rolesCapable : ['Anggota'],
  };
}

function mapBackendCompetitionToFrontend(raw: any): Competition {
  return {
    slug: raw.slug,
    institutionId: raw.institutionId || 'unida-gontor',
    namaResmi: raw.name || raw.namaResmi || '',
    kategori: raw.category || raw.kategori || '',
    tingkat: raw.level || raw.tingkat || '',
    deskripsi: raw.description || raw.deskripsi || '',
    syarat: Array.isArray(raw.requirements) ? raw.requirements : raw.syarat || [],
    komposisi: {
      min: raw.minTeamMembers ?? raw.komposisi?.min ?? 1,
      max: raw.maxTeamMembers ?? raw.komposisi?.max ?? 3,
      peranWajib: Array.isArray(raw.requiredRoles) ? raw.requiredRoles : raw.komposisi?.peranWajib || [],
    },
    tahapan: raw.tahapan || [],
    jadwal: Array.isArray(raw.scheduleTimeline) ? raw.scheduleTimeline : raw.jadwal || [],
    seleksiInternal: raw.seleksiInternal || [],
  };
}

function mapBackendCandidateToFrontend(c: any): MatchCandidate {
  return {
    user: {
      id: c.userId || c.user?.id || '',
      institutionId: 'unida-gontor',
      nama: c.nama || c.user?.nama || 'Mahasiswa',
      email: '', // Zero PII in matching
      prodi: c.prodi || c.user?.prodi || '',
      angkatan: c.enrollmentYear || c.user?.angkatan,
      role: ['mahasiswa'],
      skill: c.skill || c.user?.skill || [],
      minat: c.minat || c.user?.minat || [],
      ketersediaan: c.ketersediaan || c.user?.ketersediaan || { hari: ['Fleksibel'], jam: 4 },
      peranBisa: c.peranBisa || c.user?.peranBisa || ['Anggota'],
    },
    matchScore: c.skorKecocokan ?? c.matchScore ?? 50,
    reasons: c.alasanKecocokan || c.reasons || [],
    isOverlapTime: true,
  };
}

function mapBackendInviteToFrontend(inv: any): Invite {
  return {
    id: inv.id,
    institutionId: 'unida-gontor',
    dari: inv.senderId || inv.dari,
    ke: inv.receiverId || inv.ke,
    teamId: inv.teamId,
    status: inv.status,
    createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : '',
  };
}

function mapBackendTeamToFrontend(raw: any): Team | null {
  if (!raw) return null;
  return {
    id: raw.id,
    institutionId: raw.institutionId || 'unida-gontor',
    competitionSlug: raw.competition?.slug || raw.competitionSlug || '',
    nama: raw.name || raw.nama || '',
    anggota: (raw.members || raw.anggota || []).map((m: any) => ({
      userId: m.userId,
      status: m.status === 'active' || m.status === 'diterima' ? 'diterima' : 'diajukan',
    })),
    isFormed: raw.status === 'terbentuk' || raw.status === 'terkunci_seleksi',
    status: raw.status === 'terkunci_seleksi' ? 'terbentuk' : raw.status,
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
    const raw = await apiFetch<any>(`/competitions/${slug}`);
    return raw ? mapBackendCompetitionToFrontend(raw) : null;
  },
  save: (competition) => apiFetch('/competitions', { method: 'POST', body: JSON.stringify(competition) }),
};

export const userApiService: IUserService & {
  login?: (email: string, pass: string) => Promise<{ user: User; token: string }>;
  register?: (data: any) => Promise<{ user: User; token: string }>;
  logout?: () => Promise<void>;
  forgotPassword?: (email: string) => Promise<{ message: string }>;
  resetPassword?: (token: string, pass: string) => Promise<{ message: string }>;
} = {
  getAll: () => apiFetch('/users'),
  getById: (id) => apiFetch(`/users/${id}`),
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
    const res = await apiFetch<any>('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        fullName: data.nama,
        studyProgram: data.prodi,
        enrollmentYear: data.angkatan,
        skills: data.skill,
        interests: data.minat,
        availability: data.ketersediaan,
        rolesCapable: data.peranBisa,
      }),
    });
    return mapBackendUserToFrontend({
      id: res.userId || _userId,
      role: 'mahasiswa',
      studentProfile: res,
      email: data.email,
    });
  },
  getProfile: async (userId: string): Promise<Profile | null> => {
    try {
      const raw = await apiFetch<any>('/me/profile');
      if (!raw) return null;
      return {
        userId: raw.userId || userId,
        institutionId: 'unida-gontor',
        targetKompetisiSlug: raw.targetKompetisiSlug || '',
        kelengkapan: 100,
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
      kelengkapan: 100,
    };
  },
};

export const matchingApiService: IMatchingService = {
  getMatchCandidates: async (userId: string): Promise<MatchCandidate[]> => {
    const res = await apiFetch<any[]>(`/matching/candidates?userId=${userId}`);
    return Array.isArray(res) ? res.map(mapBackendCandidateToFrontend) : [];
  },
  getInvites: async (userId: string): Promise<Invite[]> => {
    const res = await apiFetch<any>(`/matching/invites?userId=${userId}`);
    if (Array.isArray(res)) {
      return res.map(mapBackendInviteToFrontend);
    }
    const incoming = Array.isArray(res?.incoming) ? res.incoming : [];
    const outgoing = Array.isArray(res?.outgoing) ? res.outgoing : [];
    return [...incoming, ...outgoing].map(mapBackendInviteToFrontend);
  },
  sendInvite: async (dari: string, ke: string, teamId: string): Promise<Invite> => {
    const res = await apiFetch<any>('/matching/invites', {
      method: 'POST',
      body: JSON.stringify({ dari, ke, teamId }),
    });
    return mapBackendInviteToFrontend(res);
  },
  respondInvite: async (inviteId: string, status: 'diterima' | 'ditolak'): Promise<void> => {
    await apiFetch(`/matching/invites/${inviteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

export const teamApiService: ITeamService = {
  getTeamByUserId: async (userId: string): Promise<Team | null> => {
    const raw = await apiFetch<any>(`/teams/my?userId=${userId}`);
    return mapBackendTeamToFrontend(raw);
  },
  leaveTeam: async (userId: string, teamId: string): Promise<void> => {
    await apiFetch(`/teams/${teamId}/leave`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },
  createTeam: async (competitionSlug: string, creatorId: string, teamName: string): Promise<Team> => {
    const raw = await apiFetch<any>('/teams', {
      method: 'POST',
      body: JSON.stringify({ competitionSlug, creatorId, teamName }),
    });
    return mapBackendTeamToFrontend(raw)!;
  },
};

export const roadmapApiService: IRoadmapService = {
  getByCompetition: async (slug: string) => {
    const raw = await apiFetch<any>(`/roadmaps/${slug}`);
    if (!raw) return null;
    return {
      competitionSlug: slug,
      institutionId: raw.institutionId || 'unida-gontor',
      fase: raw.fase || [],
    };
  },
  getChecklist: (userId, slug) => apiFetch(`/roadmaps/${slug}/checklist?userId=${userId}`),
  toggleChecklist: (userId, slug, taskId) =>
    apiFetch(`/roadmaps/${slug}/checklist`, { method: 'POST', body: JSON.stringify({ userId, taskId }) }),
};

function mapBackendAchievementToFrontend(raw: any): Achievement {
  const evidences: AchievementProof[] = Array.isArray(raw.evidences)
    ? raw.evidences.map((e: any) => ({
        id: e.id,
        nama: e.fileName || e.name || 'berkas.pdf',
        size: e.fileSize || e.size || 0,
        mimeType: e.mimeType,
        uploadedAt: e.uploadedAt,
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
    competitionSlug: raw.competition?.slug || raw.competitionSlug,
  };
}

export const achievementApiService: IAchievementService = {
  getAll: async (userId?: string, status?: string): Promise<Achievement[]> => {
    const endpoint = userId
      ? `/me/achievements${status && status !== 'semua' ? `?status=${status}` : ''}`
      : `/admin/achievements${status && status !== 'semua' ? `?status=${status}` : ''}`;
    try {
      const res = await apiFetch<any[]>(endpoint);
      return Array.isArray(res) ? res.map(mapBackendAchievementToFrontend) : [];
    } catch {
      const fallback = await apiFetch<any[]>(`/me/achievements${status && status !== 'semua' ? `?status=${status}` : ''}`);
      return Array.isArray(fallback) ? fallback.map(mapBackendAchievementToFrontend) : [];
    }
  },

  getById: async (id: string): Promise<Achievement | null> => {
    try {
      const res = await apiFetch<any>(`/admin/achievements/${id}`);
      return mapBackendAchievementToFrontend(res);
    } catch {
      const res = await apiFetch<any>(`/me/achievements/${id}`);
      return mapBackendAchievementToFrontend(res);
    }
  },

  create: async (data: any, files?: File[]): Promise<Achievement> => {
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append('nama', data.nama || data.name);
      formData.append('penyelenggara', data.penyelenggara || data.organizer);
      formData.append('kategori', data.kategori || data.category);
      formData.append('tingkat', data.tingkat || data.level);
      formData.append('jenisCapaian', data.jenisCapaian || data.result);
      formData.append('tanggal', data.tanggal || data.eventDate);
      if (data.deskripsi || data.description) formData.append('deskripsi', data.deskripsi || data.description);
      if (data.competitionSlug) formData.append('competitionSlug', data.competitionSlug);
      formData.append('dariSeleksiInternal', String(Boolean(data.dariSeleksiInternal)));
      for (const f of files) {
        formData.append('evidence', f);
      }
      const res = await apiFetch<any>('/me/achievements', {
        method: 'POST',
        body: formData,
      });
      return mapBackendAchievementToFrontend(res);
    }

    const res = await apiFetch<any>('/me/achievements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return mapBackendAchievementToFrontend(res);
  },

  submitRevision: async (id: string, data: any, files?: File[]): Promise<Achievement> => {
    if (files && files.length > 0) {
      const formData = new FormData();
      if (data.nama || data.name) formData.append('nama', data.nama || data.name);
      if (data.penyelenggara || data.organizer) formData.append('penyelenggara', data.penyelenggara || data.organizer);
      if (data.kategori || data.category) formData.append('kategori', data.kategori || data.category);
      if (data.tingkat || data.level) formData.append('tingkat', data.tingkat || data.level);
      if (data.jenisCapaian || data.result) formData.append('jenisCapaian', data.jenisCapaian || data.result);
      if (data.tanggal || data.eventDate) formData.append('tanggal', data.tanggal || data.eventDate);
      if (data.deskripsi || data.description) formData.append('deskripsi', data.deskripsi || data.description);
      if (data.catatan || data.note) formData.append('catatan', data.catatan || data.note);
      for (const f of files) {
        formData.append('evidence', f);
      }
      const res = await apiFetch<any>(`/me/achievements/${id}/revisions`, {
        method: 'POST',
        body: formData,
      });
      return mapBackendAchievementToFrontend(res);
    }

    const res = await apiFetch<any>(`/me/achievements/${id}/revisions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return mapBackendAchievementToFrontend(res);
  },

  verify: async (id: string, statusOrAction: any, catatan?: string, version?: number): Promise<Achievement> => {
    let action = statusOrAction;
    if (statusOrAction === 'disetujui') action = 'approve';
    else if (statusOrAction === 'perlu_perbaikan') action = 'request_changes';
    else if (statusOrAction === 'ditolak') action = 'reject';

    const res = await apiFetch<any>(`/admin/achievements/${id}/decisions`, {
      method: 'POST',
      body: JSON.stringify({ action, reason: catatan, version }),
    });
    return mapBackendAchievementToFrontend(res);
  },

  correct: async (id: string, reason: string, version?: number, targetStatus?: string): Promise<Achievement> => {
    const res = await apiFetch<any>(`/admin/achievements/${id}/corrections`, {
      method: 'POST',
      body: JSON.stringify({ reason, version, targetStatus }),
    });
    return mapBackendAchievementToFrontend(res);
  },

  getEvidenceDownloadUrl: (evidenceId: string): string => {
    return `${API_BASE_URL}/evidence/${evidenceId}/download`;
  },

  getRanking: async (periodId?: string): Promise<RankingResponse> => {
    return apiFetch<RankingResponse>(`/ranking${periodId ? `?periodId=${periodId}` : ''}`);
  },

  getLifetimeRanking: async (): Promise<RankingResponse> => {
    return apiFetch<RankingResponse>('/ranking/lifetime');
  },
};

export const consultantApiService: IConsultantService = {
  getByCompetition: async (slug: string): Promise<Consultant[]> => {
    const res = await apiFetch<any[]>(`/consultants?slug=${slug}`);
    return Array.isArray(res) ? res.map(mapBackendConsultantToFrontend) : [];
  },
};

export const validatorContentApiService: IValidatorContentService = {
  getCompetitions: () => apiFetch('/admin/competitions'),
  createCompetition: (data) =>
    apiFetch('/admin/competitions', { method: 'POST', body: JSON.stringify(data) }),
  setCompetitionStatus: (id, status) =>
    apiFetch(`/admin/competitions/${id}/${status === 'published' ? 'publish' : 'archive'}`, { method: 'POST' }),
  saveRoadmap: (competitionSlug, phases) =>
    apiFetch(`/admin/roadmaps/${competitionSlug}`, { method: 'POST', body: JSON.stringify({ phases }) }),
  createConsultant: (data) =>
    apiFetch('/admin/consultants', { method: 'POST', body: JSON.stringify(data) }),
  getSelections: () => apiFetch('/admin/selections'),
  saveSelection: (data) => apiFetch('/admin/selections', { method: 'POST', body: JSON.stringify(data) }),
};

export const statsApiService: IStatsService = {
  getAdminStats: () => apiFetch('/stats/admin'),
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
  activateAcademicPeriod: (id) => {
    return apiFetch<AcademicPeriodItem>(`/system/academic-periods/${id}/activate`, {
      method: 'POST',
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
    const res = await fetch(`${API_BASE_URL}/admin/export${qs}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Gagal mengunduh CSV: status ${res.status}`);
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
