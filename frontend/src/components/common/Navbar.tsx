import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  Compass,
  LayoutDashboard,
  Trophy,
  UserCircle2,
  Users,
  Award,
  CheckCheck,
  Medal,
  Settings2,
  Menu,
  X,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { assetUrl } from '../../lib/asset';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Navbar: React.FC = () => {
  const { currentUser, currentRole, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setProfileMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpen]);

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
        { to: '/ranking', label: 'Ranking', icon: Medal },
      ];
    }
    if (currentRole === 'mahasiswa') {
      return [
        { to: '/app/beranda', label: 'Beranda', icon: LayoutDashboard },
        { to: '/app/persiapan', label: 'Ruang Persiapan', icon: BookOpen },
        { to: '/app/tim', label: 'Tim', icon: Users },
        { to: '/kompetisi', label: 'Katalog Lomba', icon: Trophy },
        { to: '/app/prestasi', label: 'Prestasi', icon: Award },
        { to: '/ranking', label: 'Ranking', icon: Medal },
      ];
    }
    if (currentRole === 'super_admin' || currentRole === 'validator') {
      return [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/konten', label: 'Kelola Lomba', icon: Trophy },
        { to: '/admin/prestasi', label: 'Validasi Prestasi', icon: CheckCheck },
        { to: '/admin/sistem', label: 'Pengaturan Sistem', icon: Settings2 },
      ];
    }
    return [{ to: '/kompetisi', label: 'Katalog Lomba', icon: Trophy }];
  };

  const navLinks = getNavLinks();

  const isActive = (to: string) => {
    const cleanTarget = to.split('?')[0];
    if (cleanTarget === '/app/persiapan') {
      return (
        strippedPath === '/app/persiapan' ||
        (strippedPath.startsWith('/app/kompetisi/') && strippedPath.endsWith('/persiapan'))
      );
    }
    if (
      cleanTarget === '/' ||
      cleanTarget === '/admin'
    ) {
      return strippedPath === cleanTarget;
    }
    return strippedPath === cleanTarget || strippedPath.startsWith(`${cleanTarget}/`);
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
    setMobileOpen(false);
    navigate('/masuk');
  };

  const formatRole = (role?: string) => {
    if (role === 'mahasiswa') return 'Mahasiswa';
    if (role === 'super_admin' || role === 'validator') return 'Admin';
    return role || 'Pengguna';
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
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
              src={assetUrl('images/logo-icon.png')}
              alt="Logo TALENTA UNIDA Gontor"
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
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                aria-label="Menu akun dan profil"
                className={`flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 pr-2 py-1 rounded-2xl border transition-colors cursor-pointer min-h-[42px] ${
                  isLanding
                    ? profileMenuOpen
                      ? 'bg-white/15 border-white/30'
                      : 'border-white/15 hover:bg-white/10'
                    : profileMenuOpen
                      ? 'bg-slate-100 border-blue-300'
                      : 'border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {currentUser.avatar ? (
                  <img
                    src={assetUrl(currentUser.avatar)}
                    alt={currentUser.nama}
                    className="w-8 h-8 rounded-full object-cover border-2 border-blue-500/50 shadow-xs shrink-0"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 via-blue-800 to-indigo-900 text-white font-bold text-xs flex items-center justify-center border-2 border-blue-400/40 shadow-xs shrink-0"
                  >
                    {getInitials(currentUser.nama)}
                  </div>
                )}
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
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    profileMenuOpen ? 'rotate-180' : ''
                  } ${isLanding ? 'text-slate-300' : 'text-slate-500'}`}
                  aria-hidden="true"
                />
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Pilihan akun"
                  className="absolute right-0 mt-2 w-60 rounded-2xl bg-white text-slate-800 border border-slate-200 shadow-xl py-1.5 z-50"
                >
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <div className="text-xs font-extrabold text-slate-900 truncate">
                      {currentUser.nama}
                    </div>
                    <div className="text-[11px] font-semibold text-blue-700">
                      {formatRole(currentRole || 'mahasiswa')}
                    </div>
                    {currentUser.email && (
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {currentUser.email}
                      </div>
                    )}
                  </div>

                  {currentRole === 'mahasiswa' && (
                    <div className="py-1">
                      <Link
                        to="/app/profil"
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                      >
                        <UserCircle2 className="w-4 h-4 text-blue-700" aria-hidden="true" />
                        <span>Pengaturan Profil &amp; Target</span>
                      </Link>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      <span>Keluar dari Akun</span>
                    </button>
                  </div>
                </div>
              )}
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
              {currentUser.avatar ? (
                <img
                  src={assetUrl(currentUser.avatar)}
                  alt={currentUser.nama}
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/50 shadow-xs shrink-0"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-700 via-blue-800 to-indigo-900 text-white font-bold text-xs flex items-center justify-center border-2 border-blue-400/40 shadow-xs shrink-0"
                >
                  {getInitials(currentUser.nama)}
                </div>
              )}
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
            className={`pt-2 border-t mt-2 space-y-1 ${
              isLanding ? 'border-white/10' : 'border-slate-100'
            }`}
          >
            {currentUser ? (
              <>
                {currentRole === 'mahasiswa' && (
                  <Link
                    to="/app/profil"
                    onClick={() => setMobileOpen(false)}
                    className={`w-full flex items-center justify-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl min-h-[44px] transition-colors ${
                      isLanding
                        ? 'text-sky-300 hover:bg-white/10'
                        : 'text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    <UserCircle2 className="w-4 h-4" aria-hidden="true" />
                    Pengaturan Profil &amp; Target
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl border min-h-[44px] transition-colors cursor-pointer ${
                    isLanding
                      ? 'text-rose-300 border-rose-400/40 bg-rose-500/10 hover:bg-rose-500/20'
                      : 'text-rose-700 border-rose-300 bg-rose-50/80 hover:bg-rose-100'
                  }`}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Keluar dari Akun
                </button>
              </>
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
