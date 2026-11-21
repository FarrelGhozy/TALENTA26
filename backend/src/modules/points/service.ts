import { prisma } from '../../lib/prisma';
import { recordAuditEvent } from '../../lib/audit';
import { ConflictError, NotFoundError, ValidationError } from '../../app/middleware/error';
import type { AchievementCategory, AchievementLevel, AchievementResult } from '@prisma/client';

const VALID_LEVELS = new Set<string>(['lokal', 'nasional', 'internasional']);
const VALID_RESULTS = new Set<string>([
  'partisipasi',
  'finalis',
  'juara_3',
  'juara_2',
  'juara_1',
  'penghargaan_khusus',
]);

export interface PointResolution {
  calculatedPoints: number;
  pointSource: 'sub_competition_rule' | 'competition_rule' | 'template' | 'non_competition';
  ruleVersion: number;
  explanation: string;
}

export async function resolveAchievementPoints(input: {
  institutionId: string;
  category: AchievementCategory;
  level: AchievementLevel;
  result: AchievementResult;
  competitionId?: string | null;
  subCategoryId?: string | null;
}): Promise<PointResolution> {
  if (input.category !== 'kompetisi') {
    return {
      calculatedPoints: 0,
      pointSource: 'non_competition',
      ruleVersion: 1,
      explanation: `Kategori '${input.category}' bernilai 0 poin ranking (hanya kategori kompetisi lomba yang masuk ranking).`,
    };
  }

  // Lapis 2A: Cek aturan poin spesifik perlombaan + sub-lomba
  if (input.competitionId && input.subCategoryId) {
    const subCompRule = await prisma.competitionPointRule.findFirst({
      where: {
        institutionId: input.institutionId,
        competitionId: input.competitionId,
        subCategoryId: input.subCategoryId,
        level: input.level,
        result: input.result,
        isActive: true,
      },
      include: { competition: { select: { name: true } }, subCategory: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    if (subCompRule) {
      return {
        calculatedPoints: subCompRule.points,
        pointSource: 'sub_competition_rule',
        ruleVersion: 1,
        explanation:
          subCompRule.description ||
          `Aturan khusus lomba '${subCompRule.competition?.name}' sub-lomba '${subCompRule.subCategory?.name}' (${input.level} / ${input.result}) = ${subCompRule.points} poin.`,
      };
    }
  }

  // Lapis 2B: Cek aturan poin spesifik perlombaan (semua sub-lomba pada lomba tsb)
  if (input.competitionId) {
    const compRule = await prisma.competitionPointRule.findFirst({
      where: {
        institutionId: input.institutionId,
        competitionId: input.competitionId,
        subCategoryId: null,
        level: input.level,
        result: input.result,
        isActive: true,
      },
      include: { competition: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    if (compRule) {
      return {
        calculatedPoints: compRule.points,
        pointSource: 'competition_rule',
        ruleVersion: 1,
        explanation:
          compRule.description ||
          `Aturan poin khusus perlombaan '${compRule.competition?.name}' (${input.level} / ${input.result}) = ${compRule.points} poin.`,
      };
    }
  }

  // Lapis 2C: Cek aturan poin default pada sub-lomba (lintas lomba)
  if (input.subCategoryId) {
    const subRule = await prisma.competitionPointRule.findFirst({
      where: {
        institutionId: input.institutionId,
        competitionId: null,
        subCategoryId: input.subCategoryId,
        level: input.level,
        result: input.result,
        isActive: true,
      },
      include: { subCategory: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    if (subRule) {
      return {
        calculatedPoints: subRule.points,
        pointSource: 'sub_competition_rule',
        ruleVersion: 1,
        explanation:
          subRule.description ||
          `Aturan sub-lomba '${subRule.subCategory?.name}' (${input.level} / ${input.result}) = ${subRule.points} poin.`,
      };
    }
  }

  // Lapis 1A: Cek template poin yang ditautkan pada kompetisi (jika ada)
  if (input.competitionId) {
    const comp = await prisma.competition.findUnique({
      where: { id: input.competitionId },
      select: {
        name: true,
        pointTemplateId: true,
        pointDescription: true,
        pointTemplate: {
          select: {
            id: true,
            name: true,
            version: true,
            rules: {
              where: { level: input.level, result: input.result },
              take: 1,
            },
          },
        },
      },
    });
    const tplRule = comp?.pointTemplate?.rules?.[0];
    if (tplRule) {
      return {
        calculatedPoints: tplRule.points,
        pointSource: 'template',
        ruleVersion: comp?.pointTemplate?.version || tplRule.version,
        explanation:
          comp?.pointDescription ||
          `Template '${comp?.pointTemplate?.name}' v${comp?.pointTemplate?.version} untuk '${comp?.name}' (${input.level} / ${input.result}) = ${tplRule.points} poin.`,
      };
    }
  }

  // Lapis 1B: Fallback ke PointRule aktif terbaru tingkat institusi
  const activeRule = await prisma.pointRule.findFirst({
    where: {
      institutionId: input.institutionId,
      level: input.level,
      result: input.result,
      isActive: true,
    },
    include: { pointTemplate: { select: { name: true } } },
    orderBy: { version: 'desc' },
  });

  const pts = activeRule?.points ?? 0;
  const ver = activeRule?.version ?? 1;
  const tplName = activeRule?.pointTemplate?.name || `Standar Institusi v${ver}`;

  return {
    calculatedPoints: pts,
    pointSource: 'template',
    ruleVersion: ver,
    explanation: `${tplName} (${input.level} / ${input.result}) = ${pts} poin.`,
  };
}

// ==========================================
// 1. Template Poin (Super Admin)
// ==========================================
export async function getPointTemplates(institutionId: string) {
  return prisma.pointTemplate.findMany({
    where: { institutionId },
    include: {
      rules: {
        orderBy: [{ level: 'asc' }, { points: 'desc' }],
      },
    },
    orderBy: [{ isActive: 'desc' }, { version: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createPointTemplate(
  institutionId: string,
  actorId: string,
  dto: {
    name: string;
    description?: string;
    activateAsDefault?: boolean;
    rules: Array<{ level: AchievementLevel; result: AchievementResult; points: number }>;
  }
) {
  if (!dto.name || dto.name.trim().length < 3) {
    throw new ValidationError('Nama template poin minimal 3 karakter');
  }
  if (!Array.isArray(dto.rules) || dto.rules.length === 0) {
    throw new ValidationError('Daftar aturan bobot template wajib diisi');
  }
  for (const r of dto.rules) {
    if (!VALID_LEVELS.has(r.level) || !VALID_RESULTS.has(r.result)) {
      throw new ValidationError('Level atau hasil capaian pada template tidak valid');
    }
    if (typeof r.points !== 'number' || r.points < 0) {
      throw new ValidationError('Nilai poin template tidak boleh negatif');
    }
  }

  const latest = await prisma.pointRule.findFirst({
    where: { institutionId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  const created = await prisma.$transaction(async (tx) => {
    if (dto.activateAsDefault) {
      await tx.pointRule.updateMany({ where: { institutionId }, data: { isActive: false } });
      await tx.pointTemplate.updateMany({ where: { institutionId }, data: { isActive: false } });
    }

    const template = await tx.pointTemplate.create({
      data: {
        institutionId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        version: nextVersion,
        isActive: Boolean(dto.activateAsDefault),
      },
    });

    await tx.pointRule.createMany({
      data: dto.rules.map((r) => ({
        institutionId,
        pointTemplateId: template.id,
        version: nextVersion,
        level: r.level,
        result: r.result,
        points: r.points,
        isActive: Boolean(dto.activateAsDefault),
      })),
    });

    return tx.pointTemplate.findUnique({
      where: { id: template.id },
      include: { rules: true },
    });
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'POINT_TEMPLATE_CREATED',
    targetType: 'PointTemplate',
    targetId: created?.id || null,
    metadata: { name: dto.name.trim(), version: nextVersion, activateAsDefault: Boolean(dto.activateAsDefault) },
  });

  return created;
}

export async function activatePointTemplate(
  institutionId: string,
  templateId: string,
  actorId: string
) {
  const tpl = await prisma.pointTemplate.findUnique({
    where: { id: templateId },
    include: { rules: true },
  });
  if (!tpl || tpl.institutionId !== institutionId) {
    throw new NotFoundError('Template poin tidak ditemukan');
  }

  await prisma.$transaction([
    prisma.pointTemplate.updateMany({ where: { institutionId }, data: { isActive: false } }),
    prisma.pointRule.updateMany({ where: { institutionId }, data: { isActive: false } }),
    prisma.pointTemplate.update({ where: { id: templateId }, data: { isActive: true } }),
    prisma.pointRule.updateMany({ where: { pointTemplateId: templateId }, data: { isActive: true } }),
  ]);

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'POINT_TEMPLATE_ACTIVATED',
    targetType: 'PointTemplate',
    targetId: templateId,
    metadata: { name: tpl.name, version: tpl.version },
  });

  return tpl;
}

// ==========================================
// 2. Jenis & Sub-Lomba
// ==========================================
export async function getCompetitionCategories(institutionId: string, includeInactive = false) {
  return prisma.competitionCategory.findMany({
    where: {
      institutionId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      subCategories: {
        where: includeInactive ? {} : { isActive: true },
        include: {
          competitionPointRules: {
            where: { competitionId: null, isActive: true },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createCompetitionCategory(
  institutionId: string,
  actorId: string,
  dto: { code: string; name: string; description?: string }
) {
  const code = dto.code.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  if (!code || !dto.name?.trim()) {
    throw new ValidationError('Kode dan nama jenis lomba wajib diisi');
  }

  const existing = await prisma.competitionCategory.findUnique({
    where: { institutionId_code: { institutionId, code } },
  });
  if (existing) {
    throw new ConflictError('Kode jenis lomba sudah terdaftar');
  }

  const created = await prisma.competitionCategory.create({
    data: {
      institutionId,
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      isActive: true,
    },
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'COMPETITION_CATEGORY_CREATED',
    targetType: 'CompetitionCategory',
    targetId: created.id,
    metadata: { code, name: created.name },
  });

  return created;
}

export async function updateCompetitionCategory(
  institutionId: string,
  id: string,
  actorId: string,
  dto: { name?: string; description?: string; isActive?: boolean }
) {
  const cat = await prisma.competitionCategory.findUnique({ where: { id } });
  if (!cat || cat.institutionId !== institutionId) {
    throw new NotFoundError('Jenis lomba tidak ditemukan');
  }
  const updated = await prisma.competitionCategory.update({
    where: { id },
    data: {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    },
  });
  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'COMPETITION_CATEGORY_UPDATED',
    targetType: 'CompetitionCategory',
    targetId: id,
    metadata: dto,
  });
  return updated;
}

export async function createCompetitionSubCategory(
  institutionId: string,
  actorId: string,
  dto: {
    categoryId: string;
    code: string;
    name: string;
    description?: string;
    defaultPointsNote?: string;
    rules?: Array<{ level: AchievementLevel; result: AchievementResult; points: number; description?: string }>;
  }
) {
  const cat = await prisma.competitionCategory.findUnique({ where: { id: dto.categoryId } });
  if (!cat || cat.institutionId !== institutionId) {
    throw new NotFoundError('Jenis lomba induk tidak ditemukan');
  }
  const code = dto.code.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  if (!code || !dto.name?.trim()) {
    throw new ValidationError('Kode dan nama sub-lomba wajib diisi');
  }

  const created = await prisma.$transaction(async (tx) => {
    const sub = await tx.competitionSubCategory.create({
      data: {
        categoryId: cat.id,
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        defaultPointsNote: dto.defaultPointsNote?.trim() || null,
        isActive: true,
      },
    });

    if (dto.rules && dto.rules.length > 0) {
      for (const r of dto.rules) {
        if (!VALID_LEVELS.has(r.level) || !VALID_RESULTS.has(r.result) || r.points < 0) {
          throw new ValidationError('Aturan poin sub-lomba tidak valid');
        }
      }
      await tx.competitionPointRule.createMany({
        data: dto.rules.map((r) => ({
          institutionId,
          competitionId: null,
          subCategoryId: sub.id,
          level: r.level,
          result: r.result,
          points: r.points,
          description: r.description?.trim() || dto.defaultPointsNote?.trim() || null,
          isActive: true,
        })),
      });
    }

    return tx.competitionSubCategory.findUnique({
      where: { id: sub.id },
      include: { competitionPointRules: true },
    });
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'COMPETITION_SUBCATEGORY_CREATED',
    targetType: 'CompetitionSubCategory',
    targetId: created?.id || null,
    metadata: { categoryId: cat.id, code, name: dto.name.trim() },
  });

  return created;
}

export async function updateCompetitionSubCategory(
  institutionId: string,
  id: string,
  actorId: string,
  dto: {
    name?: string;
    description?: string;
    defaultPointsNote?: string;
    isActive?: boolean;
    rules?: Array<{ level: AchievementLevel; result: AchievementResult; points: number; description?: string }>;
  }
) {
  const sub = await prisma.competitionSubCategory.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!sub || sub.category.institutionId !== institutionId) {
    throw new NotFoundError('Sub-lomba tidak ditemukan');
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.competitionSubCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.defaultPointsNote !== undefined ? { defaultPointsNote: dto.defaultPointsNote.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    if (dto.rules) {
      await tx.competitionPointRule.deleteMany({
        where: { institutionId, competitionId: null, subCategoryId: id },
      });
      if (dto.rules.length > 0) {
        await tx.competitionPointRule.createMany({
          data: dto.rules.map((r) => ({
            institutionId,
            competitionId: null,
            subCategoryId: id,
            level: r.level,
            result: r.result,
            points: r.points,
            description: r.description?.trim() || dto.defaultPointsNote?.trim() || null,
            isActive: true,
          })),
        });
      }
    }

    return tx.competitionSubCategory.findUnique({
      where: { id },
      include: { competitionPointRules: { where: { competitionId: null, isActive: true } } },
    });
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'COMPETITION_SUBCATEGORY_UPDATED',
    targetType: 'CompetitionSubCategory',
    targetId: id,
    metadata: { name: dto.name },
  });

  return updated;
}

// ==========================================
// 3. Pengaturan Poin Per Perlombaan
// ==========================================
export async function getCompetitionPointConfig(competitionIdOrSlug: string, bySlug = false) {
  const comp = await prisma.competition.findFirst({
    where: bySlug
      ? { slug: competitionIdOrSlug, status: 'published' }
      : { id: competitionIdOrSlug },
    include: {
      competitionCategory: {
        include: { subCategories: { where: { isActive: true } } },
      },
      pointTemplate: {
        include: { rules: { orderBy: [{ level: 'asc' }, { points: 'desc' }] } },
      },
      competitionPointRules: {
        where: { isActive: true },
        include: { subCategory: { select: { id: true, name: true, code: true } } },
        orderBy: [{ level: 'asc' }, { points: 'desc' }],
      },
    },
  });

  if (!comp) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  return {
    competitionId: comp.id,
    slug: comp.slug,
    name: comp.name,
    pointTemplateId: comp.pointTemplateId,
    pointTemplate: comp.pointTemplate,
    pointDescription: comp.pointDescription,
    competitionCategory: comp.competitionCategory,
    customRules: comp.competitionPointRules,
  };
}

export async function saveCompetitionPointConfig(
  institutionId: string,
  competitionId: string,
  actorId: string,
  dto: {
    pointTemplateId?: string | null;
    competitionCategoryId?: string | null;
    pointDescription?: string | null;
    customRules?: Array<{
      subCategoryId?: string | null;
      level: AchievementLevel;
      result: AchievementResult;
      points: number;
      description?: string;
    }>;
  }
) {
  const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!comp || comp.institutionId !== institutionId) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  if (dto.customRules) {
    for (const r of dto.customRules) {
      if (!VALID_LEVELS.has(r.level) || !VALID_RESULTS.has(r.result) || r.points < 0) {
        throw new ValidationError('Aturan poin perlombaan tidak valid');
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.competition.update({
      where: { id: competitionId },
      data: {
        ...(dto.pointTemplateId !== undefined ? { pointTemplateId: dto.pointTemplateId || null } : {}),
        ...(dto.competitionCategoryId !== undefined
          ? { competitionCategoryId: dto.competitionCategoryId || null }
          : {}),
        ...(dto.pointDescription !== undefined
          ? { pointDescription: dto.pointDescription?.trim() || null }
          : {}),
        version: { increment: 1 },
      },
    });

    if (dto.customRules !== undefined) {
      await tx.competitionPointRule.deleteMany({
        where: { institutionId, competitionId },
      });

      if (dto.customRules.length > 0) {
        await tx.competitionPointRule.createMany({
          data: dto.customRules.map((r) => ({
            institutionId,
            competitionId,
            subCategoryId: r.subCategoryId || null,
            level: r.level,
            result: r.result,
            points: r.points,
            description: r.description?.trim() || dto.pointDescription?.trim() || null,
            isActive: true,
          })),
        });
      }
    }
  });

  await recordAuditEvent({
    institutionId,
    actorId,
    action: 'COMPETITION_POINT_RULES_UPDATED',
    targetType: 'Competition',
    targetId: competitionId,
    metadata: {
      pointTemplateId: dto.pointTemplateId,
      customRulesCount: dto.customRules?.length ?? 0,
    },
  });

  return getCompetitionPointConfig(competitionId, false);
}
