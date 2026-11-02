import React from 'react';
import { Camera, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { User } from '../../../types';
import { assetUrl } from '../../../lib/asset';

interface StepIdentitasProps {
  user: Partial<User>;
  onChange: (field: keyof User, val: any) => void;
}

const AVATAR_OPTIONS = [
  {
    id: 'andi',
    label: 'Mahasiswa (Andi Pratama)',
    url: '/images/avatar-andi.jpg',
    desc: 'Jas Almamater UNIDA',
  },
  {
    id: 'rina',
    label: 'Mahasiswi (Rina Kartika)',
    url: '/images/avatar-rina.jpg',
    desc: 'Jas Almamater & Hijab',
  },
];

export const StepIdentitas: React.FC<StepIdentitasProps> = ({ user, onChange }) => {
  const currentAvatar = user.avatar || '/images/avatar-andi.jpg';

  return (
    <div className="space-y-6">
      {/* Photo Avatar Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-blue-50/40 border border-blue-200/80 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="relative shrink-0 group">
          <img
            src={assetUrl(currentAvatar)}
            alt={user.nama || 'Foto Mahasiswa'}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-blue-600/40 shadow-md transition-transform group-hover:scale-[1.02]"
          />
          <div className="absolute -bottom-2 -right-2 bg-blue-700 text-white p-1.5 rounded-xl shadow-md border-2 border-white flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="text-xs font-bold text-slate-900">
              Foto Profil Resmi Mahasiswa
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Jas UNIDA Gontor
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed max-w-md">
            Foto ini digunakan pada kartu pencocokan tim Belmawa, portofolio prestasi, dan antrean verifikasi resmi kampus.
          </p>

          {/* Quick Avatar Preset Selector */}
          <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="text-[11px] font-bold text-slate-600 mr-1">Pilihan Foto:</span>
            {AVATAR_OPTIONS.map((opt) => {
              const isSelected = currentAvatar === opt.url;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange('avatar', opt.url)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                    isSelected
                      ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <img
                    src={assetUrl(opt.url)}
                    alt={opt.label}
                    className="w-5 h-5 rounded-full object-cover border border-white/50"
                  />
                  <span>{opt.desc}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <Input
          label="Nama Lengkap"
          value={user.nama || ''}
          onChange={(e) => onChange('nama', e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Program Studi"
            value={user.prodi || ''}
            onChange={(e) => onChange('prodi', e.target.value)}
            placeholder="contoh: Informatika"
            required
          />
          <Input
            label="Angkatan"
            type="number"
            value={user.angkatan || 2023}
            onChange={(e) => onChange('angkatan', Number(e.target.value))}
            required
          />
        </div>

        <Input
          label="Email Kampus"
          type="email"
          value={user.email || ''}
          onChange={(e) => onChange('email', e.target.value)}
          helper="Email aktif untuk koordinasi pembinaan kampus"
          required
        />
      </div>
    </div>
  );
};
