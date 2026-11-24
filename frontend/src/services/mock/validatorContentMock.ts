import competitionsData from '../../mocks/competitions.json';
import roadmapsData from '../../mocks/roadmaps.json';
import consultantsData from '../../mocks/consultants.json';
import type { CompetitionCategoryItem } from '../../types';
import type {
  IValidatorContentService,
  PointTemplateItem,
  ValidatorCompetitionItem,
  ValidatorConsultantItem,
  ValidatorRoadmapDetail,
  ValidatorSelectionItem,
} from '../types';

let competitions: ValidatorCompetitionItem[] = (competitionsData as any[]).map((c, idx) => {
  const min = c.komposisi?.min ?? 1;
  const max = c.komposisi?.max ?? 1;
  const isIndividu = min === 1 && max === 1;
  return {
    id: `demo-comp-${idx + 1}`,
    slug: c.slug,
    name: c.namaResmi,
    organizer: 'Belmawa Kemdiktisaintek',
    category: c.kategori,
    level: c.tingkat || 'nasional',
    format: isIndividu ? 'individu' : 'beregu',
    minTeamMembers: min,
    maxTeamMembers: max,
    registrationStatus: 'buka',
    requireRoles: !isIndividu && Array.isArray(c.komposisi?.peranWajib) && c.komposisi.peranWajib.length > 0,
    requireCrossStudyProgram: false,
    singleTeamPerCompetition: true,
    requiredRoles: c.komposisi?.peranWajib || [],
    requirements: c.syarat || [],
    scheduleTimeline: c.jadwal || [],
    description: c.deskripsi || '',
    status: 'published',
  };
});

const roadmapsBySlug: Record<string, ValidatorRoadmapDetail['phases']> = {};
for (const r of roadmapsData as any[]) {
  roadmapsBySlug[r.competitionSlug] = (r.fase || []).map((f: any, pIdx: number) => ({
    id: `mock-phase-${r.competitionSlug}-${pIdx + 1}`,
    orderIndex: pIdx + 1,
    title: f.judul,
    description: f.target || '',
    tasks: (f.latihan || []).map((title: string, tIdx: number) => ({
      id: `mock-task-${r.competitionSlug}-${pIdx + 1}-${tIdx + 1}`,
      orderIndex: tIdx + 1,
      title,
      isRequired: true,
    })),
  }));
}

let consultants: ValidatorConsultantItem[] = (consultantsData as any[]).map((c, idx) => {
  const comp = competitions[idx % Math.max(1, competitions.length)];
  return {
    id: c.id,
    name: c.nama,
    field: Array.isArray(c.bidang) ? c.bidang.join(', ') : 'Pembinaan Lomba',
    whatsappNumber: c.waMock || '',
    capacityNote: 'Jadwal konsultasi sesuai kesepakatan',
    isApproved: Boolean(c.assignmentApproved),
    status: c.assignmentApproved ? 'published' : 'archived',
    competition: comp ? { id: comp.id, slug: comp.slug, name: comp.name } : null,
  };
});

let selections: ValidatorSelectionItem[] = [];

let categories: CompetitionCategoryItem[] = [
  {
    id: 'cat-pkm',
    code: 'pkm',
    name: 'PKM & Karya Ilmiah',
    description: 'Program Kreativitas Mahasiswa dan karya tulis ilmiah',
    isActive: true,
    subCategories: [
      { id: 'sub-pkm-re', categoryId: 'cat-pkm', code: 'pkm-re', name: 'PKM Riset Eksakta', isActive: true },
      { id: 'sub-pkm-kc', categoryId: 'cat-pkm', code: 'pkm-kc', name: 'PKM Karsa Cipta', isActive: true },
    ],
  },
  {
    id: 'cat-tik',
    code: 'tik',
    name: 'Teknologi Informasi & Komputer',
    description: 'GEMASTIK, hackathon, dan rekayasa perangkat lunak',
    isActive: true,
    subCategories: [
      { id: 'sub-ppl', categoryId: 'cat-tik', code: 'ppl', name: 'Pengembangan Perangkat Lunak', isActive: true },
    ],
  },
];

const pointTemplates: PointTemplateItem[] = [
  {
    id: 'tpl-default',
    name: 'Standar Poin Kampus',
    description: 'Template bobot poin standar periode berjalan',
    version: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    rules: [
      { level: 'internasional', result: 'juara_1', points: 40 },
      { level: 'internasional', result: 'juara_2', points: 35 },
      { level: 'internasional', result: 'juara_3', points: 30 },
      { level: 'nasional', result: 'juara_1', points: 25 },
      { level: 'nasional', result: 'juara_2', points: 20 },
      { level: 'nasional', result: 'juara_3', points: 15 },
      { level: 'nasional', result: 'finalis', points: 10 },
      { level: 'lokal', result: 'juara_1', points: 10 },
    ],
  },
];

