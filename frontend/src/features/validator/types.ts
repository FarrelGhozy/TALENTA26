import type { ValidatorCompetitionItem } from '../../services/types';

export type WorkspaceTabId = 'info' | 'roadmap' | 'poin' | 'konsultan' | 'seleksi';

export const WORKSPACE_TAB_IDS: readonly WorkspaceTabId[] = [
  'info',
  'roadmap',
  'poin',
  'konsultan',
  'seleksi',
] as const;

export const WORKSPACE_TAB_LABELS: Record<WorkspaceTabId, string> = {
  info: 'Profil & Aturan',
  roadmap: 'Roadmap',
  poin: 'Aturan Poin',
  konsultan: 'Kontak Konsultasi',
  seleksi: 'Seleksi Internal',
};

export function normalizeWorkspaceTab(raw: string | null): WorkspaceTabId {
  if (!raw) return 'info';
  if (raw === 'kompetisi') return 'info';
  if (WORKSPACE_TAB_IDS.includes(raw as WorkspaceTabId)) {
    return raw as WorkspaceTabId;
  }
  return 'info';
}

export interface CompetitionScheduleRow {
  label: string;
  tanggal: string;
}

export interface CompetitionFormState {
  name: string;
  organizer: string;
  category: string;
  level: string;
  format: 'individu' | 'beregu';
  minTeamMembers: number;
  maxTeamMembers: number;
  registrationStatus: 'buka' | 'tutup';
  internalSelectionDeadline: string;
  requireRoles: boolean;
  requireCrossStudyProgram: boolean;
  singleTeamPerCompetition: boolean;
  requiredRolesText: string;
  requirements: string[];
  scheduleTimeline: CompetitionScheduleRow[];
  description: string;
  sourceUrl: string;
}

export function createEmptyCompetitionForm(): CompetitionFormState {
  return {
    name: '',
    organizer: '',
    category: '',
    level: 'nasional',
    format: 'beregu',
    minTeamMembers: 2,
    maxTeamMembers: 5,
    registrationStatus: 'buka',
    internalSelectionDeadline: '',
    requireRoles: false,
    requireCrossStudyProgram: false,
    singleTeamPerCompetition: true,
    requiredRolesText: 'Ketua Tim, Anggota',
    requirements: [],
    scheduleTimeline: [],
    description: '',
    sourceUrl: '',
  };
}

export function competitionToFormState(item: ValidatorCompetitionItem): CompetitionFormState {
  return {
    name: item.name || '',
    organizer: item.organizer || '',
    category: item.category || '',
    level: item.level || 'nasional',
    format: item.format || 'beregu',
    minTeamMembers: item.minTeamMembers ?? (item.format === 'individu' ? 1 : 2),
    maxTeamMembers: item.maxTeamMembers ?? (item.format === 'individu' ? 1 : 5),
    registrationStatus: item.registrationStatus || 'buka',
    internalSelectionDeadline: item.internalSelectionDeadline
      ? new Date(item.internalSelectionDeadline).toISOString().split('T')[0]
      : '',
    requireRoles: Boolean(item.requireRoles),
    requireCrossStudyProgram: Boolean(item.requireCrossStudyProgram),
    singleTeamPerCompetition: item.singleTeamPerCompetition !== false,
    requiredRolesText: (item.requiredRoles || []).join(', '),
    requirements: Array.isArray(item.requirements) ? [...item.requirements] : [],
    scheduleTimeline: Array.isArray(item.scheduleTimeline)
      ? item.scheduleTimeline.map((s) => ({ label: s.label || '', tanggal: s.tanggal || '' }))
      : [],
    description: item.description || '',
    sourceUrl: item.sourceUrl || '',
  };
}

export function formStateToCompetitionPayload(form: CompetitionFormState) {
  const isIndividu = form.format === 'individu';
  const min = isIndividu ? 1 : Math.max(1, Number(form.minTeamMembers) || 2);
  const max = isIndividu ? 1 : Math.max(min, Number(form.maxTeamMembers) || min);

  return {
    name: form.name.trim(),
    organizer: form.organizer.trim(),
    category: form.category.trim(),
    level: form.level,
    format: form.format,
    minTeamMembers: min,
    maxTeamMembers: max,
    registrationStatus: form.registrationStatus,
    internalSelectionDeadline: form.internalSelectionDeadline.trim() || null,
    requireRoles: isIndividu ? false : form.requireRoles,
    requireCrossStudyProgram: isIndividu ? false : form.requireCrossStudyProgram,
    singleTeamPerCompetition: form.singleTeamPerCompetition,
    requiredRoles: isIndividu
      ? []
      : form.requiredRolesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
    requirements: form.requirements.map((s) => s.trim()).filter(Boolean),
    scheduleTimeline: form.scheduleTimeline
      .filter((row) => row.label.trim() || row.tanggal.trim())
      .map((row) => ({
        label: row.label.trim() || 'Tahap Perlombaan',
        tanggal: row.tanggal.trim() || '-',
      })),
    description: form.description.trim(),
    sourceUrl: form.sourceUrl.trim() || null,
  };
}

export function getStatusLabel(status: ValidatorCompetitionItem['status']): string {
  switch (status) {
    case 'published':
      return 'Terbit';
    case 'archived':
      return 'Arsip';
    default:
      return 'Draft';
  }
}

export function getStatusBadgeColor(
  status: ValidatorCompetitionItem['status']
): 'emerald' | 'amber' | 'slate' {
  switch (status) {
    case 'published':
      return 'emerald';
    case 'archived':
      return 'slate';
    default:
      return 'amber';
  }
}

export function getLevelLabel(level: string): string {
  switch (level.toLowerCase()) {
    case 'internasional':
      return 'Internasional';
    case 'nasional':
      return 'Nasional';
    case 'lokal':
      return 'Lokal';
    default:
      return level;
  }
}

export function getRoadmapPhaseCount(item: ValidatorCompetitionItem): number {
  const latestRoadmap = item.roadmaps?.[0];
  if (latestRoadmap?._count?.phases !== undefined) {
    return latestRoadmap._count.phases;
  }
  return item._count?.roadmaps ? 1 : 0;
}
