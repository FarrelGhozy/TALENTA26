import {
  Achievement,
  Competition,
  CompetitionCategoryItem,
  CompetitionPointRuleItem,
  Consultant,
  Profile,
  RankingResponse,
  Roadmap,
  StudentDirectoryItem,
  Team,
  TeamDirectoryItem,
  TeamJoinRequestItem,
  User,
} from '../types';

export interface ICompetitionService {
  getAll(): Promise<Competition[]>;
  getBySlug(slug: string): Promise<Competition | null>;
}

export interface IUserService {
  getAll(): Promise<User[]>;
  getById(id: string): Promise<User | null>;
  getCurrentUser(): Promise<User>;
  updateProfile(userId: string, data: Partial<User>): Promise<User>;
  uploadAvatar?(file: File): Promise<{ avatarUrl: string }>;
  deleteAvatar?(): Promise<void>;
  getProfile(userId: string): Promise<Profile | null>;
  setTargetCompetition(userId: string, slug: string): Promise<Profile>;
  getTargetHistory?(): Promise<Array<{ id: string; status: string; createdAt: string; competition: { id: string; slug: string; name: string }; academicPeriod?: { id: string; name: string } | null }>>;
  searchStudents?(q?: string): Promise<StudentDirectoryItem[]>;
  login?(email: string, pass: string): Promise<{ user: User; token: string }>;
  register?(data: any): Promise<{ user: User; token: string }>;
  logout?(): Promise<void>;
  forgotPassword?(email: string): Promise<{ message: string }>;
  resetPassword?(token: string, pass: string): Promise<{ message: string }>;
}

export interface CreateTeamOptions {
  description?: string;
  neededRoles?: string[];
  recruitmentType?: 'terbuka' | 'privat';
  targetMaxMembers?: number;
  roleInTeam?: string;
}

export interface UpdateTeamOptions {
  teamName?: string;
  description?: string | null;
  neededRoles?: string[];
  recruitmentType?: 'terbuka' | 'privat';
  isRecruiting?: boolean;
  targetMaxMembers?: number;
}

export interface TeamDirectoryResponse {
  competition: Competition | null;
  teams: TeamDirectoryItem[];
  myActiveTeamId: string | null;
}

export interface ITeamService {
  getTeamByUserId(userId: string): Promise<Team | null>;
  leaveTeam(userId: string, teamId: string): Promise<void>;
  createTeam(
    competitionSlug: string,
    creatorId: string,
    teamName: string,
    options?: CreateTeamOptions
  ): Promise<Team>;
  getDirectory?(filters?: { competitionSlug?: string; q?: string; role?: string }): Promise<TeamDirectoryResponse>;
  getMyJoinRequests?(): Promise<TeamJoinRequestItem[]>;
  updateTeam?(teamId: string, options: UpdateTeamOptions): Promise<Team>;
  rotateInviteCode?(teamId: string): Promise<{ inviteCode: string; inviteCodeUpdatedAt: string }>;
  requestJoin?(teamId: string, payload?: { preferredRole?: string; note?: string }): Promise<TeamJoinRequestItem>;
  cancelJoinRequest?(requestId: string): Promise<void>;
  decideJoinRequest?(requestId: string, action: 'disetujui' | 'ditolak'): Promise<{ message: string }>;
  joinByCode?(inviteCode: string): Promise<{ teamId: string; teamName: string; message: string }>;
  removeMember?(teamId: string, targetUserId: string): Promise<void>;
  registerSelection?(teamId: string): Promise<unknown>;
}

export interface IRoadmapService {
  getByCompetition(slug: string): Promise<Roadmap | null>;
  getChecklist(userId: string, slug: string): Promise<Record<string, boolean>>;
  toggleChecklist(userId: string, slug: string, taskId: string): Promise<Record<string, boolean>>;
}

export interface IAchievementService {
  getAll(userId?: string, status?: string): Promise<Achievement[]>;
  getById(id: string, scope?: 'student' | 'admin'): Promise<Achievement | null>;
  create(data: any, files?: File[]): Promise<Achievement>;
  submitRevision?(id: string, data: any, files?: File[]): Promise<Achievement>;
  cancel?(id: string): Promise<Achievement>;
  verify(
    id: string,
    statusOrAction: any,
    catatan?: string,
    version?: number,
    options?: { overridePoints?: number; overrideReason?: string; idempotencyKey?: string }
  ): Promise<Achievement>;
  correct?(id: string, reason: string, version?: number, targetStatus?: string): Promise<Achievement>;
  getEvidenceDownloadUrl?(evidenceId: string): string;
  getCompetitionCategories?(): Promise<CompetitionCategoryItem[]>;
  getCompetitionPointConfig?(slug: string): Promise<{
    competitionId: string;
    slug: string;
    name: string;
    pointDescription?: string | null;
    pointTemplate?: { id: string; name: string; version: number; rules?: PointRuleItem[] } | null;
    competitionCategory?: CompetitionCategoryItem | null;
    customRules: CompetitionPointRuleItem[];
  }>;
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
  registrationStatus?: 'buka' | 'tutup';
  internalSelectionDeadline?: string | null;
  requireRoles?: boolean;
  requireCrossStudyProgram?: boolean;
  singleTeamPerCompetition?: boolean;
  requiredRoles?: string[];
  requirements?: string[];
  scheduleTimeline?: Array<{ label: string; tanggal: string }>;
  description: string;
  sourceUrl?: string | null;
  competitionCategoryId?: string | null;
  pointTemplateId?: string | null;
  pointDescription?: string | null;
  status: 'draft' | 'published' | 'archived';
  createdAt?: string;
  updatedAt?: string;
  academicPeriod?: { id: string; name: string; year?: number; semester?: string } | null;
  competitionCategory?: { id: string; name: string; code: string } | null;
  pointTemplate?: { id: string; name: string; version: number } | null;
  roadmaps?: Array<{
    id: string;
    status: string;
    version?: number;
    _count?: { phases: number };
  }>;
  _count?: {
    competitionPointRules?: number;
    teams?: number;
    studentTargets?: number;
    consultantContacts?: number;
    selections?: number;
    roadmaps?: number;
  };
}

