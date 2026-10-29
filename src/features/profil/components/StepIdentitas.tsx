import React from 'react';
import { Input } from '../../../components/ui/Input';
import { User } from '../../../types';

interface StepIdentitasProps {
  user: Partial<User>;
  onChange: (field: keyof User, val: any) => void;
}

export const StepIdentitas: React.FC<StepIdentitasProps> = ({ user, onChange }) => {
  return (
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
  );
};
