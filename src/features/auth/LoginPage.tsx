import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, KeyRound, Info } from 'lucide-react';
import { useAuth } from './AuthContext';
import { RoleCardLogin } from './components/RoleCardLogin';
import { FormLogin } from './components/FormLogin';
import { APP_ENV } from '../../config/env';
import { Role } from '../../types';

export const LoginPage: React.FC = () => {
  const { loginAsRole, loginWithCredentials, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';
  const [authMode, setAuthMode] = useState<'demo' | 'manual'>(
    APP_ENV === 'DEPLOYMENT' ? 'demo' : 'manual'
  );

  const getSafeRedirect = (role: Role) => {
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) return redirect;
    if (role === 'admin_program' || role === 'admin_institusi') return '/admin';
    if (role === 'verifikator') return '/verifikasi';
    return '/app/beranda';
  };

  const handleSelectRole = async (role: Role, userId: string) => {
    await loginAsRole(role, userId);
    navigate(getSafeRedirect(role), { replace: true });
  };

  const handleFormSubmit = async (email: string, pass: string, role: Role) => {
    await loginWithCredentials(email, pass, role);
    navigate(getSafeRedirect(role), { replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      {redirect && (
        <div className="p-4 bg-blue-50 border border-blue-200/90 text-blue-950 rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-2xs">
          <Info className="w-4 h-4 text-blue-700 shrink-0" />
          <span>Kamu perlu masuk terlebih dahulu. Setelah berhasil masuk, kamu akan langsung diarahkan ke halaman tujuan.</span>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-slate-200/70 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setAuthMode('demo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              authMode === 'demo'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-blue-700" />
            Mode Demo Instan (1-Klik)
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('manual')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              authMode === 'manual'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Login Akun Kampus
          </button>
        </div>
      </div>

      {authMode === 'demo' ? (
        <RoleCardLogin onSelectRole={handleSelectRole} isLoading={isLoading} />
      ) : (
        <FormLogin onSubmit={handleFormSubmit} isLoading={isLoading} />
      )}
    </div>
  );
};