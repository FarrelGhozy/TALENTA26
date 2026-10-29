import React from 'react';
import { GraduationCap, Settings, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Role } from '../../../types';

interface RoleCardLoginProps {
  onSelectRole: (role: Role, userId: string) => void;
  isLoading?: boolean;
}

export const RoleCardLogin: React.FC<RoleCardLoginProps> = ({ onSelectRole, isLoading = false }) => {
  const demoAccounts = [
    {
      role: 'mahasiswa' as Role,
      userId: 'u-01',
      title: 'Mahasiswa (Riset / PKM)',
      name: 'Andi Pratama',
      subtitle: 'Informatika 2023 • Target: PKM-RE',
      badge: 'Mahasiswa',
      avatar: '/images/avatar-andi.jpg',
      color: 'from-blue-700 to-blue-900',
      bgColor: 'bg-blue-50 border-blue-200/80',
      iconColor: 'text-blue-700',
      icon: GraduationCap,
    },
    {
      role: 'mahasiswa' as Role,
      userId: 'u-02',
      title: 'Mahasiswa (Desain / GEMASTIK)',
      name: 'Rina Kartika',
      subtitle: 'DKV 2022 • Target: GEMASTIK',
      badge: 'Mahasiswa',
      avatar: '/images/avatar-rina.jpg',
      color: 'from-sky-600 to-blue-800',
      bgColor: 'bg-sky-50 border-sky-200/80',
      iconColor: 'text-sky-700',
      icon: GraduationCap,
    },
    {
      role: 'admin_program' as Role,
      userId: 'u-10',
      title: 'Admin Pengelola Program',
      name: 'Budi Santoso',
      subtitle: 'Pengelola kompetisi Belmawa, jadwal, & tim',
      badge: 'Admin Kampus',
      color: 'from-amber-500 to-blue-800',
      bgColor: 'bg-amber-50 border-amber-200/80',
      iconColor: 'text-amber-700',
      icon: Settings,
    },
    {
      role: 'verifikator' as Role,
      userId: 'u-11',
      title: 'Verifikator Sertifikat',
      name: 'Dr. Sari Verifikator',
      subtitle: 'Pemeriksa keaslian bukti capaian & SK',
      badge: 'Verifikator',
      color: 'from-emerald-500 to-teal-700',
      bgColor: 'bg-emerald-50 border-emerald-200/80',
      iconColor: 'text-emerald-700',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Badge color="amber" dot>
          Mode Demo Instan (DEPLOYMENT)
        </Badge>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Pilih Peran untuk Mulai Eksplorasi
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Pilih salah satu profil demo siap pakai di bawah untuk langsung mencoba platform tanpa perlu login password.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="list">
        {demoAccounts.map((acc) => {
          const Icon = acc.icon;
          return (
            <button
              key={acc.userId}
              type="button"
              role="listitem"
              disabled={isLoading}
              onClick={() => onSelectRole(acc.role, acc.userId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectRole(acc.role, acc.userId);
                }
              }}
              className="text-left p-5 rounded-2xl border bg-white border-slate-200/90 hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-60 min-h-[96px] focus-visible:ring-2 focus-visible:ring-blue-600 group relative overflow-hidden"
            >
              <div className="flex items-start gap-4">
                {acc.avatar ? (
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-600/30 shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${acc.bgColor} shadow-2xs group-hover:scale-105 transition-transform`}
                  >
                    <Icon className={`w-6 h-6 ${acc.iconColor}`} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {acc.title}
                    </span>
                    <Badge color="blue" size="sm">
                      {acc.badge}
                    </Badge>
                  </div>
                  <p className="text-sm font-black text-slate-800 mt-1">{acc.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{acc.subtitle}</p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-700 group-hover:text-blue-900">
                <span className="text-[11px] text-slate-400 font-normal">Klik untuk masuk</span>
                <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Masuk Portal <ArrowRight className="w-3.5 h-3.5" />
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