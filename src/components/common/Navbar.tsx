import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  LayoutDashboard,
  Trophy,
  UserCircle2,
  Users,
  Award,
  CheckCheck,
  Menu,
  X,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Navbar: React.FC = () => {
  const { currentUser, currentRole, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const strippedPath =
    basePath && location.pathname.startsWith(basePath)
      ? location.pathname.slice(basePath.length) || '/'
      : location.pathname;
  const isLanding = strippedPath === '/';

  useEffect(() => {
    if (!isLanding) {
      setScrolled(false);
      return;
    }
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isLanding]);

  const getNavLinks = (): NavItem[] => {
    if (!currentUser) {
      return [
        { to: '/', label: 'Beranda', icon: Compass },
        { to: '/kompetisi', label: 'Katalog Lomba', icon: Trophy },
      ];
    }
    if (currentRole === 'mahasiswa') {
      return [
        { to: '/app/beranda', label: 'Beranda', icon: LayoutDashboard },
        { to: '/kompetisi', label: 'Katalog Lomba', icon: Trophy },
        { to: '/app/profil', label: 'Profil & Target', icon: UserCircle2 },
        { to: '/app/partner', label: 'Cari Partner', icon: Users },
        { to: '/app/tim', label: 'Tim Saya', icon: Users },
        { to: '/app/prestasi', label: 'Prestasi', icon: Award },
      ];
    }
    if (currentRole === 'admin_program' || currentRole === 'admin_institusi') {
      return [
        { to: '/admin', label: 'Dashboard Admin', icon: LayoutDashboard },
        { to: '/kompetisi', label: 'Katalog Lomba', icon: Trophy },
      ];
    }
    if (currentRole === 'verifikator') {
      return [{ to: '/verifikasi', label: 'Antrean Verifikasi', icon: CheckCheck }];
    }
    return [{ to: '/kompetisi', label: 'Katalog Lomba', icon: Trophy }];
  };

  const navLinks = getNavLinks();

  const isActive = (to: string) => {
    if (to === '/') return strippedPath === '/';
    return strippedPath === to || strippedPath.startsWith(`${to}/`);
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/masuk');
  };

  const formatRole = (role?: string) => {
    if (role === 'mahasiswa') return 'Mahasiswa';
    if (role === 'admin_program') return 'Admin Program';
    if (role === 'admin_institusi') return 'Admin Institusi';
    if (role === 'verifikator') return 'Verifikator';
    if (role === 'dosen') return 'Dosen Pembimbing';
    return role || 'Pengguna';
  };

  const getAvatarSrc = (user?: { nama?: string; avatar?: string } | null) => {
    if (user?.avatar) return user.avatar;
    const base = import.meta.env.BASE_URL;
    const name = (user?.nama || '').toLowerCase();
    if (name.includes('rina') || name.includes('sari') || name.includes('maya')) {
      return `${base}images/avatar-rina.jpg`;
    }
    return `${base}images/avatar-andi.jpg`;
  };

  return (
    <header
      className={`transition-all duration-300 z-50 ${
        isLanding
          ? `fixed top-0 left-0 right-0 ${
              scrolled
                ? 'bg-[#070b16]/95 backdrop-blur-md border-b border-white/10 shadow-xl text-white'
                : 'bg-gradient-to-b from-[#060a14]/90 via-[#060a14]/60 to-transparent border-b border-white/10 text-white'
            }`
          : 'sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs text-slate-800'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo with Generated UNIDA Icon */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={`${import.meta.env.BASE_URL}images/logo-icon.png`}
              alt="Logo Resmi TALENTA UNIDA Gontor"
              className="w-9 h-9 rounded-xl shadow-xs group-hover:scale-105 transition-transform object-cover border border-white/20"
            />
            <div>
              <span
                className={`font-black tracking-tight block text-base leading-none ${
                  isLanding ? 'text-white' : 'text-blue-950'
                }`}
              >
                TALENTA
              </span>
              <span
                className={`text-[10px] font-semibold block leading-tight mt-1 ${
                  isLanding ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                Universitas Darussalam Gontor
              </span>
            </div>
          </Link>

          {/* Desktop Navigation - Clean Text with Underline Indicator */}
          <nav aria-label="Navigasi utama" className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={active ? 'page' : undefined}
                  className={`relative py-1.5 text-xs sm:text-sm font-semibold transition-colors duration-200 ${
                    isLanding
                      ? active
                        ? 'text-sky-300 font-bold'
                        : 'text-slate-300 hover:text-white'
                      : active
                        ? 'text-blue-700 font-bold'
                        : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  <span>{link.label}</span>
                  {active && (
                    <span
                      className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full transition-all ${
                        isLanding
                          ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                          : 'bg-blue-700'
                      }`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User / Action Buttons */}
        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l ${
                  isLanding ? 'border-white/20' : 'border-slate-200/80'
                }`}
              >
                <img
                  src={getAvatarSrc(currentUser)}
                  alt={currentUser.nama}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-blue-500/50 shadow-xs shrink-0"
                />
                <div className="text-right hidden md:block">
                  <span
                    className={`text-xs font-bold block leading-tight truncate max-w-[140px] ${
                      isLanding ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {currentUser.nama}
                  </span>
                  <span
                    className={`text-[11px] font-semibold block leading-tight mt-0.5 ${
                      isLanding ? 'text-sky-300' : 'text-blue-700'
                    }`}
                  >
                    {formatRole(currentRole || 'mahasiswa')}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar"
                className={`p-2 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer ${
                  isLanding
                    ? 'text-slate-300 hover:text-rose-400 hover:bg-white/10'
                    : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span className="sr-only">Keluar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/kompetisi"
                className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl min-h-[38px] transition-all border ${
                  isLanding
                    ? 'text-white bg-white/10 hover:bg-white/20 border-white/20'
                    : 'text-slate-700 hover:text-blue-800 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <Compass className={`w-3.5 h-3.5 ${isLanding ? 'text-sky-300' : 'text-blue-700'}`} />
                Jelajah Lomba
              </Link>

              {/* Aesthetic Pill CTA Button matching Image 1 with UNIDA Royal Blue Branding */}
              <Link
                to="/masuk"
                className={`text-xs font-bold px-5 py-2 rounded-full min-h-[38px] inline-flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                  isLanding
                    ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-blue-950/60 hover:shadow-blue-800/80 border border-blue-400/30 hover:scale-[1.02]'
                    : 'bg-blue-700 text-white hover:bg-blue-800 shadow-blue-600/20'
                }`}
              >
                <span>Masuk Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-sky-200" />
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            className={`lg:hidden p-2 rounded-xl border min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors cursor-pointer ${
              isLanding
                ? 'border-white/20 text-white hover:bg-white/10'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav
          aria-label="Navigasi seluler"
          className={`lg:hidden border-t px-4 py-3 space-y-1.5 shadow-xl animate-in fade-in duration-150 ${
            isLanding
              ? 'bg-[#080d19] border-white/10 text-white'
              : 'bg-white border-slate-100 text-slate-800'
          }`}
        >
          {currentUser && (
            <div
              className={`p-3 mb-2 rounded-xl border flex items-center gap-3 ${
                isLanding
                  ? 'bg-white/5 border-white/10'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <img
                src={getAvatarSrc(currentUser)}
                alt={currentUser.nama}
                className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/50 shadow-xs shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span
                  className={`text-xs font-bold block truncate ${
                    isLanding ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {currentUser.nama}
                </span>
                <span
                  className={`text-[11px] font-semibold block leading-tight mt-0.5 ${
                    isLanding ? 'text-sky-300' : 'text-blue-700'
                  }`}
                >
                  {formatRole(currentRole || 'mahasiswa')}
                </span>
                <span
                  className={`text-[10px] block truncate mt-0.5 ${
                    isLanding ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {currentUser.email}
                </span>
              </div>
            </div>
          )}

          {navLinks.map((link) => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`block px-3 py-2 text-sm font-semibold transition-colors ${
                  isLanding
                    ? active
                      ? 'text-sky-300 font-bold border-l-2 border-sky-400 pl-4'
                      : 'text-slate-300 hover:text-white'
                    : active
                      ? 'text-blue-700 font-bold border-l-2 border-blue-700 pl-4'
                      : 'text-slate-700 hover:text-blue-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div
            className={`pt-2 border-t mt-2 ${
              isLanding ? 'border-white/10' : 'border-slate-100'
            }`}
          >
            {currentUser ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 text-sm text-rose-400 font-bold px-3 py-2.5 rounded-xl hover:bg-rose-500/10 min-h-[44px] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Keluar dari Akun
              </button>
            ) : (
              <Link
                to="/masuk"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center text-sm font-bold px-4 py-2.5 rounded-xl text-center min-h-[44px] shadow-sm bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white"
              >
                Masuk ke Aplikasi
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};