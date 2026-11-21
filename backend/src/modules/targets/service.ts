import { prisma } from '../../lib/prisma';
import { ForbiddenError, NotFoundError } from '../../app/middleware/error';
import { recordAuditEvent } from '../../lib/audit';
import type { StudentTarget } from '@prisma/client';

export async function getMyActiveTarget(userId: string): Promise<StudentTarget | null> {
  return prisma.studentTarget.findFirst({
    where: { userId, status: 'active' },
    include: {
      competition: {
        include: {
          academicPeriod: true,
        },
      },
    },
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

  return prisma.$transaction(async (tx) => {
    // 1. Cek target aktif saat ini
    const currentTarget = await tx.studentTarget.findFirst({
      where: { userId, status: 'active' },
      include: { competition: true },
    });

    if (currentTarget) {
      if (currentTarget.competitionId === comp.id) {
        return currentTarget;
      }

      // 2. Tangani tim pada kompetisi lama (jika ada)
      const currentMembership = await tx.teamMember.findFirst({
        where: {
          userId,
          status: 'active',
          team: {
            competitionId: currentTarget.competitionId,
            status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
          },
        },
        include: { team: { include: { members: true, competition: true } } },
      });

      if (currentMembership) {
        if (currentMembership.team.status === 'terkunci_seleksi') {
          throw new ForbiddenError(
            'Anda tergabung dalam tim yang sudah terkunci untuk seleksi internal dan tidak dapat mengganti target lomba secara mandiri.'
          );
        }

        // Tandai status anggota 'left'
        await tx.teamMember.update({
          where: { id: currentMembership.id },
          data: { status: 'left' },
        });

        const remainingActiveMembers = currentMembership.team.members.filter(
          (m) => m.id !== currentMembership.id && m.status === 'active'
        );

        if (remainingActiveMembers.length === 0) {
          await tx.team.update({
            where: { id: currentMembership.teamId },
            data: { status: 'arsip', version: { increment: 1 } },
          });
        } else {
          const nextTeamStatus =
            remainingActiveMembers.length >= currentMembership.team.competition.minTeamMembers
              ? 'terbentuk'
              : 'mencari';
          await tx.team.update({
            where: { id: currentMembership.teamId },
            data: { status: nextTeamStatus, version: { increment: 1 } },
          });
        }
      }

      // Arsipkan target lama setelah pengecekan tim aman
      await tx.studentTarget.update({
        where: { id: currentTarget.id },
        data: { status: 'archived' },
      });
    }

    // 3. Buat target aktif baru
    const newTarget = await tx.studentTarget.create({
      data: {
        userId,
        competitionId: comp.id,
        status: 'active',
      },
      include: {
        competition: true,
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
        previousTargetSlug: currentTarget?.competition.slug || null,
      },
    });

    return newTarget;
  });
}
