export type Role = 'mahasiswa' | 'validator' | 'super_admin';

export interface Institution {
  id: string;
  nama: string;
  kode: string;
  periodeAktif: string;
}

export interface Skill {
  nama: string;
  level: number; // 1 - 3
}

export interface Ketersediaan {
  hari: string[];
  jam: number;
}

export interface User {
  id: string;
  institutionId: string;
  nama: string;
  email: string;
  nim?: string;
  prodi: string;
  fakultas?: string;
  angkatan?: number;
  phone?: string;
  bio?: string;
  pengalaman?: string;
  avatar?: string;
  role: Role[];
  skill: Skill[];
  minat: string[];
  ketersediaan: Ketersediaan;
  peranBisa: string[];
}

export interface Profile {
  userId: string;
  institutionId: string;
  targetKompetisiSlug: string;
  kelengkapan: number;
}

export interface KomposisiTim {
  min: number;
  max: number;
  peranWajib: string[];
}

export interface JadwalItem {
  label: string;
  tanggal: string;
}

export interface SeleksiInternalItem {
  tahap: string;
  tanggal: string;
}

export interface TahapItem {
  nomor?: string;
  judul: string;
  kategori?: string;
  deskripsi: string;
}

export interface Competition {
  id?: string;
  slug: string;
  institutionId: string;
  namaResmi: string;
  penyelenggara?: string;
  kategori: string;
  tingkat: string;
  format?: 'individu' | 'beregu';
  registrationStatus?: 'buka' | 'tutup';
  internalSelectionDeadline?: string | null;
  requireRoles?: boolean;
  requireCrossStudyProgram?: boolean;
  singleTeamPerCompetition?: boolean;
  sourceUrl?: string | null;
  deskripsi: string;
  syarat: string[];
  komposisi: KomposisiTim;
  tahapan: (string | TahapItem)[];
  jadwal: JadwalItem[];
  seleksiInternal: SeleksiInternalItem[];
  competitionCategoryId?: string | null;
  pointTemplateId?: string | null;
  pointDescription?: string | null;
}

export interface TeamMember {
  userId: string;
  status: 'diterima' | 'diajukan';
  roleInTeam?: string;
  joinedAt?: string;
  nama?: string;
  prodi?: string;
  fakultas?: string;
  angkatan?: number | null;
  avatarUrl?: string | null;
  bio?: string | null;
  peranBisa?: string[];
  skill?: Skill[];
}

export interface TeamReadiness {
  level: 'dibuat' | 'anggota_cukup' | 'siap_seleksi' | 'terkunci_seleksi';
  activeMemberCount: number;
  minRequired: number;
  maxAllowed: number;
  hasEnoughMembers: boolean;
  isFull: boolean;
  isRegistrationOpen: boolean;
  uniqueStudyPrograms: string[];
  missingRequiredRoles: string[];
  crossStudyProgramSatisfied: boolean;
  isSelectionReady: boolean;
  canAccessRoadmap: boolean;
  unmetCriteria: string[];
  advisoryNotes: string[];
  statusLabel: string;
  selectionStatusLabel: string;
}

export interface TeamJoinRequestItem {
  id: string;
  teamId: string;
  userId: string;
  preferredRole?: string | null;
  note?: string | null;
  status: 'menunggu' | 'disetujui' | 'ditolak' | 'dibatalkan' | 'kedaluwarsa';
  createdAt: string;
  reviewedAt?: string | null;
  applicant?: {
    id: string;
    nama: string;
    prodi: string;
    fakultas?: string;
    angkatan?: number | null;
    avatarUrl?: string | null;
    bio?: string | null;
    pengalaman?: string | null;
    peranBisa: string[];
    skill: Skill[];
  };
  team?: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    recruitmentType: 'terbuka' | 'privat';
    activeMemberCount: number;
    maxAllowed: number;
    competitionSlug: string;
    competitionName: string;
    leaderName?: string;
    leaderAvatarUrl?: string | null;
  };
}

export interface TeamDirectoryItem {
  id: string;
  competitionId: string;
  competitionSlug: string;
  competitionName: string;
  name: string;
  description: string;
  recruitmentType: 'terbuka' | 'privat';
  isRecruiting: boolean;
  status: string;
  activeMemberCount: number;
  minRequired: number;
  maxAllowed: number;
  slotsRemaining: number;
  neededRoles: string[];
  leader: {
    id: string;
    fullName: string;
    studyProgram: string;
    avatarUrl?: string | null;
  };
  isMyTeam: boolean;
  myRequestId: string | null;
  myRequestStatus: TeamJoinRequestItem['status'] | null;
  createdAt: string;
}

export interface Team {
  id: string;
  institutionId: string;
  competitionSlug: string;
  nama: string;
  leaderId?: string;
  leaderName?: string;
  isLeader?: boolean;
  description?: string | null;
  recruitmentType?: 'terbuka' | 'privat';
  isRecruiting?: boolean;
  neededRoles?: string[];
  targetMaxMembers?: number | null;
  inviteCode?: string | null;
  inviteCodeUpdatedAt?: string | null;
  pendingJoinRequestsCount?: number;
  joinRequests?: TeamJoinRequestItem[];
  readiness?: TeamReadiness | null;
  latestSelection?: {
    id: string;
    stage: string;
    result: string;
    organizerVerified: boolean;
    notes?: string | null;
  } | null;
  anggota: TeamMember[];
  competitionDetail?: Competition | null;
  isFormed: boolean;
  status: 'mencari' | 'menunggu_1_lagi' | 'terbentuk' | 'terkunci_seleksi' | 'arsip';
}

