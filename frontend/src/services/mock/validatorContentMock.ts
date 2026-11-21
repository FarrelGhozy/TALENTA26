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
  async saveRoadmap() { return { ok: true }; },
  async createConsultant() { return { ok: true }; },
  async getSelections() { return []; },
  async saveSelection() { return { ok: true }; },
};
