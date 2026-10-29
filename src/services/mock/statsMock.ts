import usersData from '../../mocks/users.json';
import profilesData from '../../mocks/profiles.json';
import teamsData from '../../mocks/teams.json';
import selectionsData from '../../mocks/selections.json';
import { Achievement, Profile, Selection, Team, User } from '../../types';
import { getItem } from '../../lib/storage';
import { AdminStats, IStatsService } from '../types';
import achievementsData from '../../mocks/achievements.json';

export const statsMockService: IStatsService = {
  async getAdminStats(): Promise<AdminStats> {

    const users = getItem<User[]>('talenta-users', usersData as User[]);
    const profiles = getItem<Profile[]>('talenta-profiles', profilesData as Profile[]);
    const teams = getItem<Team[]>('talenta-teams', teamsData as Team[]);
    const achievements = getItem<Achievement[]>('talenta-achievements', achievementsData as Achievement[]);
    const selections = selectionsData as Selection[];

    const totalMahasiswa = users.filter((u) => u.role.includes('mahasiswa')).length;

    const pesertaPerKompetisi: Record<string, number> = {};
    profiles.forEach((p) => {
      pesertaPerKompetisi[p.targetKompetisiSlug] = (pesertaPerKompetisi[p.targetKompetisiSlug] || 0) + 1;
    });

    const totalTimTerbentuk = teams.filter((t) => t.isFormed && t.status === 'terbentuk').length;

    const pengajuanPrestasi = {
      total: achievements.length,
      menunggu: achievements.filter((a) => a.status === 'menunggu').length,
      perluPerbaikan: achievements.filter((a) => a.status === 'perlu_perbaikan').length,
      disetujui: achievements.filter((a) => a.status === 'disetujui').length,
      ditolak: achievements.filter((a) => a.status === 'ditolak').length,
    };

    const delegasiTerkonfirmasi = selections.filter((s) => s.hasil === 'lolos' && s.verifiedPanitia).length;

    return {
      totalMahasiswa,
      pesertaPerKompetisi,
      totalTimTerbentuk,
      pengajuanPrestasi,
      delegasiTerkonfirmasi,
    };
  },
};
