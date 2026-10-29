import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DemoBanner } from '../../components/common/DemoBanner';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:bg-white focus:px-3 focus:py-2 focus:rounded-lg focus:border"
      >
        Lewati ke konten utama
      </a>
      {!isLanding && <DemoBanner />}
      <Navbar />
      <main
        id="main-content"
        className={`flex-1 w-full ${isLanding ? 'w-full' : 'max-w-7xl mx-auto px-4 sm:px-6 py-6'}`}
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
