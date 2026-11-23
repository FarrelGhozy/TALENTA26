import { createBrowserRouter, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import type { ComponentType } from 'react';
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';
import { RequireRole, RequireTarget } from './guards';
import { NotFoundPage, ForbiddenPage, RouteErrorPage } from './ErrorPages';
import { PageLoading } from '../components/ui/Skeleton';

const lazyRoute = <T extends Record<string, unknown>>(loader: () => Promise<T>, name: keyof T) => async () => {
  const module = await loader();
  return { Component: module[name] as ComponentType };
};

const LegacyTeamSearchRedirect = () => {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams(searchParams);
  const tab = next.get('tab');
  if (tab === 'pengajuan-saya' || tab === 'pengajuan') {
    next.set('tab', 'pengajuan');
  } else {
    next.set('tab', 'cari');
  }
  return <Navigate to={`/app/tim?${next.toString()}`} replace />;
};

const LegacyQueryRedirect = ({ to }: { to: string }) => {
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const target = id ? `${to}/${id}` : to;
  return <Navigate to={`${target}${location.search}`} replace />;
};

export const router = createBrowserRouter(
  [
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <PageLoading message="Menyiapkan halaman..." />,
    children: [
      { path: '/', lazy: lazyRoute(() => import('../features/landing/LandingPage'), 'LandingPage') },
      { path: '/masuk', lazy: lazyRoute(() => import('../features/auth/LoginPage'), 'LoginPage') },
      { path: '/daftar', lazy: lazyRoute(() => import('../features/auth/RegisterPage'), 'RegisterPage') },
      { path: '/lupa-password', lazy: lazyRoute(() => import('../features/auth/ForgotPasswordPage'), 'ForgotPasswordPage') },
      { path: '/reset-password', lazy: lazyRoute(() => import('../features/auth/ResetPasswordPage'), 'ResetPasswordPage') },
      { path: '/ranking', lazy: lazyRoute(() => import('../features/ranking/RankingPage'), 'RankingPage') },
      { path: '/kompetisi', lazy: lazyRoute(() => import('../features/kompetisi/CompetitionListPage'), 'CompetitionListPage') },
      { path: '/kompetisi/:slug', lazy: lazyRoute(() => import('../features/kompetisi/CompetitionDetailPage'), 'CompetitionDetailPage') },
      { path: '/403', element: <ForbiddenPage /> },
    ],
  },

  {
    element: <RequireRole allowedRoles={['mahasiswa']} />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <PageLoading message="Menyiapkan portal mahasiswa..." />,
    children: [
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/app/beranda" replace /> },
          { path: 'beranda', lazy: lazyRoute(() => import('../features/mahasiswa/BerandaPage'), 'BerandaPage') },
          { path: 'persiapan', lazy: lazyRoute(() => import('../features/roadmap/PreparationHubPage'), 'PreparationHubPage') },
          { path: 'profil', lazy: lazyRoute(() => import('../features/profil/ProfilePage'), 'ProfilePage') },
          { path: 'partner', element: <Navigate to="/app/tim?tab=cari" replace /> },
          { path: 'tim', lazy: lazyRoute(() => import('../features/tim/TeamPage'), 'TeamPage') },
          { path: 'tim/cari', element: <LegacyTeamSearchRedirect /> },
          { path: 'prestasi', lazy: lazyRoute(() => import('../features/prestasi/AchievementListPage'), 'AchievementListPage') },
          { path: 'prestasi/baru', lazy: lazyRoute(() => import('../features/prestasi/AchievementNewPage'), 'AchievementNewPage') },
          { path: 'prestasi/:id', lazy: lazyRoute(() => import('../features/prestasi/AchievementDetailPage'), 'AchievementDetailPage') },
          {
            element: <RequireTarget />,
            children: [{ path: 'kompetisi/:slug/persiapan', lazy: lazyRoute(() => import('../features/roadmap/PreparationPage'), 'PreparationPage') }],
          },
        ],
      },
    ],
  },

  {
    element: <RequireRole allowedRoles={['validator', 'super_admin']} />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <PageLoading message="Menyiapkan portal admin..." />,
    children: [
      {
        path: '/admin',
        element: <AppLayout />,
        children: [
          { index: true, lazy: lazyRoute(() => import('../features/dashboard/AdminDashboardPage'), 'AdminDashboardPage') },
          { path: 'konten', lazy: lazyRoute(() => import('../features/validator/ValidatorContentPage'), 'ValidatorContentPage') },
          { path: 'prestasi', lazy: lazyRoute(() => import('../features/verifikasi/VerificationListPage'), 'VerificationListPage') },
          { path: 'prestasi/:id', lazy: lazyRoute(() => import('../features/verifikasi/VerificationDetailPage'), 'VerificationDetailPage') },
          { path: 'sistem', lazy: lazyRoute(() => import('../features/super-admin/SuperAdminDashboardPage'), 'SuperAdminDashboardPage') },
        ],
      },
    ],
  },

  { path: '/super-admin', element: <LegacyQueryRedirect to="/admin/sistem" /> },
  { path: '/super-admin/analitik', element: <Navigate to="/admin" replace /> },
  { path: '/validator', element: <Navigate to="/admin" replace /> },
  { path: '/validator/konten', element: <LegacyQueryRedirect to="/admin/konten" /> },
  { path: '/validator/prestasi', element: <Navigate to="/admin/prestasi" replace /> },
  { path: '/validator/prestasi/:id', element: <LegacyQueryRedirect to="/admin/prestasi" /> },
  { path: '/verifikasi', element: <Navigate to="/admin/prestasi" replace /> },
  { path: '/login', element: <Navigate to="/masuk" replace /> },
  { path: '/auth/login', element: <Navigate to="/masuk" replace /> },
  { path: '/register', element: <Navigate to="/daftar" replace /> },
  { path: '/auth/register', element: <Navigate to="/daftar" replace /> },
  { path: '/404', element: <NotFoundPage /> },
  { path: '*', element: <NotFoundPage /> },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);
