import React, { useEffect, useState } from 'react';
import {
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  Contact,
  Download,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { WorkspaceCard } from '../../components/ui/WorkspaceCard';
import { Button } from '../../components/ui/Button';
import { dashboardService } from '@talenta/services';
import { useToast } from '../../components/ui/Toast';

export const ValidatorDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [exportStatus, setExportStatus] = useState('');
  const [exportCategory, setExportCategory] = useState('');
  const [exporting, setExporting] = useState(false);
  const { notify } = useToast();

  useEffect(() => {
    let cancelled = false;
    dashboardService
      .getAdminDashboard()
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch(() => {
        // Fallback default jika gagal
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await dashboardService.downloadAchievementsCsv({
        status: exportStatus || undefined,
        category: exportCategory || undefined,
      });
      notify('Rekapitulasi prestasi berhasil diunduh.', 'success');
    } catch (err: any) {
      notify(err.message || 'Gagal mengunduh rekapitulasi prestasi', 'error');
    } finally {
      setExporting(false);
    }
  };

  const modules = [
    {
      title: 'Kompetisi & Poin',
      description: 'Susun informasi lomba, syarat, aturan tim, bobot poin sub-lomba, dan status publikasi.',
      icon: Trophy,
      status: stats?.competitions?.published ? `${stats.competitions.published} aktif` : 'Aktif',
      to: '/validator/konten?tab=kompetisi',
    },
    {
      title: 'Roadmap',
      description: 'Kelola fase persiapan, tugas, tenggat, dan sumber belajar mahasiswa secara non-destruktif.',
      icon: BookOpenCheck,
      status: 'Terstruktur',
      to: '/validator/konten?tab=roadmap',
    },
    {
      title: 'Kontak konsultasi',
      description: 'Atur kontak WhatsApp konsultan yang telah disetujui untuk ditampilkan.',
      icon: Contact,
      status: stats?.users?.approvedConsultants
        ? `${stats.users.approvedConsultants} kontak`
        : 'Disetujui',
      to: '/validator/konten?tab=konsultan',
    },
    {
      title: 'Seleksi internal',
      description: 'Catat jadwal, peserta tim/individu, hasil, dan status konfirmasi seleksi.',
      icon: UsersRound,
      status: stats?.teams?.terbentuk ? `${stats.teams.terbentuk} tim` : 'Proses',
      to: '/validator/konten?tab=seleksi',
    },
    {
      title: 'Aturan Poin & Sub-Lomba',
      description: 'Atur master jenis/sub-lomba dan bobot poin pengecualian perlombaan.',
      icon: CalendarDays,
      status: '3 Lapis',
      to: '/validator/konten?tab=poin',
    },
    {
      title: 'Validasi prestasi',
      description: 'Periksa data, bukti, revisi, dan keputusan pengajuan mahasiswa termasuk override poin.',
      icon: ClipboardCheck,
      to: '/validator/prestasi',
      status:
        stats?.queue?.pendingVerifications !== undefined
          ? `${stats.queue.pendingVerifications} menunggu`
          : 'Menunggu',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ruang kerja validator"
        title="Kelola data lomba dan prestasi"
        description="Gunakan satu ruang kerja untuk memperbarui program pembinaan, mengunduh rekapitulasi, dan memeriksa pengajuan prestasi mahasiswa."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter status ekspor CSV"
              value={exportStatus}
              onChange={(e) => setExportStatus(e.target.value)}
              className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
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
              className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
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
              onClick={handleExport}
              disabled={exporting}
              leftIcon={<Download className="w-4 h-4" aria-hidden="true" />}
            >
              {exporting ? 'Mengunduh...' : 'Unduh Rekap CSV'}
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <WorkspaceCard key={module.title} {...module} />
        ))}
      </div>
    </div>
  );
};
