import React, { useRef } from 'react';
import { Camera, CheckCircle2, ShieldCheck, Upload, User as UserIcon } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { User } from '../../../types';
import { assetUrl } from '../../../lib/asset';

interface StepIdentitasProps {
  user: Partial<User>;
  onChange: (field: keyof User, val: any) => void;
}

const AVATAR_PRESETS = [
  {
    id: 'initials',
    label: 'Inisial Nama',
    url: '',
    desc: 'Inisial Nama (Default)',
    isInitials: true,
  },
  {
    id: 'andi',
    label: 'Mahasiswa (Jas Putra)',
    url: '/images/avatar-andi.jpg',
    desc: 'Jas Almamater Putra',
    isInitials: false,
  },
  {
    id: 'rina',
    label: 'Mahasiswi (Jas Putri & Hijab)',
    url: '/images/avatar-rina.jpg',
    desc: 'Jas Almamater & Hijab',
    isInitials: false,
  },
];

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'M';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const StepIdentitas: React.FC<StepIdentitasProps> = ({ user, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentAvatar = user.avatar || '';
  const isCustomUpload = Boolean(currentAvatar && !AVATAR_PRESETS.some((p) => p.url === currentAvatar));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Berkas harus berupa gambar (JPG atau PNG)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran foto profil maksimal 2 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange('avatar', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Photo Avatar Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-blue-50/40 border border-blue-200/80 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="relative shrink-0 group">
          {currentAvatar ? (
            <img
              src={assetUrl(currentAvatar)}
              alt={user.nama || 'Foto Mahasiswa'}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-blue-600/40 shadow-md transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <div
              aria-label={`Inisial foto ${user.nama || 'Mahasiswa'}`}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-800 to-indigo-900 text-white font-black text-2xl sm:text-3xl flex items-center justify-center border-2 border-blue-600/40 shadow-md"
            >
              {getInitials(user.nama)}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Unggah foto profil dari perangkat"
            aria-label="Unggah foto profil dari perangkat"
            className="absolute -bottom-2 -right-2 bg-blue-700 text-white p-2 rounded-xl shadow-md border-2 border-white flex items-center justify-center hover:bg-blue-800 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg"
          className="hidden"
          onChange={handleFileUpload}
        />

        <div className="space-y-2.5 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="text-xs font-bold text-slate-900">
              Foto Profil Mahasiswa
            </span>
            {isCustomUpload ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                Foto Unggahan Pribadi
              </span>
            ) : currentAvatar ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Jas UNIDA Gontor
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                <UserIcon className="w-3 h-3 text-slate-600" />
                Inisial Nama
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 leading-relaxed max-w-md">
            Gunakan inisial nama akun, unggah foto almamater pribadi, atau pilih template resmi UNIDA Gontor.
          </p>

          {/* Quick Avatar Preset Selector & Custom Upload */}
          <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="text-[11px] font-bold text-slate-600 mr-1">Pilihan:</span>
            {AVATAR_PRESETS.map((opt) => {
              const isSelected = (!currentAvatar && opt.isInitials) || (currentAvatar === opt.url && !opt.isInitials);
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
                  {opt.isInitials ? (
                    <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black flex items-center justify-center">
                      {getInitials(user.nama)}
                    </div>
                  ) : (
                    <img
                      src={assetUrl(opt.url)}
                      alt={opt.label}
                      className="w-5 h-5 rounded-full object-cover border border-white/50"
                    />
                  )}
                  <span>{opt.desc}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" />}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                isCustomUpload
                  ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                  : 'bg-white text-slate-700 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isCustomUpload ? 'Ganti Foto' : 'Unggah Foto'}</span>
              {isCustomUpload && <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" />}
            </button>
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
            value={user.angkatan || ''}
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
