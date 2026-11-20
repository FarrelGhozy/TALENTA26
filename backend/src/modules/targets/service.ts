import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../app/middleware/error';
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

  if (!comp || comp.status !== 'published') {
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

      // Arsipkan target lama
      await tx.studentTarget.update({
        where: { id: currentTarget.id },
        data: { status: 'archived' },
      });

      // 2. Tangani tim pada kompetisi lama (jika ada)
      const currentMembership = await tx.teamMember.findFirst({
        where: {
          userId,
          status: 'active',
          team: {
            competitionId: currentTarget.competitionId,
            status: { in: ['mencari', 'terbentuk'] },
          },
        },
        include: { team: { include: { members: true } } },
      });

      if (currentMembership) {
        // Tandai status anggota 'left'
        await tx.teamMember.update({
          where: { id: currentMembership.id },
          data: { status: 'left' },
        });

        const remainingActiveMembers = currentMembership.team.members.filter(
          (m) => m.id !== currentMembership.id && m.status === 'active'
        );

        if (remainingActiveMembers.length === 0) {
          // Jika tim kosong, arsipkan tim
          await tx.team.update({
            where: { id: currentMembership.teamId },
            data: { status: 'arsip', version: { increment: 1 } },
          });
        } else {
          // Jika anggota berkurang di bawah batas min, status tim kembali 'mencari'
          await tx.team.update({
            where: { id: currentMembership.teamId },
            data: { status: 'mencari', version: { increment: 1 } },
          });
        }
      }
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
