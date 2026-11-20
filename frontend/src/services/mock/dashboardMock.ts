import { IDashboardService, StudentDashboardData } from '../types';

export const dashboardMockService: IDashboardService = {
  getStudentDashboard: async (): Promise<StudentDashboardData> => {
    return {
      profile: {
        completionPercentage: 90,
        nim: '432026101',
        fullName: 'Andi Pratama',
        studyProgram: 'Teknik Informatika',
        faculty: 'Sains dan Teknologi',
      },
      targetCompetition: {
        id: 'comp-gemastik',
        name: 'GEMASTIK XIX 2026',
        slug: 'gemastik-2026',
        category: 'kompetisi',
        level: 'nasional',
        format: 'beregu',
      },
      activeTeam: {
        id: 'team-garuda',
        name: 'Tim Garuda Cerdas',
        status: 'terbentuk',
      },
      roadmapProgress: {
        roadmapId: 'rm-gemastik',
        version: 1,
        totalTasks: 6,
        completedTasks: 4,
        percentage: 67,
      },
      submissions: {
        total: 2,
        menunggu: 1,
        perlu_perbaikan: 0,
        disetujui: 1,
        ditolak: 0,
        draft: 0,
      },
      points: {
        currentPeriod: 'Tahun Akademik 2026/2027 Ganjil',
        totalPoints: 18,
      },
      actionableSteps: [
        {
          id: 'complete-profile',
          title: 'Profil Mahasiswa Lengkap',
          description: 'Profil Anda telah terisi dengan baik.',
          actionUrl: '/profil',
          isCompleted: true,
          priority: 'low',
        },
        {
          id: 'complete-roadmap',
          title: 'Lanjutkan Roadmap Pembinaan',
          description: 'Anda telah menyelesaikan 4 dari 6 tugas pembinaan.',
          actionUrl: '/kompetisi/gemastik-2026/roadmap',
          isCompleted: false,
          priority: 'medium',
        },
      ],
    };
  },

  getAdminDashboard: async () => {
    return {
      queue: {
        pendingVerifications: 2,
        revisionNeededCount: 1,
        approvedCount: 8,
        rejectedCount: 1,
      },
      competitions: {
        published: 4,
        draft: 1,
      },
      teams: {
        terbentuk: 3,
        mencari: 2,
      },
      users: {
        totalStudents: 15,
        totalStaff: 3,
        approvedConsultants: 4,
      },
      distribution: {
        byCategory: { kompetisi: 6, konferensi: 2 },
        byLevel: { nasional: 5, lokal: 2, internasional: 1 },
      },
      upcomingDeadlines: [],
    };
  },

  downloadAchievementsCsv: async () => {
    const csvContent =
      '\uFEFF"ID","Nama Mahasiswa","NIM","Program Studi","Fakultas","Nama Capaian / Lomba","Penyelenggara","Kategori","Tingkat","Hasil Capaian","Tanggal Capaian","Periode Akademik","Status Pengajuan","Poin","Catatan Review"\r\n' +
      '"demo-1","Andi Pratama","432026101","Teknik Informatika","Sains dan Teknologi","Juara 1 GEMASTIK","Puspresnas","kompetisi","nasional","juara_1","2026-04-15","Tahun Akademik 2026/2027 Ganjil","disetujui","18",""';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
