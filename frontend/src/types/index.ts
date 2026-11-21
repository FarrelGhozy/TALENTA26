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
}

export interface Team {
  id: string;
  institutionId: string;
  competitionSlug: string;
  nama: string;
  anggota: TeamMember[];
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
  nim: string;
  studyProgram: string;
  faculty: string;
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
}

export interface RankingItem {
  rank: number;
  userId: string;
  fullName: string;
  studyProgram: string;
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
