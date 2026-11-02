import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, KeyRound, Info, ShieldCheck, GraduationCap } from 'lucide-react';
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
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
      if (basePath && redirect.startsWith(`${basePath}/`)) {
        return redirect.slice(basePath.length) || '/';
      }
      return redirect;
    }
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
    <div className="max-w-3xl mx-auto py-8 sm:py-10 space-y-7">
      {/* Institution Banner / Subtitle */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-200/60 uppercase tracking-widest">
          <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
          Universitas Darussalam Gontor
        </div>
        <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
          Portal Prestasi & Akselerasi Belmawa 2026
        </h1>
      </div>

      {redirect && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-2xs">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Kamu perlu memilih peran terlebih dahulu untuk melanjutkan ke halaman tujuan.</span>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-slate-200/80 rounded-2xl border border-slate-200 shadow-inner">
          <button
            type="button"
            onClick={() => setAuthMode('demo')}
            className={`px-4.5 py-2 rounded-xl text-xs font-extrabold transition-all inline-flex items-center gap-2 cursor-pointer ${
              authMode === 'demo'
                ? 'bg-white text-blue-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-blue-700" />
            Mode Demo Instan (1-Klik)
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('manual')}
            className={`px-4.5 py-2 rounded-xl text-xs font-extrabold transition-all inline-flex items-center gap-2 cursor-pointer ${
              authMode === 'manual'
                ? 'bg-white text-blue-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-600" />
            Login Akun Kampus / SSO
          </button>
        </div>
      </div>

      {authMode === 'demo' ? (
        <RoleCardLogin onSelectRole={handleSelectRole} isLoading={isLoading} />
      ) : (
        <FormLogin onSubmit={handleFormSubmit} isLoading={isLoading} />
      )}

      {/* Trust mark footer */}
      <div className="pt-6 border-t border-slate-200/80 text-center flex items-center justify-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-slate-400" />
        <span>Terhubung dengan kurikulum pembinaan nasional Belmawa Kemdiktisaintek 2026</span>
      </div>
    </div>
  );
};
