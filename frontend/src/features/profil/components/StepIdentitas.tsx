import React, { useRef } from 'react';
import { Camera, Trash2, Upload } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { User } from '../../../types';
import { assetUrl } from '../../../lib/asset';

interface StepIdentitasProps {
  user: Partial<User>;
  onChange: (field: keyof User, val: any) => void;
}

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
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    onChange('avatar', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Photo Avatar Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="relative shrink-0">
          {currentAvatar ? (
            <img
              src={assetUrl(currentAvatar)}
              alt={user.nama || 'Foto Profil'}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-slate-200 shadow-sm"
            />
          ) : (
            <div
              aria-label={`Inisial foto ${user.nama || 'Mahasiswa'}`}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-blue-600 text-white font-bold text-2xl sm:text-3xl flex items-center justify-center border-2 border-blue-500/30 shadow-sm"
            >
              {getInitials(user.nama)}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Ubah foto profil"
            aria-label="Ubah foto profil"
            className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-md border-2 border-white flex items-center justify-center hover:bg-blue-700 transition-colors cursor-pointer"
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

        <div className="space-y-3 text-center sm:text-left flex-1">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Foto Profil
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Format JPG, JPEG, atau PNG. Ukuran maksimal 2 MB.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{currentAvatar ? 'Ganti Foto' : 'Unggah Foto'}</span>
            </button>

            {currentAvatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="px-3 py-2 rounded-xl text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Foto</span>
              </button>
            )}
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
