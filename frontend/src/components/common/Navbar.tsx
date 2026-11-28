import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Award, BookOpen, CheckCheck, ChevronDown, Compass, LayoutDashboard, LogOut,
  Medal, Menu, Settings2, Trophy, UserCircle2, UserPlus, Users, X,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { UscBrand } from './UscBrand';
import { UserAvatar } from '../ui/UserAvatar';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

export const Navbar: React.FC = () => {
  const { currentUser, currentRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setProfileMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!profileMenuOpen && !mobileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuOpen && profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (mobileOpen) mobileToggleRef.current?.focus();
      setProfileMenuOpen(false);
      setMobileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpen, mobileOpen]);

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const strippedPath = basePath && location.pathname.startsWith(basePath)
    ? location.pathname.slice(basePath.length) || '/'
    : location.pathname;

  const getNavLinks = (): NavItem[] => {
    if (!currentUser) return [
      { to: '/', label: 'Beranda', icon: Compass },
      { to: '/kompetisi', label: 'Katalog Lomba', icon: Trophy },
      { to: '/ranking', label: 'Ranking', icon: Medal },
    ];
    if (currentRole === 'mahasiswa') return [
      { to: '/app/beranda', label: 'Beranda', icon: LayoutDashboard },
      { to: '/app/persiapan', label: 'Ruang Persiapan', icon: BookOpen },
      { to: '/app/tim', label: 'Tim', icon: Users },
      { to: '/kompetisi', label: 'Katalog Lomba', icon: Trophy },
      { to: '/app/prestasi', label: 'Prestasi', icon: Award },
      { to: '/ranking', label: 'Ranking', icon: Medal },
    ];
    if (currentRole === 'super_admin' || currentRole === 'validator') {
      const adminLinks: NavItem[] = [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/konten', label: 'Kelola Lomba', icon: Trophy },
        { to: '/admin/prestasi', label: 'Validasi Prestasi', icon: CheckCheck },
      ];
      if (currentRole === 'super_admin') adminLinks.push({ to: '/admin/sistem', label: 'Pengaturan Sistem', icon: Settings2 });
      return adminLinks;
    }
    return [{ to: '/kompetisi', label: 'Katalog Lomba', icon: Trophy }];
  };

  const navLinks = getNavLinks();
  const isActive = (to: string) => {
    const cleanTarget = to.split('?')[0];
    if (cleanTarget === '/app/persiapan') {
      return strippedPath === '/app/persiapan' ||
        (strippedPath.startsWith('/app/kompetisi/') && strippedPath.endsWith('/persiapan'));
    }
    if (cleanTarget === '/' || cleanTarget === '/admin') return strippedPath === cleanTarget;
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
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'validator') return 'Validator';
    return role || 'Pengguna';
  };

  return (
    <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/95 text-blue-950 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-7">
          <Link to="/" className="flex min-h-[44px] shrink-0 items-center" aria-label="UNIDA Student Championship (USC)">
            <UscBrand variant="responsive-nav" tone="dark" priority />
          </Link>
          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 xl:flex">
            {navLinks.map((link) => {
              const active = isActive(link.to);
              return (
                <Link key={link.to} to={link.to} aria-current={active ? 'page' : undefined}
                  className={`inline-flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold transition-colors ${
                    active ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-900'
                  }`}>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {currentUser ? (
            <div ref={profileMenuRef} className="relative">
              <button type="button" onClick={() => setProfileMenuOpen((v) => !v)}
                aria-haspopup="menu" aria-expanded={profileMenuOpen} aria-label="Menu akun dan profil"
                className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-2 py-1 transition-colors cursor-pointer ${
                  profileMenuOpen ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                <UserAvatar name={currentUser.nama} src={currentUser.avatar} size="sm" />
                <span className="hidden max-w-[150px] text-left md:block">
                  <span className="block truncate text-sm font-bold leading-tight text-slate-900">{currentUser.nama}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-blue-700">{formatRole(currentRole || 'mahasiswa')}</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {profileMenuOpen && (
                <div role="menu" aria-label="Pilihan akun" className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <div className="truncate text-sm font-bold text-slate-900">{currentUser.nama}</div>
                    <div className="text-xs font-semibold text-blue-700">{formatRole(currentRole || 'mahasiswa')}</div>
                    {currentUser.email && <div className="mt-1 truncate text-xs text-slate-500">{currentUser.email}</div>}
                  </div>
                  {currentRole === 'mahasiswa' && (
                    <Link to="/app/profil" role="menuitem" onClick={() => setProfileMenuOpen(false)}
                      className="mt-1 flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800">
                      <UserCircle2 className="h-4 w-4" aria-hidden="true" /> Pengaturan Profil &amp; Target
                    </Link>
                  )}
                  <button type="button" role="menuitem" onClick={handleLogout}
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer">
                    <LogOut className="h-4 w-4" aria-hidden="true" /> Keluar dari Akun
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/daftar" className="hidden min-h-[44px] items-center rounded-lg px-4 text-sm font-bold text-blue-800 hover:bg-blue-50 sm:inline-flex">Daftar</Link>
              <Link to="/masuk" className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-blue-700 px-6 text-sm font-bold text-white transition-colors hover:bg-blue-800">Masuk</Link>
            </div>
          )}
          <button ref={mobileToggleRef} type="button" onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen} aria-controls="usc-mobile-navigation" aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 xl:hidden cursor-pointer">
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="usc-mobile-navigation" aria-label="Navigasi seluler" className="max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-slate-100 bg-white px-4 py-4 shadow-xl xl:hidden">
          {currentUser && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <UserAvatar name={currentUser.nama} src={currentUser.avatar} size="md" />
              <div className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-900">{currentUser.nama}</span>
                <span className="block text-xs font-semibold text-blue-700">{formatRole(currentRole || 'mahasiswa')}</span>
              </div>
            </div>
          )}
          <div className="space-y-1">
            {navLinks.map((link) => {
              const active = isActive(link.to);
              const Icon = link.icon;
              return (
                <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[44px] items-center gap-3 rounded-xl px-4 text-sm font-semibold ${
                    active ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'
                  }`}>
                  <Icon className="h-4 w-4" aria-hidden={true} /> {link.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
            {currentUser ? (
              <>
                {currentRole === 'mahasiswa' && <Link to="/app/profil" onClick={() => setMobileOpen(false)} className="flex min-h-[44px] items-center gap-3 rounded-xl px-4 text-sm font-semibold text-blue-800 hover:bg-blue-50"><UserCircle2 className="h-4 w-4" aria-hidden="true" /> Pengaturan Profil &amp; Target</Link>}
                <button type="button" onClick={handleLogout} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"><LogOut className="h-4 w-4" aria-hidden="true" /> Keluar dari Akun</button>
              </>
            ) : (
              <Link to="/daftar" onClick={() => setMobileOpen(false)} className="flex min-h-[44px] items-center gap-3 rounded-xl px-4 text-sm font-semibold text-blue-800 hover:bg-blue-50"><UserPlus className="h-4 w-4" aria-hidden="true" /> Daftar Akun Mahasiswa</Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
