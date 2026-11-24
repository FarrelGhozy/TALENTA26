import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../app/middleware/error';
import { recordAuditEvent } from '../../lib/audit';

export async function listSelections(institutionId: string) {
  return prisma.internalSelection.findMany({
    where: { institutionId },
    include: {
      competition: { select: { id: true, name: true, slug: true, format: true } },
      team: { select: { id: true, name: true, status: true } },
      participant: {
        select: {
          id: true,
          studentProfile: { select: { fullName: true, nim: true, studyProgram: true } },
        },
      },
      validator: {
        select: { id: true, fullName: true, email: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function saveSelection(
  institutionId: string,
  actorId: string,
  input: {
    competitionId: string;
    teamId?: string | null;
    userId?: string | null;
    stage: string;
    result: string;
    organizerVerified: boolean;
    notes?: string;
  }
) {
  const stage = input.stage?.trim();
  if (!stage) throw new ValidationError('Tahap seleksi wajib diisi');
  if (!['menunggu', 'lolos', 'tidak'].includes(input.result)) {
    throw new ValidationError('Hasil seleksi tidak valid');
  }

  const comp = await prisma.competition.findUnique({
    where: { id: input.competitionId },
  });
  if (!comp || comp.institutionId !== institutionId) {
    throw new NotFoundError('Kompetisi seleksi tidak ditemukan');
  }

  if (!input.teamId && !input.userId) {
    throw new ValidationError('Pilih tim peserta (beregu) atau mahasiswa peserta (individu)');
  }
  if (input.teamId && input.userId) {
    throw new ValidationError('Tidak boleh memilih tim dan peserta individu secara bersamaan');
  }
  if (comp.format === 'individu' && input.teamId) {
    throw new ValidationError('Kompetisi format individu hanya menerima peserta mahasiswa (userId), bukan tim');
  }
  if (comp.format === 'beregu' && input.userId) {
    throw new ValidationError('Kompetisi format beregu hanya menerima peserta tim (teamId)');
  }

  const confirmedAt = input.organizerVerified ? new Date() : null;
  const validatorId = input.organizerVerified ? actorId : null;

  let selection;

  if (input.teamId) {
    selection = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM teams WHERE id = ${input.teamId!} FOR UPDATE`;

      const team = await tx.team.findUnique({
        where: { id: input.teamId! },
        include: { competition: true, members: { where: { status: 'active' } } },
      });
      if (!team || team.competition.institutionId !== institutionId || team.competitionId !== input.competitionId) {
        throw new NotFoundError('Tim seleksi tidak ditemukan untuk kompetisi tersebut');
      }
      if (team.status === 'arsip') {
        throw new ValidationError('Tim yang telah diarsipkan tidak dapat diproses dalam seleksi internal');
      }

      const saved = await tx.internalSelection.upsert({
        where: {
          competitionId_teamId_stage: {
            competitionId: input.competitionId,
            teamId: input.teamId!,
            stage,
          },
        },
        update: {
          result: input.result,
          organizerVerified: input.organizerVerified,
          notes: input.notes?.trim().slice(0, 1000) || null,
          confirmedAt,
          validatorId,
        },
        create: {
          institutionId,
          competitionId: input.competitionId,
          teamId: input.teamId!,
          stage,
          result: input.result,
          organizerVerified: input.organizerVerified,
          notes: input.notes?.trim().slice(0, 1000) || null,
          confirmedAt,
          validatorId,
        },
      });

      if (input.result === 'lolos' && input.organizerVerified) {
        await tx.team.update({
          where: { id: team.id },
          data: { status: 'terkunci_seleksi', isRecruiting: false, version: { increment: 1 } },
        });
        await tx.teamJoinRequest.updateMany({
          where: { teamId: team.id, status: 'menunggu' },
          data: { status: 'kedaluwarsa' },
        });
        await tx.teamInvite.updateMany({
          where: { teamId: team.id, status: 'diajukan' },
          data: { status: 'kedaluwarsa', respondedAt: new Date() },
        });
      } else if (team.status === 'terkunci_seleksi') {
        // Buka kunci hanya bila TIDAK ADA tahap seleksi lain pada tim ini yang masih lolos & terkonfirmasi
        const otherLockedStage = await tx.internalSelection.findFirst({
          where: {
            teamId: team.id,
            competitionId: input.competitionId,
            result: 'lolos',
            organizerVerified: true,
          },
          select: { id: true },
        });
        if (!otherLockedStage) {
          const nextStatus =
            team.members.length >= team.competition.minTeamMembers ? 'terbentuk' : 'mencari';
          await tx.team.update({
            where: { id: team.id },
            data: { status: nextStatus, version: { increment: 1 } },
          });
        }
      }

      return saved;
    });
  } else {
    const user = await prisma.user.findUnique({
      where: { id: input.userId! },
      select: { id: true, institutionId: true, role: true },
    });
    if (!user || user.institutionId !== institutionId || user.role !== 'mahasiswa') {
      throw new NotFoundError('Mahasiswa peserta seleksi tidak ditemukan');
    }

    selection = await prisma.internalSelection.upsert({
      where: {
        competitionId_userId_stage: {
          competitionId: input.competitionId,
          userId: input.userId!,
          stage,
        },
      },
      update: {
        result: input.result,
        organizerVerified: input.organizerVerified,
        notes: input.notes?.trim() || null,
        confirmedAt,
        validatorId,
      },
      create: {
        institutionId,
        competitionId: input.competitionId,
        userId: input.userId!,
        stage,
        result: input.result,
        organizerVerified: input.organizerVerified,
        notes: input.notes?.trim() || null,
        confirmedAt,
        validatorId,
      },
    });
  }

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'INTERNAL_SELECTION_UPDATED',
    targetType: 'InternalSelection',
    targetId: selection.id,
    metadata: {
      teamId: input.teamId || null,
      userId: input.userId || null,
      stage,
      result: input.result,
      organizerVerified: input.organizerVerified,
    },
  });

  return selection;
}