const customRulesByComp: Record<string, any[]> = {};

function enrichCompetition(item: ValidatorCompetitionItem): ValidatorCompetitionItem {
  const phases = roadmapsBySlug[item.slug] || [];
  const consCount = consultants.filter((c) => c.competition?.id === item.id || c.competition?.slug === item.slug).length;
  const selCount = selections.filter((s) => s.competitionId === item.id || s.competition?.id === item.id).length;
  const rulesCount = (customRulesByComp[item.id] || []).length;
  const cat = categories.find((c) => c.id === item.competitionCategoryId) || null;
  const tpl = pointTemplates.find((t) => t.id === item.pointTemplateId) || null;
  return {
    ...item,
    competitionCategory: cat ? { id: cat.id, name: cat.name, code: cat.code } : null,
    pointTemplate: tpl ? { id: tpl.id, name: tpl.name, version: tpl.version } : null,
    roadmaps: phases.length > 0 ? [{ id: `rm-${item.slug}`, status: 'published', _count: { phases: phases.length } }] : [],
    _count: {
      competitionPointRules: rulesCount,
      teams: 0,
      studentTargets: 0,
      consultantContacts: consCount,
      selections: selCount,
      roadmaps: phases.length > 0 ? 1 : 0,
    },
  };
}

export const validatorContentMockService: IValidatorContentService = {
  async getCompetitions() {
    return competitions.map(enrichCompetition);
  },
  async getCompetitionById(id) {
    const found = competitions.find((item) => item.id === id || item.slug === id);
    if (!found) throw new Error('Kompetisi tidak ditemukan');
    return enrichCompetition(found);
  },
  async createCompetition(data) {
    const item: ValidatorCompetitionItem = {
      ...data,
      id: `demo-${Date.now()}`,
      slug: `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}-${Date.now().toString().slice(-4)}`,
      status: 'draft',
    };
    competitions = [item, ...competitions];
    return enrichCompetition(item);
  },
  async updateCompetition(id, data) {
    let updated: ValidatorCompetitionItem | null = null;
    competitions = competitions.map((item) => {
      if (item.id !== id) return item;
      updated = { ...item, ...data };
      return updated;
    });
    if (!updated) throw new Error('Kompetisi tidak ditemukan');
    return enrichCompetition(updated);
  },
  async setCompetitionStatus(id, status) {
    competitions = competitions.map((item) => (item.id === id ? { ...item, status } : item));
    const item = competitions.find((entry) => entry.id === id);
    if (!item) throw new Error('Kompetisi tidak ditemukan');
    return enrichCompetition(item);
  },
  async getCompetitionDeletePreview(id) {
    const item = competitions.find((entry) => entry.id === id);
    if (!item) throw new Error('Kompetisi tidak ditemukan');
    const phases = roadmapsBySlug[item.slug] || [];
    const tasks = phases.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
    return {
      competition: {
        id: item.id,
        name: item.name,
        slug: item.slug,
        status: item.status,
      },
      counts: {
        targets: 0,
        activeTargets: 0,
        teams: 0,
        lockedSelectionTeams: 0,
        teamMembers: 0,
        teamJoinRequests: 0,
        teamInvites: 0,
        roadmaps: phases.length > 0 ? 1 : 0,
        roadmapPhases: phases.length,
        roadmapTasks: tasks,
        roadmapProgress: 0,
        consultants: consultants.filter((c) => c.competition?.id === item.id).length,
        selections: selections.filter((s) => s.competitionId === item.id).length,
        customPointRules: (customRulesByComp[item.id] || []).length,
        preservedAchievements: 0,
      },
      requiresTypedConfirmation: item.status === 'published',
    };
  },
  async deleteCompetition(id) {
    const item = competitions.find((entry) => entry.id === id);
    if (!item) throw new Error('Kompetisi tidak ditemukan');
    competitions = competitions.filter((entry) => entry.id !== id);
    consultants = consultants.filter((c) => c.competition?.id !== id);
    selections = selections.filter((s) => s.competitionId !== id);
    delete roadmapsBySlug[item.slug];
    delete customRulesByComp[id];
    return {
      deletedId: item.id,
      name: item.name,
      slug: item.slug,
      previousStatus: item.status,
      deletedSummary: {
        targets: 0,
        activeTargets: 0,
        teams: 0,
        lockedSelectionTeams: 0,
        teamMembers: 0,
        teamJoinRequests: 0,
        teamInvites: 0,
        roadmaps: 0,
        roadmapPhases: 0,
        roadmapTasks: 0,
        roadmapProgress: 0,
        consultants: 0,
        selections: 0,
        customPointRules: 0,
      },
      preservedAchievementsCount: 0,
    };
  },
  async getRoadmap(competitionSlug) {
    const comp = competitions.find((c) => c.slug === competitionSlug);
    return {
      id: `rm-${competitionSlug}`,
      competitionId: comp?.id || '',
      competitionSlug,
      competitionName: comp?.name || competitionSlug,
      phases: roadmapsBySlug[competitionSlug] || [],
    };
  },
  async saveRoadmap(competitionSlug, phases) {
    roadmapsBySlug[competitionSlug] = phases;
    return { competitionSlug, phases };
  },
  async getConsultants() {
    return [...consultants];
  },
  async createConsultant(data) {
    const comp = competitions.find((c) => c.slug === data.competitionSlug);
    const created: ValidatorConsultantItem = {
      id: `cons-${Date.now()}`,
      name: data.name,
      field: data.field,
      whatsappNumber: data.whatsappNumber,
      capacityNote: data.capacityNote || null,
      isApproved: data.isApproved ?? true,
      status: data.status ?? 'published',
      competition: comp ? { id: comp.id, slug: comp.slug, name: comp.name } : null,
    };
    consultants = [created, ...consultants];
    return created;
  },
  async updateConsultant(id, data) {
    let updated: ValidatorConsultantItem | null = null;
    consultants = consultants.map((c) => {
      if (c.id !== id) return c;
      updated = { ...c, ...data };
      return updated;
    });
    if (!updated) throw new Error('Kontak konsultan tidak ditemukan');
    return updated;
  },
  async deleteConsultant(id) {
    consultants = consultants.filter((c) => c.id !== id);
  },
  async getCompetitionParticipants() {
    return { teams: [], individuals: [] };
  },
  async getSelections() {
    return [...selections];
  },
  async saveSelection(data) {
    const comp = competitions.find((c) => c.id === data.competitionId);
    const created: ValidatorSelectionItem = {
      id: `sel-${Date.now()}`,
      competitionId: data.competitionId,
      teamId: data.teamId || null,
      userId: data.userId || null,
      stage: data.stage,
      result: data.result,
      organizerVerified: data.organizerVerified,
      notes: data.notes || null,
      competition: comp ? { id: comp.id, name: comp.name, slug: comp.slug, format: comp.format } : undefined,
    };
    selections = [created, ...selections];
    return created;
  },
  async getCompetitionCategories() {
    return [...categories];
  },
  async createCompetitionCategory(data) {
    const created: CompetitionCategoryItem = {
      id: `cat-${Date.now()}`,
      code: data.code,
      name: data.name,
      description: data.description,
      isActive: true,
      subCategories: [],
    };
    categories = [...categories, created];
    return created;
  },
  async createCompetitionSubCategory(data) {
    const created = {
      id: `sub-${Date.now()}`,
      categoryId: data.categoryId,
      code: data.code,
      name: data.name,
      description: data.description,
      isActive: true,
    };
    categories = categories.map((cat) =>
      cat.id === data.categoryId
        ? { ...cat, subCategories: [...cat.subCategories, created] }
        : cat
    );
    return created;
  },
  async getCompetitionPointConfig(competitionId) {
    const comp = competitions.find((c) => c.id === competitionId);
    return {
      competitionId,
      pointTemplateId: comp?.pointTemplateId || null,
      competitionCategory: categories.find((c) => c.id === comp?.competitionCategoryId) || null,
      pointDescription: comp?.pointDescription || '',
      customRules: customRulesByComp[competitionId] || [],
    };
  },
  async saveCompetitionPointConfig(competitionId, data) {
    competitions = competitions.map((c) =>
      c.id === competitionId
        ? {
            ...c,
            pointTemplateId: data.pointTemplateId ?? null,
            competitionCategoryId: data.competitionCategoryId ?? null,
            pointDescription: data.pointDescription ?? null,
          }
        : c
    );
    customRulesByComp[competitionId] = data.customRules || [];
    return { ok: true };
  },
  async getPointTemplates() {
    return [...pointTemplates];
  },
};
