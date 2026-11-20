import { prisma } from '../../lib/prisma';

export interface MatchCandidateResult {
  userId: string;
  nama: string;
  prodi: string;
  fakultas: string;
  bio?: string | null;
  targetKompetisiSlug: string;
  targetKompetisiNama: string;
  peranBisa: string[];
  skill: Array<{ nama: string; level: number }>;
  minat: string[];
  ketersediaan: { hari: string[]; jam: number };
  skorKecocokan: number;
  labelKesesuaian: string;
  alasanKecocokan: string[];
}

export async function getMatchCandidates(userId: string): Promise<MatchCandidateResult[]> {
  // 1. Ambil target aktif pengguna saat ini
  const activeTarget = await prisma.studentTarget.findFirst({
    where: { userId, status: 'active' },
    include: { competition: true },
  });

  if (!activeTarget) {
    return [];
  }

  // 2. Ambil profil pengguna saat ini
  const myProfile = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  const myInterests = Array.isArray(myProfile?.interests)
    ? (myProfile.interests as string[])
    : [];
  const myRoles = Array.isArray(myProfile?.rolesCapable)
    ? (myProfile.rolesCapable as string[])
    : [];

  // 3. Cari mahasiswa lain pada institusi yang sama dengan target lomba yang sama
  const candidates = await prisma.studentTarget.findMany({
    where: {
      competitionId: activeTarget.competitionId,
      status: 'active',
      userId: { not: userId },
      user: {
        status: 'active',
      },
    },
    include: {
      competition: true,
      user: {
        include: {
          studentProfile: true,
          teamMemberships: {
            where: {
              status: 'active',
              team: {
                competitionId: activeTarget.competitionId,
              },
            },
            include: { team: true },
          },
        },
      },
    },
  });

  const results: MatchCandidateResult[] = [];

  for (const item of candidates) {
    // Saring kandidat yang sudah berada dalam tim yang statusnya 'terkunci_seleksi'
    const isLockedInTeam = item.user.teamMemberships.some(
      (tm) => tm.team.status === 'terkunci_seleksi'
    );
    if (isLockedInTeam) continue;

    const profile = item.user.studentProfile;
    if (!profile) continue;

    const candSkills = Array.isArray(profile.skills)
      ? (profile.skills as Array<{ nama: string; level: number }>)
      : [];
    const candInterests = Array.isArray(profile.interests)
      ? (profile.interests as string[])
      : [];
    const candRoles = Array.isArray(profile.rolesCapable)
      ? (profile.rolesCapable as string[])
      : [];
    const candAvail = (profile.availability as { hari?: string[]; jam?: number }) || {
      hari: ['Senin', 'Rabu'],
      jam: 4,
    };

    // Hitung skor kesesuaian transparan
    let score = 50; // Baseline target kompetisi sama
    const reasons: string[] = [`Memilih target kompetisi yang sama (${activeTarget.competition.name})`];

    // Cek peran komplementer
    const hasDifferentRole = candRoles.some((r) => !myRoles.includes(r));
    if (hasDifferentRole) {
      score += 20;
      reasons.push('Memiliki keahlian peran yang melengkapi komposisi tim');
    }

    // Cek kesamaan minat
    const sharedInterests = candInterests.filter((i) => myInterests.includes(i));
    if (sharedInterests.length > 0) {
      score += 15;
      reasons.push(`Memiliki minat bidang serupa (${sharedInterests.slice(0, 2).join(', ')})`);
    }

    // Cek ketersediaan waktu
    if (candAvail.jam && candAvail.jam >= 3) {
      score += 10;
      reasons.push(`Komitmen ketersediaan waktu memadai (${candAvail.jam} jam/minggu)`);
    }

    score = Math.min(score, 98);

    let label = 'Kesesuaian Cukup';
    if (score >= 80) label = 'Kesesuaian Sangat Cocok';
    else if (score >= 65) label = 'Kesesuaian Baik';

    // Data PII yang aman (tanpa NIM, email, nomor telepon)
    results.push({
      userId: item.user.id,
      nama: profile.fullName,
      prodi: profile.studyProgram,
      fakultas: profile.faculty,
      bio: profile.bio,
      targetKompetisiSlug: item.competition.slug,
      targetKompetisiNama: item.competition.name,
      peranBisa: candRoles.length > 0 ? candRoles : ['Anggota'],
      skill: candSkills,
      minat: candInterests,
      ketersediaan: {
        hari: Array.isArray(candAvail.hari) ? candAvail.hari : ['Fleksibel'],
        jam: candAvail.jam || 4,
      },
      skorKecocokan: score,
      labelKesesuaian: label,
      alasanKecocokan: reasons,
    });
  }

  // Urutkan dari skor kecocokan tertinggi
  return results.sort((a, b) => b.skorKecocokan - a.skorKecocokan);
}
