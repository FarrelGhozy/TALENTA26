import {
  Achievement,
  Competition,
  Consultant,
  Invite,
  MatchCandidate,
  Profile,
  RankingResponse,
  Roadmap,
  Team,
  User,
} from '../types';

export interface ICompetitionService {
  getAll(): Promise<Competition[]>;
  getBySlug(slug: string): Promise<Competition | null>;
  save(competition: Competition): Promise<void>;
}

export interface IUserService {
  getAll(): Promise<User[]>;
  getById(id: string): Promise<User | null>;
  getCurrentUser(): Promise<User>;
  updateProfile(userId: string, data: Partial<User>): Promise<User>;
  getProfile(userId: string): Promise<Profile | null>;
  setTargetCompetition(userId: string, slug: string): Promise<Profile>;
  login?(email: string, pass: string): Promise<{ user: User; token: string }>;
  register?(data: any): Promise<{ user: User; token: string }>;
  logout?(): Promise<void>;
  forgotPassword?(email: string): Promise<{ message: string }>;
  resetPassword?(token: string, pass: string): Promise<{ message: string }>;
}

export interface IMatchingService {
  getMatchCandidates(userId: string): Promise<MatchCandidate[]>;
  getInvites(userId: string): Promise<Invite[]>;
  sendInvite(dari: string, ke: string, teamId: string): Promise<Invite>;
  respondInvite(inviteId: string, status: 'diterima' | 'ditolak'): Promise<void>;
  cancelInvite?(inviteId: string): Promise<void>;
}

export interface ITeamService {
  getTeamByUserId(userId: string): Promise<Team | null>;
  leaveTeam(userId: string, teamId: string): Promise<void>;
  createTeam(competitionSlug: string, creatorId: string, teamName: string): Promise<Team>;
}

export interface IRoadmapService {
  getByCompetition(slug: string): Promise<Roadmap | null>;
  getChecklist(userId: string, slug: string): Promise<Record<string, boolean>>;
  toggleChecklist(userId: string, slug: string, taskId: string): Promise<Record<string, boolean>>;
}

export interface IAchievementService {
  getAll(userId?: string, status?: string): Promise<Achievement[]>;
  getById(id: string): Promise<Achievement | null>;
  create(data: any, files?: File[]): Promise<Achievement>;
  submitRevision?(id: string, data: any, files?: File[]): Promise<Achievement>;
  cancel?(id: string): Promise<Achievement>;
  verify(id: string, statusOrAction: any, catatan?: string, version?: number): Promise<Achievement>;
  correct?(id: string, reason: string, version?: number, targetStatus?: string): Promise<Achievement>;
  getEvidenceDownloadUrl?(evidenceId: string): string;
  getRanking?(periodId?: string): Promise<RankingResponse>;
  getLifetimeRanking?(): Promise<RankingResponse>;
}

export interface IConsultantService {
  getByCompetition(slug: string): Promise<Consultant[]>;
}

export interface ValidatorCompetitionItem {
  id: string;
  slug: string;
  name: string;
  organizer: string;
  category: string;
  level: string;
  format: 'individu' | 'beregu';
  minTeamMembers: number;
  maxTeamMembers: number;
  description: string;
  status: 'draft' | 'published' | 'archived';
}

export interface IValidatorContentService {
  getCompetitions(): Promise<ValidatorCompetitionItem[]>;
  createCompetition(data: Omit<ValidatorCompetitionItem, 'id' | 'slug' | 'status'>): Promise<ValidatorCompetitionItem>;
  setCompetitionStatus(id: string, status: 'published' | 'archived'): Promise<ValidatorCompetitionItem>;
  saveRoadmap(competitionSlug: string, phases: Array<{
    orderIndex: number;
    title: string;
    description?: string;
    targetDays?: number;
    tasks: Array<{ orderIndex: number; title: string; description?: string; isRequired?: boolean }>;
  }>): Promise<unknown>;
  createConsultant(data: {
    competitionSlug: string;
    name: string;
    field: string;
    whatsappNumber: string;
    capacityNote?: string;
  }): Promise<unknown>;
  getSelections(): Promise<Array<{ id: string; stage: string; result: string; organizerVerified: boolean; competition?: { name: string }; team?: { name: string } }>>;
  saveSelection(data: { competitionId: string; teamId: string; stage: string; result: 'menunggu' | 'lolos' | 'tidak'; organizerVerified: boolean }): Promise<unknown>;
}

