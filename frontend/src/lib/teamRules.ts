import { Competition, Team, User } from '../types';

export interface TeamValidationResult {
  isFormed: boolean;
  isSelectionReady: boolean;
  level: 'dibuat' | 'anggota_cukup' | 'siap_seleksi' | 'terkunci_seleksi';
  acceptedCount: number;
  minNeeded: number;
  maxAllowed: number;
  missingRoles: string[];
  uniqueProdis: string[];
  unmetCriteria: string[];
  advisoryNotes: string[];
  statusText: string;
  selectionStatusLabel: string;
}

export function validateTeamFormation(
  team: Team,
  members: User[],
  competition: Competition
): TeamValidationResult {
  // Gunakan hasil evaluasi backend sebagai sumber utama bila tersedia
  if (team.readiness) {
    const r = team.readiness;
    return {
      isFormed: r.hasEnoughMembers || team.status === 'terbentuk' || team.status === 'terkunci_seleksi',
      isSelectionReady: r.isSelectionReady,
      level: r.level,
      acceptedCount: r.activeMemberCount,
      minNeeded: r.minRequired,
      maxAllowed: r.maxAllowed,
      missingRoles: r.missingRequiredRoles,
      uniqueProdis: r.uniqueStudyPrograms,
      unmetCriteria: r.unmetCriteria,
      advisoryNotes: r.advisoryNotes,
      statusText: r.statusLabel,
      selectionStatusLabel: r.selectionStatusLabel,
    };
  }

  const acceptedMembers = team.anggota.filter((m) => m.status === 'diterima');
  const acceptedCount = acceptedMembers.length;
  const { min, max, peranWajib } = competition.komposisi;
  const effectiveMax =
    typeof team.targetMaxMembers === 'number' && team.targetMaxMembers >= min
      ? Math.min(team.targetMaxMembers, max)
      : max;

  const filledRoles = new Set<string>();
  const prodis = new Set<string>();
  acceptedMembers.forEach((m) => {
    if (m.roleInTeam) filledRoles.add(m.roleInTeam.toLowerCase());
    if (m.prodi) prodis.add(m.prodi);
    (m.peranBisa || []).forEach((r) => filledRoles.add(r.toLowerCase()));
    const user = members.find((u) => u.id === m.userId);
    if (user) {
      if (user.prodi) prodis.add(user.prodi);
      user.peranBisa.forEach((r) => filledRoles.add(r.toLowerCase()));
    }
  });

  const uniqueProdis = Array.from(prodis);
  const missingRoles = peranWajib.filter((r) => !filledRoles.has(r.toLowerCase()));
  const isCountValid = acceptedCount >= min && acceptedCount <= effectiveMax;
  const isFormed =
    team.isFormed ||
    team.status === 'terbentuk' ||
    team.status === 'terkunci_seleksi' ||
    isCountValid;

  const unmetCriteria: string[] = [];
  if (!isCountValid) {
    unmetCriteria.push(`Tim baru memiliki ${acceptedCount} dari minimal ${min} anggota`);
  }
  if (competition.registrationStatus === 'tutup') {
    unmetCriteria.push('Pendaftaran internal kompetisi sedang ditutup');
  }
  if (competition.requireRoles && missingRoles.length > 0) {
    unmetCriteria.push(`Peran wajib belum terisi: ${missingRoles.join(', ')}`);
  }
  if (competition.requireCrossStudyProgram && uniqueProdis.length < 2) {
    unmetCriteria.push('Kompetisi mensyaratkan anggota lintas program studi');
  }

  const isLocked = team.status === 'terkunci_seleksi';
  const isSelectionReady = !isLocked && team.status !== 'arsip' && unmetCriteria.length === 0;
  const level: TeamValidationResult['level'] = isLocked
    ? 'terkunci_seleksi'
    : isSelectionReady
    ? 'siap_seleksi'
    : isFormed
    ? 'anggota_cukup'
    : 'dibuat';

  let statusText = 'Mencari Anggota';
  if (isLocked) statusText = 'Terkunci Seleksi';
  else if (isSelectionReady) statusText = 'Siap Seleksi Internal';
  else if (isFormed) statusText = 'Anggota Cukup';
  else if (acceptedCount < min) statusText = `Kurang ${min - acceptedCount} anggota lagi`;

  const selectionStatusLabel = isLocked
    ? 'Terkonfirmasi Seleksi'
    : isSelectionReady
    ? 'Siap daftar seleksi'
    : isFormed
    ? 'Jumlah anggota sesuai'
    : 'Belum memenuhi syarat';

  return {
    isFormed,
    isSelectionReady,
    level,
    acceptedCount,
    minNeeded: min,
    maxAllowed: effectiveMax,
    missingRoles,
    uniqueProdis,
    unmetCriteria,
    advisoryNotes: [],
    statusText,
    selectionStatusLabel,
  };
}
