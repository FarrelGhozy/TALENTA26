import { describe, expect, it } from 'bun:test';
import { evaluateTeamReadiness } from '../../src/modules/teams/readiness';

describe('evaluateTeamReadiness — 3 Lapis Kesiapan Tim (K-23)', () => {
  const baseCompetition = {
    format: 'beregu',
    minTeamMembers: 3,
    maxTeamMembers: 5,
    requiredRoles: ['Penulis Proposal', 'Analis Data'],
    registrationStatus: 'buka',
    internalSelectionDeadline: null,
    requireRoles: false,
    requireCrossStudyProgram: false,
  };

  it('Level 1 (dibuat): tim < minimum tetap boleh buka roadmap, tetapi belum siap seleksi', () => {
    const res = evaluateTeamReadiness({
      teamStatus: 'mencari',
      competition: baseCompetition,
      members: [
        { userId: 'u1', roleInTeam: 'Ketua Tim', studyProgram: 'Informatika', rolesCapable: ['Riset'] },
        { userId: 'u2', roleInTeam: 'Anggota', studyProgram: 'Informatika', rolesCapable: ['Analis Data'] },
      ],
    });

    expect(res.level).toBe('dibuat');
    expect(res.activeMemberCount).toBe(2);
    expect(res.hasEnoughMembers).toBe(false);
    expect(res.canAccessRoadmap).toBe(true);
    expect(res.isSelectionReady).toBe(false);
    expect(res.unmetCriteria.some((c) => c.includes('2 dari minimal 3'))).toBe(true);
  });

  it('Level 2 (anggota_cukup): jumlah anggota cukup tetapi gagal syarat wajib lintas prodi', () => {
    const res = evaluateTeamReadiness({
      teamStatus: 'terbentuk',
      competition: {
        ...baseCompetition,
        requireCrossStudyProgram: true,
      },
      members: [
        { userId: 'u1', roleInTeam: 'Ketua Tim', studyProgram: 'Informatika', rolesCapable: ['Penulis Proposal'] },
        { userId: 'u2', roleInTeam: 'Anggota', studyProgram: 'Informatika', rolesCapable: ['Analis Data'] },
        { userId: 'u3', roleInTeam: 'Anggota', studyProgram: 'Informatika', rolesCapable: ['Desain UI'] },
      ],
    });

    expect(res.level).toBe('anggota_cukup');
    expect(res.hasEnoughMembers).toBe(true);
    expect(res.crossStudyProgramSatisfied).toBe(false);
    expect(res.isSelectionReady).toBe(false);
    expect(res.unmetCriteria.some((c) => c.toLowerCase().includes('lintas program studi'))).toBe(true);
  });

  it('Level 2 (anggota_cukup): jumlah anggota cukup tetapi gagal syarat peran wajib', () => {
    const res = evaluateTeamReadiness({
      teamStatus: 'terbentuk',
      competition: {
        ...baseCompetition,
        requireRoles: true,
      },
      members: [
        { userId: 'u1', roleInTeam: 'Ketua Tim', studyProgram: 'Informatika', rolesCapable: ['Desain UI'] },
        { userId: 'u2', roleInTeam: 'Anggota', studyProgram: 'Farmasi', rolesCapable: ['Analis Data'] },
        { userId: 'u3', roleInTeam: 'Anggota', studyProgram: 'Manajemen', rolesCapable: ['Presentasi'] },
      ],
    });

    expect(res.level).toBe('anggota_cukup');
    expect(res.missingRequiredRoles).toContain('Penulis Proposal');
    expect(res.isSelectionReady).toBe(false);
  });

  it('Level 2 (anggota_cukup): pendaftaran ditutup atau melewati tenggat seleksi internal', () => {
    const pastDeadline = new Date('2025-01-01T23:59:59+07:00');
    const res = evaluateTeamReadiness({
      teamStatus: 'terbentuk',
      competition: {
        ...baseCompetition,
        internalSelectionDeadline: pastDeadline,
      },
      members: [
        { userId: 'u1', studyProgram: 'Informatika' },
        { userId: 'u2', studyProgram: 'Farmasi' },
        { userId: 'u3', studyProgram: 'Hukum' },
      ],
      now: new Date('2026-11-23T10:00:00+07:00'),
    });

    expect(res.level).toBe('anggota_cukup');
    expect(res.isRegistrationOpen).toBe(false);
    expect(res.isSelectionReady).toBe(false);
  });

  it('Level 3 (siap_seleksi): seluruh syarat wajib terpenuhi (anggota, peran wajib, lintas prodi, pendaftaran buka)', () => {
    const res = evaluateTeamReadiness({
      teamStatus: 'terbentuk',
      targetMaxMembers: 4,
      competition: {
        ...baseCompetition,
        requireRoles: true,
        requireCrossStudyProgram: true,
        internalSelectionDeadline: new Date('2027-06-01T23:59:59+07:00'),
      },
      members: [
        { userId: 'u1', roleInTeam: 'Ketua Tim', studyProgram: 'Informatika', rolesCapable: ['Penulis Proposal'] },
        { userId: 'u2', roleInTeam: 'Analis Data', studyProgram: 'Agroteknologi', rolesCapable: ['Riset'] },
        { userId: 'u3', roleInTeam: 'Anggota', studyProgram: 'Manajemen', rolesCapable: ['Desain'] },
      ],
      now: new Date('2026-11-23T10:00:00+07:00'),
    });

    expect(res.level).toBe('siap_seleksi');
    expect(res.maxAllowed).toBe(4);
    expect(res.hasEnoughMembers).toBe(true);
    expect(res.isRegistrationOpen).toBe(true);
    expect(res.missingRequiredRoles).toHaveLength(0);
    expect(res.crossStudyProgramSatisfied).toBe(true);
    expect(res.isSelectionReady).toBe(true);
    expect(res.unmetCriteria).toHaveLength(0);
  });

  it('Level 2 (anggota_cukup): satu anggota tidak dapat menutup 2 peran spesifik wajib sekaligus', () => {
    const res = evaluateTeamReadiness({
      teamStatus: 'terbentuk',
      competition: {
        ...baseCompetition,
        requireRoles: true,
      },
      members: [
        {
          userId: 'u1',
          roleInTeam: 'Ketua Tim',
          studyProgram: 'Informatika',
          rolesCapable: ['Penulis Proposal', 'Analis Data'],
        },
        { userId: 'u2', roleInTeam: 'Anggota', studyProgram: 'Farmasi', rolesCapable: ['Desain'] },
        { userId: 'u3', roleInTeam: 'Anggota', studyProgram: 'Manajemen', rolesCapable: ['Presentasi'] },
      ],
    });

    expect(res.level).toBe('anggota_cukup');
    expect(res.missingRequiredRoles.length).toBe(1);
    expect(res.isSelectionReady).toBe(false);
  });

  it('Status terkunci_seleksi tidak lagi bisa mendaftar ulang', () => {
    const res = evaluateTeamReadiness({
      teamStatus: 'terkunci_seleksi',
      competition: baseCompetition,
      members: [
        { userId: 'u1', studyProgram: 'Informatika' },
        { userId: 'u2', studyProgram: 'Farmasi' },
        { userId: 'u3', studyProgram: 'Hukum' },
      ],
    });

    expect(res.level).toBe('terkunci_seleksi');
    expect(res.isSelectionReady).toBe(false);
    expect(res.canAccessRoadmap).toBe(true);
  });
});
