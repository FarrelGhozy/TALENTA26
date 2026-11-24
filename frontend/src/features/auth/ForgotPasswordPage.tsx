import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UscBrand } from '../../components/common/UscBrand';
import { userService } from '@talenta/services';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError('');
    setIsLoading(true);
    try {
      if ((userService as any).forgotPassword) {
        await (userService as any).forgotPassword(email.trim());
      }
      setIsSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Gagal memproses permintaan reset password.');
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
          Lupa Kata Sandi
        </h1>
        <p className="text-sm text-slate-600">
          Masukkan alamat email akun USC yang terdaftar untuk menerima instruksi pemulihan kata sandi.
        </p>
      </div>

      {isSubmitted ? (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Instruksi Terkirim</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Jika email <span className="font-semibold text-slate-800">{email}</span> terdaftar di sistem, instruksi reset kata sandi telah dikirim. Silakan periksa kotak masuk atau spam email Anda.
          </p>
          <div className="pt-2">
            <Link to="/masuk">
              <Button variant="outline" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Kembali ke Halaman Masuk
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

          <Input
            label="Alamat Email Terdaftar"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@unida.gontor.ac.id"
            helper="Kami akan mengirimkan token atau tautan pemulihan"
          />

          <Button
            type="submit"
            className="w-full mt-2"
            isLoading={isLoading}
            rightIcon={<Mail className="w-4 h-4" />}
          >
            Kirim Instruksi Pemulihan
          </Button>

          <div className="pt-2 text-center text-xs">
            <Link
              to="/masuk"
              className="text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Halaman Masuk
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};
