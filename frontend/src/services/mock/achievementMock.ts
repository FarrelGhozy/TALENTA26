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

  async getById(id: string, _scope?: 'student' | 'admin'): Promise<Achievement | null> {
    return getAchievements().find((a) => a.id === id) || null;
  },

  async create(data: Omit<Achievement, 'id' | 'status' | 'institutionId'>): Promise<Achievement> {
    const list = getAchievements();
    const newAchievement: Achievement = {
      ...data,
      id: `a-${Date.now()}`,
      institutionId: 'unida-gontor',
      status: 'menunggu', // Aturan wajib: pengajuan baru selalu berstatus menunggu verifikasi
    };
    list.unshift(newAchievement);
    setItem(ACHIEVEMENTS_KEY, list);
    return newAchievement;
  },

  async cancel(id: string): Promise<Achievement> {
    const list = getAchievements();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Data prestasi tidak ditemukan');
    list[idx] = { ...list[idx], status: 'dibatalkan', version: (list[idx].version || 1) + 1 };
    setItem(ACHIEVEMENTS_KEY, list);
    return list[idx];
  },

  async verify(id: string, status: Achievement['status'], catatan?: string): Promise<Achievement> {
    const list = getAchievements();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Data prestasi tidak ditemukan');

    list[idx] = {
      ...list[idx],
      status,
      catatan: catatan || list[idx].catatan,
      version: (list[idx].version || 1) + 1,
    };
    setItem(ACHIEVEMENTS_KEY, list);
    return list[idx];
  },

  async submitRevision(id: string, data: any, files?: File[]): Promise<Achievement> {
    const list = getAchievements();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Data prestasi tidak ditemukan');

    const newEvidence = files && files.length > 0
      ? files.map((f, i) => ({ id: `ev-mock-${Date.now()}-${i}`, nama: f.name, size: f.size }))
      : list[idx].bukti;

    list[idx] = {
      ...list[idx],
      ...data,
      bukti: newEvidence,
      status: 'menunggu',
      version: (list[idx].version || 1) + 1,
      catatan: undefined,
    };
    setItem(ACHIEVEMENTS_KEY, list);
    return list[idx];
  },

  async correct(id: string, reason: string): Promise<Achievement> {
    const list = getAchievements();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Data prestasi tidak ditemukan');

    list[idx] = {
      ...list[idx],
      status: 'perlu_perbaikan',
      catatan: `[KOREKSI] ${reason}`,
      version: (list[idx].version || 1) + 1,
    };
    setItem(ACHIEVEMENTS_KEY, list);
    return list[idx];
  },

  getEvidenceDownloadUrl(evidenceId: string): string {
    return `#download-mock-${evidenceId}`;
  },

  async getRanking() {
    return {
      period: {
        id: 'mock-period',
        name: 'Tahun Akademik 2025/2026 Ganjil',
        year: 2026,
        semester: 'ganjil',
      },
      ranking: [
        {
          rank: 1,
          userId: 'u-sim-1',
          fullName: 'Nabila Rahmawati',
          studyProgram: 'Farmasi',
          points: 52,
          approvedCount: 3,
          juara1Count: 2,
        },
        {
          rank: 2,
          userId: 'u-01',
          fullName: 'Ahmad Fauzan',
          studyProgram: 'Teknik Informatika',
          points: 48,
          approvedCount: 2,
          juara1Count: 2,
        },
        {
          rank: 3,
          userId: 'u-sim-3',
          fullName: 'Muhammad Raihan Pratama',
          studyProgram: 'Hubungan Internasional',
          points: 40,
          approvedCount: 2,
          juara1Count: 1,
        },
        {
          rank: 4,
          userId: 'u-02',
          fullName: 'Zaidan Ali',
          studyProgram: 'Teknik Informatika',
          points: 38,
          approvedCount: 2,
          juara1Count: 2,
        },
      ],
    };
  },

  async getLifetimeRanking() {
    return {
      period: {
        id: 'lifetime',
        name: 'Sepanjang Waktu (Lifetime)',
        year: 0,
        semester: 'all',
      },
      ranking: [
        {
          rank: 1,
          userId: 'u-sim-1',
          fullName: 'Nabila Rahmawati',
          studyProgram: 'Farmasi',
          points: 70,
          approvedCount: 4,
          juara1Count: 3,
        },
        {
          rank: 2,
          userId: 'u-sim-3',
          fullName: 'Muhammad Raihan Pratama',
          studyProgram: 'Hubungan Internasional',
          points: 70,
          approvedCount: 3,
          juara1Count: 2,
        },
        {
          rank: 3,
          userId: 'u-01',
          fullName: 'Ahmad Fauzan',
          studyProgram: 'Teknik Informatika',
          points: 62,
          approvedCount: 3,
          juara1Count: 2,
        },
        {
          rank: 4,
          userId: 'u-02',
          fullName: 'Zaidan Ali',
          studyProgram: 'Teknik Informatika',
          points: 48,
          approvedCount: 3,
          juara1Count: 2,
        },
      ],
    };
  },
};
