import React from 'react';
import { GraduationCap, Settings, ShieldCheck, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Role } from '../../../types';
import { assetUrl } from '../../../lib/asset';

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
      badge: 'Mahasiswa Binaan',
      avatar: '/images/avatar-andi.jpg',
      color: 'from-blue-600 to-indigo-800',
      bgColor: 'bg-blue-50 border-blue-200/80',
      iconColor: 'text-blue-700',
      icon: GraduationCap,
      highlights: ['Cari partner tim', 'Roadmap mingguan', 'Ajukan prestasi'],
    },
    {
      role: 'mahasiswa' as Role,
      userId: 'u-02',
      title: 'Mahasiswa (Desain / GEMASTIK)',
      name: 'Rina Kartika',
      subtitle: 'DKV 2022 • Target: GEMASTIK',
      badge: 'Mahasiswa Binaan',
      avatar: '/images/avatar-rina.jpg',
      color: 'from-sky-600 to-blue-800',
      bgColor: 'bg-sky-50 border-sky-200/80',
      iconColor: 'text-sky-700',
      icon: GraduationCap,
      highlights: ['Portofolio UI/UX', 'Undangan tim masuk', 'Bimbingan dosen'],
    },
    {
      role: 'admin_program' as Role,
      userId: 'u-10',
      title: 'Admin Pengelola Program',
      name: 'Budi Santoso',
      subtitle: 'Biro Kemahasiswaan & BAAK Institusi',
      badge: 'Admin Kampus',
      color: 'from-amber-500 to-indigo-900',
      bgColor: 'bg-amber-50 border-amber-200/80',
      iconColor: 'text-amber-700',
      icon: Settings,
      highlights: ['Analitik distribusi peserta', 'Monitoring kuota tim', 'Kelola jadwal'],
    },
    {
      role: 'verifikator' as Role,
      userId: 'u-11',
      title: 'Verifikator Sertifikat',
      name: 'Dr. Sari Verifikator',
      subtitle: 'Tim Validasi Capaian & Rekognisi SKPI',
      badge: 'Verifikator Resmi',
      color: 'from-emerald-500 to-teal-800',
      bgColor: 'bg-emerald-50 border-emerald-200/80',
      iconColor: 'text-emerald-700',
      icon: ShieldCheck,
      highlights: ['Telaah bukti sertifikat', 'Sahkan poin SKPI', 'Feedback revisi berkas'],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-bold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
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
              className="text-left p-5 rounded-2xl border bg-white border-slate-200/90 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer disabled:opacity-60 min-h-[140px] focus-visible:ring-2 focus-visible:ring-blue-600 group relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-start gap-4">
                {acc.avatar ? (
                  <img
                    src={assetUrl(acc.avatar)}
                    alt={acc.name}
                    className="w-13 h-13 rounded-2xl object-cover border-2 border-blue-600/30 shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div
                    className={`w-13 h-13 rounded-2xl border flex items-center justify-center shrink-0 ${acc.bgColor} shadow-2xs group-hover:scale-105 transition-transform`}
                  >
                    <Icon className={`w-6 h-6 ${acc.iconColor}`} />
                  </div>
                )}
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
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
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
