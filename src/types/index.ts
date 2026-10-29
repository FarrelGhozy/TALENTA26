export type Role = 'mahasiswa' | 'admin_program' | 'verifikator' | 'dosen' | 'admin_institusi';

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
  prodi: string;
  angkatan: number;
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

export interface Competition {
  slug: string;
  institutionId: string;
  namaResmi: string;
  kategori: string;
  tingkat: string;
  deskripsi: string;
  syarat: string[];
  komposisi: KomposisiTim;
  tahapan: string[];
  jadwal: JadwalItem[];
  seleksiInternal: SeleksiInternalItem[];
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
  status: 'mencari' | 'menunggu_1_lagi' | 'terbentuk' | 'arsip';
}

export interface Invite {
  id: string;
  institutionId: string;
  dari: string;
  ke: string;
  teamId: string;
  status: 'diajukan' | 'diterima' | 'ditolak' | 'kedaluwarsa';
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
  nama: string;
  size: number;
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
  | 'nominasi'
  | 'penghargaan'
  | 'juara_1'
  | 'juara_2'
  | 'juara_3'
  | 'best_delegate';

export type AchievementStatus = 'menunggu' | 'perlu_perbaikan' | 'disetujui' | 'ditolak';

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
  bukti: AchievementProof[];
  status: AchievementStatus;
  catatan?: string;
  dariSeleksiInternal: boolean;
  competitionSlug?: string;
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
  reasons: string[];
  isOverlapTime: boolean;
}
