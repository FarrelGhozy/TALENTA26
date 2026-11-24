import { prisma } from '../../lib/prisma';
import { ForbiddenError, NotFoundError } from '../../app/middleware/error';
import { recordAuditEvent } from '../../lib/audit';
import type { StudentTarget } from '@prisma/client';

export async function getMyActiveTarget(userId: string): Promise<StudentTarget | null> {
  return prisma.studentTarget.findFirst({
    where: { userId, status: 'active' },
    include: {
      academicPeriod: true,
      competition: {
        include: {
          academicPeriod: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMyTargetHistory(userId: string) {
  return prisma.studentTarget.findMany({
    where: { userId },
    include: {
      academicPeriod: { select: { id: true, name: true, year: true, semester: true } },
      competition: { select: { id: true, slug: true, name: true, category: true, level: true, format: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function setTargetCompetition(
  userId: string,
  competitionSlug: string,
  institutionId: string
): Promise<StudentTarget> {
  const comp = await prisma.competition.findUnique({
    where: { slug: competitionSlug },
  });

  if (!comp || comp.status !== 'published' || comp.institutionId !== institutionId) {
    throw new NotFoundError('Kompetisi terbit tidak ditemukan.');
  }

  const activePeriod = await prisma.academicPeriod.findFirst({
    where: { institutionId, isActive: true },
  });

  const { newTarget, previousTargetSlug } = await prisma.$transaction(async (tx) => {
    // Kunci baris user untuk mencegah multiple active StudentTarget pada request paralel
    await tx.$executeRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;

    const currentTarget = await tx.studentTarget.findFirst({
      where: { userId, status: 'active' },
      include: { competition: true },
      orderBy: { createdAt: 'desc' },
    });

    if (currentTarget) {
      if (currentTarget.competitionId === comp.id) {
        return { newTarget: currentTarget, previousTargetSlug: null as string | null, unchanged: true };
      }

      const activeMemberships = await tx.teamMember.findMany({
        where: {
          userId,
          status: 'active',
          team: {
            competitionId: currentTarget.competitionId,
            status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
          },
        },
        include: {
          team: {
            include: {
              members: { where: { status: 'active' }, orderBy: { joinedAt: 'asc' } },
              competition: true,
            },
          },
        },
      });

      if (activeMemberships.some((m) => m.team.status === 'terkunci_seleksi')) {
        throw new ForbiddenError(
          'Anda tergabung dalam tim yang sudah terkunci untuk seleksi internal dan tidak dapat mengganti target lomba secara mandiri.'
        );
      }

      for (const membership of activeMemberships) {
        await tx.$executeRaw`SELECT id FROM teams WHERE id = ${membership.teamId} FOR UPDATE`;

        const lockedTeam = await tx.team.findUnique({
          where: { id: membership.teamId },
          include: {
            members: { where: { status: 'active' }, orderBy: { joinedAt: 'asc' } },
            competition: true,
          },
        });
        if (!lockedTeam) continue;
        if (lockedTeam.status === 'terkunci_seleksi') {
          throw new ForbiddenError(
            'Anda tergabung dalam tim yang sudah terkunci untuk seleksi internal dan tidak dapat mengganti target lomba secara mandiri.'
          );
        }

        await tx.teamMember.update({
          where: { id: membership.id },
          data: { status: 'left' },
        });

        const remainingActiveMembers = lockedTeam.members.filter((m) => m.id !== membership.id);

        if (remainingActiveMembers.length === 0) {
          await tx.team.update({
            where: { id: membership.teamId },
            data: { status: 'arsip', isRecruiting: false, version: { increment: 1 } },
          });
          await tx.teamJoinRequest.updateMany({
            where: { teamId: membership.teamId, status: 'menunggu' },
            data: { status: 'kedaluwarsa' },
          });
          await tx.teamInvite.updateMany({
            where: { teamId: membership.teamId, status: 'diajukan' },
            data: { status: 'kedaluwarsa', respondedAt: new Date() },
          });
        } else {
          const nextTeamStatus =
            remainingActiveMembers.length >= lockedTeam.competition.minTeamMembers
              ? 'terbentuk'
              : 'mencari';
          let nextLeaderId = lockedTeam.leaderId;
          if (lockedTeam.leaderId === userId) {
            const promoted = remainingActiveMembers[0];
            nextLeaderId = promoted.userId;
            const currentRoleLower = (promoted.roleInTeam || '').trim().toLowerCase();
            if (!currentRoleLower || currentRoleLower === 'anggota' || currentRoleLower === 'anggota tim') {
              await tx.teamMember.update({
                where: { id: promoted.id },
                data: { roleInTeam: 'Ketua Tim' },
              });
            }
          }
          await tx.team.update({
            where: { id: membership.teamId },
            data: {
              status: nextTeamStatus,
              leaderId: nextLeaderId,
              isRecruiting:
                lockedTeam.recruitmentType === 'terbuka'
                  ? true
                  : lockedTeam.isRecruiting,
              version: { increment: 1 },
            },
          });
        }
      }

      // Batalkan pengajuan bergabung & undangan lama tertunda pada kompetisi lama
      await tx.teamJoinRequest.updateMany({
        where: {
          userId,
          status: 'menunggu',
          team: { competitionId: currentTarget.competitionId },
        },
        data: { status: 'dibatalkan' },
      });

      await tx.teamInvite.updateMany({
        where: {
          receiverId: userId,
          status: 'diajukan',
          team: { competitionId: currentTarget.competitionId },
        },
        data: { status: 'kedaluwarsa', respondedAt: new Date() },
      });

      await tx.studentTarget.updateMany({
        where: { userId, status: 'active' },
        data: { status: 'archived' },
      });
    }

    const created = await tx.studentTarget.create({
      data: {
        userId,
        competitionId: comp.id,
        academicPeriodId: comp.academicPeriodId || activePeriod?.id || null,
        status: 'active',
      },
      include: {
        competition: true,
        academicPeriod: true,
      },
    });

    return {
      newTarget: created,
      previousTargetSlug: currentTarget?.competition.slug || null,
      unchanged: false,
    };
  });

  if (previousTargetSlug !== null || newTarget.competitionId === comp.id) {
    await recordAuditEvent({
      institutionId,
      actorId: userId,
      action: 'TARGET_COMPETITION_SET',
      targetType: 'StudentTarget',
      targetId: newTarget.id,
      metadata: {
        competitionSlug: comp.slug,
        academicPeriodId: newTarget.academicPeriodId,
        previousTargetSlug,
      },
    });
  }

  return newTarget;
}
