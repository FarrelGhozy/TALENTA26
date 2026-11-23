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

  return prisma.$transaction(async (tx) => {
    const currentTarget = await tx.studentTarget.findFirst({
      where: { userId, status: 'active' },
      include: { competition: true },
    });

    if (currentTarget) {
      if (currentTarget.competitionId === comp.id) {
        return currentTarget;
      }

      const currentMembership = await tx.teamMember.findFirst({
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

      if (currentMembership) {
        if (currentMembership.team.status === 'terkunci_seleksi') {
          throw new ForbiddenError(
            'Anda tergabung dalam tim yang sudah terkunci untuk seleksi internal dan tidak dapat mengganti target lomba secara mandiri.'
          );
        }

        await tx.teamMember.update({
          where: { id: currentMembership.id },
          data: { status: 'left' },
        });

        const remainingActiveMembers = currentMembership.team.members.filter(
          (m) => m.id !== currentMembership.id
        );

        if (remainingActiveMembers.length === 0) {
          await tx.team.update({
            where: { id: currentMembership.teamId },
            data: { status: 'arsip', isRecruiting: false, version: { increment: 1 } },
          });
          await tx.teamJoinRequest.updateMany({
            where: { teamId: currentMembership.teamId, status: 'menunggu' },
            data: { status: 'kedaluwarsa' },
          });
        } else {
          const nextTeamStatus =
            remainingActiveMembers.length >= currentMembership.team.competition.minTeamMembers
              ? 'terbentuk'
              : 'mencari';
          let nextLeaderId = currentMembership.team.leaderId;
          if (currentMembership.team.leaderId === userId) {
            const promoted = remainingActiveMembers[0];
            nextLeaderId = promoted.userId;
            await tx.teamMember.update({
              where: { id: promoted.id },
              data: { roleInTeam: 'Ketua Tim' },
            });
          }
          await tx.team.update({
            where: { id: currentMembership.teamId },
            data: {
              status: nextTeamStatus,
              leaderId: nextLeaderId,
              isRecruiting:
                currentMembership.team.recruitmentType === 'terbuka'
                  ? true
                  : currentMembership.team.isRecruiting,
              version: { increment: 1 },
            },
          });
        }
      }

      // Batalkan pengajuan bergabung tertunda pada kompetisi lama
      await tx.teamJoinRequest.updateMany({
        where: {
          userId,
          status: 'menunggu',
          team: { competitionId: currentTarget.competitionId },
        },
        data: { status: 'dibatalkan' },
      });

      await tx.studentTarget.update({
        where: { id: currentTarget.id },
        data: { status: 'archived' },
      });
    }

    const newTarget = await tx.studentTarget.create({
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

    await recordAuditEvent({
      institutionId,
      actorId: userId,
      action: 'TARGET_COMPETITION_SET',
      targetType: 'StudentTarget',
      targetId: newTarget.id,
      metadata: {
        competitionSlug: comp.slug,
        academicPeriodId: newTarget.academicPeriodId,
        previousTargetSlug: currentTarget?.competition.slug || null,
      },
    });

    return newTarget;
  });
}
