import { prisma } from '../../lib/prisma';
import { evaluateTeamReadiness } from '../teams/readiness';
import { ValidationError } from '../../app/middleware/error';
import { recordAuditEvent } from '../../lib/audit';
import type { AchievementStatus, AchievementCategory } from '@prisma/client';

const VALID_ACH_STATUSES = new Set<string>([
  'draft',
  'menunggu',
  'perlu_perbaikan',
  'disetujui',
  'ditolak',
  'dibatalkan',
]);
const VALID_ACH_CATEGORIES = new Set<string>([
  'kompetisi',
  'konferensi',
  'olahraga',
  'seni',
  'nominasi',
  'lain',
  'seleksi_internal',
]);

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
          description: true,
          minTeamMembers: true,
          maxTeamMembers: true,
          requiredRoles: true,
          registrationStatus: true,
          internalSelectionDeadline: true,
          requireRoles: true,
          requireCrossStudyProgram: true,
          scheduleTimeline: true,
          registrationDeadline: true,
          competitionDate: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 2B. Pengajuan bergabung tim yang dikirim mahasiswa (status menunggu)
  const myPendingJoinRequests = await prisma.teamJoinRequest.findMany({
    where: {
      userId,
      status: 'menunggu',
      team: {
        status: { in: ['mencari', 'terbentuk'] },
      },
    },
    select: {
      id: true,
      teamId: true,
      preferredRole: true,
      createdAt: true,
      team: {
        select: {
          id: true,
          name: true,
          competition: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 3. Tim aktif & status pembentukan (nol PII anggota lain)
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId,
      status: 'active',
      team: {
        status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
      },
    },
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
              requiredRoles: true,
              registrationStatus: true,
              internalSelectionDeadline: true,
              requireRoles: true,
              requireCrossStudyProgram: true,
            },
          },
          members: {
            where: { status: 'active' },
            include: {
              user: {
                select: {
                  id: true,
                  studentProfile: {
                    select: {
                      fullName: true,
                      studyProgram: true,
                      rolesCapable: true,
                    },
                  },
                },
              },
            },
          },
          joinRequests: {
            where: { status: 'menunggu' },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const activeTeamReadiness = teamMember
    ? evaluateTeamReadiness({
        teamStatus: teamMember.team.status,
        targetMaxMembers: teamMember.team.targetMaxMembers,
        competition: teamMember.team.competition,
        members: teamMember.team.members.map((m) => ({
          userId: m.userId,
          roleInTeam: m.roleInTeam,
          studyProgram: m.user.studentProfile?.studyProgram ?? null,
          rolesCapable: m.user.studentProfile?.rolesCapable ?? [],
        })),
      })
    : null;

  // 4. Progres roadmap untuk target kompetisi (jika ada) — gunakan count langsung tanpa muat seluruh task
  let roadmapSummary = null;
  if (target?.competition?.id) {
    const roadmap = await prisma.roadmap.findFirst({
      where: { competitionId: target.competition.id, status: 'published' },
      select: { id: true, version: true },
    });

    if (roadmap) {
      const [totalTasks, completedCount] = await Promise.all([
        prisma.roadmapTask.count({
          where: { phase: { roadmapId: roadmap.id } },
        }),
        prisma.roadmapProgress.count({
          where: {
            userId,
            completed: true,
            task: {
              phase: {
                roadmapId: roadmap.id,
              },
            },
          },
        }),
      ]);

      roadmapSummary = {
        roadmapId: roadmap.id,
        version: roadmap.version,
        totalTasks,
        completedTasks: completedCount,
        percentage: totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0,
      };
    }
  }

  // 5. Rangkuman pengajuan prestasi (1 groupBy menggantikan 7 query count terpisah)
  const achOwnerFilter = {
    OR: [{ userId }, { participants: { some: { userId } } }],
  };
  const [
    statusCountsRaw,
    recentAchievementsRaw,
    firstRevisionRow,
    currentPeriod,
  ] = await Promise.all([
    prisma.achievement.groupBy({
      by: ['status'],
      where: achOwnerFilter,
      _count: { id: true },
    }),
    prisma.achievement.findMany({
      where: achOwnerFilter,
      select: {
        id: true,
        name: true,
        organizer: true,
        eventDate: true,
        status: true,
        level: true,
        result: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    prisma.achievement.findFirst({
      where: { ...achOwnerFilter, status: 'perlu_perbaikan' },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.academicPeriod.findFirst({
      where: { institutionId, isActive: true },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  let totalAchievements = 0;
  for (const row of statusCountsRaw) {
    statusMap[row.status] = row._count.id;
    totalAchievements += row._count.id;
  }
  const pendingCount = statusMap['menunggu'] ?? 0;
  const revisionCount = statusMap['perlu_perbaikan'] ?? 0;
  const approvedCount = statusMap['disetujui'] ?? 0;
  const rejectedCount = statusMap['ditolak'] ?? 0;
  const cancelledCount = statusMap['dibatalkan'] ?? 0;
  const draftCount = statusMap['draft'] ?? 0;

  // 6. Poin periode aktif (agregasi SUM langsung di MySQL tanpa memuat seluruh baris PointLedger)
  const pointsAgg = currentPeriod
    ? await prisma.pointLedger.aggregate({
        where: {
          userId,
          academicPeriodId: currentPeriod.id,
        },
        _sum: { points: true },
      })
    : null;

  // Reversal sudah disimpan bernilai negatif di PointLedger, sehingga _sum langsung akurat
  const currentPeriodPoints = pointsAgg?._sum.points ?? 0;

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
      actionUrl: '/app/profil',
      isCompleted: false,
      priority: 'high',
    });
  } else {
    actionableSteps.push({
      id: 'complete-profile',
      title: 'Profil Mahasiswa Lengkap',
      description: 'Profil Anda telah terisi dengan baik.',
      actionUrl: '/app/profil',
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
      actionUrl: '/app/prestasi',
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
      if (myPendingJoinRequests.length > 0) {
        const firstReq = myPendingJoinRequests[0];
        actionableSteps.push({
          id: 'form-team',
          title: 'Pengajuan Bergabung Menunggu Persetujuan Ketua',
          description: `Pengajuan Anda ke ${firstReq.team.name} sedang menunggu keputusan ketua tim.`,
          actionUrl: '/app/tim?tab=pengajuan',
          isCompleted: false,
          priority: 'medium',
        });
      } else {
        actionableSteps.push({
          id: 'form-team',
          title: 'Pilih Cara Bergabung atau Buat Tim',
          description: 'Buat tim baru, cari tim yang membuka rekrutmen, atau gabung memakai kode undangan ketua.',
          actionUrl: '/app/tim',
          isCompleted: false,
          priority: 'medium',
        });
      }
    } else {
      const pendingReqs =
        teamMember.team.leaderId === userId ? teamMember.team.joinRequests.length : 0;
      actionableSteps.push({
        id: 'form-team',
        title:
          pendingReqs > 0
            ? `${pendingReqs} Permintaan Bergabung Menunggu Persetujuan`
            : activeTeamReadiness?.isSelectionReady || teamMember.team.status === 'terkunci_seleksi'
            ? 'Tim Siap Mengikuti Seleksi Internal'
            : 'Kelola Ruang Tim & Anggota',
        description: `${teamMember.team.name} (${activeTeamReadiness?.statusLabel || teamMember.team.status})`,
        actionUrl: '/app/tim',
        isCompleted: Boolean(
          activeTeamReadiness?.isSelectionReady || teamMember.team.status === 'terkunci_seleksi'
        ),
        priority: pendingReqs > 0 ? 'high' : 'low',
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
        actionUrl: `/app/kompetisi/${target?.competition?.slug}/persiapan`,
        isCompleted: false,
        priority: 'medium',
      });
    } else {
      actionableSteps.push({
        id: 'complete-roadmap',
        title: 'Roadmap Pembinaan Selesai',
        description: 'Seluruh tahapan persiapan lomba telah berhasil diselesaikan.',
        actionUrl: `/app/kompetisi/${target?.competition?.slug}/persiapan`,
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
      actionUrl: '/app/prestasi/baru',
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
    activeTeam: teamMember
      ? (() => {
          const isLeader = teamMember.team.leaderId === userId;
          const {
            inviteCode,
            inviteCodeUpdatedAt,
            joinRequests,
            ...safeTeamFields
          } = teamMember.team;
          return {
            ...safeTeamFields,
            inviteCode: isLeader ? inviteCode : null,
            inviteCodeUpdatedAt: isLeader ? inviteCodeUpdatedAt : null,
            isLeader,
            pendingJoinRequestsCount: isLeader ? joinRequests.length : 0,
            readiness: activeTeamReadiness,
          };
        })()
      : null,
    myPendingJoinRequests: myPendingJoinRequests.map((req) => ({
      id: req.id,
      teamId: req.teamId,
      teamName: req.team.name,
      preferredRole: req.preferredRole,
      competitionSlug: req.team.competition.slug,
      competitionName: req.team.competition.name,
      createdAt: req.createdAt.toISOString(),
    })),
    roadmapProgress: roadmapSummary,
    submissions: {
      total: totalAchievements,
      menunggu: pendingCount,
      perlu_perbaikan: revisionCount,
      disetujui: approvedCount,
      ditolak: rejectedCount,
      dibatalkan: cancelledCount,
      draft: draftCount,
    },
    recentAchievements: recentAchievementsRaw.map((ach) => ({
      id: ach.id,
      name: ach.name,
      organizer: ach.organizer,
      eventDate: ach.eventDate ? ach.eventDate.toISOString().split('T')[0] : '',
      status: ach.status,
      level: ach.level,
      result: ach.result,
    })),
    firstRevisionAchievementId: firstRevisionRow?.id ?? null,
    points: {
      currentPeriod: currentPeriod ? currentPeriod.name : 'Belum ada periode aktif',
      totalPoints: currentPeriodPoints,
    },
    actionableSteps,
  };
}

export async function getAdminDashboardStats(institutionId: string) {
  // Kolaps 22 query paralel sebelumnya menjadi 9 query groupBy/agregasi agar ramah terhadap pool MariaDB (15 koneksi)
  const [
    achByStatus,
    compByStatus,
    teamByStatus,
    userByRoleStatus,
    consultantByApproval,
    selectionByResult,
    categoryRaw,
    levelRaw,
    publishedCompetitions,
  ] = await Promise.all([
    prisma.achievement.groupBy({
      by: ['status'],
      where: { institutionId },
      _count: { id: true },
    }),
    prisma.competition.groupBy({
      by: ['status'],
      where: { institutionId },
      _count: { id: true },
    }),
    prisma.team.groupBy({
      by: ['status'],
      where: { competition: { institutionId } },
      _count: { id: true },
    }),
    prisma.user.groupBy({
      by: ['role', 'status'],
      where: { institutionId },
      _count: { id: true },
    }),
    prisma.consultantContact.groupBy({
      by: ['isApproved'],
      where: { competition: { institutionId } },
      _count: { id: true },
    }),
    prisma.internalSelection.groupBy({
      by: ['result', 'organizerVerified'],
      where: { institutionId },
      _count: { id: true },
    }),
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
      where: { institutionId, status: 'published' },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        level: true,
        registrationDeadline: true,
        _count: {
          select: {
            studentTargets: { where: { status: 'active' } },
          },
        },
      },
    }),
  ]);

  let pendingVerifications = 0;
  let revisionNeededCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let totalAchievements = 0;
  for (const row of achByStatus) {
    totalAchievements += row._count.id;
    if (row.status === 'menunggu') pendingVerifications = row._count.id;
    else if (row.status === 'perlu_perbaikan') revisionNeededCount = row._count.id;
    else if (row.status === 'disetujui') approvedCount = row._count.id;
    else if (row.status === 'ditolak') rejectedCount = row._count.id;
  }

  let totalCompetitions = 0;
  let draftCompetitions = 0;
  let allCompetitionsCount = 0;
  for (const row of compByStatus) {
    allCompetitionsCount += row._count.id;
    if (row.status === 'published') totalCompetitions = row._count.id;
    else if (row.status === 'draft') draftCompetitions = row._count.id;
  }

  let teamsFormed = 0;
  let teamsLockedSelection = 0;
  let teamsSearching = 0;
  for (const row of teamByStatus) {
    if (row.status === 'terbentuk') teamsFormed = row._count.id;
    else if (row.status === 'terkunci_seleksi') teamsLockedSelection = row._count.id;
    else if (row.status === 'mencari') teamsSearching = row._count.id;
  }

  let totalStudents = 0;
  let totalStaff = 0;
  let totalUsers = 0;
  for (const row of userByRoleStatus) {
    totalUsers += row._count.id;
    if (row.role === 'mahasiswa' && row.status === 'active') {
      totalStudents += row._count.id;
    } else if (row.role === 'validator' || row.role === 'super_admin') {
      totalStaff += row._count.id;
    }
  }

  let approvedConsultants = 0;
  let totalConsultants = 0;
  for (const row of consultantByApproval) {
    totalConsultants += row._count.id;
    if (row.isApproved) approvedConsultants += row._count.id;
  }

  let confirmedSelectionsCount = 0;
  let totalSelectionsCount = 0;
  for (const row of selectionByResult) {
    totalSelectionsCount += row._count.id;
    if (row.result === 'lolos' && row.organizerVerified) {
      confirmedSelectionsCount += row._count.id;
    }
  }

  const categoryBreakdown: Record<string, number> = {};
  for (const item of categoryRaw) {
    categoryBreakdown[item.category] = item._count.id;
  }

  const levelBreakdown: Record<string, number> = {};
  for (const item of levelRaw) {
    levelBreakdown[item.level] = item._count.id;
  }

  const participantsByCompetition: Record<string, number> = {};
  const now = new Date();
  const upcomingDeadlines = publishedCompetitions
    .filter((c) => c.registrationDeadline && c.registrationDeadline >= now)
    .sort((a, b) => a.registrationDeadline!.getTime() - b.registrationDeadline!.getTime())
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      category: c.category,
      level: c.level,
      registrationDeadline: c.registrationDeadline,
    }));

  for (const c of publishedCompetitions) {
    participantsByCompetition[c.slug] = c._count.studentTargets;
  }

  return {
    queue: {
      pendingVerifications,
      revisionNeededCount,
      approvedCount,
      rejectedCount,
      total: totalAchievements,
    },
    competitions: {
      published: totalCompetitions,
      draft: draftCompetitions,
      total: allCompetitionsCount,
    },
    teams: {
      terbentuk: teamsFormed + teamsLockedSelection,
      terkunciSeleksi: teamsLockedSelection,
      mencari: teamsSearching,
    },
    selections: {
      confirmedPassed: confirmedSelectionsCount,
      total: totalSelectionsCount,
    },
    consultants: {
      approved: approvedConsultants,
      total: totalConsultants,
    },
    users: {
      totalStudents,
      totalStaff,
      total: totalUsers,
      approvedConsultants,
    },
    distribution: {
      byCategory: categoryBreakdown,
      byLevel: levelBreakdown,
      participantsByCompetition,
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
  },
  actorId?: string
): Promise<string> {
  const where: any = {
    institutionId,
  };

  if (filters.status && filters.status !== 'semua') {
    if (!VALID_ACH_STATUSES.has(filters.status)) {
      throw new ValidationError('Filter status ekspor prestasi tidak valid');
    }
    where.status = filters.status as AchievementStatus;
  }
  if (filters.academicPeriodId) {
    where.academicPeriodId = filters.academicPeriodId;
  }
  if (filters.category && filters.category !== 'semua') {
    if (!VALID_ACH_CATEGORIES.has(filters.category)) {
      throw new ValidationError('Filter kategori ekspor prestasi tidak valid');
    }
    where.category = filters.category as AchievementCategory;
  }

  const achievements = await prisma.achievement.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          studentProfile: {
            select: {
              fullName: true,
              nim: true,
              studyProgram: true,
              faculty: true,
            },
          },
        },
      },
      team: {
        select: { name: true },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              studentProfile: {
                select: {
                  fullName: true,
                  nim: true,
                  studyProgram: true,
                  faculty: true,
                },
              },
            },
          },
        },
        orderBy: [{ isSubmitter: 'desc' }, { createdAt: 'asc' }],
      },
      academicPeriod: { select: { name: true } },
      competition: { select: { name: true } },
      pointLedgers: {
        select: { userId: true, points: true },
      },
    },
    orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
  });

  const headers = [
    'ID',
    'Nama Mahasiswa',
    'NIM',
    'Program Studi',
    'Fakultas',
    'Tipe Kepesertaan',
    'Nama Tim',
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

  const rows: string[] = [];

  for (const a of achievements) {
    const eventDateStr = a.eventDate
      ? new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(a.eventDate)
      : '';

    const participantUsers =
      a.participants.length > 0
        ? a.participants.map((p) => p.user)
        : [a.user];

    for (const memberUser of participantUsers) {
      const memberPoints = a.pointLedgers
        .filter((ledger) => ledger.userId === memberUser.id)
        .reduce((sum, ledger) => sum + ledger.points, 0);

      rows.push(
        [
          escapeCsvField(a.id),
          escapeCsvField(memberUser.studentProfile?.fullName || memberUser.fullName || memberUser.email),
          escapeCsvField(memberUser.studentProfile?.nim || '-'),
          escapeCsvField(memberUser.studentProfile?.studyProgram || '-'),
          escapeCsvField(memberUser.studentProfile?.faculty || '-'),
          escapeCsvField(a.participationType === 'kelompok' ? 'Kelompok' : 'Individu'),
          escapeCsvField(a.team?.name || '-'),
          escapeCsvField(a.name),
          escapeCsvField(a.organizer),
          escapeCsvField(a.category),
          escapeCsvField(a.level),
          escapeCsvField(a.result),
          escapeCsvField(eventDateStr),
          escapeCsvField(a.academicPeriod?.name || '-'),
          escapeCsvField(a.status),
          escapeCsvField(memberPoints),
          escapeCsvField(a.reviewNote || ''),
        ].join(',')
      );
    }
  }

  if (actorId) {
    await recordAuditEvent({
      institutionId,
      actorId,
      action: 'ACHIEVEMENT_CSV_EXPORTED',
      targetType: 'Achievement',
      targetId: null,
      metadata: {
        status: filters.status || 'semua',
        academicPeriodId: filters.academicPeriodId || null,
        category: filters.category || 'semua',
        achievementsCount: achievements.length,
        rowsCount: rows.length,
      },
    });
  }

  // Tambahkan UTF-8 BOM agar Excel dapat membuka file berkarakter khusus langsung tanpa mojibake
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}
