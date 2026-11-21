import { prisma } from '../../lib/prisma';

export interface MatchCandidateResult {
  userId: string;
  nama: string;
  prodi: string;
  fakultas: string;
  angkatan?: number | null;
  bio?: string | null;
  targetKompetisiSlug: string;
  targetKompetisiNama: string;
  peranBisa: string[];
  skill: Array<{ nama: string; level: number }>;
  minat: string[];
  ketersediaan: { hari: string[]; jam: number };
  isOverlapTime: boolean;
  skorKecocokan: number;
  labelKesesuaian: string;
  alasanKecocokan: string[];
}

export async function getMatchCandidates(
  userId: string,
  institutionId: string
): Promise<MatchCandidateResult[]> {
  // 1. Ambil target aktif pengguna saat ini
  const activeTarget = await prisma.studentTarget.findFirst({
    where: { userId, status: 'active' },
    include: { competition: true },
  });

  if (!activeTarget || activeTarget.competition.format === 'individu') {
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
  const myAvail = (myProfile?.availability as { hari?: string[]; jam?: number } | null) || null;
  const myDays = Array.isArray(myAvail?.hari) ? myAvail!.hari : [];

  // 3. Cari mahasiswa lain pada institusi yang sama dengan target lomba yang sama
  const candidates = await prisma.studentTarget.findMany({
    where: {
      competitionId: activeTarget.competitionId,
      status: 'active',
      userId: { not: userId },
      user: {
        institutionId,
        role: 'mahasiswa',
        status: 'active',
      },
    },
    include: {
      competition: true,
      user: {
        select: {
          id: true,
          studentProfile: {
            select: {
              fullName: true,
              studyProgram: true,
              faculty: true,
              enrollmentYear: true,
              bio: true,
              skills: true,
              interests: true,
              rolesCapable: true,
              availability: true,
            },
          },
          teamMemberships: {
            where: {
              status: 'active',
              team: {
                competitionId: activeTarget.competitionId,
                status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
              },
            },
            include: { team: { select: { status: true } } },
          },
        },
      },
    },
  });

  const results: MatchCandidateResult[] = [];

  for (const item of candidates) {
    // Saring kandidat yang sudah berada dalam tim aktif pada kompetisi ini
    if (item.user.teamMemberships.length > 0) continue;

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
    const rawAvail = (profile.availability as { hari?: string[]; jam?: number } | null) || null;
    const candDays = Array.isArray(rawAvail?.hari) ? rawAvail!.hari : [];
    const candHours = typeof rawAvail?.jam === 'number' ? rawAvail.jam : 0;

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

    // Cek overlap ketersediaan waktu
    const hasDayOverlap =
      myDays.length > 0 && candDays.length > 0
        ? candDays.some((d) => myDays.includes(d))
        : false;
    const isOverlapTime = hasDayOverlap || (candHours >= 3 && myDays.length === 0);

    if (candHours >= 3 && (hasDayOverlap || myDays.length === 0)) {
      score += 10;
      reasons.push(`Komitmen ketersediaan waktu memadai (${candHours} jam/minggu)`);
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
      angkatan: profile.enrollmentYear,
      bio: profile.bio,
      targetKompetisiSlug: item.competition.slug,
      targetKompetisiNama: item.competition.name,
      peranBisa: candRoles.length > 0 ? candRoles : ['Anggota'],
      skill: candSkills,
      minat: candInterests,
      ketersediaan: {
        hari: candDays,
        jam: candHours,
      },
      isOverlapTime,
      skorKecocokan: score,
      labelKesesuaian: label,
      alasanKecocokan: reasons,
    });
  }

  return results.sort((a, b) => b.skorKecocokan - a.skorKecocokan);
}
