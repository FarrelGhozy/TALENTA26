import competitionsData from '../../mocks/competitions.json';
import { Competition } from '../../types';
import { getItem, setItem } from '../../lib/storage';
import { ICompetitionService } from '../types';

const STORAGE_KEY = 'talenta-competitions-v3';

function getStoredCompetitions(): Competition[] {
  return getItem<Competition[]>(STORAGE_KEY, competitionsData as Competition[]);
}

export const competitionMockService: ICompetitionService = {
  async getAll(): Promise<Competition[]> {
    return getStoredCompetitions();
  },

  async getBySlug(slug: string): Promise<Competition | null> {
    const list = getStoredCompetitions();
    return list.find((c) => c.slug === slug) || null;
  },

  async save(competition: Competition): Promise<void> {
    const list = getStoredCompetitions();
    const idx = list.findIndex((c) => c.slug === competition.slug);
    if (idx >= 0) {
      list[idx] = competition;
    } else {
      list.push(competition);
    }
    setItem(STORAGE_KEY, list);
  },
};
