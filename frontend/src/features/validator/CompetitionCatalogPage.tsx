import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FolderTree,
  Info,
  Plus,
  RotateCcw,
  Search,
  Trophy,
  X,
} from 'lucide-react';
import { validatorContentService } from '@talenta/services';
import type { ValidatorCompetitionItem } from '../../services/types';
import type { CompetitionCategoryItem } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoading } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { useAdminNav } from '../admin/AdminNavContext';
import {
  WORKSPACE_TAB_LABELS,
  normalizeWorkspaceTab,
  type WorkspaceTabId,
} from './types';
import { CompetitionCardAdmin } from './components/CompetitionCardAdmin';
import { CreateCompetitionModal } from './components/CreateCompetitionModal';
import { MasterCategoriesModal } from './components/MasterCategoriesModal';

type StatusFilter = 'semua' | 'published' | 'draft' | 'archived';

export const CompetitionCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useToast();
  const { refreshNavCounts, setActiveCompetitionName } = useAdminNav();

  const rawTabParam = searchParams.get('tab');
  const deepLinkTab: WorkspaceTabId | undefined =
    rawTabParam && ['poin', 'roadmap', 'konsultan', 'seleksi'].includes(rawTabParam)
      ? normalizeWorkspaceTab(rawTabParam)
      : undefined;

  const [items, setItems] = useState<ValidatorCompetitionItem[]>([]);
  const [categories, setCategories] = useState<CompetitionCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter & Pencarian
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'semua' | 'beregu' | 'individu'>('semua');
  const [levelFilter, setLevelFilter] = useState<'semua' | 'lokal' | 'nasional' | 'internasional'>('semua');

  // Modals & quick action states
  const [createOpen, setCreateOpen] = useState(false);
  const [masterCatOpen, setMasterCatOpen] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    setActiveCompetitionName(null);
  }, [setActiveCompetitionName]);

  const loadData = useCallback(async () => {
    try {
      setError('');
      const [comps, cats] = await Promise.all([
        validatorContentService.getCompetitions(),
        validatorContentService.getCompetitionCategories?.().catch(() => []) ?? Promise.resolve([]),
      ]);
      setItems(comps);
      setCategories(cats);
      void refreshNavCounts();
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat daftar perlombaan.');
    } finally {
      setLoading(false);
    }
  }, [refreshNavCounts]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const statusCounts = useMemo(() => {
    return {
      semua: items.length,
      published: items.filter((i) => i.status === 'published').length,
      draft: items.filter((i) => i.status === 'draft').length,
      archived: items.filter((i) => i.status === 'archived').length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== 'semua' && item.status !== statusFilter) return false;
      if (formatFilter !== 'semua' && item.format !== formatFilter) return false;
      if (levelFilter !== 'semua' && item.level.toLowerCase() !== levelFilter) return false;
      if (q) {
        const haystack = `${item.name} ${item.organizer} ${item.category} ${item.description}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, statusFilter, formatFilter, levelFilter, searchQuery]);

  const hasActiveFilter =
    statusFilter !== 'semua' ||
    formatFilter !== 'semua' ||
    levelFilter !== 'semua' ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setStatusFilter('semua');
    setFormatFilter('semua');
    setLevelFilter('semua');
    setSearchQuery('');
  };

  const handleQuickPublish = async (item: ValidatorCompetitionItem) => {
    setPublishingId(item.id);
    try {
      await validatorContentService.setCompetitionStatus(item.id, 'published');
      notify(`Kompetisi "${item.name}" berhasil diterbitkan ke katalog publik.`, 'success');
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'Gagal menerbitkan kompetisi.', 'error');
    } finally {
      setPublishingId(null);
    }
  };

  const handleCreated = async (created: ValidatorCompetitionItem, openImmediately: boolean) => {
    setCreateOpen(false);
    if (openImmediately) {
      void refreshNavCounts();
      navigate(`/admin/konten/${created.id}`);
      return;
    }
    if (statusFilter === 'published' || statusFilter === 'archived') {
      setStatusFilter('semua');
    }
    await loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kelola Lomba Terpadu"
        title="Kelola Lomba & Konten Pembinaan"
        description="Buat perlombaan baru lalu masuk ke masing-masing kartu lomba untuk mengatur detail, aturan tim, roadmap persiapan, bobot poin, kontak konsultasi, dan seleksi internal dalam satu ruang kerja."
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMasterCatOpen(true)}
              leftIcon={<FolderTree className="w-4 h-4" aria-hidden="true" />}
            >
              Master Jenis &amp; Sub-Lomba
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateOpen(true)}
              leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
            >
              Buat Lomba Baru
            </Button>
          </>
        }
      />

      {/* Banner Konteks Deep-Link dari URL lama (?tab=seleksi|roadmap|poin|konsultan) */}
      {deepLinkTab && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3.5 flex items-start justify-between gap-3 text-xs text-blue-950">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              Pilih salah satu <strong>kartu lomba</strong> di bawah ini untuk langsung membuka pengaturan{' '}
              <strong>{WORKSPACE_TAB_LABELS[deepLinkTab]}</strong> pada perlombaan tersebut.
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup arahan tab"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('tab');
              setSearchParams(next, { replace: true });
            }}
            className="text-blue-700 hover:bg-blue-100 rounded-lg p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Bilah Filter Status & Pencarian */}
      {!loading && !error && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3.5">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter status lomba">
            {(
              [
                { id: 'semua', label: 'Semua Lomba', count: statusCounts.semua },
                { id: 'published', label: 'Terbit', count: statusCounts.published },
                { id: 'draft', label: 'Draft', count: statusCounts.draft },
                { id: 'archived', label: 'Arsip', count: statusCounts.archived },
              ] as const
            ).map((pill) => {
              const active = statusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStatusFilter(pill.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-full leading-none ${
                      active ? 'bg-blue-800 text-blue-100' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Pencarian & Filter Format / Tingkat */}
          <div className="grid gap-3 md:grid-cols-12 items-center">
            <div className="md:col-span-6 relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari perlombaan"
                placeholder="Cari nama lomba, penyelenggara, atau kategori..."
                className="w-full min-h-[42px] pl-10 pr-9 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Bersihkan pencarian"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="md:col-span-3">
              <Select
                aria-label="Filter format lomba"
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value as 'semua' | 'beregu' | 'individu')}
                options={[
                  { value: 'semua', label: 'Semua Format' },
                  { value: 'beregu', label: 'Beregu (Tim)' },
                  { value: 'individu', label: 'Individu' },
                ]}
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-2">
              <div className="flex-1">
                <Select
                  aria-label="Filter tingkat lomba"
                  value={levelFilter}
                  onChange={(e) =>
                    setLevelFilter(
                      e.target.value as 'semua' | 'lokal' | 'nasional' | 'internasional'
                    )
                  }
                  options={[
                    { value: 'semua', label: 'Semua Tingkat' },
                    { value: 'lokal', label: 'Lokal' },
                    { value: 'nasional', label: 'Nasional' },
                    { value: 'internasional', label: 'Internasional' },
                  ]}
                />
              </div>
              {hasActiveFilter && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={resetFilters}
                  title="Reset filter"
                  aria-label="Reset seluruh filter"
                  className="px-2.5 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Error */}
      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs font-semibold text-rose-800">{error}</p>
          <Button size="sm" variant="outline" onClick={() => void loadData()}>
            Coba Muat Ulang
          </Button>
        </div>
      )}

      {/* Status Loading */}
      {loading ? (
        <PageLoading message="Memuat daftar kartu perlombaan..." />
      ) : !error && items.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-6 h-6" aria-hidden="true" />}
          title="Belum ada perlombaan terdaftar"
          description="Mulai dengan membuat perlombaan pertama. Setelah dibuat, klik kartunya untuk mengatur roadmap, aturan poin, kontak konsultan, dan seleksi internal."
          action={
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateOpen(true)}
              leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
            >
              Buat Lomba Pertama
            </Button>
          }
        />
      ) : !error && filteredItems.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6" aria-hidden="true" />}
          title="Tidak ada perlombaan yang cocok"
          description="Ubah kata kunci pencarian atau reset filter untuk melihat seluruh kartu perlombaan."
          action={
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={resetFilters}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Reset Filter
            </Button>
          }
        />
      ) : !error ? (
        <section aria-label="Daftar kartu perlombaan" className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Menampilkan <strong className="text-slate-800">{filteredItems.length}</strong> dari{' '}
              <strong className="text-slate-800">{items.length}</strong> perlombaan
            </span>
            <span className="hidden sm:inline">
              Klik <strong>Kelola Lomba</strong> pada kartu untuk mengatur seluruh isi perlombaan
            </span>
          </div>

          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <CompetitionCardAdmin
                key={item.id}
                competition={item}
                targetTab={deepLinkTab}
                publishingId={publishingId}
                onQuickPublish={handleQuickPublish}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Modal Buat Lomba Baru */}
      <CreateCompetitionModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      {/* Modal Master Jenis & Sub-Lomba Global */}
      <MasterCategoriesModal
        isOpen={masterCatOpen}
        onClose={() => setMasterCatOpen(false)}
        categories={categories}
        onRefresh={loadData}
      />
    </div>
  );
};
