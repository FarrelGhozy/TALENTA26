import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardCheck,
  Download,
  Settings2,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { AdminStats } from '../../services/types';
import { statsService, competitionService, dashboardService } from '@talenta/services';
import { Competition } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { useAdminNav } from '../admin/AdminNavContext';
import { ScopeBanner } from './components/ScopeBanner';
import { StatCards } from './components/StatCards';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { WorkspaceCard } from '../../components/ui/WorkspaceCard';
import { PageLoading } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';

export const AdminDashboardPage: React.FC = () => {
  const { currentRole } = useAuth();
  const { rawDashboard: sharedRawDashboard, loadingCounts } = useAdminNav();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rawDashboard, setRawDashboard] = useState<any>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exportCategory, setExportCategory] = useState('');
  const [exporting, setExporting] = useState(false);
  const { notify } = useToast();
  const isSuperAdmin = currentRole === 'super_admin';

  useEffect(() => {
    if (loadingCounts) return;
    let cancelled = false;

    const mapRawToStats = (raw: any): AdminStats => {
      const queue = raw?.queue || {};
      const teams = raw?.teams || {};
      const users = raw?.users || {};
      const totalPengajuan =
        (queue.pendingVerifications || 0) +
        (queue.revisionNeededCount || 0) +
        (queue.approvedCount || 0) +
        (queue.rejectedCount || 0);
      return {
        totalMahasiswa: users.totalStudents || 0,
        pesertaPerKompetisi: raw?.distribution?.participantsByCompetition || {},
        totalTimTerbentuk: teams.terbentuk || 0,
        pengajuanPrestasi: {
          total: totalPengajuan,
          menunggu: queue.pendingVerifications || 0,
          perluPerbaikan: queue.revisionNeededCount || 0,
          disetujui: queue.approvedCount || 0,
          ditolak: queue.rejectedCount || 0,
        },
        delegasiTerkonfirmasi: raw?.selections?.confirmedPassed ?? 0,
      };
    };

    const loadData = async () => {
      try {
        const compsPromise = competitionService.getAll();
        if (sharedRawDashboard) {
          const comps = await compsPromise;
          if (cancelled) return;
          setRawDashboard(sharedRawDashboard);
          setStats(mapRawToStats(sharedRawDashboard));
          setCompetitions(comps);
          setLoading(false);
          return;
        }
        const [s, comps] = await Promise.all([
          statsService.getAdminStats(),
          compsPromise,
        ]);
        if (cancelled) return;
        setStats(s);
        setCompetitions(comps);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError('Gagal memuat statistik admin.');
        setLoading(false);
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [loadingCounts, sharedRawDashboard]);

  const handleExportData = async () => {
    setExporting(true);
    try {
      await dashboardService.downloadAchievementsCsv({
        status: exportStatus || undefined,
        category: exportCategory || undefined,
      });
      notify('Laporan rekapitulasi prestasi berhasil diunduh.', 'success');
    } catch (err: any) {
      notify(err.message || 'Gagal mengunduh rekapitulasi prestasi.', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <PageLoading message="Memuat dashboard & analitik admin..." />;
  if (error || !stats) {
    return (
      <div className="p-12 text-center space-y-4">
        <p role="alert" className="text-rose-500 text-xs font-semibold">
          {error || 'Gagal memuat statistik.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Muat Ulang
        </Button>
      </div>
    );
  }

  const maxCount = Math.max(1, ...Object.values(stats.pesertaPerKompetisi || {}));
  const pendingCount =
    rawDashboard?.queue?.pendingVerifications ?? stats.pengajuanPrestasi.menunggu;
  const publishedCompetitions = rawDashboard?.competitions?.published ?? competitions.length;
  const totalCompetitions =
    rawDashboard?.competitions?.total !== undefined
      ? Number(rawDashboard.competitions.total)
      : publishedCompetitions;

  const modules = [
    {
      title: 'Kelola Lomba Terpadu',
      description:
        'Buat lomba baru dan atur seluruh detail, aturan tim, roadmap persiapan, bobot poin, kontak konsultasi WA, serta seleksi internal langsung di dalam masing-masing kartu lomba.',
      icon: Trophy,
      status: `${publishedCompetitions}/${totalCompetitions} terbit`,
      to: '/admin/konten',
    },
    {
      title: 'Validasi Prestasi',
      description:
        'Periksa data, bukti sertifikat privat, revisi mahasiswa, kalkulasi poin otomatis, dan keputusan pengajuan prestasi.',
      icon: ClipboardCheck,
      to: '/admin/prestasi?status=menunggu',
      status: `${pendingCount} menunggu`,
    },
    ...(isSuperAdmin
      ? [
          {
            title: 'Pengaturan Sistem & Periode',
            description:
              'Kelola akun admin & mahasiswa, pergantian periode akademik, template bobot poin kampus, jejak audit, dan kesehatan layanan.',
            icon: Settings2,
            to: '/admin/sistem',
            status: 'Tata Kelola',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Portal Admin Terpadu
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
              Operasional
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Dashboard Pengelola Program
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Satu pusat kendali untuk analitik pembinaan, pengelolaan kompetisi, validasi prestasi, dan ekspor data institusi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            aria-label="Filter status ekspor CSV"
            value={exportStatus}
            onChange={(e) => setExportStatus(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 min-h-[38px]"
          >
            <option value="">Semua Status CSV</option>
            <option value="disetujui">Disetujui</option>
            <option value="menunggu">Menunggu</option>
            <option value="perlu_perbaikan">Perlu Perbaikan</option>
            <option value="ditolak">Ditolak</option>
          </select>
          <select
            aria-label="Filter kategori ekspor CSV"
            value={exportCategory}
            onChange={(e) => setExportCategory(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 min-h-[38px]"
          >
            <option value="">Semua Kategori CSV</option>
            <option value="kompetisi">Kompetisi</option>
            <option value="konferensi">Konferensi</option>
            <option value="olahraga">Olahraga</option>
            <option value="seni">Seni</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportData}
            disabled={exporting}
            leftIcon={<Download className="w-4 h-4" aria-hidden="true" />}
          >
            {exporting ? 'Mengunduh...' : 'Ekspor Data'}
          </Button>
          <Link to="/admin/prestasi?status=menunggu">
            <Button size="sm" rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}>
              Antrean Verifikasi
            </Button>
          </Link>
        </div>
      </div>

      <ScopeBanner />

      <StatCards stats={stats} />

      {/* Pintasan Modul Pengelolaan */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            Pintasan Modul Pengelolaan
          </h2>
          {isSuperAdmin && (
            <Link
              to="/admin/sistem"
              className="text-xs font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
            >
              Pengaturan Sistem &amp; Akun <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <WorkspaceCard key={module.title} {...module} />
          ))}
        </div>
      </section>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Distribusi Peserta per Kompetisi */}
        <Card className="bg-white border-slate-200/90 shadow-2xs">
          <CardHeader className="py-3.5">
            <CardTitle level={2} className="text-sm font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-blue-700" aria-hidden="true" />
              <span>Distribusi Peserta per Kompetisi</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {competitions.map((comp) => {
              const count = stats.pesertaPerKompetisi[comp.slug] || 0;
              const percent = Math.round((count / maxCount) * 100);

              return (
                <div
                  key={comp.slug}
                  className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2 hover:border-slate-300 transition-colors"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-extrabold text-slate-900 truncate" title={comp.namaResmi}>
                      {comp.namaResmi}
                    </span>
                    <span
                      className="font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60 text-xs shrink-0"
                      aria-label={`${count} mahasiswa di ${comp.namaResmi}`}
                    >
                      {count} Mahasiswa
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden" aria-hidden="true">
                    <div
                      className="h-full bg-gradient-to-r from-blue-700 to-indigo-600 rounded-full transition-all duration-300"
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
              <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Ringkasan Verifikasi Prestasi</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-3.5 rounded-xl bg-emerald-50/90 text-emerald-950 border border-emerald-200/80">
              <span className="font-bold">Prestasi Disetujui</span>
              <strong className="text-emerald-700 text-sm font-black">{stats.pengajuanPrestasi.disetujui}</strong>
            </div>

            <div className="flex justify-between items-center p-3.5 rounded-xl bg-amber-50/90 text-amber-950 border border-amber-200/80">
              <span className="font-bold">Menunggu Pemeriksaan Berkas</span>
              <strong className="text-amber-700 text-sm font-black">{stats.pengajuanPrestasi.menunggu}</strong>
            </div>

            <div className="flex justify-between items-center p-3.5 rounded-xl bg-orange-50/90 text-orange-950 border border-orange-200/80">
              <span className="font-bold">Perlu Perbaikan oleh Mahasiswa</span>
              <strong className="text-orange-700 text-sm font-black">{stats.pengajuanPrestasi.perluPerbaikan}</strong>
            </div>

            <div className="flex justify-between items-center p-3.5 rounded-xl bg-rose-50/90 text-rose-950 border border-rose-200/80">
              <span className="font-bold">Ditolak / Dokumen Tidak Valid</span>
              <strong className="text-rose-700 text-sm font-black">{stats.pengajuanPrestasi.ditolak}</strong>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 mt-2 leading-relaxed">
              <strong>Prinsip Integritas Data:</strong> Hanya pengajuan berstatus <em>Disetujui</em> oleh admin yang dihitung dalam rekapitulasi resmi dan papan ranking kemahasiswaan internal kampus.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
