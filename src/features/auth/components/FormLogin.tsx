import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Role } from '../../../types';
import { USE_MOCK } from '../../../config/env';

interface FormLoginProps {
  onSubmit: (email: string, pass: string, role: Role) => Promise<void>;
  isLoading: boolean;
}

export const FormLogin: React.FC<FormLoginProps> = ({ onSubmit, isLoading }) => {
  const [email, setEmail] = useState('andi@mock.ac.id');
  const [password, setPassword] = useState('demo123');
  const [role, setRole] = useState<Role>('mahasiswa');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await onSubmit(email, password, role);
    } catch (err: any) {
      setError(err.message || 'Gagal masuk');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-w-sm mx-auto bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs"
    >
      <div className="text-center mb-5">
        <h3 className="text-lg font-black text-slate-900 tracking-tight">Masuk ke Akun Kampus</h3>
        <p className="text-xs text-slate-500 mt-1">
          {USE_MOCK ? 'Simulasi kredensial aktif (password default: demo123)' : 'Gunakan akun Single Sign-On (SSO) kampus'}
        </p>
      </div>

      {error ? (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      ) : null}

      <Input
        label="Email Kampus"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="nama@kampus.ac.id"
      />

      <Input
        label="Kata Sandi"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Select
        label="Peran Akses"
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        options={[
          { value: 'mahasiswa', label: 'Mahasiswa' },
          { value: 'admin_program', label: 'Admin Pengelola Program' },
          { value: 'verifikator', label: 'Verifikator Prestasi' },
        ]}
      />

      <Button type="submit" className="w-full mt-2" isLoading={isLoading} rightIcon={<LogIn className="w-4 h-4" />}>
        Masuk ke Portal
      </Button>
    </form>
  );
};