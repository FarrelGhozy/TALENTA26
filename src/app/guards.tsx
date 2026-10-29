import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Role } from '../types';
import { userService } from '../services/factory';
import { PageLoading } from '../components/ui/Skeleton';

export const RequireRole: React.FC<{ allowedRoles: Role[] }> = ({ allowedRoles }) => {
  const { currentUser, currentRole, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoading message="Memuat sesi pengguna..." />;
  }

  if (!currentUser || !allowedRoles.includes(currentRole)) {
    return <Navigate to={`/masuk?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return <Outlet />;
};

export const RequireTarget: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasTarget, setHasTarget] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!currentUser) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    setError('');
    userService
      .getProfile(currentUser.id)
      .then((profile) => {
        if (cancelled) return;
        setHasTarget(Boolean(profile?.targetKompetisiSlug));
        setChecking(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Gagal memeriksa target kompetisi. Coba muat ulang.');
        setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser, isLoading]);

  if (isLoading || checking) {
    return <PageLoading message="Memeriksa target kompetisi..." />;
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-3">
        <p role="alert" className="text-xs text-rose-600 font-semibold">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs font-bold text-slate-800 bg-white px-4 py-2 rounded-xl border-2 border-slate-300 min-h-[40px] hover:bg-slate-50 hover:border-slate-400 cursor-pointer"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  if (!hasTarget) {
    return <Navigate to="/app/profil?need=target" replace />;
  }

  return <Outlet />;
};
