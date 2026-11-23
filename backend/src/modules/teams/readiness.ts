export interface TeamReadinessMemberInput {
  userId?: string;
  roleInTeam?: string | null;
  studyProgram?: string | null;
  rolesCapable?: unknown;
}

export interface TeamReadinessCompetitionInput {
  format: string;
  minTeamMembers: number;
  maxTeamMembers: number;
  requiredRoles?: unknown;
  registrationStatus?: string | null;
  internalSelectionDeadline?: Date | string | null;
  requireRoles?: boolean | null;
  requireCrossStudyProgram?: boolean | null;
}

export interface TeamReadinessResult {
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

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function parseDeadline(value?: Date | string | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function evaluateTeamReadiness(params: {
  teamStatus: string;
  targetMaxMembers?: number | null;
  competition: TeamReadinessCompetitionInput;
  members: TeamReadinessMemberInput[];
  now?: Date;
}): TeamReadinessResult {
  const { teamStatus, targetMaxMembers, competition, members, now = new Date() } = params;

  const activeMemberCount = members.length;
  const minRequired = Math.max(1, competition.minTeamMembers || 1);
  const compMax = Math.max(minRequired, competition.maxTeamMembers || minRequired);
  const maxAllowed =
    typeof targetMaxMembers === 'number' && targetMaxMembers >= minRequired
      ? Math.min(targetMaxMembers, compMax)
      : compMax;

  const hasEnoughMembers = activeMemberCount >= minRequired && activeMemberCount <= maxAllowed;
  const isFull = activeMemberCount >= maxAllowed;

  const deadline = parseDeadline(competition.internalSelectionDeadline);
  const isDeadlinePassed = deadline ? now.getTime() > deadline.getTime() : false;
  const isRegistrationOpen = (competition.registrationStatus ?? 'buka') === 'buka' && !isDeadlinePassed;

  const uniqueStudyPrograms = Array.from(
    new Set(
      members
        .map((m) => (m.studyProgram || '').trim())
        .filter(Boolean)
    )
  );
  const crossStudyProgramSatisfied = uniqueStudyPrograms.length >= 2;

  const requiredRoles = normalizeStringList(competition.requiredRoles);
  const filledRoleSet = new Set<string>();
  for (const m of members) {
    if (m.roleInTeam && m.roleInTeam.trim()) {
      filledRoleSet.add(m.roleInTeam.trim().toLowerCase());
    }
    for (const r of normalizeStringList(m.rolesCapable)) {
      filledRoleSet.add(r.toLowerCase());
    }
  }

  const missingRequiredRoles = requiredRoles.filter((reqRole) => {
    const lower = reqRole.toLowerCase();
    if (lower === 'ketua tim' || lower === 'ketua') {
      return activeMemberCount === 0;
    }
    if (lower === 'anggota' || lower === 'anggota tim') {
      return activeMemberCount < 2;
    }
    return !filledRoleSet.has(lower);
  });

  const requireRoles = Boolean(competition.requireRoles);
  const requireCrossStudyProgram = Boolean(competition.requireCrossStudyProgram);

  const unmetCriteria: string[] = [];
  const advisoryNotes: string[] = [];

  if (!hasEnoughMembers) {
    if (activeMemberCount < minRequired) {
      unmetCriteria.push(
        `Tim baru memiliki ${activeMemberCount} dari minimal ${minRequired} anggota`
      );
    } else if (activeMemberCount > maxAllowed) {
      unmetCriteria.push(
        `Jumlah anggota (${activeMemberCount}) melebihi batas maksimal (${maxAllowed} anggota)`
      );
    }
  }

  if (!isRegistrationOpen) {
    unmetCriteria.push(
      isDeadlinePassed
        ? 'Tenggat seleksi internal kompetisi telah berakhir'
        : 'Pendaftaran / rekrutmen internal kompetisi sedang ditutup oleh admin'
    );
  }

  if (requireRoles && missingRequiredRoles.length > 0) {
    unmetCriteria.push(`Peran wajib belum terisi: ${missingRequiredRoles.join(', ')}`);
  } else if (!requireRoles && missingRequiredRoles.length > 0) {
    advisoryNotes.push(`Peran disarankan yang belum terisi: ${missingRequiredRoles.join(', ')}`);
  }

  if (requireCrossStudyProgram && !crossStudyProgramSatisfied) {
    unmetCriteria.push('Kompetisi ini mensyaratkan anggota lintas program studi (minimal 2 prodi)');
  } else if (!requireCrossStudyProgram && !crossStudyProgramSatisfied && activeMemberCount >= 2) {
    advisoryNotes.push('Kombinasi lintas program studi bersifat opsional sesuai pedoman lomba');
  }

  const isLocked = teamStatus === 'terkunci_seleksi';
  const isSelectionReady = !isLocked && teamStatus !== 'arsip' && unmetCriteria.length === 0;

  let level: TeamReadinessResult['level'] = 'dibuat';
  if (isLocked) {
    level = 'terkunci_seleksi';
  } else if (isSelectionReady) {
    level = 'siap_seleksi';
  } else if (hasEnoughMembers) {
    level = 'anggota_cukup';
  }

  let statusLabel = 'Mencari Anggota';
  if (isLocked) statusLabel = 'Terkunci Seleksi';
  else if (level === 'siap_seleksi') statusLabel = 'Siap Seleksi Internal';
  else if (level === 'anggota_cukup') statusLabel = 'Anggota Cukup';

  let selectionStatusLabel = 'Belum memenuhi syarat';
  if (isLocked) selectionStatusLabel = 'Terkonfirmasi Seleksi';
  else if (level === 'siap_seleksi') selectionStatusLabel = 'Siap daftar seleksi';
  else if (level === 'anggota_cukup') selectionStatusLabel = 'Jumlah anggota sesuai';

  return {
    level,
    activeMemberCount,
    minRequired,
    maxAllowed,
    hasEnoughMembers,
    isFull,
    isRegistrationOpen,
    uniqueStudyPrograms,
    missingRequiredRoles,
    crossStudyProgramSatisfied,
    isSelectionReady,
    canAccessRoadmap: activeMemberCount >= 1 && teamStatus !== 'arsip',
    unmetCriteria,
    advisoryNotes,
    statusLabel,
    selectionStatusLabel,
  };
}
