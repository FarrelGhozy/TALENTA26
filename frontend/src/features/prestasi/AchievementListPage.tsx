import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Award, CheckCircle2, Clock, Plus, Search, Filter } from 'lucide-react';
import { Achievement } from '../../types';
import { achievementService } from '@talenta/services';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PageLoading } from '../../components/ui/Skeleton';
import { AchievementTable } from './components/AchievementTable';

type StatusFilter = 'semua' | 'menunggu' | 'perlu_perbaikan' | 'disetujui' | 'ditolak' | 'dibatalkan';

const VALID_STATUS_FILTERS: readonly StatusFilter[] = [
  'semua',
  'menunggu',
  'perlu_perbaikan',
  'disetujui',
  'ditolak',
  'dibatalkan',
] as const;

export const AchievementListPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const rawStatus = searchParams.get('status') as StatusFilter | null;
  const initialStatus: StatusFilter =
    rawStatus && VALID_STATUS_FILTERS.includes(rawStatus) ? rawStatus : 'semua';
  const [statusFilter, setStatusFilterState] = useState<StatusFilter>(initialStatus);

  useEffect(() => {
    if (rawStatus && VALID_STATUS_FILTERS.includes(rawStatus) && rawStatus !== statusFilter) {
      setStatusFilterState(rawStatus);
    }
  }, [rawStatus, statusFilter]);

  const setStatusFilter = (nextStatus: StatusFilter) => {
    setStatusFilterState(nextStatus);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextStatus === 'semua') next.delete('status');
        else next.set('status', nextStatus);
        return next;
      },
      { replace: true }
    );
  };
  const [query, setQuery] = useState('');

  const [cancelTarget, setCancelTarget] = useState<Achievement | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchAchievements = (isCancelled?: () => boolean) => {
    if (!currentUser) return;
    setLoading(true);
    setLoadError(null);
    achievementService
      .getAll(currentUser.id)
      .then((data) => {
        if (isCancelled?.()) return;
        setAchievements(data);
        setLoading(false);
      })
      .catch((err: any) => {
        if (isCancelled?.()) return;
        setLoadError(err?.message || 'Gagal memuat daftar prestasi.');
        setLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    fetchAchievements(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleConfirmCancel = async () => {
    if (cancelling || !cancelTarget || !achievementService.cancel) return;
    setCancelling(true);
    try {
      await achievementService.cancel(cancelTarget.id);
      notify('Pengajuan prestasi berhasil dibatalkan.');
      setCancelTarget(null);
      fetchAchievements();
    } catch (err: any) {
      notify(err?.message || 'Gagal membatalkan pengajuan.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <PageLoading message="Memuat rekap data prestasi..." />;
  if (loadError) {
    return (
      <div className="p-10 text-center space-y-4 bg-white rounded-2xl border border-rose-200">
        <p role="alert" className="text-xs font-semibold text-rose-700">{loadError}</p>
        <Button size="sm" variant="outline" onClick={() => fetchAchievements()}>
          Muat Ulang
        </Button>
      </div>
    );
  }

  const verifiedCount = achievements.filter((a) => a.status === 'disetujui').length;
  const pendingCount = achievements.filter((a) => a.status === 'menunggu').length;

  const filtered = achievements.filter((a) => {
    const matchStatus = statusFilter === 'semua' || a.status === statusFilter;
    const q = query.toLowerCase();
    const matchQuery =
      !q || a.nama.toLowerCase().includes(q) || a.penyelenggara.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const filters: { id: StatusFilter; label: string }[] = [
    { id: 'semua', label: 'Semua Status' },
    { id: 'menunggu', label: 'Menunggu Verifikasi' },
    { id: 'perlu_perbaikan', label: 'Perlu Perbaikan' },
    { id: 'disetujui', label: 'Telah Disetujui' },
    { id: 'ditolak', label: 'Ditolak' },
    { id: 'dibatalkan', label: 'Dibatalkan' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Portofolio Capaian
            </span>
            <span className="text-[11px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
              {achievements.length} Total Prestasi
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Pencatatan Prestasi Mahasiswa
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Rekam jejak seluruh capaian kompetisi pembinaan Belmawa dan keikutsertaan mandiri yang telah diajukan.
          </p>
        </div>

        <Link to="/app/prestasi/baru">
          <Button size="md" leftIcon={<Plus className="w-4 h-4" />}>
            Ajukan Prestasi Mandiri
          </Button>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Prestasi Terverifikasi
            </span>
            <div className="text-3xl font-black text-emerald-600 mt-1" aria-label={`${verifiedCount} terverifikasi`}>
              {verifiedCount}
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5 font-medium">Terverifikasi oleh validator USC</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Menunggu Verifikasi
            </span>
            <div className="text-3xl font-black text-amber-500 mt-1" aria-label={`${pendingCount} menunggu`}>
              {pendingCount}
            </div>
            <p className="text-[10px] text-amber-700 mt-0.5 font-medium">Dalam telaah verifikator</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Total Pengajuan
            </span>
            <div className="text-3xl font-black text-slate-800 mt-1">
              {achievements.length}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Seluruh rekam jejak</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama kegiatan / penyelenggara..."
              aria-label="Cari prestasi"
              className="w-full pl-9 pr-3 py-2 min-h-[40px] text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
          <p className="text-xs text-slate-500 font-medium" aria-live="polite">
            <span className="font-bold text-slate-800">{filtered.length}</span> pengajuan ditampilkan
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 scrollbar-none" role="group" aria-label="Filter status prestasi">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 inline-flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Status:
          </span>
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              aria-pressed={statusFilter === f.id}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all min-h-[36px] ${
                statusFilter === f.id
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 border border-slate-200/80 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            Daftar Riwayat Pengajuan
          </h2>
        </div>
        <AchievementTable
          achievements={filtered}
          studentDetailBasePath="/app/prestasi"
          currentUserId={currentUser?.id}
          onRevise={(item) => navigate(`/app/prestasi/${item.id}`)}
          onCancel={achievementService.cancel ? (item) => setCancelTarget(item) : undefined}
        />
      </div>

      <Modal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Batalkan Pengajuan Prestasi"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCancelTarget(null)}>
              Kembali
            </Button>
            <Button variant="danger" size="sm" isLoading={cancelling} onClick={handleConfirmCancel}>
              Ya, Batalkan Pengajuan
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Apakah Anda yakin ingin membatalkan pengajuan <strong className="text-slate-900">{cancelTarget?.nama}</strong>? Pengajuan yang dibatalkan tidak akan diproses oleh validator.
        </p>
      </Modal>
    </div>
  );
};
