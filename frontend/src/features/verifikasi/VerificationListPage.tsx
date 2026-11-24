import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { Achievement } from '../../types';
import { achievementService } from '@talenta/services';
import { AchievementTable } from '../prestasi/components/AchievementTable';
import { PageLoading } from '../../components/ui/Skeleton';
import { useAdminNav } from '../admin/AdminNavContext';

type VerificationStatusFilter = 'menunggu' | 'perlu_perbaikan' | 'disetujui' | 'ditolak' | 'semua';

const VALID_STATUSES: VerificationStatusFilter[] = [
  'menunggu',
  'perlu_perbaikan',
  'disetujui',
  'ditolak',
  'semua',
];

const STATUS_META: Record<
  VerificationStatusFilter,
  { label: string; description: string; badgeClass: string }
> = {
  menunggu: {
    label: 'Menunggu Verifikasi',
    description:
      'Periksa keabsahan berkas sertifikat, SK lomba, dan rekognisi yang menunggu keputusan verifikator.',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  perlu_perbaikan: {
    label: 'Perlu Perbaikan',
    description:
      'Pengajuan yang dikembalikan kepada mahasiswa untuk melengkapi data atau mengganti berkas bukti.',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  disetujui: {
    label: 'Telah Disetujui',
    description:
      'Prestasi yang telah disahkan validator dan tercatat pada statistik serta papan peringkat.',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  ditolak: {
    label: 'Ditolak',
    description:
      'Pengajuan prestasi yang tidak memenuhi syarat atau tidak dapat diverifikasi keabsahannya.',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  semua: {
    label: 'Semua Riwayat',
    description: 'Seluruh riwayat pengajuan prestasi mahasiswa lintas status verifikasi.',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export const VerificationListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const rawStatus = searchParams.get('status') as VerificationStatusFilter | null;
  const filterStatus: VerificationStatusFilter =
    rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : 'menunggu';

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { openMobileDrawer } = useAdminNav();

  const fetchQueue = (isCancelled?: () => boolean) => {
    setLoading(true);
    setLoadError(null);
    achievementService
      .getAll()
      .then((data) => {
        if (isCancelled?.()) return;
        setAchievements(data);
        setLoading(false);
      })
      .catch((err: any) => {
        if (isCancelled?.()) return;
        setLoadError(err?.message || 'Gagal memuat antrean verifikasi.');
        setLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    fetchQueue(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageLoading message="Memuat antrean verifikasi..." />;
  if (loadError) {
    return (
      <div className="p-10 text-center space-y-4 bg-white rounded-2xl border border-rose-200">
        <p role="alert" className="text-xs font-semibold text-rose-700">{loadError}</p>
        <button
          type="button"
          onClick={() => fetchQueue()}
          className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          Muat Ulang Antrean
        </button>
      </div>
    );
  }

  const filtered = achievements.filter((a) => {
    const matchStatus = filterStatus === 'semua' || a.status === filterStatus;
    const q = query.trim().toLowerCase();
    const matchQuery =
      !q ||
      a.nama.toLowerCase().includes(q) ||
      a.penyelenggara.toLowerCase().includes(q) ||
      (a.submitterName || '').toLowerCase().includes(q) ||
      (a.submitterNim || '').toLowerCase().includes(q) ||
      (a.subCategoryName || '').toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const statusMeta = STATUS_META[filterStatus];

  return (
    <div className="space-y-5">
      {/* Header Antrean */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Validasi Prestasi
            </span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusMeta.badgeClass}`}
            >
              {statusMeta.label}: {filtered.length}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Antrean Verifikasi Prestasi
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {statusMeta.description}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={openMobileDrawer}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shrink-0 cursor-pointer"
          >
            <Menu className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Status</span>
          </button>

          <div className="relative flex-1 sm:w-72">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama lomba, penyelenggara, nama/NIM mahasiswa..."
              aria-label="Cari antrean verifikasi"
              className="w-full pl-9 pr-3 py-2 min-h-[40px] text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
            />
          </div>
        </div>
      </div>

      <section aria-label={`Daftar pengajuan ${statusMeta.label}`}>
        <AchievementTable
          achievements={filtered}
          showSubmitter
          onSelect={(item) => navigate(`/admin/prestasi/${item.id}`)}
        />
      </section>
    </div>
  );
};
