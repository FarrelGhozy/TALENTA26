import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  Award,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  Contact,
  ExternalLink,
  Send,
  Trash2,
  Trophy,
  Users,
  UsersRound,
} from 'lucide-react';
import { validatorContentService } from '@talenta/services';
import type {
  PointTemplateItem,
  ValidatorCompetitionItem,
  ValidatorConsultantItem,
  ValidatorSelectionItem,
} from '../../services/types';
import type { CompetitionCategoryItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoading } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { useAdminNav } from '../admin/AdminNavContext';
import {
  getLevelLabel,
  getRoadmapPhaseCount,
  getStatusBadgeColor,
  getStatusLabel,
  normalizeWorkspaceTab,
  type WorkspaceTabId,
} from './types';
import { DeleteCompetitionModal } from './components/DeleteCompetitionModal';
import { MasterCategoriesModal } from './components/MasterCategoriesModal';
import { CompetitionInfoTab } from './components/workspace/CompetitionInfoTab';
import { CompetitionRoadmapTab } from './components/workspace/CompetitionRoadmapTab';
import { CompetitionPointsTab } from './components/workspace/CompetitionPointsTab';
import { CompetitionConsultantsTab } from './components/workspace/CompetitionConsultantsTab';
import { CompetitionSelectionTab } from './components/workspace/CompetitionSelectionTab';

