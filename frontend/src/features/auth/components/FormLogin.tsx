import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

interface FormLoginProps {
  onSubmit: (email: string, pass: string) => Promise<void>;
  isLoading: boolean;
}

export const FormLogin: React.FC<FormLoginProps> = ({ onSubmit, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await onSubmit(email, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Gagal masuk');
      } else {
        setError('Gagal masuk. Periksa kembali email dan kata sandi.');
      }
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs"
      >
        <div className="text-center mb-3">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Masuk dengan akun TALENTA</h3>
          <p className="text-sm text-slate-500 mt-1">Peran akses ditentukan oleh akun, bukan dipilih saat login.</p>
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

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="login-password" className="block text-sm font-bold text-slate-700">
              Kata Sandi
            </label>
            <Link
              to="/lupa-password"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Lupa kata sandi?
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={isLoading} rightIcon={<LogIn className="w-4 h-4" />}>
          Masuk ke Portal
        </Button>

        <div className="pt-2 text-center text-xs text-slate-500">
          Belum memiliki akun mahasiswa?{' '}
          <Link
            to="/daftar"
            className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Daftar Sekarang
          </Link>
        </div>
      </form>
    </div>
  );
};
