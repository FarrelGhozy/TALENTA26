import React, { useEffect, useState } from 'react';
import { Award, Medal, Trophy, Calendar, Sparkles } from 'lucide-react';
import { achievementService } from '@talenta/services';
import { RankingResponse } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoading } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';

export const RankingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'lifetime'>('current');
  const [rankingData, setRankingData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const fetcher =
      activeTab === 'lifetime' && achievementService.getLifetimeRanking
        ? achievementService.getLifetimeRanking()
        : achievementService.getRanking
        ? achievementService.getRanking()
        : Promise.resolve({
            period: { id: 'mock', name: 'Tahun Akademik 2026/2027 Ganjil', year: 2026, semester: 'ganjil' },
            ranking: [],
          });

    fetcher
      .then((data) => {
        if (cancelled) return;
        setRankingData(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Gagal memuat rekapitulasi ranking prestasi mahasiswa.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  if (loading) return <PageLoading message="Memuat rekapitulasi ranking resmi institusi…" />;

  const ranking = rankingData?.ranking || [];
  const periodName = rankingData?.period?.name || 'Periode Akademik Aktif';

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow={periodName}
          title="Ranking Prestasi Mahasiswa"
          description="Papan peringkat resmi dari akumulasi poin prestasi lomba berstatus disetujui validator. Dihitung otomatis berdasar aturan poin berversi."
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <Tabs
          tabs={[
            { id: 'current', label: 'Periode Berjalan' },
            { id: 'lifetime', label: 'Sepanjang Waktu (Lifetime)' },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as 'current' | 'lifetime')}
        />

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-blue-700" />
          <span>{periodName}</span>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          {error}
        </p>
      ) : null}

      {!error && ranking.length === 0 ? (
        <EmptyState
          icon={<Trophy aria-hidden="true" className="h-6 w-6 text-slate-400" />}
          title="Belum Ada Prestasi di Papan Peringkat"
          description="Peringkat akan muncul secara otomatis setelah pengajuan prestasi lomba mahasiswa diverifikasi dan disahkan oleh validator."
        />
      ) : null}

      {ranking.length > 0 ? (
        <ol className="space-y-3" aria-label="Daftar peringkat prestasi mahasiswa">
          {ranking.map((item) => {
            const isTop1 = item.rank === 1;
            const isTop2 = item.rank === 2;
            const isTop3 = item.rank === 3;

            return (
              <li
                key={item.userId}
                className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border p-4 sm:p-5 transition-all ${
                  isTop1
                    ? 'border-amber-300 bg-gradient-to-r from-amber-50/50 via-white to-white shadow-xs'
                    : isTop2
                    ? 'border-slate-200 bg-white shadow-2xs'
                    : 'border-slate-200 bg-white shadow-2xs'
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl font-black text-sm shrink-0 ${
                    isTop1
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : isTop2
                      ? 'bg-slate-100 text-slate-800 border border-slate-300'
                      : isTop3
                      ? 'bg-orange-100 text-orange-900 border border-orange-200'
                      : 'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                  aria-label={`Peringkat ${item.rank}`}
                >
                  {isTop1 ? <Medal className="h-5 w-5 text-amber-700" /> : item.rank}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-slate-950 text-sm truncate">{item.fullName}</p>
                    {isTop1 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        Juara Puncak
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {item.studyProgram} • {item.approvedCount} prestasi lomba sah
                    {item.juara1Count > 0 ? ` • ${item.juara1Count} Juara 1` : ''}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-2xl font-black text-blue-800 leading-none">{item.points}</p>
                  <p className="flex items-center justify-end gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 mt-1">
                    <Award aria-hidden="true" className="h-3.5 w-3.5 text-blue-600" /> poin
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className="rounded-xl bg-slate-100/90 border border-slate-200 p-4 text-xs leading-relaxed text-slate-600">
        <strong className="block text-slate-800 font-bold mb-0.5">Perlindungan Data Pribadi:</strong>
        Papan peringkat publik hanya menampilkan nama mahasiswa, program studi, perolehan poin lomba resmi, dan jumlah capaian sah.
        Sesuai UU No. 27/2022 (UU PDP) dan kebijakan kampus, NIM, email, nomor kontak, serta dokumen berkas bukti sertifikat <strong>tidak dipublikasikan</strong>.
      </div>
    </div>
  );
};
