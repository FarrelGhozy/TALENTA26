import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, KeyRound, Info, ShieldCheck, GraduationCap } from 'lucide-react';
import { useAuth } from './AuthContext';
import { FormLogin } from './components/FormLogin';
import { UscBrand } from '../../components/common/UscBrand';
import { USE_MOCK, APP_ENV } from '../../config/env';
import { Role } from '../../types';

// Lazy-load kartu login demo agar di build produksi (MODE === 'production') tidak ikut masuk bundle utama
const LazyRoleCardLogin =
  import.meta.env.MODE !== 'production'
    ? lazy(() => import('./components/RoleCardLogin').then((m) => ({ default: m.RoleCardLogin })))
    : null;

export const LoginPage: React.FC = () => {
  const { currentUser, currentRole, loginAsRole, loginWithCredentials, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';
  const reason = searchParams.get('reason') || '';

  const isDevelopment =
    import.meta.env.MODE !== 'production' && (APP_ENV === 'DEPLOYMENT' || USE_MOCK);
  const [authMode, setAuthMode] = useState<'demo' | 'manual'>(
    isDevelopment ? 'demo' : 'manual'
  );
  const [loginError, setLoginError] = useState<string>('');

  const getSafeRedirect = (role: Role) => {
    const isAdminRole = role === 'super_admin' || role === 'validator';
    const roleHome = isAdminRole ? '/admin' : '/app/beranda';

    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
      const normalizedRedirect = basePath && redirect.startsWith(`${basePath}/`)
        ? redirect.slice(basePath.length) || '/'
        : redirect;
      const isStudentRoute = normalizedRedirect === '/app' || normalizedRedirect.startsWith('/app/');
      const isSystemRoute =
        normalizedRedirect === '/admin/sistem' ||
        normalizedRedirect.startsWith('/admin/sistem?') ||
        normalizedRedirect === '/super-admin' ||
        normalizedRedirect.startsWith('/super-admin/');
      const isAdminRoute =
        normalizedRedirect === '/admin' ||
        normalizedRedirect.startsWith('/admin/') ||
        normalizedRedirect === '/validator' ||
        normalizedRedirect.startsWith('/validator/') ||
        normalizedRedirect === '/verifikasi' ||
        normalizedRedirect.startsWith('/verifikasi/') ||
        normalizedRedirect === '/super-admin' ||
        normalizedRedirect.startsWith('/super-admin/');

      if (isStudentRoute && role !== 'mahasiswa') return roleHome;
      if (isSystemRoute && role !== 'super_admin') return roleHome;
      if (isAdminRoute && !isAdminRole) return roleHome;
      if (normalizedRedirect === '/masuk' || normalizedRedirect.startsWith('/masuk?')) {
        return roleHome;
      }
      return normalizedRedirect;
    }
    return roleHome;
  };

  // Arahkan otomatis bila pengguna sudah memiliki sesi aktif (bukan mode demo switch)
  useEffect(() => {
    if (!isLoading && currentUser && !isDevelopment) {
      navigate(getSafeRedirect(currentRole), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, currentUser, currentRole, isDevelopment]);

  const handleSelectRole = async (
    role: Role,
    userId: string,
    credentials?: { email: string; pass: string }
  ) => {
    setLoginError('');
    try {
      if (USE_MOCK) {
        await loginAsRole(role, userId);
        navigate(getSafeRedirect(role), { replace: true });
      } else if (credentials) {
        const user = await loginWithCredentials(credentials.email, credentials.pass);
        const userRole = user.role[0] || role;
        navigate(getSafeRedirect(userRole), { replace: true });
      } else {
        await loginAsRole(role, userId);
        navigate(getSafeRedirect(role), { replace: true });
      }
    } catch (err: any) {
      setLoginError(err.message || 'Gagal login instan dengan peran ini. Silakan coba login manual.');
    }
  };

  const handleFormSubmit = async (email: string, pass: string) => {
    setLoginError('');
    try {
      const user = await loginWithCredentials(email, pass);
      const role = user.role[0] || 'mahasiswa';
      navigate(getSafeRedirect(role), { replace: true });
    } catch (err: any) {
      setLoginError(err.message || 'Login gagal. Periksa kembali email dan kata sandi Anda.');
      throw err;
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-10 space-y-7">
      {/* Institution Banner / Brand Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <UscBrand variant="stacked" size="md" priority />
        </div>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-200/60 uppercase tracking-widest">
            <GraduationCap className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
            Universitas Darussalam Gontor
          </div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
            Portal Pembinaan Lomba dan Prestasi Mahasiswa
          </h1>
        </div>
      </div>

      {reason === 'session_expired' ? (
        <div role="alert" className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-2xs">
          <Info className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
          <span>Sesi login Anda telah berakhir. Silakan masuk kembali untuk melanjutkan.</span>
        </div>
      ) : redirect ? (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-2xs">
          <Info className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
          <span>Anda perlu masuk terlebih dahulu untuk melanjutkan ke halaman tujuan.</span>
        </div>
      ) : null}

      {loginError && isDevelopment && authMode === 'demo' && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold">
          {loginError}
        </div>
      )}

      {/* Mode Switcher Tabs (Hanya ditampilkan pada mode development / demo) */}
      {isDevelopment && LazyRoleCardLogin && (
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
              Pilih Peran Instan (1-Klik)
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
              Login Manual (Email/Password)
            </button>
          </div>
        </div>
      )}

      {isDevelopment && LazyRoleCardLogin && authMode === 'demo' ? (
        <Suspense fallback={<div className="text-center text-xs text-slate-500 py-8">Menyiapkan pilihan peran...</div>}>
          <LazyRoleCardLogin onSelectRole={handleSelectRole} isLoading={isLoading} />
        </Suspense>
      ) : (
        <FormLogin onSubmit={handleFormSubmit} isLoading={isLoading} />
      )}

      {/* Trust mark footer */}
      <div className="pt-6 border-t border-slate-200/80 text-center flex items-center justify-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-slate-400" />
        <span>Pembinaan dan pencatatan prestasi mahasiswa</span>
      </div>
    </div>
  );
};
