import { AchievementCategory, AchievementLevel, AchievementStatus, AchievementType } from '../types';

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatAchievementType(type: AchievementType): string {
  const map: Record<AchievementType, string> = {
    partisipasi: 'Partisipasi',
    nominasi: 'Nominasi',
    penghargaan: 'Penghargaan',
    juara_1: 'Juara 1',
    juara_2: 'Juara 2',
    juara_3: 'Juara 3',
    best_delegate: 'Best Delegate',
  };
  return map[type] || type;
}

export function formatAchievementCategory(cat: AchievementCategory): string {
  const map: Record<AchievementCategory, string> = {
    kompetisi: 'Kompetisi',
    konferensi: 'Konferensi',
    olahraga: 'Olahraga',
    seni: 'Seni',
    nominasi: 'Nominasi',
    lain: 'Lainnya',
    seleksi_internal: 'Seleksi Internal',
  };
  return map[cat] || cat;
}

export function formatAchievementLevel(level: AchievementLevel): string {
  const map: Record<AchievementLevel, string> = {
    lokal: 'Tingkat Lokal / Kampus',
    nasional: 'Tingkat Nasional',
    internasional: 'Tingkat Internasional',
  };
  return map[level] || level;
}

export function formatAchievementStatus(status: AchievementStatus): { label: string; color: string } {
  switch (status) {
    case 'menunggu':
      return { label: 'Menunggu Verifikasi', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'perlu_perbaikan':
      return { label: 'Perlu Perbaikan', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    case 'disetujui':
      return { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'ditolak':
      return { label: 'Ditolak', color: 'bg-rose-100 text-rose-800 border-rose-200' };
    default:
      return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}
