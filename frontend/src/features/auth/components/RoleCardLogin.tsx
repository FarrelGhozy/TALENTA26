import React from 'react';
import { GraduationCap, Settings, ArrowRight, Loader2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Role } from '../../../types';

interface RoleCardLoginProps {
  onSelectRole: (role: Role, userId: string, credentials?: { email: string; pass: string }) => void;
  isLoading?: boolean;
}

export const RoleCardLogin: React.FC<RoleCardLoginProps> = ({ onSelectRole, isLoading = false }) => {
  const demoAccounts = [
    {
      role: 'mahasiswa' as Role,
      userId: 'u-01',
      email: 'mhs@unida.gontor.ac.id',
      pass: 'Mahasiswa2026!',
      title: 'Mahasiswa (Riset / PKM)',
      name: 'Ahmad Fauzan',
      subtitle: 'Teknik Informatika 2024 • Target: PKM 2026',
      badge: 'Mahasiswa Binaan',
      color: 'from-blue-600 to-indigo-800',
      bgColor: 'bg-blue-50 border-blue-200/80',
      iconColor: 'text-blue-700',
      icon: GraduationCap,
      highlights: ['Katalog kompetisi', 'Roadmap mingguan', 'Ajukan prestasi'],
    },
    {
      role: 'mahasiswa' as Role,
      userId: 'u-02',
      email: 'zaidan@unida.gontor.ac.id',
      pass: 'Mahasiswa2026!',
      title: 'Mahasiswa (Desain / GEMASTIK)',
      name: 'Zaidan Ali',
      subtitle: 'Teknik Informatika 2024 • Target: Gemastik XIX 2026',
      badge: 'Mahasiswa Binaan',
      color: 'from-sky-600 to-blue-800',
      bgColor: 'bg-sky-50 border-sky-200/80',
      iconColor: 'text-sky-700',
      icon: GraduationCap,
      highlights: ['Portofolio karya', 'Undangan tim masuk', 'Papan peringkat'],
    },
    {
      role: 'super_admin' as Role,
      userId: 'u-10',
      email: 'admin@unida.gontor.ac.id',
      pass: 'AdminGontor2026!',
      title: 'Admin Kampus',
      name: 'Admin Pengelola USC',
      subtitle: 'admin@unida.gontor.ac.id • Pengelola Lomba, Verifikator & Sistem',
      badge: 'Pengelola & Verifikator',
      color: 'from-amber-500 to-indigo-900',
      bgColor: 'bg-amber-50 border-amber-200/80',
      iconColor: 'text-amber-700',
      icon: Settings,
      highlights: ['Dashboard & analitik', 'Kelola lomba & prestasi', 'Periode & sistem'],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-bold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span>Lingkungan Simulasi Interaktif Aktif (1-Klik Masuk)</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Pilih Peran Demo untuk Pengujian
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          Pilih profil di bawah untuk menguji alur masing-masing peran secara instan tanpa perlu memasukkan kata sandi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="list">
        {demoAccounts.map((acc) => {
          const Icon = acc.icon;
          const isAdminCard = acc.role === 'super_admin' || acc.role === 'validator';
          return (
            <button
              key={acc.userId}
              type="button"
              role="listitem"
              disabled={isLoading}
              onClick={() => onSelectRole(acc.role, acc.userId, { email: acc.email, pass: acc.pass })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectRole(acc.role, acc.userId, { email: acc.email, pass: acc.pass });
                }
              }}
              className={`text-left p-5 rounded-2xl border bg-white border-slate-200/90 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer disabled:opacity-60 min-h-[140px] focus-visible:ring-2 focus-visible:ring-blue-600 group relative overflow-hidden flex flex-col justify-between ${
                isAdminCard ? 'md:col-span-2' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-13 h-13 rounded-2xl border flex items-center justify-center shrink-0 ${acc.bgColor} shadow-2xs group-hover:scale-105 transition-transform`}
                >
                  <Icon className={`w-6 h-6 ${acc.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-900 truncate">
                      {acc.title}
                    </span>
                    <Badge color="blue" size="sm">
                      {acc.badge}
                    </Badge>
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-1">{acc.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{acc.subtitle}</p>
                </div>
              </div>

              {/* Highlights feature access */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                {acc.highlights.map((hl) => (
                  <span
                    key={hl}
                    className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                  >
                    {hl}
                  </span>
                ))}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:text-blue-900">
                <span className="text-[11px] text-slate-400 font-normal">Klik untuk masuk langsung</span>
                <span className="inline-flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
                  Mulai Simulasi <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div role="status" className="flex items-center justify-center gap-2 text-xs text-blue-700 font-semibold py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Memproses sesi masuk demo...
        </div>
      )}
    </div>
  );
};
