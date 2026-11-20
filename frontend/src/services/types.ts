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
  verify(id: string, statusOrAction: any, catatan?: string, version?: number): Promise<Achievement>;
  correct?(id: string, reason: string, version?: number, targetStatus?: string): Promise<Achievement>;
  getEvidenceDownloadUrl?(evidenceId: string): string;
  getRanking?(periodId?: string): Promise<RankingResponse>;
  getLifetimeRanking?(): Promise<RankingResponse>;
}

export interface IConsultantService {
  getByCompetition(slug: string): Promise<Consultant[]>;
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
