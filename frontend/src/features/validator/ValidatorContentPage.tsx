import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Contact,
  Edit3,
  Loader2,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  Trophy,
} from 'lucide-react';
import { validatorContentService } from '@talenta/services';
import type {
  CompetitionDeletePreview,
  CompetitionParticipantOption,
  PointTemplateItem,
  ValidatorCompetitionItem,
  ValidatorConsultantItem,
  ValidatorRoadmapDetail,
} from '../../services/types';
import type { AchievementLevel, AchievementType, CompetitionCategoryItem } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoading } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { formatAchievementType } from '../../lib/format';
import { useAdminNav } from '../admin/AdminNavContext';

const VALID_TABS = ['kompetisi', 'poin', 'roadmap', 'konsultan', 'seleksi'] as const;

const TAB_LABELS: Record<(typeof VALID_TABS)[number], string> = {
  kompetisi: 'Kompetisi',
  poin: 'Aturan Poin & Sub-Lomba',
  roadmap: 'Roadmap',
  konsultan: 'Kontak Konsultasi',
  seleksi: 'Seleksi Internal',
};

const emptyCompForm = {
  name: '',
  organizer: '',
  category: '',
  level: 'nasional',
  format: 'beregu' as 'individu' | 'beregu',
  minTeamMembers: 2,
  maxTeamMembers: 5,
  registrationStatus: 'buka' as 'buka' | 'tutup',
  internalSelectionDeadline: '',
  requireRoles: false,
  requireCrossStudyProgram: false,
  singleTeamPerCompetition: true,
  requiredRolesText: 'Ketua Tim, Anggota',
  requirementsText: '',
  scheduleText: '',
  description: '',
  sourceUrl: '',
  pointDescription: '',
  competitionCategoryId: '',
  pointTemplateId: '',
};

