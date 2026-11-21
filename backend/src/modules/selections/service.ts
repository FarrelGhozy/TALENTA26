import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../app/middleware/error';
import { recordAuditEvent } from '../../lib/audit';

export async function listSelections(institutionId: string) {
  return prisma.internalSelection.findMany({
    where: { institutionId },
    include: { competition: { select: { name: true, slug: true } }, team: { select: { name: true } } },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function saveSelection(
  institutionId: string,
  actorId: string,
  input: { competitionId: string; teamId: string; stage: string; result: string; organizerVerified: boolean }
) {
  if (!input.stage.trim()) throw new ValidationError('Tahap seleksi wajib diisi');
  if (!['menunggu', 'lolos', 'tidak'].includes(input.result)) throw new ValidationError('Hasil seleksi tidak valid');
  const team = await prisma.team.findUnique({ where: { id: input.teamId }, include: { competition: true } });
  if (!team || team.competition.institutionId !== institutionId || team.competitionId !== input.competitionId) {
    throw new NotFoundError('Tim seleksi tidak ditemukan untuk kompetisi tersebut');
  }
  const selection = await prisma.internalSelection.upsert({
    where: { competitionId_teamId_stage: { competitionId: input.competitionId, teamId: input.teamId, stage: input.stage.trim() } },
    update: { result: input.result, organizerVerified: input.organizerVerified },
    create: { institutionId, competitionId: input.competitionId, teamId: input.teamId, stage: input.stage.trim(), result: input.result, organizerVerified: input.organizerVerified },
  });
  if (input.result === 'lolos' && input.organizerVerified) {
    await prisma.team.update({ where: { id: input.teamId }, data: { status: 'terkunci_seleksi' } });
  }
  await recordAuditEvent({ institutionId, actorId, action: 'INTERNAL_SELECTION_UPDATED', targetType: 'InternalSelection', targetId: selection.id, metadata: { result: input.result, organizerVerified: input.organizerVerified } });
  return selection;
}
