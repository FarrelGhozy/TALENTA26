import { prisma } from '../../lib/prisma';
import type { AchievementStatus, AchievementCategory } from '@prisma/client';

export async function getStudentDashboard(userId: string, institutionId: string) {
  // 1. Profil mahasiswa & kelengkapan
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  const profileFields = [
    Boolean(profile?.nim),
    Boolean(profile?.fullName),
    Boolean(profile?.studyProgram),
    Boolean(profile?.faculty),
    Boolean(profile?.phone),
    Boolean(profile?.bio),
    Boolean(profile?.skills && Array.isArray(profile.skills) && profile.skills.length > 0),
    Boolean(profile?.interests && Array.isArray(profile.interests) && profile.interests.length > 0),
    Boolean(profile?.availability),
    Boolean(profile?.experience),
  ];
  const completedFieldsCount = profileFields.filter(Boolean).length;
  const profileCompletionPercentage = Math.round((completedFieldsCount / profileFields.length) * 100);

  // 2. Target kompetisi aktif
  const target = await prisma.studentTarget.findFirst({
    where: { userId, status: 'active' },
    include: {
      competition: {
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          level: true,
          format: true,
          registrationDeadline: true,
          competitionDate: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 3. Tim aktif & status pembentukan
  const teamMember = await prisma.teamMember.findFirst({
    where: { userId, status: 'active' },
    include: {
      team: {
        include: {
          competition: {
            select: {
              id: true,
              name: true,
              slug: true,
              format: true,
              minTeamMembers: true,
              maxTeamMembers: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  studentProfile: {
                    select: {
                      nim: true,
                      fullName: true,
                      studyProgram: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  // 4. Progres roadmap untuk target kompetisi (jika ada)
  let roadmapSummary = null;
  if (target?.competition?.id) {
    const roadmap = await prisma.roadmap.findFirst({
      where: { competitionId: target.competition.id, status: 'published' },
      include: {
        phases: {
          include: {
            tasks: true,
          },
        },
      },
    });

    if (roadmap) {
      const allTasks = roadmap.phases.flatMap((p) => p.tasks);
      const totalTasks = allTasks.length;

      const completedCount = await prisma.roadmapProgress.count({
        where: {
          userId,
          completed: true,
          task: {
            phase: {
              roadmapId: roadmap.id,
            },
          },
        },
      });

      roadmapSummary = {
        roadmapId: roadmap.id,
        version: roadmap.version,
        totalTasks,
        completedTasks: completedCount,
        percentage: totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0,
      };
    }
  }

  // 5. Rangkuman pengajuan prestasi
  const [
    totalAchievements,
    pendingCount,
    revisionCount,
    approvedCount,
    rejectedCount,
    draftCount,
  ] = await Promise.all([
    prisma.achievement.count({ where: { userId } }),
    prisma.achievement.count({ where: { userId, status: 'menunggu' } }),
    prisma.achievement.count({ where: { userId, status: 'perlu_perbaikan' } }),
    prisma.achievement.count({ where: { userId, status: 'disetujui' } }),
    prisma.achievement.count({ where: { userId, status: 'ditolak' } }),
    prisma.achievement.count({ where: { userId, status: 'draft' } }),
  ]);

  // 6. Poin periode aktif
  const currentPeriod = await prisma.academicPeriod.findFirst({
    where: { institutionId, isActive: true },
  });

  const ledgers = await prisma.pointLedger.findMany({
    where: {
      userId,
      ...(currentPeriod ? { academicPeriodId: currentPeriod.id } : {}),
    },
  });

  const currentPeriodPoints = ledgers.reduce((sum, item) => {
    return item.type === 'award' ? sum + item.points : sum - item.points;
  }, 0);

  // 7. Langkah tindak lanjut yang dapat dilakukan (actionable steps)
  const actionableSteps: Array<{
    id: string;
    title: string;
    description: string;
    actionUrl: string;
    isCompleted: boolean;
    priority: 'high' | 'medium' | 'low';
  }> = [];

  // Langkah 1: Profil Mahasiswa
  if (profileCompletionPercentage < 80) {
    actionableSteps.push({
      id: 'complete-profile',
      title: 'Lengkapi Profil Mahasiswa',
      description: `Kelengkapan profil Anda baru ${profileCompletionPercentage}%. Lengkapi data agar mudah menemukan rekan kompetisi.`,
      actionUrl: '/profil',
      isCompleted: false,
      priority: 'high',
    });
  } else {
    actionableSteps.push({
      id: 'complete-profile',
      title: 'Profil Mahasiswa Lengkap',
      description: 'Profil Anda telah terisi dengan baik.',
      actionUrl: '/profil',
      isCompleted: true,
      priority: 'low',
    });
  }

  // Langkah 2: Revisi Dokumen Prestasi jika ada yang diminta perbaikan
  if (revisionCount > 0) {
    actionableSteps.push({
      id: 'revise-submission',
      title: 'Perbaiki Berkas Pengajuan Prestasi',
      description: `Ada ${revisionCount} pengajuan prestasi yang memerlukan revisi dokumen bukti sesuai catatan validator.`,
      actionUrl: '/prestasi',
      isCompleted: false,
      priority: 'high',
    });
  }

  // Langkah 3: Target Kompetisi
  if (!target) {
    actionableSteps.push({
      id: 'choose-target',
      title: 'Pilih Target Kompetisi',
      description: 'Pilih salah satu kompetisi yang ingin Anda ikuti semester ini untuk memulai pembinaan.',
      actionUrl: '/kompetisi',
      isCompleted: false,
      priority: 'high',
    });
  } else {
    actionableSteps.push({
      id: 'choose-target',
      title: 'Target Kompetisi Terpilih',
      description: `Kompetisi: ${target.competition.name}`,
      actionUrl: `/kompetisi/${target.competition.slug}`,
      isCompleted: true,
      priority: 'low',
    });
  }

  // Langkah 4: Pembentukan Tim
  if (target && target.competition.format === 'beregu') {
    if (!teamMember) {
      actionableSteps.push({
        id: 'form-team',
        title: 'Bentuk atau Gabung Tim Kompetisi',
        description: 'Kompetisi target Anda berskala beregu. Cari rekan tim melalui fitur pencarian atau buat tim baru.',
        actionUrl: '/tim',
        isCompleted: false,
        priority: 'medium',
      });
    } else {
      actionableSteps.push({
        id: 'form-team',
        title: 'Tim Kompetisi Terbentuk',
        description: `Bergabung dalam ${teamMember.team.name} (${teamMember.team.status})`,
        actionUrl: `/tim/${teamMember.team.id}`,
        isCompleted: true,
        priority: 'low',
      });
    }
  }

  // Langkah 5: Roadmap Pembinaan
  if (roadmapSummary && roadmapSummary.totalTasks > 0) {
    if (roadmapSummary.completedTasks < roadmapSummary.totalTasks) {
      actionableSteps.push({
        id: 'complete-roadmap',
        title: 'Lanjutkan Roadmap Pembinaan',
        description: `Anda telah menyelesaikan ${roadmapSummary.completedTasks} dari ${roadmapSummary.totalTasks} tugas pembinaan.`,
        actionUrl: `/kompetisi/${target?.competition?.slug}/roadmap`,
        isCompleted: false,
        priority: 'medium',
      });
    } else {
      actionableSteps.push({
        id: 'complete-roadmap',
        title: 'Roadmap Pembinaan Selesai',
        description: 'Seluruh tahapan persiapan lomba telah berhasil diselesaikan.',
        actionUrl: `/kompetisi/${target?.competition?.slug}/roadmap`,
        isCompleted: true,
        priority: 'low',
      });
    }
  }

  // Langkah 6: Klaim Prestasi
  if (totalAchievements === 0) {
    actionableSteps.push({
      id: 'submit-achievement',
      title: 'Ajukan Prestasi Perdana',
      description: 'Punya capaian lomba atau karya ilmiah? Ajukan untuk diverifikasi dan peroleh poin prestasi resmi.',
      actionUrl: '/prestasi/baru',
      isCompleted: false,
      priority: 'medium',
    });
  }

  return {
    profile: {
      completionPercentage: profileCompletionPercentage,
      nim: profile?.nim || null,
      fullName: profile?.fullName || null,
      studyProgram: profile?.studyProgram || null,
      faculty: profile?.faculty || null,
    },
    targetCompetition: target ? target.competition : null,
    activeTeam: teamMember ? teamMember.team : null,
    roadmapProgress: roadmapSummary,
    submissions: {
      total: totalAchievements,
      menunggu: pendingCount,
      perlu_perbaikan: revisionCount,
      disetujui: approvedCount,
      ditolak: rejectedCount,
      draft: draftCount,
    },
    points: {
      currentPeriod: currentPeriod ? currentPeriod.name : 'Semua Periode',
      totalPoints: currentPeriodPoints,
    },
    actionableSteps,
  };
}

export async function getAdminDashboardStats(institutionId: string) {
  const [
    pendingVerifications,
    revisionNeededCount,
    approvedCount,
    rejectedCount,
    totalCompetitions,
    draftCompetitions,
    teamsFormed,
    teamsSearching,
    totalStudents,
    totalStaff,
    approvedConsultants,
    categoryRaw,
    levelRaw,
    upcomingDeadlines,
  ] = await Promise.all([
    prisma.achievement.count({ where: { institutionId, status: 'menunggu' } }),
    prisma.achievement.count({ where: { institutionId, status: 'perlu_perbaikan' } }),
    prisma.achievement.count({ where: { institutionId, status: 'disetujui' } }),
    prisma.achievement.count({ where: { institutionId, status: 'ditolak' } }),
    prisma.competition.count({ where: { institutionId, status: 'published' } }),
    prisma.competition.count({ where: { institutionId, status: 'draft' } }),
    prisma.team.count({ where: { competition: { institutionId }, status: 'terbentuk' } }),
    prisma.team.count({ where: { competition: { institutionId }, status: 'mencari' } }),
    prisma.user.count({ where: { institutionId, role: 'mahasiswa', status: 'active' } }),
    prisma.user.count({ where: { institutionId, role: { in: ['validator', 'super_admin'] } } }),
    prisma.consultantContact.count({ where: { competition: { institutionId }, isApproved: true } }),
    prisma.achievement.groupBy({
      by: ['category'],
      where: { institutionId, status: 'disetujui' },
      _count: { id: true },
    }),
    prisma.achievement.groupBy({
      by: ['level'],
      where: { institutionId, status: 'disetujui' },
      _count: { id: true },
    }),
    prisma.competition.findMany({
      where: {
        institutionId,
        status: 'published',
        registrationDeadline: { gte: new Date() },
      },
      orderBy: { registrationDeadline: 'asc' },
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        level: true,
        registrationDeadline: true,
      },
    }),
  ]);

  const categoryBreakdown: Record<string, number> = {};
  for (const item of categoryRaw) {
    categoryBreakdown[item.category] = item._count.id;
  }

  const levelBreakdown: Record<string, number> = {};
  for (const item of levelRaw) {
    levelBreakdown[item.level] = item._count.id;
  }

  return {
    queue: {
      pendingVerifications,
      revisionNeededCount,
      approvedCount,
      rejectedCount,
    },
    competitions: {
      published: totalCompetitions,
      draft: draftCompetitions,
    },
    teams: {
      terbentuk: teamsFormed,
      mencari: teamsSearching,
    },
    users: {
      totalStudents,
      totalStaff,
      approvedConsultants,
    },
    distribution: {
      byCategory: categoryBreakdown,
      byLevel: levelBreakdown,
    },
    upcomingDeadlines,
  };
}

export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (/^[\s]*[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export async function generateAchievementsCsv(
  institutionId: string,
  filters: {
    status?: string;
    academicPeriodId?: string;
    category?: string;
  }
): Promise<string> {
  const where: any = {
    institutionId,
  };

  if (filters.status) {
    where.status = filters.status as AchievementStatus;
  }
  if (filters.academicPeriodId) {
    where.academicPeriodId = filters.academicPeriodId;
  }
  if (filters.category) {
    where.category = filters.category as AchievementCategory;
  }

  const achievements = await prisma.achievement.findMany({
    where,
    include: {
      user: {
        include: {
          studentProfile: true,
        },
      },
      academicPeriod: true,
      competition: true,
      pointLedgers: true,
    },
    orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
  });

  const headers = [
    'ID',
    'Nama Mahasiswa',
    'NIM',
    'Program Studi',
    'Fakultas',
    'Nama Capaian / Lomba',
    'Penyelenggara',
    'Kategori',
    'Tingkat',
    'Hasil Capaian',
    'Tanggal Capaian',
    'Periode Akademik',
    'Status Pengajuan',
    'Poin',
    'Catatan Review',
  ];

  const rows = achievements.map((a) => {
    const totalPoints = a.pointLedgers.reduce((sum, ledger) => {
      return ledger.type === 'award' ? sum + ledger.points : sum - ledger.points;
    }, 0);

    const eventDateStr = a.eventDate ? a.eventDate.toISOString().split('T')[0] : '';

    return [
      escapeCsvField(a.id),
      escapeCsvField(a.user.studentProfile?.fullName || a.user.email),
      escapeCsvField(a.user.studentProfile?.nim || '-'),
      escapeCsvField(a.user.studentProfile?.studyProgram || '-'),
      escapeCsvField(a.user.studentProfile?.faculty || '-'),
      escapeCsvField(a.name),
      escapeCsvField(a.organizer),
      escapeCsvField(a.category),
      escapeCsvField(a.level),
      escapeCsvField(a.result),
      escapeCsvField(eventDateStr),
      escapeCsvField(a.academicPeriod?.name || '-'),
      escapeCsvField(a.status),
      escapeCsvField(totalPoints),
      escapeCsvField(a.reviewNote || ''),
    ].join(',');
  });

  // Tambahkan UTF-8 BOM agar Excel dapat membuka file berkarakter khusus langsung tanpa mojibake
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}
