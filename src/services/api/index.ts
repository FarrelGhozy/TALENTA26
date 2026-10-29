import { API_BASE_URL } from '../../config/env';
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

// Helper fetcher
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('talenta-token');
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const competitionApiService: ICompetitionService = {
  getAll: () => apiFetch('/competitions'),
  getBySlug: (slug) => apiFetch(`/competitions/${slug}`),
  save: (competition) => apiFetch('/competitions', { method: 'POST', body: JSON.stringify(competition) }),
};

export const userApiService: IUserService = {
  getAll: () => apiFetch('/users'),
  getById: (id) => apiFetch(`/users/${id}`),
  getCurrentUser: () => apiFetch('/auth/me'),
  updateProfile: (userId, data) => apiFetch(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getProfile: (userId) => apiFetch(`/users/${userId}/profile`),
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
