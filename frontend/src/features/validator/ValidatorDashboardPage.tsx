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
      await dashboardService.downloadAchievementsCsv();
      notify('Rekapitulasi prestasi berhasil diunduh.', 'success');
    } catch (err: any) {
      notify(err.message || 'Gagal mengunduh rekapitulasi prestasi', 'error');
    } finally {
      setExporting(false);
    }
  };

  const modules = [
    {
      title: 'Kompetisi',
      description: 'Susun informasi lomba, syarat, aturan tim, jadwal, dan status publikasi.',
      icon: Trophy,
      status: stats?.competitions?.published ? `${stats.competitions.published} aktif` : 'Aktif',
      to: '/validator/konten',
    },
    {
      title: 'Roadmap',
      description: 'Kelola fase persiapan, tugas, tenggat, dan sumber belajar mahasiswa.',
      icon: BookOpenCheck,
      status: 'Terstruktur',
      to: '/validator/konten',
    },
    {
      title: 'Kontak konsultasi',
      description: 'Atur kontak WhatsApp konsultan yang telah disetujui untuk ditampilkan.',
      icon: Contact,
      status: stats?.users?.approvedConsultants
        ? `${stats.users.approvedConsultants} kontak`
        : 'Disetujui',
      to: '/validator/konten',
    },
    {
      title: 'Seleksi internal',
      description: 'Catat jadwal, peserta, hasil, dan status konfirmasi seleksi.',
      icon: UsersRound,
      status: stats?.teams?.terbentuk ? `${stats.teams.terbentuk} tim` : 'Proses',
    },
    {
      title: 'Kalender program',
      description: 'Periksa tenggat lomba dan jadwal internal yang akan datang.',
      icon: CalendarDays,
      status: stats?.upcomingDeadlines?.length
        ? `${stats.upcomingDeadlines.length} agenda`
        : 'Terkini',
    },
    {
      title: 'Validasi prestasi',
      description: 'Periksa data, bukti, revisi, dan keputusan pengajuan mahasiswa.',
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
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {exporting ? 'Mengunduh...' : 'Unduh Rekap CSV'}
          </Button>
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
