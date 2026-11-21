import React, { useRef, useState } from 'react';
import { AlertCircle, Camera, ShieldAlert, Trash2, Upload } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Select, SelectOption } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { User } from '../../../types';
import { assetUrl } from '../../../lib/asset';

interface StepIdentitasProps {
  user: Partial<User>;
  onChange: (field: keyof User, val: any) => void;
  onUploadAvatar?: (file: File) => Promise<void>;
  onDeleteAvatar?: () => Promise<void>;
  uploadingAvatar?: boolean;
}

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'M';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const StepIdentitas: React.FC<StepIdentitasProps> = ({
  user,
  onChange,
  onUploadAvatar,
  onDeleteAvatar,
  uploadingAvatar = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState('');
  const currentAvatar = user.avatar || '';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError('');

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Berkas foto profil harus berformat JPG, PNG, atau WebP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Ukuran foto profil maksimal 2 MB.');
      return;
    }

    if (onUploadAvatar) {
      try {
        await onUploadAvatar(file);
      } catch (err: any) {
        setAvatarError(err?.message || 'Gagal mengunggah foto profil.');
      }
      return;
    }

    // Mode demo fallback (saat tidak terhubung storage privat)
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange('avatar', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    setAvatarError('');
    if (onDeleteAvatar) {
      try {
        await onDeleteAvatar();
      } catch (err: any) {
        setAvatarError(err?.message || 'Gagal menghapus foto profil.');
      }
    } else {
      onChange('avatar', '');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 1; y >= currentYear - 10; y--) {
    years.push(y);
  }
  if (user.angkatan && !years.includes(user.angkatan)) {
    years.push(user.angkatan);
    years.sort((a, b) => b - a);
  }

  const angkatanOptions: SelectOption[] = [
    { value: '', label: 'Pilih Tahun Angkatan' },
    ...years.map((y) => ({
      value: String(y),
      label: String(y),
    })),
  ];

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
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          onChange={handleFileUpload}
        />

        <div className="space-y-3 text-center sm:text-left flex-1">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Foto Profil Privat
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Format JPG, PNG, atau WebP (maks. 2 MB). Foto disimpan privat untuk koordinasi pembinaan internal kampus dan tidak ditampilkan pada ranking publik.
            </p>
          </div>

          {avatarError && (
            <div role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{avatarError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{uploadingAvatar ? 'Mengunggah...' : currentAvatar ? 'Ganti Foto' : 'Unggah Foto'}</span>
            </button>

            {currentAvatar && (
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={handleRemoveAvatar}
                className="px-3 py-2 rounded-xl text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 disabled:opacity-60 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Hapus Foto</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nama Lengkap"
            value={user.nama || ''}
            onChange={(e) => onChange('nama', e.target.value)}
            required
          />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">NIM</label>
              <Badge color="amber" size="sm" className="inline-flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                Diisi mandiri (belum verifikasi kampus)
              </Badge>
            </div>
            <input
              type="text"
              readOnly
              value={user.nim || 'Belum tercatat'}
              aria-label="Nomor Induk Mahasiswa"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Program Studi"
            value={user.prodi || ''}
            onChange={(e) => onChange('prodi', e.target.value)}
            placeholder="contoh: Teknik Informatika"
            required
          />
          <Input
            label="Fakultas"
            value={user.fakultas || ''}
            onChange={(e) => onChange('fakultas', e.target.value)}
            placeholder="contoh: Sains dan Teknologi"
          />
          <Select
            label="Angkatan"
            value={user.angkatan ? String(user.angkatan) : ''}
            onChange={(e) => onChange('angkatan', e.target.value ? Number(e.target.value) : undefined)}
            options={angkatanOptions}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Email Akun"
            type="email"
            value={user.email || ''}
            disabled
            helper="Email akun terdaftar dan tidak dapat diubah di halaman profil"
          />
          <Input
            label="Nomor WhatsApp / Telepon Aktif"
            type="tel"
            value={user.phone || ''}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="contoh: 081234567890"
            helper="Hanya digunakan untuk koordinasi tim internal"
          />
        </div>

        <div>
          <label htmlFor="profil-bio" className="block text-xs font-bold text-slate-700 mb-1.5">
            Bio Singkat
          </label>
          <textarea
            id="profil-bio"
            rows={2}
            value={user.bio || ''}
            onChange={(e) => onChange('bio', e.target.value)}
            placeholder="Ceritakan singkat fokus keahlian dan tujuan kompetisi Anda..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div>
          <label htmlFor="profil-experience" className="block text-xs font-bold text-slate-700 mb-1.5">
            Pengalaman Lomba / Organisasi (Opsional)
          </label>
          <textarea
            id="profil-experience"
            rows={3}
            value={user.pengalaman || ''}
            onChange={(e) => onChange('pengalaman', e.target.value)}
            placeholder="Tuliskan pengalaman kepanitiaan, riset, proyek, atau lomba yang pernah diikuti..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>
      </div>
    </div>
  );
};
