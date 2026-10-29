import roadmapsData from '../../mocks/roadmaps.json';
import { Roadmap } from '../../types';
import { getItem, setItem } from '../../lib/storage';
import { IRoadmapService } from '../types';

export const roadmapMockService: IRoadmapService = {
  async getByCompetition(slug: string): Promise<Roadmap | null> {
    const list = roadmapsData as Roadmap[];
    return list.find((r) => r.competitionSlug === slug) || null;
  },

  async getChecklist(userId: string, slug: string): Promise<Record<string, boolean>> {
    const key = `talenta-checklist:${userId}:${slug}`;
    return getItem<Record<string, boolean>>(key, {});
  },

  async toggleChecklist(userId: string, slug: string, taskId: string): Promise<Record<string, boolean>> {
    const key = `talenta-checklist:${userId}:${slug}`;
    const current = getItem<Record<string, boolean>>(key, {});
    current[taskId] = !current[taskId];
    setItem(key, current);
    return current;
  },
};
