import React from 'react';
import { Users, ShieldCheck, Award, Clock, Trophy } from 'lucide-react';
import { AdminStats } from '../../../services/types';
import { Card, CardContent } from '../../../components/ui/Card';

export const StatCards: React.FC<{ stats: AdminStats }> = ({ stats }) => {
  const cards = [
    {
      label: 'Mahasiswa Terdaftar',
      value: stats.totalMahasiswa,
      sub: 'Peserta aktif pembinaan',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-100 text-blue-700',
      icon: Users,
    },
    {
      label: 'Tim Terbentuk Sah',
      value: stats.totalTimTerbentuk,
      sub: 'Memenuhi aturan Belmawa',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-100 text-emerald-600',
      icon: ShieldCheck,
    },
    {
      label: 'Prestasi Sah & Masuk SK',
      value: stats.pengajuanPrestasi.disetujui,
      sub: `Dari total ${stats.pengajuanPrestasi.total} berkas`,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-100 text-emerald-600',
      icon: Award,
    },
    {
      label: 'Menunggu Verifikasi',
      value: stats.pengajuanPrestasi.menunggu,
      sub: 'Perlu pemeriksaan berkas',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-100 text-amber-600',
      icon: Clock,
    },
    {
      label: 'Delegasi Lolos Seleksi',
      value: stats.delegasiTerkonfirmasi,
      sub: 'Seleksi internal kampus',
      color: 'text-blue-700',
      bgColor: 'bg-sky-50 border-sky-100 text-blue-700',
      icon: Trophy,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5" role="list" aria-label="Statistik utama">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="bg-white border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors" role="listitem">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${c.bgColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block leading-tight truncate" title={c.label}>
                  {c.label}
                </span>
                <div className={`text-2xl font-black mt-1 ${c.color}`} aria-label={`${c.label}: ${c.value}`}>
                  {c.value}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{c.sub}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};