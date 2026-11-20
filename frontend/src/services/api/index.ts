import { API_BASE_URL } from '../../config/env';
import type { Role, User } from '../../types';
import {
  IAchievementService,
  ICompetitionService,
  IConsultantService,
  IMatchingService,
  IRoadmapService,
  IStatsService,
  ITeamService,
  IUserService,
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
  const token = localStorage.getItem('talenta-token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
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
    angkatan: 2026,
    role: [role],
    skill: [],
    minat: [],
    ketersediaan: { hari: ['Senin', 'Rabu'], jam: 4 },
    peranBisa: ['Anggota'],
  };
}

export const competitionApiService: ICompetitionService = {
  getAll: () => apiFetch('/competitions'),
  getBySlug: (slug) => apiFetch(`/competitions/${slug}`),
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
    if (res.token) {
      localStorage.setItem('talenta-token', res.token);
    }
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
    if (res.token) {
      localStorage.setItem('talenta-token', res.token);
    }
    return {
      user: mapBackendUserToFrontend(res.user),
      token: res.token,
    };
  },
  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('talenta-token');
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
      body: JSON.stringify(data),
    });
    return mapBackendUserToFrontend(res);
  },
  getProfile: () => apiFetch('/me/profile'),
  setTargetCompetition: (userId, slug) =>
    apiFetch(`/users/${userId}/target`, { method: 'POST', body: JSON.stringify({ slug }) }),
};

export const matchingApiService: IMatchingService = {
  getMatchCandidates: (userId) => apiFetch(`/matching/candidates?userId=${userId}`),
  getInvites: (userId) => apiFetch(`/matching/invites?userId=${userId}`),
  sendInvite: (dari, ke, teamId) =>
    apiFetch('/matching/invites', { method: 'POST', body: JSON.stringify({ dari, ke, teamId }) }),
  respondInvite: (inviteId, status) =>
    apiFetch(`/matching/invites/${inviteId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

export const teamApiService: ITeamService = {
  getTeamByUserId: (userId) => apiFetch(`/teams/my?userId=${userId}`),
  leaveTeam: (userId, teamId) =>
    apiFetch(`/teams/${teamId}/leave`, { method: 'POST', body: JSON.stringify({ userId }) }),
  createTeam: (competitionSlug, creatorId, teamName) =>
    apiFetch('/teams', { method: 'POST', body: JSON.stringify({ competitionSlug, creatorId, teamName }) }),
};

export const roadmapApiService: IRoadmapService = {
  getByCompetition: (slug) => apiFetch(`/roadmaps/${slug}`),
  getChecklist: (userId, slug) => apiFetch(`/roadmaps/${slug}/checklist?userId=${userId}`),
  toggleChecklist: (userId, slug, taskId) =>
    apiFetch(`/roadmaps/${slug}/checklist`, { method: 'POST', body: JSON.stringify({ userId, taskId }) }),
};

export const achievementApiService: IAchievementService = {
  getAll: (userId) => apiFetch(`/achievements${userId ? `?userId=${userId}` : ''}`),
  getById: (id) => apiFetch(`/achievements/${id}`),
  create: (data) => apiFetch('/achievements', { method: 'POST', body: JSON.stringify(data) }),
  verify: (id, status, catatan) =>
    apiFetch(`/achievements/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ status, catatan }) }),
};

export const consultantApiService: IConsultantService = {
  getByCompetition: (slug) => apiFetch(`/consultants?slug=${slug}`),
};

export const statsApiService: IStatsService = {
  getAdminStats: () => apiFetch('/stats/admin'),
};
