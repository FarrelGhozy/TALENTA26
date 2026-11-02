import React, { useState } from 'react';
import { LogIn, Shield } from 'lucide-react';
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

  const quickAccounts = [
    { label: 'Andi (Mhs)', email: 'andi@mock.ac.id', pass: 'demo123', role: 'mahasiswa' as Role },
    { label: 'Rina (Mhs)', email: 'rina@mock.ac.id', pass: 'demo123', role: 'mahasiswa' as Role },
    { label: 'Budi (Admin)', email: 'budi@mock.ac.id', pass: 'demo123', role: 'admin_program' as Role },
    { label: 'Sari (Verifikator)', email: 'sari@mock.ac.id', pass: 'demo123', role: 'verifikator' as Role },
  ];

  const handleQuickFill = (acc: (typeof quickAccounts)[0]) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setRole(acc.role);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await onSubmit(email, password, role);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Gagal masuk');
      } else {
        setError('Gagal masuk. Periksa kembali email dan kata sandi.');
      }
    }
  };

  const handleSsoClick = async () => {
    // Simulated SSO click with default student account
    await onSubmit('andi@mock.ac.id', 'demo123', 'mahasiswa');
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* SSO Mockup Button */}
      <button
        type="button"
        onClick={handleSsoClick}
        disabled={isLoading}
        className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white shadow-md hover:shadow-lg hover:from-blue-800 hover:to-indigo-900 transition-all flex items-center justify-between gap-3 text-left border border-blue-800/80 cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
            <Shield className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="text-xs font-black tracking-wide text-amber-300 uppercase">Single Sign-On (SSO)</div>
            <div className="text-sm font-bold text-white group-hover:text-blue-100 transition-colors">
              Masuk dengan Akun Kampus UNIDA
            </div>
          </div>
        </div>
        <span className="text-[11px] font-bold bg-white/20 px-2.5 py-1 rounded-lg shrink-0">
          Simulasi Instan →
        </span>
      </button>

      <div className="relative flex items-center justify-center my-3">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-slate-50 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          Atau Masuk Manual
        </span>
        <div className="border-t border-slate-200 w-full" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs"
      >
        <div className="text-center mb-3">
          <h3 className="text-base font-black text-slate-900 tracking-tight">Login Kredensial Form</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {USE_MOCK ? 'Simulasi kredensial aktif (password default: demo123)' : 'Gunakan akun resmi institusi'}
          </p>
        </div>

        {/* Quick Fill Chips */}
        <div className="space-y-1.5 pb-2 border-b border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Isi Cepat Akun Demo:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickFill(acc)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  email === acc.email
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {acc.label}
              </button>
            ))}
          </div>
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
    </div>
  );
};
