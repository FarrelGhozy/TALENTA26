import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../app/middleware/error';
import { recordAuditEvent } from '../../lib/audit';

export async function getRoadmapByCompetitionSlug(slug: string) {
  const comp = await prisma.competition.findFirst({
    where: { slug, status: 'published' },
  });

  if (!comp) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  const roadmap = await prisma.roadmap.findFirst({
    where: {
      competitionId: comp.id,
      status: 'published',
    },
    include: {
      phases: {
        orderBy: { orderIndex: 'asc' },
        include: {
          tasks: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      },
    },
  });

  if (!roadmap) {
    return null;
  }

  // Format kompatibel dengan frontend UI & types
  const fase = roadmap.phases.map((phase, pIdx) => ({
    id: phase.id,
    minggu: phase.targetDays ? `${Math.ceil((pIdx * 14) / 7) + 1}-${Math.ceil(((pIdx + 1) * 14) / 7)}` : `${pIdx + 1}`,
    judul: phase.title,
    materi: [phase.description || phase.title],
    skillDilati: [],
    latihan: phase.tasks.map((t) => t.title),
    target: phase.description || phase.title,
    indikator: phase.tasks.map((t) => `Selesai: ${t.title}`),
    tenggat: phase.targetDays ? [`Target ${phase.targetDays} hari`] : [],
    sumber: phase.tasks
      .filter((t) => t.resourceUrl)
      .map((t) => ({
        judul: t.resourceTitle || t.title,
        url: t.resourceUrl || '#',
        wajib: t.isRequired,
      })),
  }));

  return {
    ...roadmap,
    competitionSlug: comp.slug,
    fase,
  };
}

export async function getChecklistProgress(userId: string, slug: string): Promise<Record<string, boolean>> {
  const comp = await prisma.competition.findFirst({
    where: { slug, status: 'published' },
  });

  if (!comp) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  const roadmap = await prisma.roadmap.findFirst({
    where: { competitionId: comp.id, status: 'published' },
    include: {
      phases: {
        orderBy: { orderIndex: 'asc' },
        include: {
          tasks: { orderBy: { orderIndex: 'asc' } },
        },
      },
    },
  });

  if (!roadmap) {
    return {};
  }

  const taskIds: string[] = [];
  const taskIdToMockKey: Record<string, string> = {};

  roadmap.phases.forEach((phase, pIdx) => {
    phase.tasks.forEach((task, tIdx) => {
      taskIds.push(task.id);
      taskIdToMockKey[task.id] = `p${pIdx}-l${tIdx}`;
    });
  });

  const progressList = await prisma.roadmapProgress.findMany({
    where: {
      userId,
      taskId: { in: taskIds },
    },
  });

  const checklist: Record<string, boolean> = {};

  for (const p of progressList) {
    checklist[p.taskId] = p.completed;
    const mockKey = taskIdToMockKey[p.taskId];
    if (mockKey) {
      checklist[mockKey] = p.completed;
    }
  }

  return checklist;
}

export async function toggleChecklistTask(
  userId: string,
  slug: string,
  taskIdOrKey: string,
  institutionId: string
): Promise<Record<string, boolean>> {
  const comp = await prisma.competition.findFirst({
    where: { slug, status: 'published' },
  });

  if (!comp) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  const roadmap = await prisma.roadmap.findFirst({
    where: { competitionId: comp.id, status: 'published' },
    include: {
      phases: {
        orderBy: { orderIndex: 'asc' },
        include: {
          tasks: { orderBy: { orderIndex: 'asc' } },
        },
      },
    },
  });

  if (!roadmap) {
    throw new NotFoundError('Roadmap untuk kompetisi ini belum tersedia');
  }

  // Resolve actual task ID: apakah berbentuk cuid atau key `p{pIdx}-l{tIdx}`
  let actualTaskId = taskIdOrKey;

  const mockKeyMatch = taskIdOrKey.match(/^p(\d+)-l(\d+)$/);
  if (mockKeyMatch) {
    const pIdx = parseInt(mockKeyMatch[1], 10);
    const tIdx = parseInt(mockKeyMatch[2], 10);
    const targetPhase = roadmap.phases[pIdx];
    const targetTask = targetPhase?.tasks[tIdx];

    if (!targetTask) {
      throw new NotFoundError('Tugas roadmap tidak ditemukan');
    }
    actualTaskId = targetTask.id;
  } else {
    // Validasi apakah taskId ada di roadmap kompetisi ini
    const allTaskIds = roadmap.phases.flatMap((p) => p.tasks.map((t) => t.id));
    if (!allTaskIds.includes(actualTaskId)) {
      throw new NotFoundError('Tugas roadmap tidak ditemukan pada kompetisi ini');
    }
  }

  const existing = await prisma.roadmapProgress.findUnique({
    where: {
      userId_taskId: {
        userId,
        taskId: actualTaskId,
      },
    },
  });

  const newCompleted = existing ? !existing.completed : true;

  await prisma.roadmapProgress.upsert({
    where: {
      userId_taskId: {
        userId,
        taskId: actualTaskId,
      },
    },
    update: {
      completed: newCompleted,
      completedAt: newCompleted ? new Date() : null,
    },
    create: {
      userId,
      taskId: actualTaskId,
      completed: true,
      completedAt: new Date(),
    },
  });

  await recordAuditEvent({
    institutionId,
    actorId: userId,
    action: 'ROADMAP_TASK_TOGGLED',
    targetType: 'RoadmapTask',
    targetId: actualTaskId,
    metadata: { completed: newCompleted, competitionSlug: slug },
  });

  return getChecklistProgress(userId, slug);
}

export async function setRoadmapTaskProgress(
  userId: string,
  taskId: string,
  completed?: boolean,
  institutionId?: string
) {
  const task = await prisma.roadmapTask.findUnique({
    where: { id: taskId },
    include: { phase: { include: { roadmap: { include: { competition: true } } } } },
  });
  if (!task || task.phase.roadmap.status !== 'published' || task.phase.roadmap.competition.status !== 'published') {
    throw new NotFoundError('Tugas roadmap tidak ditemukan');
  }

  const existing = await prisma.roadmapProgress.findUnique({
    where: { userId_taskId: { userId, taskId } },
  });
  const nextCompleted = completed !== undefined ? completed : !(existing?.completed ?? false);

  const progress = await prisma.roadmapProgress.upsert({
    where: { userId_taskId: { userId, taskId } },
    update: { completed: nextCompleted, completedAt: nextCompleted ? new Date() : null },
    create: { userId, taskId, completed: nextCompleted, completedAt: nextCompleted ? new Date() : null },
  });

  if (institutionId) {
    await recordAuditEvent({
      institutionId,
      actorId: userId,
      action: 'ROADMAP_TASK_TOGGLED',
      targetType: 'RoadmapTask',
      targetId: taskId,
      metadata: { completed: nextCompleted, competitionSlug: task.phase.roadmap.competition.slug },
    });
  }

  return progress;
}

export async function getConsultantsByCompetitionSlug(slug: string) {
  const comp = await prisma.competition.findFirst({
    where: { slug, status: 'published' },
  });

  if (!comp) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  const contacts = await prisma.consultantContact.findMany({
    where: {
      competitionId: comp.id,
      isApproved: true,
      status: 'published',
    },
    orderBy: { createdAt: 'asc' },
  });

  // Petakan ke atribut frontend & backend
  return contacts.map((c) => ({
    id: c.id,
    institutionId: comp.institutionId,
    name: c.name,
    nama: c.name,
    field: c.field,
    bidang: [c.field],
    whatsappNumber: c.whatsappNumber,
    waMock: c.whatsappNumber,
    capacityNote: c.capacityNote,
    isApproved: c.isApproved,
    assignmentApproved: c.isApproved,
    isVerifiedContact: c.isApproved,
    status: c.status,
  }));
}

// ================= Validator Admin Operations =================

export interface CreateRoadmapPhaseDto {
  orderIndex: number;
  title: string;
  description?: string;
  targetDays?: number;
  tasks: {
    orderIndex: number;
    title: string;
    description?: string;
    isRequired?: boolean;
    resourceUrl?: string;
    resourceTitle?: string;
  }[];
}

export async function createOrUpdateRoadmap(
  validatorId: string,
  competitionSlug: string,
  phases: CreateRoadmapPhaseDto[],
  institutionId: string
) {
  const comp = await prisma.competition.findUnique({
    where: { slug: competitionSlug },
  });

  if (!comp) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  return prisma.$transaction(async (tx) => {
    let roadmap = await tx.roadmap.findFirst({
      where: { competitionId: comp.id },
    });

    if (!roadmap) {
      roadmap = await tx.roadmap.create({
        data: {
          competitionId: comp.id,
          version: 1,
          status: 'published',
        },
      });
    } else {
      // Hapus fase lama & task untuk pembaruan kurikulum
      await tx.roadmapPhase.deleteMany({
        where: { roadmapId: roadmap.id },
      });
      roadmap = await tx.roadmap.update({
        where: { id: roadmap.id },
        data: { version: { increment: 1 } },
      });
    }

    for (const phaseDto of phases) {
      const createdPhase = await tx.roadmapPhase.create({
        data: {
          roadmapId: roadmap.id,
          orderIndex: phaseDto.orderIndex,
          title: phaseDto.title,
          description: phaseDto.description,
          targetDays: phaseDto.targetDays,
        },
      });

      if (phaseDto.tasks && phaseDto.tasks.length > 0) {
        await tx.roadmapTask.createMany({
          data: phaseDto.tasks.map((t) => ({
            phaseId: createdPhase.id,
            orderIndex: t.orderIndex,
            title: t.title,
            description: t.description,
            isRequired: t.isRequired ?? true,
            resourceUrl: t.resourceUrl,
            resourceTitle: t.resourceTitle,
          })),
        });
      }
    }

    await recordAuditEvent({
      institutionId,
      actorId: validatorId,
      action: 'ROADMAP_UPDATED',
      targetType: 'Roadmap',
      targetId: roadmap.id,
      metadata: { competitionSlug },
    });

    return roadmap;
  });
}

export interface CreateConsultantDto {
  competitionSlug: string;
  name: string;
  field: string;
  whatsappNumber: string;
  capacityNote?: string;
}

export async function createConsultantContact(
  validatorId: string,
  dto: CreateConsultantDto,
  institutionId: string
) {
  const comp = await prisma.competition.findUnique({
    where: { slug: dto.competitionSlug },
  });

  if (!comp) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  const consultant = await prisma.consultantContact.create({
    data: {
      competitionId: comp.id,
      name: dto.name,
      field: dto.field,
      whatsappNumber: dto.whatsappNumber,
      capacityNote: dto.capacityNote,
      isApproved: true,
      status: 'published',
    },
  });

  await recordAuditEvent({
    institutionId,
    actorId: validatorId,
    action: 'CONSULTANT_CONTACT_CREATED',
    targetType: 'ConsultantContact',
    targetId: consultant.id,
    metadata: { competitionSlug: dto.competitionSlug, name: dto.name },
  });

  return consultant;
}
