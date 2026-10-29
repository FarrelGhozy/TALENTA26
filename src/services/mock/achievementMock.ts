import achievementsData from '../../mocks/achievements.json';
import { Achievement } from '../../types';
import { getItem, setItem } from '../../lib/storage';
import { IAchievementService } from '../types';

const ACHIEVEMENTS_KEY = 'talenta-achievements';

function getAchievements(): Achievement[] {
  return getItem<Achievement[]>(ACHIEVEMENTS_KEY, achievementsData as Achievement[]);
}

export const achievementMockService: IAchievementService = {
  async getAll(userId?: string): Promise<Achievement[]> {
    const list = getAchievements();
    if (userId) {
      return list.filter((a) => a.userId === userId);
    }
    return list;
  },

  async getById(id: string): Promise<Achievement | null> {
    return getAchievements().find((a) => a.id === id) || null;
  },

  async create(data: Omit<Achievement, 'id' | 'status' | 'institutionId'>): Promise<Achievement> {
    const list = getAchievements();
    const newAchievement: Achievement = {
      ...data,
      id: `a-${Date.now()}`,
      institutionId: 'inst-01',
      status: 'menunggu', // Aturan wajib: pengajuan baru selalu berstatus menunggu verifikasi
    };
    list.unshift(newAchievement);
    setItem(ACHIEVEMENTS_KEY, list);
    return newAchievement;
  },

  async verify(id: string, status: Achievement['status'], catatan?: string): Promise<Achievement> {
    const list = getAchievements();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Data prestasi tidak ditemukan');

    list[idx] = {
      ...list[idx],
      status,
      catatan: catatan || list[idx].catatan,
    };
    setItem(ACHIEVEMENTS_KEY, list);
    return list[idx];
  },
};