export interface Invite {
  id: string;
  institutionId: string;
  dari: string;
  ke: string;
  teamId: string;
  status: 'diajukan' | 'diterima' | 'ditolak' | 'kedaluwarsa' | 'dibatalkan';
  createdAt: string;
}

export interface RoadmapSource {
  judul: string;
  url: string;
  wajib: boolean;
}

export interface RoadmapPhase {
  minggu: string;
  judul: string;
  materi: string[];
  skillDilati: string[];
  latihan: string[];
  target: string;
  indikator: string[];
  tenggat: string[];
  sumber: RoadmapSource[];
}

export interface Roadmap {
  competitionSlug: string;
  institutionId: string;
  fase: RoadmapPhase[];
}

export interface AchievementProof {
  id?: string;
  nama: string;
  size: number;
  mimeType?: string;
  uploadedAt?: string;
  isActive?: boolean;
  supersededByRevisionId?: string | null;
}

export interface AchievementParticipantItem {
  id: string;
  userId: string;
  fullName: string;
  nim?: string;
  studyProgram?: string;
  avatarUrl?: string | null;
  roleInTeam?: string | null;
  isSubmitter: boolean;
}

export interface AchievementDecisionItem {
  id: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  reason?: string | null;
  calculatedPoints?: number | null;
  awardedPoints?: number | null;
  pointSource?: string | null;
  overrideReason?: string | null;
  version: number;
  createdAt: string;
  decidedBy?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
}

export interface AchievementRevisionItem {
  id: string;
  versionNumber: number;
  note?: string | null;
  snapshotJson?: Record<string, any>;
  createdAt: string;
}

export interface PointRecommendation {
  calculatedPoints: number;
  pointSource: 'sub_competition_rule' | 'competition_rule' | 'template' | 'non_competition';
  ruleVersion: number;
  explanation: string;
}

export interface CompetitionSubCategoryItem {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description?: string | null;
  defaultPointsNote?: string | null;
  isActive: boolean;
  pointRules?: Array<{
    id: string;
    level: AchievementLevel;
    result: AchievementType;
    points: number;
    description?: string | null;
  }>;
}

export interface CompetitionCategoryItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  subCategories: CompetitionSubCategoryItem[];
}

export interface CompetitionPointRuleItem {
  id?: string;
  subCategoryId?: string | null;
  subCategory?: { id: string; name: string; code: string } | null;
  level: AchievementLevel;
  result: AchievementType;
  points: number;
  description?: string | null;
}

export interface StudentDirectoryItem {
  userId: string;
  fullName: string;
  nim?: string;
  studyProgram: string;
  faculty: string;
  enrollmentYear?: number | null;
  avatarUrl?: string | null;
}

export type AchievementCategory =
  | 'kompetisi'
  | 'konferensi'
  | 'olahraga'
  | 'seni'
  | 'nominasi'
  | 'lain'
  | 'seleksi_internal';

export type AchievementLevel = 'lokal' | 'nasional' | 'internasional';

export type AchievementType =
  | 'partisipasi'
  | 'finalis'
  | 'juara_3'
  | 'juara_2'
  | 'juara_1'
  | 'penghargaan_khusus';

export type AchievementStatus = 'menunggu' | 'perlu_perbaikan' | 'disetujui' | 'ditolak' | 'draft' | 'dibatalkan';

export interface Achievement {
  id: string;
  institutionId: string;
  userId: string;
  nama: string;
  penyelenggara: string;
  kategori: AchievementCategory;
  tanggal: string;
  tingkat: AchievementLevel;
  jenisCapaian: AchievementType;
  deskripsi?: string;
  bukti: AchievementProof[];
  status: AchievementStatus;
  version?: number;
  catatan?: string;
  dariSeleksiInternal: boolean;
  competitionId?: string | null;
  competitionSlug?: string;
  competitionName?: string;
  participationType?: 'individu' | 'kelompok';
  teamId?: string | null;
  teamName?: string | null;
  competitionCategoryId?: string | null;
  competitionCategoryName?: string | null;
  subCategoryId?: string | null;
  subCategoryName?: string | null;
  subCompetitionName?: string | null;
  potentialDuplicateOfId?: string | null;
  pointRecommendation?: PointRecommendation | null;
  participants?: AchievementParticipantItem[];
  decisions?: AchievementDecisionItem[];
  revisions?: AchievementRevisionItem[];
  submitterName?: string;
  submitterNim?: string;
  submitterProdi?: string;
  submitterAvatarUrl?: string | null;
}

export interface RankingItem {
  rank: number;
  userId: string;
  fullName: string;
  studyProgram: string;
  avatarUrl?: string;
  points: number;
  approvedCount: number;
  juara1Count: number;
}

export interface RankingResponse {
  period: {
    id: string;
    name: string;
    year: number;
    semester: string;
  } | null;
  ranking: RankingItem[];
}

export interface Consultant {
  id: string;
  institutionId: string;
  nama: string;
  bidang: string[];
  assignmentApproved: boolean;
  isVerifiedContact: boolean;
  waMock: string;
}

export interface Selection {
  id: string;
  institutionId: string;
  competitionSlug: string;
  pesertaTeamId: string;
  tahap: string;
  hasil: 'lolos' | 'tidak' | 'menunggu';
  verifiedPanitia: boolean;
}

export interface MatchCandidate {
  user: User;
  matchScore: number;
  labelKesesuaian?: string;
  reasons: string[];
  isOverlapTime: boolean;
}
