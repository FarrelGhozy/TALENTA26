import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Achievement } from '../../types';
import { achievementService } from '../../services/factory';
import { AchievementTable } from '../prestasi/components/AchievementTable';
import { Tabs } from '../../components/ui/Tabs';
import { PageLoading } from '../../components/ui/Skeleton';

export const VerificationListPage: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filterTab, setFilterTab] = useState('menunggu');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    achievementService
      .getAll()
      .then((data) => {
        if (cancelled) return;
        setAchievements(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageLoading message="Memuat antrean verifikasi..." />;

  const filtered = achievements.filter((a) => {
    const matchTab = filterTab === 'semua' || a.status === filterTab;
    const q = query.toLowerCase();
    const matchQuery = !q || a.nama.toLowerCase().includes(q) || a.penyelenggara.toLowerCase().includes(q);
    return matchTab && matchQuery;
  });

  const counts = {
    menunggu: achievements.filter((a) => a.status === 'menunggu').length,
    perlu_perbaikan: achievements.filter((a) => a.status === 'perlu_perbaikan').length,
    disetujui: achievements.filter((a) => a.status === 'disetujui').length,
    ditolak: achievements.filter((a) => a.status === 'ditolak').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Portal Verifikator
            </span>
            <span className="text-[11px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
              {counts.menunggu} Menunggu Tindakan
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Antrean Verifikasi Prestasi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Periksa keabsahan berkas sertifikat, SK lomba, dan rekognisi sebelum disahkan ke dashboard institusi.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama kegiatan atau penyelenggara..."
            aria-label="Cari antrean verifikasi"
            className="w-full pl-9 pr-3 py-2 min-h-[40px] text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
          />
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'menunggu', label: 'Menunggu Verifikasi', badge: counts.menunggu },
          { id: 'perlu_perbaikan', label: 'Perlu Perbaikan', badge: counts.perlu_perbaikan },
          { id: 'disetujui', label: 'Telah Disetujui', badge: counts.disetujui },
          { id: 'ditolak', label: 'Ditolak', badge: counts.ditolak },
          { id: 'semua', label: 'Semua Riwayat', badge: achievements.length },
        ]}
        activeTab={filterTab}
        onChange={setFilterTab}
      />

      <div id={`panel-${filterTab}`} role="tabpanel" aria-labelledby={`tab-${filterTab}`}>
        <AchievementTable
          achievements={filtered}
          onSelect={(item) => navigate(`/verifikasi/${item.id}`)}
        />
      </div>
    </div>
  );
};