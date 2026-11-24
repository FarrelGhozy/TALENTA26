import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  Clock,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { DemoBanner } from '../../components/common/DemoBanner';
import { AdminSidebar, getAdminBreadcrumb } from '../../components/common/AdminSidebar';
import { AdminNavProvider, useAdminNav } from '../../features/admin/AdminNavContext';

const AdminShell: React.FC<{
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ mobileDrawerOpen, setMobileDrawerOpen }) => {
  const location = useLocation();
  const { counts, activeCompetitionName } = useAdminNav();
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  const breadcrumb = getAdminBreadcrumb(location.pathname, location.search, activeCompetitionName);

  // Tutup drawer mobile saat pindah halaman/query
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname, location.search, setMobileDrawerOpen]);

  // Tutup drawer mobile dengan tombol Escape & kunci scroll body saat terbuka
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileDrawerOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileDrawerOpen, setMobileDrawerOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:bg-white focus:px-3 focus:py-2 focus:rounded-lg focus:border focus:text-xs focus:font-bold"
      >
        Lewati ke konten utama
      </a>

      <DemoBanner />

      <div className="flex-1 flex min-w-0">
        {/* Sidebar Desktop Tetap Kiri */}
        {desktopSidebarOpen && (
          <aside
            aria-label="Sidebar navigasi admin"
            className="hidden lg:block w-72 shrink-0 border-r border-slate-200/90 bg-white sticky top-0 h-screen"
          >
            <AdminSidebar />
          </aside>
        )}

        {/* Slide-Over Drawer Mobile & Tablet */}
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu navigasi admin">
            <div
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity"
              aria-hidden="true"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <aside className="relative z-10 w-[85vw] max-w-[304px] h-full bg-white shadow-2xl border-r border-slate-200">
              <AdminSidebar
                showCloseButton
                onClose={() => setMobileDrawerOpen(false)}
                onNavigate={() => setMobileDrawerOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* Kolom Utama Kanan */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top Utility Bar Ringkas (Desktop & Mobile) */}
          <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Tombol Hamburger Mobile/Tablet */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                aria-label="Buka navigasi admin"
                aria-expanded={mobileDrawerOpen}
                className="lg:hidden min-w-[42px] min-h-[42px] -ml-1.5 rounded-xl text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>

              {/* Tombol Toggle Sidebar Desktop */}
              <button
                type="button"
                onClick={() => setDesktopSidebarOpen((prev) => !prev)}
                aria-label={desktopSidebarOpen ? 'Sembunyikan sidebar navigasi' : 'Tampilkan sidebar navigasi'}
                aria-expanded={desktopSidebarOpen}
                title={desktopSidebarOpen ? 'Sembunyikan sidebar' : 'Tampilkan sidebar'}
                className="hidden lg:inline-flex min-w-[36px] min-h-[36px] rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                {desktopSidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              {/* Breadcrumb Lokasi Aktif */}
              <nav aria-label="Breadcrumb lokasi" className="flex items-center gap-1.5 text-xs min-w-0">
                <Link
                  to="/admin"
                  className="hidden sm:inline font-semibold text-slate-500 hover:text-blue-700 truncate"
                >
                  Portal Admin
                </Link>
                <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                {breadcrumb.sectionTo && breadcrumb.subsection ? (
                  <Link
                    to={breadcrumb.sectionTo}
                    className="font-semibold text-slate-600 hover:text-blue-700 truncate transition-colors"
                  >
                    {breadcrumb.section}
                  </Link>
                ) : (
                  <span
                    className={`truncate ${
                      breadcrumb.subsection
                        ? 'font-semibold text-slate-600'
                        : 'font-extrabold text-slate-900'
                    }`}
                  >
                    {breadcrumb.section}
                  </span>
                )}
                {breadcrumb.subsection && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span className="font-extrabold text-slate-900 truncate">
                      {breadcrumb.subsection}
                    </span>
                  </>
                )}
              </nav>
            </div>

            {/* Indikator Cepat Antrean Menunggu */}
            <div className="flex items-center gap-2 shrink-0">
              {counts.achievements.menunggu > 0 && (
                <Link
                  to="/admin/prestasi?status=menunggu"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 text-[11px] font-bold transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Menunggu:</span>
                  <span>{counts.achievements.menunggu}</span>
                </Link>
              )}
            </div>
          </header>

          {/* Area Konten Utama yang Lega */}
          <main
            id="main-content"
            className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export const AdminLayout: React.FC = () => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <AdminNavProvider onOpenMobileDrawer={() => setMobileDrawerOpen(true)}>
      <AdminShell
        mobileDrawerOpen={mobileDrawerOpen}
        setMobileDrawerOpen={setMobileDrawerOpen}
      />
    </AdminNavProvider>
  );
};
