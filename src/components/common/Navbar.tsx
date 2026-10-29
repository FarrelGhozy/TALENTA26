import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Badge } from '../ui/Badge';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Navbar: React.FC = () => {
  const { currentUser, currentRole, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const getNavLinks = (): NavItem[] => {
    if (!currentUser) {
      return [{ to: '/kompetisi', label: 'Katalog Lomba', icon: Trophy }];
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
    if (to === '/') return location.pathname === '/';
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/masuk');
  };

  const roleColor: Record<string, 'indigo' | 'purple' | 'emerald' | 'blue'> = {
    mahasiswa: 'blue',
    admin_program: 'blue',
    admin_institusi: 'blue',
    verifikator: 'emerald',
    dosen: 'blue',
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo with Generated UNIDA Icon */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/images/logo-icon.png"
              alt="Logo Resmi TALENTA UNIDA Gontor"
              className="w-9 h-9 rounded-xl shadow-xs group-hover:scale-105 transition-transform object-cover border border-blue-900/10"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-blue-950 tracking-tight block text-base leading-none">
                  TALENTA
                </span>
                <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-200/80 leading-none">
                  UNIDA
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block leading-tight mt-0.5">
                Universitas Darussalam Gontor
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav aria-label="Navigasi utama" className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.to);
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={active ? 'page' : undefined}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] inline-flex items-center gap-2 ${
                    active
                      ? 'bg-blue-50 text-blue-800 shadow-2xs font-bold border border-blue-200/60'
                      : 'text-slate-700 hover:text-blue-900 hover:bg-slate-100/90'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-blue-700' : 'text-slate-400'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User / Action Buttons */}
        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200/80">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-blue-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {getInitials(currentUser.nama)}
                </div>
                <div className="text-right hidden md:block">
                  <span className="text-xs font-bold text-slate-900 block leading-tight truncate max-w-[140px]">
                    {currentUser.nama}
                  </span>
                  <div className="flex justify-end mt-0.5">
                    <Badge color={roleColor[currentRole || 'mahasiswa']} size="sm">
                      {currentRole}
                    </Badge>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar"
                className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="sr-only">Keluar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/kompetisi"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 text-slate-700 hover:text-blue-800 hover:bg-slate-100 rounded-xl min-h-[38px] border border-slate-200"
              >
                <Compass className="w-3.5 h-3.5 text-blue-700" />
                Jelajah Lomba
              </Link>
              <Link
                to="/masuk"
                className="text-xs font-bold px-4 py-2 bg-blue-700 text-white rounded-xl hover:bg-blue-800 shadow-sm hover:shadow-blue-600/20 transition-all min-h-[38px] inline-flex items-center gap-1.5"
              >
                Masuk Portal
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            className="lg:hidden p-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors cursor-pointer"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav
          aria-label="Navigasi seluler"
          className="lg:hidden border-t border-slate-100 px-4 py-3 space-y-1.5 bg-white shadow-lg animate-in fade-in duration-150"
        >
          {currentUser && (
            <div className="p-3 mb-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-700 to-blue-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {getInitials(currentUser.nama)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {currentUser.nama}
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  {currentUser.email}
                </span>
              </div>
              <Badge color={roleColor[currentRole || 'mahasiswa']} size="sm">
                {currentRole}
              </Badge>
            </div>
          )}

          {navLinks.map((link) => {
            const active = isActive(link.to);
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold min-h-[44px] transition-colors ${
                  active ? 'bg-blue-50 text-blue-800 border border-blue-200/80' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-700' : 'text-slate-400'}`} />
                {link.label}
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-100 mt-2">
            {currentUser ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 text-sm text-rose-600 font-bold px-3 py-2.5 rounded-xl hover:bg-rose-50 min-h-[44px] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Keluar dari Akun
              </button>
            ) : (
              <Link
                to="/masuk"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center text-sm font-bold px-3 py-2.5 bg-blue-700 text-white rounded-xl text-center min-h-[44px] shadow-sm hover:bg-blue-800"
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