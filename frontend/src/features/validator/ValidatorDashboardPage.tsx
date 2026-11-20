import React from 'react';
import { BookOpenCheck, CalendarDays, ClipboardCheck, Contact, Trophy, UsersRound } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { WorkspaceCard } from '../../components/ui/WorkspaceCard';

const modules = [
  { title: 'Kompetisi', description: 'Susun informasi lomba, syarat, aturan tim, jadwal, dan status publikasi.', icon: Trophy, status: '4 aktif' },
  { title: 'Roadmap', description: 'Kelola fase persiapan, tugas, tenggat, dan sumber belajar mahasiswa.', icon: BookOpenCheck, status: '2 terbit' },
  { title: 'Kontak konsultasi', description: 'Atur kontak WhatsApp konsultan yang telah disetujui untuk ditampilkan.', icon: Contact, status: '3 kontak' },
  { title: 'Seleksi internal', description: 'Catat jadwal, peserta, hasil, dan status konfirmasi seleksi.', icon: UsersRound, status: '2 proses' },
  { title: 'Kalender program', description: 'Periksa tenggat lomba dan jadwal internal yang akan datang.', icon: CalendarDays, status: '6 agenda' },
  { title: 'Validasi prestasi', description: 'Periksa data, bukti, revisi, dan keputusan pengajuan mahasiswa.', icon: ClipboardCheck, to: '/validator/prestasi', status: '2 menunggu' },
];

export const ValidatorDashboardPage: React.FC = () => (
  <div className="space-y-6">
    <PageHeader
      eyebrow="Ruang kerja validator"
      title="Kelola data lomba dan prestasi"
      description="Gunakan satu ruang kerja untuk memperbarui program pembinaan dan memeriksa pengajuan mahasiswa. Seluruh data pada tahap ini adalah simulasi."
    />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {modules.map((module) => <WorkspaceCard key={module.title} {...module} />)}
    </div>
  </div>
);
