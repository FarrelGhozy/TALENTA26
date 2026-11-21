import { Competition, Team, User } from '../types';

export interface TeamValidationResult {
  isFormed: boolean;
  acceptedCount: number;
  minNeeded: number;
  maxAllowed: number;
  missingRoles: string[];
  statusText: string;
}

export function validateTeamFormation(
  team: Team,
  members: User[],
  competition: Competition
): TeamValidationResult {
  const acceptedMembers = team.anggota.filter((m) => m.status === 'diterima');
  const acceptedCount = acceptedMembers.length;
  const { min, max, peranWajib } = competition.komposisi;

  // Determine which roles are filled by accepted members
  const filledRoles = new Set<string>();
  acceptedMembers.forEach((m) => {
    const user = members.find((u) => u.id === m.userId);
    if (user) {
      user.peranBisa.forEach((r) => filledRoles.add(r));
    }
  });

  const missingRoles = peranWajib.filter((r) => !filledRoles.has(r));
  const isCountValid = acceptedCount >= min && acceptedCount <= max;
  const isFormed =
    team.isFormed ||
    team.status === 'terbentuk' ||
    team.status === 'terkunci_seleksi' ||
    isCountValid;

  let statusText = 'Mencari rekan tim';
  if (team.status === 'terkunci_seleksi') {
    statusText = 'Terkunci Seleksi Internal';
  } else if (isFormed) {
    statusText = missingRoles.length > 0 ? 'Tim Terbentuk (Saran peran belum lengkap)' : 'Tim Terbentuk (Lengkap)';
  } else if (acceptedCount < min) {
    statusText = `Kurang ${min - acceptedCount} anggota lagi`;
  }

  return {
    isFormed,
    acceptedCount,
    minNeeded: min,
    maxAllowed: max,
    missingRoles,
    statusText,
  };
}