export interface ValidatorSelectionItem {
  id: string;
  stage: string;
  result: string;
  organizerVerified: boolean;
  notes?: string | null;
  confirmedAt?: string | null;
  updatedAt?: string;
  competitionId?: string;
  teamId?: string | null;
  userId?: string | null;
  competition?: { id: string; name: string; slug?: string; format?: string };
  team?: { id: string; name: string; status?: string } | null;
  user?: { id: string; fullName?: string | null; studentProfile?: { fullName: string; nim: string; studyProgram?: string } | null } | null;
  participant?: { id: string; fullName?: string | null; studentProfile?: { fullName: string; nim: string; studyProgram?: string } | null } | null;
}

export interface ValidatorRoadmapDetail {
  id?: string;
  competitionId: string;
  competitionSlug: string;
  competitionName: string;
  phases: Array<{
    id?: string;
    orderIndex: number;
    title: string;
    description?: string | null;
    targetDays?: number | null;
    tasks: Array<{
      id?: string;
      orderIndex: number;
      title: string;
      description?: string | null;
      isRequired?: boolean;
      resourceUrl?: string | null;
      resourceTitle?: string | null;
    }>;
  }>;
}

export interface ValidatorConsultantItem {
  id: string;
  name: string;
  field: string;
  whatsappNumber: string;
  capacityNote?: string | null;
  isApproved: boolean;
  status: 'draft' | 'published' | 'archived';
  competition?: { id: string; slug: string; name: string } | null;
}

export interface CompetitionParticipantOption {
  teams: Array<{ id: string; name: string; status: string; memberNames: string[] }>;
  individuals: Array<{ userId: string; fullName: string; nim: string; studyProgram: string }>;
}

export interface CompetitionDeletePreview {
  competition: {
    id: string;
    name: string;
    slug: string;
    status: 'draft' | 'published' | 'archived';
  };
  counts: {
    targets: number;
    activeTargets: number;
    teams: number;
    lockedSelectionTeams: number;
    teamMembers: number;
    teamJoinRequests: number;
    teamInvites: number;
    roadmaps: number;
    roadmapPhases: number;
    roadmapTasks: number;
    roadmapProgress: number;
    consultants: number;
    selections: number;
    customPointRules: number;
    preservedAchievements: number;
  };
  requiresTypedConfirmation: boolean;
}

export interface CompetitionDeleteResult {
  deletedId: string;
  name: string;
  slug: string;
  previousStatus: 'draft' | 'published' | 'archived';
  deletedSummary: Omit<CompetitionDeletePreview['counts'], 'preservedAchievements'>;
  preservedAchievementsCount: number;
}