export const CompetitionWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useToast();
  const { refreshNavCounts, setActiveCompetitionName } = useAdminNav();

  const activeTab: WorkspaceTabId = normalizeWorkspaceTab(searchParams.get('tab'));
  const setTab = (nextTab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', normalizeWorkspaceTab(nextTab));
      return next;
    });
  };

  const [competition, setCompetition] = useState<ValidatorCompetitionItem | null>(null);
  const [categories, setCategories] = useState<CompetitionCategoryItem[]>([]);
  const [templates, setTemplates] = useState<PointTemplateItem[]>([]);
  const [allConsultants, setAllConsultants] = useState<ValidatorConsultantItem[]>([]);
  const [allSelections, setAllSelections] = useState<ValidatorSelectionItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [changingStatus, setChangingStatus] = useState<'published' | 'archived' | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [masterCatOpen, setMasterCatOpen] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setError('');
    setNotFound(false);

    try {
      const fetchComp = async (): Promise<ValidatorCompetitionItem | null> => {
        if (validatorContentService.getCompetitionById) {
          try {
            return await validatorContentService.getCompetitionById(id);
          } catch (err: any) {
            if (err?.status === 404) return null;
            throw err;
          }
        }
        const list = await validatorContentService.getCompetitions();
        return list.find((item) => item.id === id || item.slug === id) || null;
      };

      const [comp, cats, tpls, cons, sels] = await Promise.all([
        fetchComp(),
        validatorContentService.getCompetitionCategories?.().catch(() => []) ?? Promise.resolve([]),
        validatorContentService.getPointTemplates?.().catch(() => []) ?? Promise.resolve([]),
        validatorContentService.getConsultants?.().catch(() => []) ?? Promise.resolve([]),
        validatorContentService.getSelections().catch(() => []),
      ]);

      if (!comp) {
        setCompetition(null);
        setNotFound(true);
        setActiveCompetitionName(null);
      } else {
        setCompetition(comp);
        setActiveCompetitionName(comp.name);
      }
      setCategories(cats);
      setTemplates(tpls);
      setAllConsultants(cons);
      setAllSelections(sels);
      void refreshNavCounts();
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat ruang kelola perlombaan.');
    } finally {
      setLoading(false);
    }
  }, [id, refreshNavCounts, setActiveCompetitionName]);

  useEffect(() => {
    setLoading(true);
    void loadWorkspace();
    return () => {
      setActiveCompetitionName(null);
    };
  }, [loadWorkspace, setActiveCompetitionName]);

  const scopedConsultants = useMemo(() => {
    if (!competition) return [];
    return allConsultants.filter(
      (c) =>
        c.competition?.id === competition.id ||
        c.competition?.slug === competition.slug
    );
  }, [allConsultants, competition]);

  const scopedSelections = useMemo(() => {
    if (!competition) return [];
    return allSelections.filter(
      (s) =>
        s.competitionId === competition.id ||
        s.competition?.id === competition.id
    );
  }, [allSelections, competition]);

  const handleStatusChange = async (nextStatus: 'published' | 'archived') => {
    if (!competition) return;
    setChangingStatus(nextStatus);
    try {
      await validatorContentService.setCompetitionStatus(competition.id, nextStatus);
      notify(
        nextStatus === 'published'
          ? `Kompetisi "${competition.name}" berhasil diterbitkan ke katalog publik.`
          : `Kompetisi "${competition.name}" berhasil diarsipkan.`,
        nextStatus === 'published' ? 'success' : 'info'
      );
      await loadWorkspace();
    } catch (err: any) {
      notify(err?.message || 'Gagal memperbarui status kompetisi.', 'error');
    } finally {
      setChangingStatus(null);
    }
  };

  if (loading) {
    return <PageLoading message="Memuat ruang kelola perlombaan..." />;
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/konten"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Kembali ke Daftar Lomba</span>
        </Link>
        <EmptyState
          icon={<Trophy className="w-6 h-6" aria-hidden="true" />}
          title="Perlombaan tidak ditemukan"
          description="Kompetisi yang Anda cari mungkin telah dihapus atau ID tautan tidak valid."
          action={
            <Button type="button" size="sm" onClick={() => navigate('/admin/konten')}>
              Kembali ke Kelola Lomba
            </Button>
          }
        />
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/konten"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Kembali ke Daftar Lomba</span>
        </Link>
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-3">
          <p className="text-xs font-semibold text-rose-800">{error || 'Gagal memuat perlombaan.'}</p>
          <Button size="sm" variant="outline" onClick={() => void loadWorkspace()}>
            Coba Muat Ulang
          </Button>
        </div>
      </div>
    );
  }

  const phaseCount = getRoadmapPhaseCount(competition);
  const customRuleCount = competition._count?.competitionPointRules ?? 0;

  const tabs = [
    { id: 'info', label: 'Profil & Aturan' },
    { id: 'roadmap', label: 'Roadmap', badge: phaseCount },
    { id: 'poin', label: 'Aturan Poin', badge: customRuleCount > 0 ? `${customRuleCount} khusus` : undefined },
    { id: 'konsultan', label: 'Kontak Konsultasi', badge: scopedConsultants.length },
    { id: 'seleksi', label: 'Seleksi Internal', badge: scopedSelections.length },
  ];

  return (
    <div className="space-y-6">
      {/* Top Back Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/admin/konten"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 -ml-3 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-700 hover:bg-white transition-colors min-h-[38px]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Kembali ke Daftar Lomba</span>
        </Link>

        {competition.status === 'published' && (
          <Link
            to={`/kompetisi/${competition.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-xs font-bold text-blue-700 transition-colors min-h-[38px]"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Lihat Halaman Publik</span>
          </Link>
        )}
      </div>

      {/* Header Ruang Kelola Lomba */}
      <section className="rounded-3xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        <div
          className={`h-2 w-full bg-gradient-to-r ${
            competition.status === 'published'
              ? 'from-blue-700 via-blue-600 to-emerald-600'
              : competition.status === 'archived'
                ? 'from-slate-400 via-slate-500 to-slate-600'
                : 'from-amber-500 via-orange-500 to-amber-600'
          }`}
          aria-hidden="true"
        />

        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge color={getStatusBadgeColor(competition.status)} dot>
                  {getStatusLabel(competition.status)}
                </Badge>
                <Badge color={competition.registrationStatus === 'tutup' ? 'rose' : 'blue'}>
                  {competition.registrationStatus === 'tutup' ? 'Rekrutmen Tutup' : 'Rekrutmen Buka'}
                </Badge>
                <Badge color="slate">{competition.category}</Badge>
                <Badge color="slate">{getLevelLabel(competition.level)}</Badge>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-snug">
                {competition.name}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  {competition.organizer}
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                  {competition.format === 'individu'
                    ? 'Individu (1 peserta)'
                    : `Beregu (${competition.minTeamMembers}–${competition.maxTeamMembers} anggota)`}
                </span>
                {competition.academicPeriod?.name && (
                  <span className="text-slate-500">
                    Periode: <strong className="text-slate-700">{competition.academicPeriod.name}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Aksi Siklus Hidup Lomba */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {competition.status !== 'published' && (
                <Button
                  type="button"
                  size="sm"
                  isLoading={changingStatus === 'published'}
                  disabled={Boolean(changingStatus)}
                  onClick={() => void handleStatusChange('published')}
                  leftIcon={<Send className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  Terbitkan Lomba
                </Button>
              )}
              {competition.status !== 'archived' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  isLoading={changingStatus === 'archived'}
                  disabled={Boolean(changingStatus)}
                  onClick={() => void handleStatusChange('archived')}
                  leftIcon={<Archive className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  Arsipkan
                </Button>
              )}
              {validatorContentService.deleteCompetition && (
                <Button
                  type="button"
                  size="sm"
                  variant="danger-outline"
                  disabled={Boolean(changingStatus)}
                  onClick={() => setDeleteModalOpen(true)}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  Hapus
                </Button>
              )}
            </div>
          </div>

          {/* Strip Ringkasan Kesiapan Modul (bisa diklik langsung ke tab terkait) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setTab('roadmap')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                activeTab === 'roadmap'
                  ? 'bg-blue-50/80 border-blue-300'
                  : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/70'
              }`}
            >
              <BookOpenCheck
                className={`w-4 h-4 shrink-0 ${phaseCount > 0 ? 'text-emerald-600' : 'text-amber-500'}`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Roadmap
                </span>
                <span className="text-xs font-extrabold text-slate-900 truncate block">
                  {phaseCount > 0 ? `${phaseCount} Fase` : 'Belum diatur'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTab('poin')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                activeTab === 'poin'
                  ? 'bg-blue-50/80 border-blue-300'
                  : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/70'
              }`}
            >
              <Award className="w-4 h-4 shrink-0 text-blue-700" aria-hidden="true" />
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Aturan Poin
                </span>
                <span className="text-xs font-extrabold text-slate-900 truncate block">
                  {customRuleCount > 0 ? `${customRuleCount} Khusus` : 'Template Kampus'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTab('konsultan')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                activeTab === 'konsultan'
                  ? 'bg-blue-50/80 border-blue-300'
                  : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/70'
              }`}
            >
              <Contact
                className={`w-4 h-4 shrink-0 ${scopedConsultants.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Konsultan
                </span>
                <span className="text-xs font-extrabold text-slate-900 truncate block">
                  {scopedConsultants.length > 0 ? `${scopedConsultants.length} Kontak` : 'Belum ada'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTab('seleksi')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                activeTab === 'seleksi'
                  ? 'bg-blue-50/80 border-blue-300'
                  : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/70'
              }`}
            >
              {scopedSelections.some((s) => s.result === 'lolos' && s.organizerVerified) ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <UsersRound className="w-4 h-4 shrink-0 text-blue-700" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Seleksi Internal
                </span>
                <span className="text-xs font-extrabold text-slate-900 truncate block">
                  {scopedSelections.length} Catatan
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Navigasi Tab Internal Ruang Lomba */}
        <div className="px-5 sm:px-6 bg-slate-50/60 border-t border-slate-200/80">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setTab} />
        </div>
      </section>

      {/* Panel Isi Tab Aktif */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'info' && (
          <CompetitionInfoTab competition={competition} onUpdated={loadWorkspace} />
        )}

        {activeTab === 'roadmap' && (
          <CompetitionRoadmapTab competition={competition} onUpdated={loadWorkspace} />
        )}

        {activeTab === 'poin' && (
          <CompetitionPointsTab
            competition={competition}
            categories={categories}
            templates={templates}
            onOpenMasterCategories={() => setMasterCatOpen(true)}
            onUpdated={loadWorkspace}
          />
        )}

        {activeTab === 'konsultan' && (
          <CompetitionConsultantsTab
            competition={competition}
            consultants={scopedConsultants}
            onUpdated={loadWorkspace}
          />
        )}

        {activeTab === 'seleksi' && (
          <CompetitionSelectionTab
            competition={competition}
            selections={scopedSelections}
            onUpdated={loadWorkspace}
          />
        )}
      </div>

      {/* Modal Master Jenis & Sub-Lomba Global */}
      <MasterCategoriesModal
        isOpen={masterCatOpen}
        onClose={() => setMasterCatOpen(false)}
        categories={categories}
        onRefresh={loadWorkspace}
      />

      {/* Modal Hapus Permanen Lomba */}
      <DeleteCompetitionModal
        target={deleteModalOpen ? competition : null}
        onClose={() => setDeleteModalOpen(false)}
        onDeleted={() => {
          setDeleteModalOpen(false);
          void refreshNavCounts();
          navigate('/admin/konten', { replace: true });
        }}
      />
    </div>
  );
};
