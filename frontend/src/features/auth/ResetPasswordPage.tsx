import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UscBrand } from '../../components/common/UscBrand';
import { userService } from '@talenta/services';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [customToken, setCustomToken] = useState(token);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const activeToken = customToken.trim();
    if (!activeToken) {
      setError('Token reset password wajib diisi.');
      return;
    }

    if (password.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsLoading(true);
    try {
      if ((userService as any).resetPassword) {
        await (userService as any).resetPassword(activeToken, password);
      }
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Gagal mengatur ulang kata sandi. Token mungkin telah kedaluwarsa.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-1">
          <UscBrand variant="emblem" size="lg" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Atur Ulang Kata Sandi
        </h1>
        <p className="text-sm text-slate-600">
          Masukkan kata sandi baru untuk akun UNIDA Student Championship (USC) Anda.
        </p>
      </div>

      {isSuccess ? (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Kata Sandi Berhasil Diperbarui</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Kata sandi akun Anda telah diperbarui. Semua sesi lama telah dicabut demi keamanan. Silakan masuk menggunakan kata sandi baru.
          </p>
          <div className="pt-2">
            <Link to="/masuk">
              <Button className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Masuk
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-4 shadow-xs"
        >
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
            >
              {error}
            </div>
          )}

          {!token && (
            <Input
              label="Token Reset Password"
              required
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              placeholder="Masukkan token reset dari email Anda"
            />
          )}

          <Input
            label="Kata Sandi Baru"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helper="Minimal 8 karakter"
          />

          <Input
            label="Konfirmasi Kata Sandi Baru"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <Button
            type="submit"
            className="w-full mt-2"
            isLoading={isLoading}
            rightIcon={<KeyRound className="w-4 h-4" />}
          >
            Simpan Kata Sandi Baru
          </Button>

          <div className="pt-2 text-center text-xs">
            <Link
              to="/masuk"
              className="text-slate-500 hover:text-slate-800 font-semibold"
            >
              Batal dan Kembali
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};