export interface IValidatorContentService {
  getCompetitions(): Promise<ValidatorCompetitionItem[]>;
  getCompetitionById?(id: string): Promise<ValidatorCompetitionItem>;
  createCompetition(data: Partial<ValidatorCompetitionItem> & { name: string; organizer: string; category: string; level: string; format: 'individu' | 'beregu'; minTeamMembers: number; maxTeamMembers: number; description: string }): Promise<ValidatorCompetitionItem>;
  updateCompetition?(id: string, data: Partial<ValidatorCompetitionItem>): Promise<ValidatorCompetitionItem>;
  setCompetitionStatus(id: string, status: 'published' | 'archived'): Promise<ValidatorCompetitionItem>;
  getCompetitionDeletePreview?(id: string): Promise<CompetitionDeletePreview>;
  deleteCompetition?(id: string): Promise<CompetitionDeleteResult>;
  getRoadmap?(competitionSlug: string): Promise<ValidatorRoadmapDetail>;
  saveRoadmap(competitionSlug: string, phases: ValidatorRoadmapDetail['phases']): Promise<unknown>;
  getConsultants?(): Promise<ValidatorConsultantItem[]>;
  createConsultant(data: {
    competitionSlug: string;
    name: string;
    field: string;
    whatsappNumber: string;
    capacityNote?: string;
    isApproved?: boolean;
    status?: 'draft' | 'published' | 'archived';
  }): Promise<ValidatorConsultantItem>;
  updateConsultant?(id: string, data: Partial<{ name: string; field: string; whatsappNumber: string; capacityNote: string; isApproved: boolean; status: 'draft' | 'published' | 'archived' }>): Promise<ValidatorConsultantItem>;
  deleteConsultant?(id: string): Promise<void>;
  getCompetitionParticipants?(competitionId: string): Promise<CompetitionParticipantOption>;
  getSelections(): Promise<ValidatorSelectionItem[]>;
  saveSelection(data: { competitionId: string; teamId?: string | null; userId?: string | null; stage: string; result: 'menunggu' | 'lolos' | 'tidak'; organizerVerified: boolean; notes?: string }): Promise<unknown>;
  getCompetitionCategories?(): Promise<CompetitionCategoryItem[]>;
  createCompetitionCategory?(data: { code: string; name: string; description?: string }): Promise<CompetitionCategoryItem>;
  updateCompetitionCategory?(id: string, data: Partial<{ name: string; description: string; isActive: boolean }>): Promise<CompetitionCategoryItem>;
  createCompetitionSubCategory?(data: { categoryId: string; code: string; name: string; description?: string; defaultPointsNote?: string; rules?: Array<{ level: string; result: string; points: number; description?: string }> }): Promise<any>;
  updateCompetitionSubCategory?(id: string, data: Partial<{ name: string; description: string; defaultPointsNote: string; isActive: boolean; rules: Array<{ level: string; result: string; points: number; description?: string }> }>): Promise<any>;
  getCompetitionPointConfig?(competitionId: string): Promise<any>;
  saveCompetitionPointConfig?(competitionId: string, data: { pointTemplateId?: string | null; competitionCategoryId?: string | null; pointDescription?: string | null; customRules?: Array<{ subCategoryId?: string | null; level: string; result: string; points: number; description?: string }> }): Promise<any>;
  getPointTemplates?(): Promise<PointTemplateItem[]>;
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
  startDate?: string | null;
  endDate?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  _count?: {
    competitions: number;
    achievements: number;
  };
}

export interface AcademicPeriodActivationPreview {
  targetPeriod: AcademicPeriodItem;
  currentActivePeriod: AcademicPeriodItem | null;
  activeTargetsToArchive: number;
  activeTeamsToArchive: number;
}

export interface PointTemplateItem {
  id: string;
  name: string;
  description?: string | null;
  version: number;
  isActive: boolean;
  createdAt: string;
  rules: PointRuleItem[];
  _count?: { competitions: number };
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
  createStaff(data: { email: string; fullName?: string; password: string; role?: 'admin' | 'validator' | 'super_admin' }): Promise<any>;
  updateUserName?(userId: string, fullName: string): Promise<any>;
  updateStaffRole(userId: string, role: 'admin' | 'validator' | 'super_admin'): Promise<any>;
  getAcademicPeriods(): Promise<AcademicPeriodItem[]>;
  createAcademicPeriod(data: { name: string; year: number; semester: 'ganjil' | 'genap'; startDate?: string; endDate?: string }): Promise<AcademicPeriodItem>;
  getAcademicPeriodPreview?(id: string): Promise<AcademicPeriodActivationPreview>;
  activateAcademicPeriod(id: string, archiveOldTargets?: boolean): Promise<AcademicPeriodItem>;
  getPointRules(): Promise<{ activeVersion: number | null; activeRules: PointRuleItem[]; versions: any[] }>;
  createPointRuleVersion(rules: PointRuleItem[]): Promise<any>;
  getPointTemplates?(): Promise<PointTemplateItem[]>;
  createPointTemplate?(data: { name: string; description?: string; activateAsDefault?: boolean; rules: PointRuleItem[] }): Promise<PointTemplateItem>;
  activatePointTemplate?(id: string): Promise<PointTemplateItem>;
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
  targetCompetition: {
    id: string;
    name: string;
    slug: string;
    category: string;
    level: string;
    format: 'individu' | 'beregu';
    description?: string;
    minTeamMembers?: number;
    maxTeamMembers?: number;
    requiredRoles?: string[];
    registrationStatus?: 'buka' | 'tutup';
    internalSelectionDeadline?: string | null;
    requireRoles?: boolean;
    requireCrossStudyProgram?: boolean;
    scheduleTimeline?: Array<{ label: string; tanggal: string }>;
    status?: string;
  } | null;
  activeTeam: any;
  myPendingJoinRequests?: Array<{
    id: string;
    teamId: string;
    teamName: string;
    preferredRole?: string | null;
    competitionSlug: string;
    competitionName: string;
    createdAt: string;
  }>;
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
    dibatalkan?: number;
    draft: number;
  };
  recentAchievements?: Array<{
    id: string;
    name: string;
    organizer: string;
    eventDate: string;
    status: Achievement['status'];
    level: string;
    result: string;
  }>;
  firstRevisionAchievementId?: string | null;
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
