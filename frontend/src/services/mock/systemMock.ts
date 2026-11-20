import {
  AcademicPeriodItem,
  AuditLogItem,
  ISystemService,
  PointRuleItem,
  SystemHealthSummary,
} from '../types';

let mockUsers = [
  {
    id: 'u-admin-1',
    email: 'admin@unida.gontor.ac.id',
    role: 'super_admin',
    status: 'active',
    createdAt: new Date().toISOString(),
    studentProfile: null,
  },
  {
    id: 'u-val-1',
    email: 'validator@unida.gontor.ac.id',
    role: 'validator',
    status: 'active',
    createdAt: new Date().toISOString(),
    studentProfile: null,
  },
  {
    id: 'u-mhs-1',
    email: 'andi@mhs.unida.gontor.ac.id',
    role: 'mahasiswa',
    status: 'active',
    createdAt: new Date().toISOString(),
    studentProfile: {
      nim: '432026101',
      fullName: 'Andi Pratama',
      studyProgram: 'Teknik Informatika',
      faculty: 'Sains dan Teknologi',
      phone: '081234567890',
    },
  },
];

let mockPeriods: AcademicPeriodItem[] = [
  {
    id: 'p-2026-ganjil',
    name: 'Tahun Akademik 2026/2027 Ganjil',
    year: 2026,
    semester: 'ganjil',
    isActive: true,
    createdAt: new Date().toISOString(),
    _count: {
      competitions: 4,
      achievements: 12,
    },
  },
  {
    id: 'p-2025-genap',
    name: 'Tahun Akademik 2025/2026 Genap',
    year: 2025,
    semester: 'genap',
    isActive: false,
    createdAt: new Date().toISOString(),
    _count: {
      competitions: 3,
      achievements: 8,
    },
  },
];

let mockRules: PointRuleItem[] = [
  { level: 'lokal', result: 'juara_1', points: 8, version: 1, isActive: true },
  { level: 'nasional', result: 'juara_1', points: 18, version: 1, isActive: true },
  { level: 'nasional', result: 'juara_2', points: 14, version: 1, isActive: true },
  { level: 'internasional', result: 'juara_1', points: 30, version: 1, isActive: true },
];

let mockAuditLogs: AuditLogItem[] = [
  {
    id: 'aud-1',
    action: 'ACADEMIC_PERIOD_ACTIVATED',
    targetType: 'AcademicPeriod',
    targetId: 'p-2026-ganjil',
    createdAt: new Date().toISOString(),
    actor: {
      id: 'u-admin-1',
      email: 'admin@unida.gontor.ac.id',
      role: 'super_admin',
    },
    metadata: { name: 'Tahun Akademik 2026/2027 Ganjil' },
  },
];

export const systemMockService: ISystemService = {
  getUsers: async (params) => {
    let list = [...mockUsers];
    if (params?.role && params.role !== 'semua') {
      list = list.filter((u) => u.role === params.role);
    }
    if (params?.status && params.status !== 'semua') {
      list = list.filter((u) => u.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.studentProfile?.fullName.toLowerCase().includes(q) ||
          u.studentProfile?.nim.toLowerCase().includes(q)
      );
    }
    return {
      users: list,
      total: list.length,
      page: 1,
      totalPages: 1,
    };
  },

  updateUserStatus: async (userId, status) => {
    const user = mockUsers.find((u) => u.id === userId);
    if (user) {
      user.status = status;
    }
    return user;
  },

  createStaff: async (data) => {
    const newUser = {
      id: `u-staff-${Date.now()}`,
      email: data.email,
      role: data.role,
      status: 'active',
      createdAt: new Date().toISOString(),
      studentProfile: null,
    };
    mockUsers.unshift(newUser);
    return newUser;
  },

  updateStaffRole: async (userId, role) => {
    const user = mockUsers.find((u) => u.id === userId);
    if (user) {
      user.role = role;
    }
    return user;
  },

  getAcademicPeriods: async () => {
    return [...mockPeriods];
  },

  createAcademicPeriod: async (data) => {
    const newPeriod: AcademicPeriodItem = {
      id: `p-${Date.now()}`,
      name: data.name,
      year: data.year,
      semester: data.semester,
      isActive: false,
      createdAt: new Date().toISOString(),
      _count: { competitions: 0, achievements: 0 },
    };
    mockPeriods.unshift(newPeriod);
    return newPeriod;
  },

  activateAcademicPeriod: async (id) => {
    mockPeriods = mockPeriods.map((p) => ({
      ...p,
      isActive: p.id === id,
    }));
    const target = mockPeriods.find((p) => p.id === id);
    if (!target) throw new Error('Periode tidak ditemukan');
    return target;
  },

  getPointRules: async () => {
    return {
      activeVersion: 1,
      activeRules: mockRules,
      versions: [
        {
          version: 1,
          isActive: true,
          rulesCount: mockRules.length,
          rules: mockRules,
        },
      ],
    };
  },

  createPointRuleVersion: async (rules) => {
    const nextVer = 2;
    mockRules = rules.map((r) => ({ ...r, version: nextVer, isActive: true }));
    return { version: nextVer, rules: mockRules };
  },

  getAuditLogs: async () => {
    return {
      logs: mockAuditLogs,
      total: mockAuditLogs.length,
      page: 1,
      totalPages: 1,
    };
  },

  getHealth: async (): Promise<SystemHealthSummary> => {
    return {
      status: 'healthy',
      database: {
        status: 'connected',
        type: 'MySQL (Simulasi Demo)',
      },
      storage: {
        status: 'connected',
        type: 'RustFS S3 (Simulasi Demo)',
      },
      system: {
        uptimeSeconds: 86400,
        memory: {
          heapUsedMb: 45.2,
          heapTotalMb: 92.1,
          rssMb: 120.4,
        },
      },
      metrics: {
        totalUsers: mockUsers.length,
        pendingVerifications: 2,
        auditLogsCount: mockAuditLogs.length,
      },
    };
  },
};