export interface AdminStats {
  totalMahasiswa: number;
  pesertaPerKompetisi: Record<string, number>;
  totalTimTerbentuk: number;
  pengajuanPrestasi: {
    total: number;
    menunggu: number;
    perluPerbaikan: number;
    disetujui: number;
    ditolak: number;
  };
  delegasiTerkonfirmasi: number;
}

export interface IStatsService {
  getAdminStats(): Promise<AdminStats>;
}

export interface AcademicPeriodItem {
  id: string;
  name: string;
  year: number;
  semester: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    competitions: number;
    achievements: number;
  };
}

export interface PointRuleItem {
  id?: string;
  level: 'lokal' | 'nasional' | 'internasional';
  result: 'partisipasi' | 'finalis' | 'juara_3' | 'juara_2' | 'juara_1' | 'penghargaan_khusus';
  points: number;
  version?: number;
  isActive?: boolean;
}

export interface AuditLogItem {
  id: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: any;
  createdAt: string;
  actor?: {
    id: string;
    email: string;
    role: string;
    studentProfile?: {
      fullName: string;
    } | null;
  } | null;
}

export interface SystemHealthSummary {
  status: 'healthy' | 'degraded';
  database: {
    status: string;
    type: string;
  };
  storage: {
    status: string;
    type: string;
  };
  system: {
    uptimeSeconds: number;
    memory: {
      heapUsedMb: number;
      heapTotalMb: number;
      rssMb: number;
    };
  };
  metrics: {
    totalUsers: number;
    pendingVerifications: number;
    auditLogsCount: number;
  };
}

export interface ISystemService {
  getUsers(params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }): Promise<{
    users: any[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  updateUserStatus(userId: string, status: 'active' | 'suspended' | 'pending_verification'): Promise<any>;
  createStaff(data: { email: string; password: string; role: 'validator' | 'super_admin' }): Promise<any>;
  updateStaffRole(userId: string, role: 'validator' | 'super_admin'): Promise<any>;
  getAcademicPeriods(): Promise<AcademicPeriodItem[]>;
  createAcademicPeriod(data: { name: string; year: number; semester: 'ganjil' | 'genap' }): Promise<AcademicPeriodItem>;
  activateAcademicPeriod(id: string): Promise<AcademicPeriodItem>;
  getPointRules(): Promise<{ activeVersion: number | null; activeRules: PointRuleItem[]; versions: any[] }>;
  createPointRuleVersion(rules: PointRuleItem[]): Promise<any>;
  getAuditLogs(params?: { action?: string; actorId?: string; targetType?: string; page?: number; limit?: number }): Promise<{
    logs: AuditLogItem[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  getHealth(): Promise<SystemHealthSummary>;
}

export interface StudentDashboardData {
  profile: {
    completionPercentage: number;
    nim: string | null;
    fullName: string | null;
    studyProgram: string | null;
    faculty: string | null;
  };
  targetCompetition: any;
  activeTeam: any;
  roadmapProgress: {
    roadmapId: string;
    version: number;
    totalTasks: number;
    completedTasks: number;
    percentage: number;
  } | null;
  submissions: {
    total: number;
    menunggu: number;
    perlu_perbaikan: number;
    disetujui: number;
    ditolak: number;
    draft: number;
  };
  points: {
    currentPeriod: string;
    totalPoints: number;
  };
  actionableSteps: Array<{
    id: string;
    title: string;
    description: string;
    actionUrl: string;
    isCompleted: boolean;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface IDashboardService {
  getStudentDashboard(): Promise<StudentDashboardData>;
  getAdminDashboard(): Promise<any>;
  downloadAchievementsCsv(filters?: { status?: string; academicPeriodId?: string; category?: string }): Promise<void>;
}
