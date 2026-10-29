import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Trophy } from 'lucide-react';
import { AdminStats } from '../../services/types';
import { statsService, competitionService } from '../../services/factory';
import { Competition } from '../../types';
import { ScopeBanner } from './components/ScopeBanner';
import { StatCards } from './components/StatCards';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageLoading } from '../../components/ui/Skeleton';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([statsService.getAdminStats(), competitionService.getAll()])
      .then(([s, comps]) => {
        if (cancelled) return;
        setStats(s);
        setCompetitions(comps);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Gagal memuat statistik admin.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageLoading message="Memuat analitik dashboard admin..." />;
  if (error || !stats) {
    return (
      <div className="p-12 text-center space-y-4">
        <p role="alert" className="text-rose-500 text-xs font-semibold">{error || 'Gagal memuat statistik.'}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Muat Ulang
        </Button>
      </div>
    );
  }

  // Find max count to scale visual progress bars
  const maxCount = Math.max(1, ...Object.values(stats.pesertaPerKompetisi));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Pusat Kendali Pengelola
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
              Tahun Akademik 2026
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Dashboard Pengelola Program
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pemantauan operasional pembinaan, progres tim Belmawa, dan pendataan prestasi institusi.
          </p>
        </div>

        <Link to="/verifikasi">
          <Button size="md" variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Antrean Verifikasi Prestasi
          </Button>
        </Link>
      </div>

      <ScopeBanner />

      <StatCards stats={stats} />

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Distribusi Peserta per Kompetisi */}
        <Card className="bg-white border-slate-200/90 shadow-2xs">
          <CardHeader className="py-3.5">
            <CardTitle level={2} className="text-sm font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-blue-700" />
              <span>Distribusi Peserta per Kompetisi Belmawa</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {competitions.map((comp) => {
              const count = stats.pesertaPerKompetisi[comp.slug] || 0;
              const percent = Math.round((count / maxCount) * 100);

              return (
                <div
                  key={comp.slug}
                  className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-slate-800 truncate" title={comp.namaResmi}>
                      {comp.namaResmi}
                    </span>
                    <span
                      className="font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60 text-xs shrink-0"
                      aria-label={`${count} mahasiswa di ${comp.namaResmi}`}
                    >
                      {count} Mahasiswa
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden" aria-hidden="true">
                    <div
                      className="h-full bg-blue-700 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Ringkasan Verifikasi Prestasi */}
        <Card className="bg-white border-slate-200/90 shadow-2xs">
          <CardHeader className="py-3.5">
            <CardTitle level={2} className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Ringkasan Verifikasi Prestasi Mandiri</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/90 text-emerald-950 border border-emerald-200/70">
              <span className="font-semibold">Prestasi Sah / Disetujui Masuk SK</span>
              <strong className="text-emerald-700 text-sm font-black">{stats.pengajuanPrestasi.disetujui}</strong>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-amber-50/90 text-amber-950 border border-amber-200/70">
              <span className="font-semibold">Menunggu Pemeriksaan Berkas</span>
              <strong className="text-amber-700 text-sm font-black">{stats.pengajuanPrestasi.menunggu}</strong>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-orange-50/90 text-orange-950 border border-orange-200/70">
              <span className="font-semibold">Perlu Perbaikan oleh Mahasiswa</span>
              <strong className="text-orange-700 text-sm font-black">{stats.pengajuanPrestasi.perluPerbaikan}</strong>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50/90 text-rose-950 border border-rose-200/70">
              <span className="font-semibold">Ditolak / Dokumen Tidak Valid</span>
              <strong className="text-rose-700 text-sm font-black">{stats.pengajuanPrestasi.ditolak}</strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 mt-2">
              <strong>Prinsip Integritas Data:</strong> Hanya pengajuan berstatus <em>Disetujui</em> yang sah dihitung dalam pelaporan PDDIKTI dan akreditasi pemeringkatan kemahasiswaan institusi.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};