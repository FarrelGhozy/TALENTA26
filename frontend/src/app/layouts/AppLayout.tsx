import React from 'react';
import { Outlet } from 'react-router-dom';
import { DemoBanner } from '../../components/common/DemoBanner';
import { Navbar } from '../../components/common/Navbar';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7fafc]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:bg-white focus:px-3 focus:py-2 focus:rounded-lg focus:border"
      >
        Lewati ke konten utama
      </a>
      <DemoBanner />
      <Navbar />
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-7 sm:py-9">
        <Outlet />
      </main>
    </div>
  );
};
