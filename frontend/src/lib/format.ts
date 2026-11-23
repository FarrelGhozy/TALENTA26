import { AchievementCategory, AchievementLevel, AchievementStatus, AchievementType } from '../types';

const ID_MONTH_MAP: Record<string, number> = {
  januari: 0,
  jan: 0,
  februari: 1,
  feb: 1,
  maret: 2,
  mar: 2,
  april: 3,
  apr: 3,
  mei: 4,
  may: 4,
  juni: 5,
  jun: 5,
  juli: 6,
  jul: 6,
  agustus: 7,
  agt: 7,
  agu: 7,
  aug: 7,
  september: 8,
  sep: 8,
  oktober: 9,
  okt: 9,
  oct: 9,
  november: 10,
  nov: 10,
  desember: 11,
  des: 11,
  dec: 11,
};

export function parseFlexibleDate(dateString?: string | null): Date | null {
  if (!dateString || !dateString.trim()) return null;
  const raw = dateString.trim();

  // Coba format Indonesia: "25 Mei 2026" atau rentang "15-18 Juli 2026"
  const idMatch = raw.match(/^(\d{1,2})(?:\s*[-–]\s*\d{1,2})?\s+([A-Za-z]+)\s+(\d{4})$/);
  if (idMatch) {
    const day = Number(idMatch[1]);
    const month = ID_MONTH_MAP[idMatch[2].toLowerCase()];
    const year = Number(idMatch[3]);
    if (month !== undefined && day >= 1 && day <= 31) {
      return new Date(year, month, day, 23, 59, 59);
    }
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  // Jika berupa rentang seperti "15-18 Juli 2026", pertahankan teks rentangnya agar akurat
  if (/^\d{1,2}\s*[-–]\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(dateString.trim())) {
    return dateString.trim();
  }
  try {
    const date = parseFlexibleDate(dateString);
    if (!date) return dateString;
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });
  } catch {
    return dateString;
  }
}

export function formatAchievementType(type: AchievementType): string {
  const map: Record<AchievementType, string> = {
    partisipasi: 'Partisipasi',
    finalis: 'Finalis / Nominasi',
    juara_1: 'Juara 1',
    juara_2: 'Juara 2',
    juara_3: 'Juara 3',
    penghargaan_khusus: 'Penghargaan Khusus / Best Delegate',
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
    case 'dibatalkan':
      return { label: 'Dibatalkan', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    default:
      return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}
