import React from 'react';
import { Activity, CalendarRange, Database, History, Shield, SlidersHorizontal, UserCog } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { WorkspaceCard } from '../../components/ui/WorkspaceCard';
import { Button } from '../../components/ui/Button';

const modules = [
  { title: 'Staf dan peran', description: 'Kelola akun validator dan batas akses setiap peran.', icon: UserCog, status: '2 staf' },
  { title: 'Periode akademik', description: 'Atur periode aktif tanpa menghapus riwayat periode sebelumnya.', icon: CalendarRange, status: '2026/2027' },
  { title: 'Aturan poin', description: 'Siapkan versi bobot ranking berdasarkan tingkat dan hasil lomba.', icon: SlidersHorizontal, status: 'Draf' },
  { title: 'Audit aktivitas', description: 'Tinjau perubahan peran, publikasi konten, dan keputusan sensitif.', icon: History, status: 'Simulasi' },
  { title: 'Kesehatan sistem', description: 'Prototipe status API, database, storage, dan cadangan data.', icon: Activity, status: 'Belum terhubung' },
  { title: 'Konfigurasi data', description: 'Rancangan koneksi MySQL dan RustFS akan dibaca dari environment backend.', icon: Database, status: 'Stage 2' },
];

export const SuperAdminDashboardPage: React.FC = () => (
  <div className="space-y-6">
    <PageHeader
      eyebrow="Pusat kendali sistem"
      title="Super Admin"
      description="Kelola peran, periode, aturan poin, dan jejak operasi. Pengaturan teknis sensitif tidak ditampilkan pada halaman publik."
      actions={<Button variant="outline" leftIcon={<Shield aria-hidden="true" className="h-4 w-4" />}>Tinjau keamanan</Button>}
    />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {modules.map((module) => <WorkspaceCard key={module.title} {...module} />)}
    </div>
  </div>
);
