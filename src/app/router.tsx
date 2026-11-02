import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';
import { RequireRole, RequireTarget } from './guards';
import { NotFoundPage, ForbiddenPage, RouteErrorPage } from './ErrorPages';

import { LandingPage } from '../features/landing/LandingPage';
import { LoginPage } from '../features/auth/LoginPage';
import { CompetitionListPage } from '../features/kompetisi/CompetitionListPage';
import { CompetitionDetailPage } from '../features/kompetisi/CompetitionDetailPage';
import { BerandaPage } from '../features/mahasiswa/BerandaPage';
import { ProfilePage } from '../features/profil/ProfilePage';
import { PartnerPage } from '../features/matching/PartnerPage';
import { TeamPage } from '../features/tim/TeamPage';
import { PreparationPage } from '../features/roadmap/PreparationPage';
import { AchievementListPage } from '../features/prestasi/AchievementListPage';
import { AchievementNewPage } from '../features/prestasi/AchievementNewPage';
import { AdminDashboardPage } from '../features/dashboard/AdminDashboardPage';
import { VerificationListPage } from '../features/verifikasi/VerificationListPage';
import { VerificationDetailPage } from '../features/verifikasi/VerificationDetailPage';

export const router = createBrowserRouter(
  [
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/masuk', element: <LoginPage /> },
      { path: '/kompetisi', element: <CompetitionListPage /> },
      { path: '/kompetisi/:slug', element: <CompetitionDetailPage /> },
      { path: '/403', element: <ForbiddenPage /> },
    ],
  },

  {
    element: <RequireRole allowedRoles={['mahasiswa']} />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/app/beranda" replace /> },
          { path: 'beranda', element: <BerandaPage /> },
          { path: 'profil', element: <ProfilePage /> },
          { path: 'partner', element: <PartnerPage /> },
          { path: 'tim', element: <TeamPage /> },
          { path: 'prestasi', element: <AchievementListPage /> },
          { path: 'prestasi/baru', element: <AchievementNewPage /> },
          {
            element: <RequireTarget />,
            children: [{ path: 'kompetisi/:slug/persiapan', element: <PreparationPage /> }],
          },
        ],
      },
    ],
  },

  {
    element: <RequireRole allowedRoles={['admin_program', 'admin_institusi']} />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/admin',
        element: <AppLayout />,
        children: [{ index: true, element: <AdminDashboardPage /> }],
      },
    ],
  },

  {
    element: <RequireRole allowedRoles={['verifikator']} />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/verifikasi',
        element: <AppLayout />,
        children: [
          { index: true, element: <VerificationListPage /> },
          { path: ':id', element: <VerificationDetailPage /> },
        ],
      },
    ],
  },

  { path: '/404', element: <NotFoundPage /> },
  { path: '*', element: <NotFoundPage /> },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);