export const ValidatorContentPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'kompetisi';
  const tab = VALID_TABS.includes(rawTab as any) ? rawTab : 'kompetisi';
  const setTab = (nextTab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', nextTab);
      return next;
    });
  };

  const { notify } = useToast();
  const { refreshNavCounts } = useAdminNav();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [items, setItems] = useState<ValidatorCompetitionItem[]>([]);
  const [categories, setCategories] = useState<CompetitionCategoryItem[]>([]);
  const [templates, setTemplates] = useState<PointTemplateItem[]>([]);
  const [consultants, setConsultants] = useState<ValidatorConsultantItem[]>([]);
  const [selections, setSelections] = useState<
    Array<{
      id: string;
      competitionId?: string;
      teamId?: string | null;
      userId?: string | null;
      stage: string;
      result: string;
      organizerVerified: boolean;
      notes?: string | null;
      competition?: { id: string; name: string };
      team?: { id: string; name: string } | null;
      user?: { id: string; fullName?: string | null; studentProfile?: { fullName: string; nim: string } | null } | null;
      participant?: { id: string; fullName?: string | null; studentProfile?: { fullName: string; nim: string } | null } | null;
    }>
  >([]);

  // Kompetisi create/edit/delete
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [compForm, setCompForm] = useState(emptyCompForm);
  const [deleteCompTarget, setDeleteCompTarget] = useState<ValidatorCompetitionItem | null>(null);
  const [deleteCompPreview, setDeleteCompPreview] = useState<CompetitionDeletePreview | null>(null);
  const [deleteCompLoading, setDeleteCompLoading] = useState(false);
  const [deleteCompError, setDeleteCompError] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingComp, setDeletingComp] = useState(false);

  // Poin & Master Jenis/Sub-Lomba
  const [selectedPointCompId, setSelectedPointCompId] = useState('');
  const [compPointTemplateId, setCompPointTemplateId] = useState('');
  const [compPointCategoryId, setCompPointCategoryId] = useState('');
  const [compPointDesc, setCompPointDesc] = useState('');
  const [customPointRules, setCustomPointRules] = useState<
    Array<{ subCategoryId: string; level: AchievementLevel; result: AchievementType; points: number; description: string }>
  >([]);
  const [newCatForm, setNewCatForm] = useState({ code: '', name: '', description: '' });
  const [newSubForm, setNewSubForm] = useState({ categoryId: '', code: '', name: '', description: '' });

  // Roadmap non-destruktif
  const [roadmapSlug, setRoadmapSlug] = useState('');
  const [phases, setPhases] = useState<ValidatorRoadmapDetail['phases']>([]);

  // Konsultan
  const [consultantForm, setConsultantForm] = useState({
    competitionSlug: '',
    name: '',
    field: '',
    whatsappNumber: '',
    capacityNote: '',
  });
  const [deleteConsultantTarget, setDeleteConsultantTarget] = useState<ValidatorConsultantItem | null>(null);

  // Seleksi
  const [selectionForm, setSelectionForm] = useState({
    competitionId: '',
    teamId: '',
    userId: '',
    stage: '',
    result: 'menunggu' as 'menunggu' | 'lolos' | 'tidak',
    organizerVerified: false,
    notes: '',
  });
  const [compParticipants, setCompParticipants] = useState<CompetitionParticipantOption>({
    teams: [],
    individuals: [],
  });

  const loadAll = async () => {
    try {
      setError('');
      const [comps, selRows, cats, tpls, cons] = await Promise.all([
        validatorContentService.getCompetitions(),
        validatorContentService.getSelections(),
        validatorContentService.getCompetitionCategories?.().catch(() => []) ?? Promise.resolve([]),
        validatorContentService.getPointTemplates?.().catch(() => []) ?? Promise.resolve([]),
        validatorContentService.getConsultants?.().catch(() => []) ?? Promise.resolve([]),
      ]);
      setItems(comps);
      setSelections(selRows);
      setCategories(cats);
      setTemplates(tpls);
      setConsultants(cons);
      void refreshNavCounts();
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat konten pembinaan validator.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  // Muat roadmap saat slug berubah
  useEffect(() => {
    if (!roadmapSlug || !validatorContentService.getRoadmap) {
      setPhases([]);
      return;
    }
    validatorContentService
      .getRoadmap(roadmapSlug)
      .then((res) => {
        setPhases(
          res.phases.length > 0
            ? res.phases
            : [{ orderIndex: 1, title: 'Tahap Persiapan Awal', description: '', tasks: [{ orderIndex: 1, title: '', isRequired: true }] }]
        );
      })
      .catch(() => setPhases([]));
  }, [roadmapSlug]);

  // Muat point config saat selectedPointCompId berubah
  useEffect(() => {
    if (!selectedPointCompId || !validatorContentService.getCompetitionPointConfig) return;
    validatorContentService
      .getCompetitionPointConfig(selectedPointCompId)
      .then((res) => {
        setCompPointTemplateId(res.pointTemplateId || '');
        setCompPointCategoryId(res.competitionCategory?.id || '');
        setCompPointDesc(res.pointDescription || '');
        setCustomPointRules(
          Array.isArray(res.customRules)
            ? res.customRules.map((r: any) => ({
                subCategoryId: r.subCategoryId || '',
                level: r.level,
                result: r.result,
                points: r.points,
                description: r.description || '',
              }))
            : []
        );
      })
      .catch(() => {});
  }, [selectedPointCompId]);

  // Muat peserta kompetisi saat selectionForm.competitionId berubah
  useEffect(() => {
    if (!selectionForm.competitionId || !validatorContentService.getCompetitionParticipants) {
      setCompParticipants({ teams: [], individuals: [] });
      return;
    }
    validatorContentService
      .getCompetitionParticipants(selectionForm.competitionId)
      .then((res: any) =>
        setCompParticipants({
          teams: Array.isArray(res?.teams)
            ? res.teams.map((t: any) => ({
                ...t,
                memberNames: Array.isArray(t.memberNames) ? t.memberNames : [],
              }))
            : [],
          individuals: Array.isArray(res?.individuals)
            ? res.individuals
            : Array.isArray(res?.students)
            ? res.students.map((s: any) => ({ ...s, userId: s.userId || s.id }))
            : [],
        })
      )
      .catch(() => setCompParticipants({ teams: [], individuals: [] }));
  }, [selectionForm.competitionId]);

  const startEditCompetition = (item: ValidatorCompetitionItem) => {
    setEditingCompId(item.id);
    setCompForm({
      name: item.name,
      organizer: item.organizer,
      category: item.category,
      level: item.level,
      format: item.format,
      minTeamMembers: item.minTeamMembers,
      maxTeamMembers: item.maxTeamMembers,
      registrationStatus: item.registrationStatus || 'buka',
      internalSelectionDeadline: item.internalSelectionDeadline
        ? new Date(item.internalSelectionDeadline).toISOString().split('T')[0]
        : '',
      requireRoles: Boolean(item.requireRoles),
      requireCrossStudyProgram: Boolean(item.requireCrossStudyProgram),
      singleTeamPerCompetition: item.singleTeamPerCompetition !== false,
      requiredRolesText: (item.requiredRoles || []).join(', '),
      requirementsText: (item.requirements || []).join('\n'),
      scheduleText: (item.scheduleTimeline || []).map((s) => `${s.label} | ${s.tanggal}`).join('\n'),
      description: item.description,
      sourceUrl: item.sourceUrl || '',
      pointDescription: item.pointDescription || '',
      competitionCategoryId: item.competitionCategoryId || '',
      pointTemplateId: item.pointTemplateId || '',
    });
  };

  const submitCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = compForm.format === 'individu' ? 1 : Number(compForm.minTeamMembers);
    const max = compForm.format === 'individu' ? 1 : Number(compForm.maxTeamMembers);
    const payload = {
      name: compForm.name.trim(),
      organizer: compForm.organizer.trim(),
      category: compForm.category.trim(),
      level: compForm.level,
      format: compForm.format,
      minTeamMembers: min,
      maxTeamMembers: max,
      registrationStatus: compForm.registrationStatus,
      internalSelectionDeadline: compForm.internalSelectionDeadline.trim() || null,
      requireRoles: compForm.format === 'individu' ? false : compForm.requireRoles,
      requireCrossStudyProgram:
        compForm.format === 'individu' ? false : compForm.requireCrossStudyProgram,
      singleTeamPerCompetition: compForm.singleTeamPerCompetition,
      requiredRoles: compForm.requiredRolesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      requirements: compForm.requirementsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      scheduleTimeline: compForm.scheduleText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [label, tanggal] = line.split('|').map((p) => p.trim());
          return { label: label || line, tanggal: tanggal || '-' };
        }),
      description: compForm.description.trim(),
      sourceUrl: compForm.sourceUrl.trim() || undefined,
      pointDescription: compForm.pointDescription.trim() || undefined,
      competitionCategoryId: compForm.competitionCategoryId || undefined,
      pointTemplateId: compForm.pointTemplateId || undefined,
    };

    try {
      if (editingCompId && validatorContentService.updateCompetition) {
        await validatorContentService.updateCompetition(editingCompId, payload);
        notify('Informasi perlombaan berhasil diperbarui.', 'success');
      } else {
        await validatorContentService.createCompetition(payload);
        notify('Draft perlombaan berhasil dibuat.', 'success');
      }
      setEditingCompId(null);
      setCompForm(emptyCompForm);
      await loadAll();
    } catch (err: any) {
      notify(err?.message || 'Gagal menyimpan perlombaan.', 'error');
    }
  };

  const handleSaveCompetitionPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPointCompId || !validatorContentService.saveCompetitionPointConfig) return;
    try {
      await validatorContentService.saveCompetitionPointConfig(selectedPointCompId, {
        pointTemplateId: compPointTemplateId || null,
        competitionCategoryId: compPointCategoryId || null,
        pointDescription: compPointDesc.trim() || null,
        customRules: customPointRules.map((r) => ({
          subCategoryId: r.subCategoryId || null,
          level: r.level,
          result: r.result,
          points: Number(r.points),
          description: r.description.trim() || undefined,
        })),
      });
      notify('Aturan poin perlombaan & keterangan berhasil disimpan.');
      await loadAll();
    } catch (err: any) {
      notify(err?.message || 'Gagal menyimpan aturan poin perlombaan.', 'error');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatorContentService.createCompetitionCategory) return;
    try {
      await validatorContentService.createCompetitionCategory(newCatForm);
      setNewCatForm({ code: '', name: '', description: '' });
      notify('Jenis lomba berhasil ditambahkan.');
      await loadAll();
    } catch (err: any) {
      notify(err?.message || 'Gagal menambah jenis lomba.', 'error');
    }
  };

  const handleCreateSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatorContentService.createCompetitionSubCategory) return;
    try {
      await validatorContentService.createCompetitionSubCategory(newSubForm);
      setNewSubForm({ categoryId: newSubForm.categoryId, code: '', name: '', description: '' });
      notify('Sub-lomba berhasil ditambahkan.');
      await loadAll();
    } catch (err: any) {
      notify(err?.message || 'Gagal menambah sub-lomba.', 'error');
    }
  };

  const handleSaveRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadmapSlug) return;
    try {
      const normalized = phases.map((p, pIdx) => ({
        id: p.id,
        orderIndex: pIdx + 1,
        title: p.title,
        description: p.description || undefined,
        tasks: (p.tasks || []).map((t, tIdx) => ({
          id: t.id,
          orderIndex: tIdx + 1,
          title: t.title,
          description: t.description || undefined,
          isRequired: t.isRequired ?? true,
        })),
      }));
      const saved: any = await validatorContentService.saveRoadmap(roadmapSlug, normalized);
      if (saved?.phases) setPhases(saved.phases);
      notify('Roadmap berhasil disimpan tanpa menghapus progres mahasiswa.', 'success');
    } catch (err: any) {
      notify(err?.message || 'Gagal menyimpan roadmap.', 'error');
    }
  };

  const handleSaveConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await validatorContentService.createConsultant(consultantForm);
      setConsultantForm({ competitionSlug: '', name: '', field: '', whatsappNumber: '', capacityNote: '' });
      notify('Kontak konsultasi berhasil diterbitkan.', 'success');
      await loadAll();
    } catch (err: any) {
      notify(err?.message || 'Gagal menyimpan kontak.', 'error');
    }
  };

  const handleDeleteConsultant = async () => {
    if (!deleteConsultantTarget || !validatorContentService.deleteConsultant) return;
    try {
      await validatorContentService.deleteConsultant(deleteConsultantTarget.id);
      setDeleteConsultantTarget(null);
      notify('Kontak konsultasi dihapus.');
      await loadAll();
    } catch (err: any) {
      notify(err?.message || 'Gagal menghapus kontak.', 'error');
    }
  };

  const openDeleteCompetitionModal = async (item: ValidatorCompetitionItem) => {
    setDeleteCompTarget(item);
    setDeleteCompPreview(null);
    setDeleteCompError('');
    setDeleteConfirmText('');

    if (!validatorContentService.getCompetitionDeletePreview) return;
    setDeleteCompLoading(true);
    try {
      const preview = await validatorContentService.getCompetitionDeletePreview(item.id);
      setDeleteCompPreview(preview);
    } catch (err: any) {
      setDeleteCompError(err?.message || 'Gagal memuat pratinjau dampak penghapusan lomba.');
    } finally {
      setDeleteCompLoading(false);
    }
  };

  const closeDeleteCompetitionModal = () => {
    if (deletingComp) return;
    setDeleteCompTarget(null);
    setDeleteCompPreview(null);
    setDeleteCompError('');
    setDeleteConfirmText('');
  };

  const handleConfirmDeleteCompetition = async () => {
    if (!deleteCompTarget || !validatorContentService.deleteCompetition) return;
    if (deleteCompPreview?.requiresTypedConfirmation && deleteConfirmText.trim().toUpperCase() !== 'HAPUS') {
      return;
    }

    setDeletingComp(true);
    try {
      const result = await validatorContentService.deleteCompetition(deleteCompTarget.id);

      if (editingCompId === deleteCompTarget.id) {
        setEditingCompId(null);
        setCompForm(emptyCompForm);
      }
      if (selectedPointCompId === deleteCompTarget.id) {
        setSelectedPointCompId('');
      }
      if (roadmapSlug === deleteCompTarget.slug) {
        setRoadmapSlug('');
        setPhases([]);
      }
      if (selectionForm.competitionId === deleteCompTarget.id) {
        setSelectionForm({
          competitionId: '',
          teamId: '',
          userId: '',
          stage: '',
          result: 'menunggu',
          organizerVerified: false,
          notes: '',
        });
      }

      setDeleteCompTarget(null);
      setDeleteCompPreview(null);
      setDeleteConfirmText('');
      setDeleteCompError('');

      const preservedNote =
        result.preservedAchievementsCount > 0
          ? ` ${result.preservedAchievementsCount} input prestasi mahasiswa tetap dipertahankan.`
          : '';
      notify(`Kompetisi "${result.name}" berhasil dihapus.${preservedNote}`, 'success');
      await loadAll();
    } catch (err: any) {
      notify(err?.message || 'Gagal menghapus kompetisi.', 'error');
    } finally {
      setDeletingComp(false);
    }
  };

  const handleSaveSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await validatorContentService.saveSelection({
        competitionId: selectionForm.competitionId,
        teamId: selectionForm.teamId || undefined,
        userId: selectionForm.userId || undefined,
        stage: selectionForm.stage,
        result: selectionForm.result,
        organizerVerified: selectionForm.organizerVerified,
        notes: selectionForm.notes || undefined,
      });
      setSelectionForm({
        competitionId: selectionForm.competitionId,
        teamId: '',
        userId: '',
        stage: '',
        result: 'menunggu',
        organizerVerified: false,
        notes: '',
      });
      notify('Hasil seleksi internal berhasil dicatat.', 'success');
      await loadAll();
    } catch (err: any) {
      notify(err?.message || 'Gagal menyimpan hasil seleksi.', 'error');
    }
  };

  const slugOptions = items.map((item) => ({ value: item.slug, label: item.name }));
  const selectedSelectionComp = items.find((c) => c.id === selectionForm.competitionId);
  const selectedPointComp = items.find((c) => c.id === selectedPointCompId);
  const activePointSubCats =
    categories.find((c) => c.id === compPointCategoryId)?.subCategories || [];

  const currentTabLabel = TAB_LABELS[tab as (typeof VALID_TABS)[number]] || 'Kompetisi';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Kelola Lomba · ${currentTabLabel}`}
        title="Kelola Lomba & Konten Pembinaan"
        description="Kelola katalog perlombaan, bobot poin per lomba/sub-lomba, roadmap non-destruktif, kontak konsultan, dan seleksi internal."
      />

      <div id={`panel-${tab}`} className="space-y-5">
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
        {loading ? <PageLoading message="Memuat konten pembinaan..." /> : null}

        {/* TAB 1: KOMPETISI */}
        {!loading && tab === 'kompetisi' && (
          <>
            <form onSubmit={submitCompetition} className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900">
                  {editingCompId ? 'Edit Informasi Perlombaan' : 'Buat Draft Perlombaan Baru'}
                </h2>
                {editingCompId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingCompId(null);
                      setCompForm(emptyCompForm);
                    }}
                  >
                    Batal Edit
                  </Button>
                )}
              </div>

              <Input label="Nama kompetisi" value={compForm.name} onChange={(e) => setCompForm({ ...compForm, name: e.target.value })} required />
              <Input label="Penyelenggara" value={compForm.organizer} onChange={(e) => setCompForm({ ...compForm, organizer: e.target.value })} required />
              <Input label="Kategori tampilan" value={compForm.category} onChange={(e) => setCompForm({ ...compForm, category: e.target.value })} placeholder="contoh: Teknologi / Kepenulisan / Sains" required />
              <Select
                label="Tingkat"
                value={compForm.level}
                onChange={(e) => setCompForm({ ...compForm, level: e.target.value })}
                options={[
                  { value: 'lokal', label: 'Lokal' },
                  { value: 'nasional', label: 'Nasional' },
                  { value: 'internasional', label: 'Internasional' },
                ]}
              />
              <Select
                label="Format Kepesertaan"
                value={compForm.format}
                onChange={(e) => setCompForm({ ...compForm, format: e.target.value as 'individu' | 'beregu' })}
                options={[
                  { value: 'individu', label: 'Individu' },
                  { value: 'beregu', label: 'Beregu (Tim)' },
                ]}
              />
              {compForm.format === 'beregu' && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Minimal Anggota Tim"
                    type="number"
                    min={1}
                    value={String(compForm.minTeamMembers)}
                    onChange={(e) => setCompForm({ ...compForm, minTeamMembers: Number(e.target.value) })}
                  />
                  <Input
                    label="Maksimal Anggota Tim"
                    type="number"
                    min={1}
                    value={String(compForm.maxTeamMembers)}
                    onChange={(e) => setCompForm({ ...compForm, maxTeamMembers: Number(e.target.value) })}
                  />
                </div>
              )}

              <Select
                label="Status Pendaftaran Internal"
                value={compForm.registrationStatus}
                onChange={(e) =>
                  setCompForm({ ...compForm, registrationStatus: e.target.value as 'buka' | 'tutup' })
                }
                options={[
                  { value: 'buka', label: 'Buka rekrutmen internal' },
                  { value: 'tutup', label: 'Tutup rekrutmen internal' },
                ]}
              />
              <Input
                label="Tenggat Seleksi Internal (Opsional)"
                type="date"
                value={compForm.internalSelectionDeadline}
                onChange={(e) =>
                  setCompForm({ ...compForm, internalSelectionDeadline: e.target.value })
                }
              />

              {compForm.format === 'beregu' && (
                <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-extrabold text-slate-800">
                    Syarat Tambahan Dinamis (Hanya aktifkan jika tertulis pada pedoman lomba)
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={compForm.requireRoles}
                        onChange={(e) => setCompForm({ ...compForm, requireRoles: e.target.checked })}
                        className="accent-blue-700"
                      />
                      <span className="font-semibold text-slate-700">
                        Peran anggota: {compForm.requireRoles ? 'Wajib terpenuhi' : 'Opsional (Saran)'}
                      </span>
                    </label>
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={compForm.requireCrossStudyProgram}
                        onChange={(e) =>
                          setCompForm({ ...compForm, requireCrossStudyProgram: e.target.checked })
                        }
                        className="accent-blue-700"
                      />
                      <span className="font-semibold text-slate-700">
                        Lintas prodi: {compForm.requireCrossStudyProgram ? 'Wajib (≥2 prodi)' : 'Opsional'}
                      </span>
                    </label>
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={compForm.singleTeamPerCompetition}
                        onChange={(e) =>
                          setCompForm({ ...compForm, singleTeamPerCompetition: e.target.checked })
                        }
                        className="accent-blue-700"
                      />
                      <span className="font-semibold text-slate-700">
                        Batas satu tim aktif per cabang
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <Input
                label="Daftar Peran Tim (pisahkan koma)"
                value={compForm.requiredRolesText}
                onChange={(e) => setCompForm({ ...compForm, requiredRolesText: e.target.value })}
              />
              <Input
                label="Tautan Pedoman Resmi & Sumber Aturan (Opsional)"
                value={compForm.sourceUrl}
                onChange={(e) => setCompForm({ ...compForm, sourceUrl: e.target.value })}
                placeholder="https://..."
              />

              <div className="sm:col-span-2 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-slate-600 space-y-1">
                <strong className="text-slate-800 block">Perilaku sistem otomatis berdasarkan aturan ini:</strong>
                <p>
                  &bull; <strong>Individu:</strong> fitur buat/cari tim disembunyikan dan mahasiswa langsung diarahkan ke Ruang Persiapan.
                  {' '}&bull; <strong>Beregu:</strong> tampilkan 3 jalur (Buat Tim, Cari Tim Terbuka, Gabung Kode); roadmap tetap terbuka sebelum anggota lengkap; tim penuh otomatis menutup pengajuan baru.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Perlombaan</label>
                <textarea
                  rows={2}
                  required
                  value={compForm.description}
                  onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Syarat Pendaftaran (1 baris per butir)</label>
                <textarea
                  rows={2}
                  value={compForm.requirementsText}
                  onChange={(e) => setCompForm({ ...compForm, requirementsText: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jadwal (Format: Tahap | Tanggal, 1 per baris)</label>
                <textarea
                  rows={2}
                  value={compForm.scheduleText}
                  onChange={(e) => setCompForm({ ...compForm, scheduleText: e.target.value })}
                  placeholder="Pengumpulan Proposal | 15 Maret 2026"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
                  {editingCompId ? 'Simpan Perubahan Perlombaan' : 'Buat Draft Perlombaan'}
                </Button>
              </div>
            </form>

            {items.length === 0 ? (
              <EmptyState icon={<Trophy className="h-6 w-6" />} title="Belum ada kompetisi" description="Buat draft pertama melalui formulir di atas." />
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong>{item.name}</strong>
                        <Badge color={item.status === 'published' ? 'emerald' : item.status === 'archived' ? 'slate' : 'amber'} size="sm">
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.organizer} • {item.format === 'individu' ? 'Individu (1 peserta)' : `Beregu (${item.minTeamMembers}–${item.maxTeamMembers} org)`}
                        {' • '}
                        {item.registrationStatus === 'tutup' ? 'Rekrutmen Tutup' : 'Rekrutmen Buka'}
                        {item.requireCrossStudyProgram ? ' • Wajib Lintas Prodi' : ''}
                        {item.requireRoles ? ' • Peran Wajib' : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEditCompetition(item)} leftIcon={<Edit3 className="h-3.5 w-3.5" aria-hidden="true" />}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPointCompId(item.id);
                          setTab('poin');
                        }}
                        leftIcon={<Award className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />}
                      >
                        Atur Poin
                      </Button>
                      {item.status !== 'published' && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await validatorContentService.setCompetitionStatus(item.id, 'published');
                              notify(`Kompetisi "${item.name}" berhasil diterbitkan.`);
                              await loadAll();
                            } catch (err: any) {
                              notify(err?.message || 'Gagal menerbitkan kompetisi.', 'error');
                            }
                          }}
                          leftIcon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}
                        >
                          Terbitkan
                        </Button>
                      )}
                      {item.status !== 'archived' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await validatorContentService.setCompetitionStatus(item.id, 'archived');
                              notify(`Kompetisi "${item.name}" berhasil diarsipkan.`, 'info');
                              await loadAll();
                            } catch (err: any) {
                              notify(err?.message || 'Gagal mengarsipkan kompetisi.', 'error');
                            }
                          }}
                        >
                          Arsipkan
                        </Button>
                      )}
                      {validatorContentService.deleteCompetition && (
                        <Button
                          size="sm"
                          variant="danger-outline"
                          onClick={() => void openDeleteCompetitionModal(item)}
                          leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                          aria-label={`Hapus kompetisi ${item.name}`}
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* TAB 2: ATURAN POIN PERLOMBAAN & MASTER JENIS / SUB-LOMBA */}
        {!loading && tab === 'poin' && (
          <div className="space-y-6">
            <form onSubmit={handleSaveCompetitionPoints} className="bg-white rounded-2xl border p-5 space-y-4">
              <h2 className="text-sm font-extrabold text-slate-900">Atur Template, Jenis Lomba & Bobot Poin Khusus Perlombaan</h2>
              <div className="grid gap-3.5 sm:grid-cols-3">
                <Select
                  label="Pilih Perlombaan"
                  value={selectedPointCompId}
                  onChange={(e) => setSelectedPointCompId(e.target.value)}
                  options={[{ value: '', label: 'Pilih perlombaan...' }, ...items.map((c) => ({ value: c.id, label: c.name }))]}
                  required
                />
                <Select
                  label="Template Poin Rujukan (Opsional)"
                  value={compPointTemplateId}
                  onChange={(e) => setCompPointTemplateId(e.target.value)}
                  options={[
                    { value: '', label: 'Ikuti Template Aktif Kampus' },
                    ...templates.map((t) => ({ value: t.id, label: `${t.name} (v${t.version})` })),
                  ]}
                />
                <Select
                  label="Jenis / Rumpun Lomba"
                  value={compPointCategoryId}
                  onChange={(e) => setCompPointCategoryId(e.target.value)}
                  options={[
                    { value: '', label: 'Pilih Jenis Lomba...' },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>

              {selectedPointComp && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan Bobot Poin Perlombaan (Tampil saat Verifikasi & Katalog)</label>
                    <textarea
                      rows={2}
                      value={compPointDesc}
                      onChange={(e) => setCompPointDesc(e.target.value)}
                      placeholder="Contoh: PKM dengan pendanaan Dikti memperoleh bobot khusus sesuai sub-lomba..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Pengecualian / Aturan Poin Khusus Perlombaan & Sub-Lomba</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                        onClick={() =>
                          setCustomPointRules((prev) => [
                            ...prev,
                            { subCategoryId: '', level: 'nasional', result: 'juara_1', points: 20, description: '' },
                          ])
                        }
                      >
                        Tambah Aturan Khusus
                      </Button>
                    </div>

                    {customPointRules.map((rule, idx) => (
                      <div key={idx} className="grid gap-2 sm:grid-cols-6 items-end p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <Select
                          label="Sub-Lomba"
                          value={rule.subCategoryId}
                          onChange={(e) => {
                            const next = [...customPointRules];
                            next[idx].subCategoryId = e.target.value;
                            setCustomPointRules(next);
                          }}
                          options={[
                            { value: '', label: 'Semua Sub-Lomba' },
                            ...activePointSubCats.map((s) => ({ value: s.id, label: s.name })),
                          ]}
                        />
                        <Select
                          label="Tingkat"
                          value={rule.level}
                          onChange={(e) => {
                            const next = [...customPointRules];
                            next[idx].level = e.target.value as AchievementLevel;
                            setCustomPointRules(next);
                          }}
                          options={[
                            { value: 'lokal', label: 'Lokal' },
                            { value: 'nasional', label: 'Nasional' },
                            { value: 'internasional', label: 'Internasional' },
                          ]}
                        />
                        <Select
                          label="Capaian"
                          value={rule.result}
                          onChange={(e) => {
                            const next = [...customPointRules];
                            next[idx].result = e.target.value as AchievementType;
                            setCustomPointRules(next);
                          }}
                          options={[
                            { value: 'juara_1', label: 'Juara 1' },
                            { value: 'juara_2', label: 'Juara 2' },
                            { value: 'juara_3', label: 'Juara 3' },
                            { value: 'finalis', label: 'Finalis' },
                            { value: 'penghargaan_khusus', label: 'Penghargaan Khusus' },
                            { value: 'partisipasi', label: 'Partisipasi' },
                          ]}
                        />
                        <Input
                          label="Poin"
                          type="number"
                          min={0}
                          value={String(rule.points)}
                          onChange={(e) => {
                            const next = [...customPointRules];
                            next[idx].points = Number(e.target.value);
                            setCustomPointRules(next);
                          }}
                        />
                        <Input
                          label="Keterangan"
                          value={rule.description}
                          onChange={(e) => {
                            const next = [...customPointRules];
                            next[idx].description = e.target.value;
                            setCustomPointRules(next);
                          }}
                          placeholder="Catatan..."
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="danger-outline"
                          className="px-2.5"
                          aria-label={`Hapus aturan poin khusus baris ${idx + 1}`}
                          title="Hapus aturan poin"
                          onClick={() => setCustomPointRules((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button type="submit" leftIcon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}>
                    Simpan Konfigurasi Poin Perlombaan
                  </Button>
                </>
              )}
            </form>

            {/* Master Jenis & Sub-Lomba */}
            <div className="grid gap-5 md:grid-cols-2">
              <form onSubmit={handleCreateCategory} className="bg-white rounded-2xl border p-5 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900">Tambah Master Jenis Lomba</h3>
                <Input label="Kode (Unik)" value={newCatForm.code} onChange={(e) => setNewCatForm({ ...newCatForm, code: e.target.value })} placeholder="contoh: debat-ilmiah" required />
                <Input label="Nama Jenis Lomba" value={newCatForm.name} onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })} placeholder="contoh: Debat & Bahasa" required />
                <Input label="Keterangan" value={newCatForm.description} onChange={(e) => setNewCatForm({ ...newCatForm, description: e.target.value })} />
                <Button type="submit" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}>Tambah Jenis</Button>
              </form>

              <form onSubmit={handleCreateSubCategory} className="bg-white rounded-2xl border p-5 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900">Tambah Master Sub-Lomba / Divisi</h3>
                <Select
                  label="Induk Jenis Lomba"
                  value={newSubForm.categoryId}
                  onChange={(e) => setNewSubForm({ ...newSubForm, categoryId: e.target.value })}
                  options={[{ value: '', label: 'Pilih jenis...' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
                  required
                />
                <Input label="Kode Sub-Lomba" value={newSubForm.code} onChange={(e) => setNewSubForm({ ...newSubForm, code: e.target.value })} placeholder="contoh: kdbi" required />
                <Input label="Nama Sub-Lomba" value={newSubForm.name} onChange={(e) => setNewSubForm({ ...newSubForm, name: e.target.value })} placeholder="contoh: Kompetisi Debat Bahasa Indonesia" required />
                <Button type="submit" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}>Tambah Sub-Lomba</Button>
              </form>
            </div>

            {categories.length > 0 && (
              <div className="bg-white rounded-2xl border p-5 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900">Daftar Master Jenis & Sub-Lomba ({categories.length})</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900">{cat.name}</strong>
                        <Badge color="blue" size="sm">{cat.subCategories.length} sub</Badge>
                      </div>
                      <ul className="space-y-1 text-slate-600 pl-3 list-disc">
                        {cat.subCategories.map((sub) => (
                          <li key={sub.id}>
                            {sub.name}
                            {sub.pointRules && sub.pointRules.length > 0
                              ? ` (${sub.pointRules.map((r) => `${formatAchievementType(r.result)}: ${r.points}`).join(', ')})`
                              : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ROADMAP NON-DESTRUKTIF */}
        {!loading && tab === 'roadmap' && (
          <form onSubmit={handleSaveRoadmap} className="space-y-4 rounded-2xl border bg-white p-5">
            <Select
              label="Pilih Kompetisi untuk Dikelola Roadmap-nya"
              value={roadmapSlug}
              onChange={(e) => setRoadmapSlug(e.target.value)}
              options={[{ value: '', label: 'Pilih kompetisi...' }, ...slugOptions]}
              required
            />

            {roadmapSlug && (
              <div className="space-y-4">
                {phases.map((phase, pIdx) => (
                  <div key={phase.id || `p-${pIdx}`} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs text-blue-900">Fase #{pIdx + 1}</strong>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger-outline"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" aria-hidden="true" />}
                        onClick={() => setPhases((prev) => prev.filter((_, i) => i !== pIdx))}
                      >
                        Hapus Fase
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Judul Fase"
                        value={phase.title}
                        onChange={(e) => {
                          const next = [...phases];
                          next[pIdx] = { ...next[pIdx], title: e.target.value };
                          setPhases(next);
                        }}
                        required
                      />
                      <Input
                        label="Ringkasan Fase"
                        value={phase.description || ''}
                        onChange={(e) => {
                          const next = [...phases];
                          next[pIdx] = { ...next[pIdx], description: e.target.value };
                          setPhases(next);
                        }}
                      />
                    </div>

                    <div className="space-y-2 pl-2 border-l-2 border-blue-200">
                      {(phase.tasks || []).map((task, tIdx) => (
                        <div key={task.id || `t-${tIdx}`} className="flex flex-col sm:flex-row gap-2 sm:items-end bg-white p-2.5 rounded-xl border border-slate-200">
                          <div className="flex-1">
                            <Input
                              label={`Tugas ${tIdx + 1}`}
                              value={task.title}
                              onChange={(e) => {
                                const next = [...phases];
                                const nextTasks = [...(next[pIdx].tasks || [])];
                                nextTasks[tIdx] = { ...nextTasks[tIdx], title: e.target.value };
                                next[pIdx] = { ...next[pIdx], tasks: nextTasks };
                                setPhases(next);
                              }}
                              required
                            />
                          </div>
                          <label className="inline-flex items-center gap-1.5 text-xs pb-2">
                            <input
                              type="checkbox"
                              checked={task.isRequired !== false}
                              onChange={(e) => {
                                const next = [...phases];
                                const nextTasks = [...(next[pIdx].tasks || [])];
                                nextTasks[tIdx] = { ...nextTasks[tIdx], isRequired: e.target.checked };
                                next[pIdx] = { ...next[pIdx], tasks: nextTasks };
                                setPhases(next);
                              }}
                            />
                            Wajib
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger-outline"
                            className="px-2.5"
                            aria-label={`Hapus tugas ${task.title || tIdx + 1}`}
                            title="Hapus tugas"
                            onClick={() => {
                              const next = [...phases];
                              next[pIdx] = {
                                ...next[pIdx],
                                tasks: next[pIdx].tasks.filter((_, idx) => idx !== tIdx),
                              };
                              setPhases(next);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                        onClick={() => {
                          const next = [...phases];
                          next[pIdx] = {
                            ...next[pIdx],
                            tasks: [...(next[pIdx].tasks || []), { orderIndex: (next[pIdx].tasks?.length || 0) + 1, title: '', isRequired: true }],
                          };
                          setPhases(next);
                        }}
                      >
                        Tambah Tugas
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
                    onClick={() =>
                      setPhases((prev) => [
                        ...prev,
                        { orderIndex: prev.length + 1, title: `Fase ${prev.length + 1}`, description: '', tasks: [{ orderIndex: 1, title: '', isRequired: true }] },
                      ])
                    }
                  >
                    Tambah Fase Baru
                  </Button>
                  <Button type="submit" leftIcon={<BookOpenCheck className="h-4 w-4" aria-hidden="true" />}>
                    Simpan Roadmap (Non-Destruktif)
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}

        {/* TAB 4: KONSULTAN */}
        {!loading && tab === 'konsultan' && (
          <div className="space-y-5">
            <form onSubmit={handleSaveConsultant} className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Select label="Kompetisi" value={consultantForm.competitionSlug} onChange={(e) => setConsultantForm({ ...consultantForm, competitionSlug: e.target.value })} options={[{ value: '', label: 'Pilih kompetisi' }, ...slugOptions]} required />
              </div>
              <Input label="Nama Dosen / Konsultan" value={consultantForm.name} onChange={(e) => setConsultantForm({ ...consultantForm, name: e.target.value })} required />
              <Input label="Bidang Keahlian" value={consultantForm.field} onChange={(e) => setConsultantForm({ ...consultantForm, field: e.target.value })} required />
              <Input label="Nomor WhatsApp (628...)" value={consultantForm.whatsappNumber} onChange={(e) => setConsultantForm({ ...consultantForm, whatsappNumber: e.target.value })} required />
              <Input label="Catatan Jadwal / Kuota" value={consultantForm.capacityNote} onChange={(e) => setConsultantForm({ ...consultantForm, capacityNote: e.target.value })} placeholder="contoh: Senin-Rabu 13.00-15.00 WIB" />
              <div className="sm:col-span-2">
                <Button type="submit" leftIcon={<Contact className="h-4 w-4" aria-hidden="true" />}>Terbitkan Kontak Konsultasi</Button>
              </div>
            </form>

            {consultants.length > 0 && (
              <ul className="space-y-2.5">
                {consultants.map((c) => (
                  <li key={c.id} className="p-4 rounded-xl border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-slate-900">{c.name}</strong>
                        <Badge color={c.status === 'published' ? 'emerald' : 'slate'} size="sm">{c.status}</Badge>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        {c.field} • {c.competition?.name || '-'} • WA {c.whatsappNumber}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {validatorContentService.updateConsultant && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const nextStatus = c.status === 'published' ? 'archived' : 'published';
                              await validatorContentService.updateConsultant?.(c.id, {
                                status: nextStatus,
                              });
                              notify(
                                nextStatus === 'published'
                                  ? `Kontak "${c.name}" berhasil diterbitkan.`
                                  : `Kontak "${c.name}" berhasil diarsipkan.`,
                                'info'
                              );
                              await loadAll();
                            } catch (err: any) {
                              notify(err?.message || 'Gagal memperbarui status kontak.', 'error');
                            }
                          }}
                        >
                          {c.status === 'published' ? 'Arsipkan' : 'Terbitkan'}
                        </Button>
                      )}
                      {validatorContentService.deleteConsultant && (
                        <Button
                          size="sm"
                          variant="danger-outline"
                          leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                          aria-label={`Hapus kontak ${c.name}`}
                          onClick={() => setDeleteConsultantTarget(c)}
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* TAB 5: SELEKSI INTERNAL (TIM & INDIVIDU) */}
        {!loading && tab === 'seleksi' && (
          <div className="space-y-5">
            <form onSubmit={handleSaveSelection} className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2">
              <Select
                label="Kompetisi"
                value={selectionForm.competitionId}
                onChange={(e) => setSelectionForm({ ...selectionForm, competitionId: e.target.value, teamId: '', userId: '' })}
                options={[{ value: '', label: 'Pilih kompetisi...' }, ...items.map((item) => ({ value: item.id, label: item.name }))]}
                required
              />

              {selectedSelectionComp?.format === 'individu' ? (
                <Select
                  label="Pilih Peserta Individu"
                  value={selectionForm.userId}
                  onChange={(e) => setSelectionForm({ ...selectionForm, userId: e.target.value, teamId: '' })}
                  options={[
                    { value: '', label: compParticipants.individuals.length ? 'Pilih mahasiswa...' : 'Belum ada mahasiswa memilih target lomba ini' },
                    ...compParticipants.individuals.map((ind) => ({
                      value: ind.userId,
                      label: `${ind.fullName} (${ind.nim} - ${ind.studyProgram})`,
                    })),
                  ]}
                  required
                />
              ) : (
                <Select
                  label="Pilih Tim Peserta"
                  value={selectionForm.teamId}
                  onChange={(e) => setSelectionForm({ ...selectionForm, teamId: e.target.value, userId: '' })}
                  options={[
                    { value: '', label: compParticipants.teams.length ? 'Pilih tim...' : 'Belum ada tim pada kompetisi ini' },
                    ...compParticipants.teams.map((t) => ({
                      value: t.id,
                      label: `${t.name} (${t.memberNames.join(', ') || t.status})`,
                    })),
                  ]}
                  required
                />
              )}

              <Input label="Tahap seleksi" value={selectionForm.stage} onChange={(e) => setSelectionForm({ ...selectionForm, stage: e.target.value })} placeholder="contoh: Presentasi Internal Kampus" required />
              <Select
                label="Hasil Seleksi"
                value={selectionForm.result}
                onChange={(e) => setSelectionForm({ ...selectionForm, result: e.target.value as 'menunggu' | 'lolos' | 'tidak' })}
                options={[
                  { value: 'menunggu', label: 'Menunggu' },
                  { value: 'lolos', label: 'Lolos (Delegasi Resmi)' },
                  { value: 'tidak', label: 'Tidak Lolos' },
                ]}
              />
              <div className="sm:col-span-2">
                <Input label="Catatan Berita Acara / Penilai (Opsional)" value={selectionForm.notes} onChange={(e) => setSelectionForm({ ...selectionForm, notes: e.target.value })} />
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={selectionForm.organizerVerified}
                  onChange={(e) => setSelectionForm({ ...selectionForm, organizerVerified: e.target.checked })}
                />
                Hasil telah dikonfirmasi panitia/pembina (mengunci keanggotaan tim selama proses seleksi)
              </label>
              <div className="sm:col-span-2">
                <Button type="submit">Simpan Hasil Seleksi</Button>
              </div>
            </form>

            {selections.length > 0 && (
              <ul className="space-y-2.5">
                {selections.map((item) => {
                  const participantName =
                    item.team?.name ||
                    item.participant?.studentProfile?.fullName ||
                    item.user?.studentProfile?.fullName ||
                    item.user?.fullName ||
                    'Peserta';
                  return (
                    <li
                      key={item.id}
                      className="rounded-xl border bg-white p-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>
                            {item.competition?.name || 'Kompetisi'} — {participantName}
                          </strong>
                          <Badge
                            color={
                              item.result === 'lolos'
                                ? 'emerald'
                                : item.result === 'tidak'
                                ? 'rose'
                                : 'amber'
                            }
                            size="sm"
                          >
                            {item.result}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.stage} • {item.organizerVerified ? 'Terkonfirmasi panitia' : 'Belum dikonfirmasi'}
                          {item.notes ? ` • Catatan: ${item.notes}` : ''}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectionForm({
                            competitionId: item.competitionId || item.competition?.id || '',
                            teamId: item.teamId || item.team?.id || '',
                            userId: item.userId || item.participant?.id || item.user?.id || '',
                            stage: item.stage,
                            result: (['menunggu', 'lolos', 'tidak'].includes(item.result)
                              ? item.result
                              : 'menunggu') as 'menunggu' | 'lolos' | 'tidak',
                            organizerVerified: Boolean(item.organizerVerified),
                            notes: item.notes || '',
                          });
                        }}
                      >
                        Tinjau / Nilai
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(deleteConsultantTarget)}
        onClose={() => setDeleteConsultantTarget(null)}
        title="Hapus Kontak Konsultan"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConsultantTarget(null)}>Batal</Button>
            <Button variant="danger" size="sm" onClick={handleDeleteConsultant}>Hapus Kontak</Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus kontak <strong>{deleteConsultantTarget?.name}</strong>?
        </p>
      </Modal>

      <Modal
        isOpen={Boolean(deleteCompTarget)}
        onClose={closeDeleteCompetitionModal}
        title="Hapus Perlombaan Permanen"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={closeDeleteCompetitionModal} disabled={deletingComp}>
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deletingComp}
              disabled={
                deleteCompLoading ||
                Boolean(deleteCompError) ||
                !deleteCompPreview ||
                (deleteCompPreview.requiresTypedConfirmation &&
                  deleteConfirmText.trim().toUpperCase() !== 'HAPUS')
              }
              onClick={handleConfirmDeleteCompetition}
              leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Hapus Permanen
            </Button>
          </div>
        }
      >
        {deleteCompTarget && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-900 truncate">{deleteCompTarget.name}</p>
                <p className="text-[11px] text-slate-500">{deleteCompTarget.organizer}</p>
              </div>
              <Badge
                color={
                  deleteCompTarget.status === 'published'
                    ? 'emerald'
                    : deleteCompTarget.status === 'archived'
                    ? 'slate'
                    : 'amber'
                }
                size="sm"
              >
                {deleteCompTarget.status}
              </Badge>
            </div>

            {deleteCompLoading && (
              <div className="flex items-center gap-2.5 py-6 justify-center text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" aria-hidden="true" />
                <span>Menghitung data terkait yang terdampak...</span>
              </div>
            )}

            {deleteCompError && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-rose-800 space-y-2">
                <p className="font-semibold">{deleteCompError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteCompTarget && void openDeleteCompetitionModal(deleteCompTarget)}
                >
                  Coba Muat Ulang
                </Button>
              </div>
            )}

            {deleteCompPreview && !deleteCompLoading && (
              <>
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-2">
                  <div className="flex items-start gap-2 text-rose-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-xs">Data terkait lomba yang akan ikut terhapus permanen:</p>
                      <p className="text-[11px] text-rose-700/90">
                        Tindakan ini tidak dapat dibatalkan. Gunakan tombol <strong>Arsipkan</strong> jika hanya ingin menyembunyikan lomba dari katalog.
                      </p>
                    </div>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-rose-900">
                    <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                      <span>Target mahasiswa</span>
                      <strong>
                        {deleteCompPreview.counts.targets}
                        {deleteCompPreview.counts.activeTargets > 0
                          ? ` (${deleteCompPreview.counts.activeTargets} aktif)`
                          : ''}
                      </strong>
                    </li>
                    <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                      <span>Tim &amp; keanggotaan</span>
                      <strong>
                        {deleteCompPreview.counts.teams} tim / {deleteCompPreview.counts.teamMembers} org
                      </strong>
                    </li>
                    <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                      <span>Pengajuan &amp; undangan tim</span>
                      <strong>
                        {deleteCompPreview.counts.teamJoinRequests + deleteCompPreview.counts.teamInvites}
                      </strong>
                    </li>
                    <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                      <span>Roadmap &amp; tugas persiapan</span>
                      <strong>
                        {deleteCompPreview.counts.roadmaps} ({deleteCompPreview.counts.roadmapTasks} tugas)
                      </strong>
                    </li>
                    <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                      <span>Progres checklist mahasiswa</span>
                      <strong>{deleteCompPreview.counts.roadmapProgress}</strong>
                    </li>
                    <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                      <span>Kontak konsultan</span>
                      <strong>{deleteCompPreview.counts.consultants}</strong>
                    </li>
                    <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                      <span>Catatan seleksi internal</span>
                      <strong>{deleteCompPreview.counts.selections}</strong>
                    </li>
                    <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                      <span>Aturan poin khusus lomba</span>
                      <strong>{deleteCompPreview.counts.customPointRules}</strong>
                    </li>
                  </ul>
                  {deleteCompPreview.counts.lockedSelectionTeams > 0 && (
                    <p className="text-[11px] font-semibold text-rose-800 bg-rose-100/80 rounded-lg px-2.5 py-1.5">
                      Perhatian: Terdapat {deleteCompPreview.counts.lockedSelectionTeams} tim berstatus terkunci seleksi internal yang akan ikut terhapus.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-start gap-2.5 text-emerald-900">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" aria-hidden="true" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs">
                      Input Prestasi Mahasiswa Tetap Aman ({deleteCompPreview.counts.preservedAchievements} pengajuan)
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      Seluruh input prestasi mahasiswa, berkas bukti, riwayat verifikasi, catatan poin, dan papan peringkat <strong>tidak akan terhapus</strong>. Tautan katalog lomba/tim pada prestasi tersebut hanya dilepas secara otomatis.
                    </p>
                  </div>
                </div>

                {deleteCompPreview.requiresTypedConfirmation && (
                  <div className="space-y-1.5 pt-1">
                    <Input
                      label='Ketik "HAPUS" untuk mengonfirmasi penghapusan permanen'
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="HAPUS"
                      autoComplete="off"
                    />
                    <p className="text-[11px] text-slate-500">
                      Konfirmasi ketik diwajibkan karena perlombaan ini berstatus terbit atau memiliki target/tim/seleksi terkait.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
