import type { IValidatorContentService, ValidatorCompetitionItem } from '../types';

let competitions: ValidatorCompetitionItem[] = [];

export const validatorContentMockService: IValidatorContentService = {
  async getCompetitions() { return [...competitions]; },
  async createCompetition(data) {
    const item: ValidatorCompetitionItem = {
      ...data,
      id: `demo-${Date.now()}`,
      slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      status: 'draft',
    };
    competitions = [item, ...competitions];
    return item;
  },
  async setCompetitionStatus(id, status) {
    competitions = competitions.map((item) => (item.id === id ? { ...item, status } : item));
    const item = competitions.find((entry) => entry.id === id);
    if (!item) throw new Error('Kompetisi tidak ditemukan');
    return item;
  },
  async getCompetitionDeletePreview(id) {
    const item = competitions.find((entry) => entry.id === id);
    if (!item) throw new Error('Kompetisi tidak ditemukan');
    return {
      competition: {
        id: item.id,
        name: item.name,
        slug: item.slug,
        status: item.status,
      },
      counts: {
        targets: 0,
        activeTargets: 0,
        teams: 0,
        lockedSelectionTeams: 0,
        teamMembers: 0,
        teamJoinRequests: 0,
        teamInvites: 0,
        roadmaps: 0,
        roadmapPhases: 0,
        roadmapTasks: 0,
        roadmapProgress: 0,
        consultants: 0,
        selections: 0,
        customPointRules: 0,
        preservedAchievements: 0,
      },
      requiresTypedConfirmation: item.status === 'published',
    };
  },
  async deleteCompetition(id) {
    const item = competitions.find((entry) => entry.id === id);
    if (!item) throw new Error('Kompetisi tidak ditemukan');
    competitions = competitions.filter((entry) => entry.id !== id);
    return {
      deletedId: item.id,
      name: item.name,
      slug: item.slug,
      previousStatus: item.status,
      deletedSummary: {
        targets: 0,
        activeTargets: 0,
        teams: 0,
        lockedSelectionTeams: 0,
        teamMembers: 0,
        teamJoinRequests: 0,
        teamInvites: 0,
        roadmaps: 0,
        roadmapPhases: 0,
        roadmapTasks: 0,
        roadmapProgress: 0,
        consultants: 0,
        selections: 0,
        customPointRules: 0,
      },
      preservedAchievementsCount: 0,
    };
  },
  async saveRoadmap() { return { ok: true }; },
  async createConsultant(data) {
    return {
      id: `cons-${Date.now()}`,
      name: data.name,
      field: data.field,
      whatsappNumber: data.whatsappNumber,
      capacityNote: data.capacityNote || null,
      isApproved: data.isApproved ?? true,
      status: data.status ?? 'published',
    };
  },
  async getSelections() { return []; },
  async saveSelection() { return { ok: true }; },
};
