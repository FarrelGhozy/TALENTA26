import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Award,
  BookOpenCheck,
  CalendarRange,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  Contact,
  Globe,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Medal,
  Settings2,
  SlidersHorizontal,
  Trophy,
  Users,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useAdminNav } from '../../features/admin/AdminNavContext';
import { assetUrl } from '../../lib/asset';
import { UserAvatar } from '../ui/UserAvatar';

type BadgeTone = 'amber' | 'orange' | 'emerald' | 'rose' | 'slate' | 'blue';

interface SidebarSubItem {
  id: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | null;
  badgeTone?: BadgeTone;
  isActive: (pathname: string, search: URLSearchParams) => boolean;
}

interface SidebarGroup {
  id: 'prestasi' | 'konten' | 'sistem';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  headBadge?: number | null;
  headBadgeTone?: BadgeTone;
  isGroupActive: (pathname: string) => boolean;
  items: SidebarSubItem[];
}

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  amber: 'bg-amber-100 text-amber-900 border-amber-200',
  orange: 'bg-orange-100 text-orange-900 border-orange-200',
  emerald: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  rose: 'bg-rose-100 text-rose-800 border-rose-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

function stripBasePath(pathname: string): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (basePath && pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length) || '/';
  }
  return pathname;
}

function normalizeSystemTab(raw: string | null): string {
  switch (raw) {
    case 'periods':
    case 'periode':
      return 'periods';
    case 'points':
    case 'poin':
      return 'points';
    case 'audit':
      return 'audit';
    case 'health':
    case 'kesehatan':
      return 'health';
    case 'users':
    case 'staf':
    default:
      return 'users';
  }
}

function normalizeContentTab(raw: string | null): string {
  if (raw && ['kompetisi', 'poin', 'roadmap', 'konsultan', 'seleksi'].includes(raw)) {
    return raw;
  }
  return 'kompetisi';
}

function normalizeAchievementStatus(raw: string | null): string {
  if (raw && ['menunggu', 'perlu_perbaikan', 'disetujui', 'ditolak', 'semua'].includes(raw)) {
    return raw;
  }
  return 'menunggu';
}

export function getAdminBreadcrumb(pathname: string, search: string): {
  section: string;
  subsection?: string;
} {
  const cleanPath = stripBasePath(pathname);
  const params = new URLSearchParams(search);

  if (cleanPath === '/admin' || cleanPath === '/admin/') {
    return { section: 'Dashboard' };
  }

  if (cleanPath.startsWith('/admin/prestasi/')) {
    return { section: 'Validasi Prestasi', subsection: 'Pemeriksaan Bukti' };
  }

  if (cleanPath === '/admin/prestasi') {
    const status = normalizeAchievementStatus(params.get('status'));
    const statusLabels: Record<string, string> = {
      menunggu: 'Menunggu Verifikasi',
      perlu_perbaikan: 'Perlu Perbaikan',
      disetujui: 'Telah Disetujui',
      ditolak: 'Ditolak',
      semua: 'Semua Riwayat',
    };
    return { section: 'Validasi Prestasi', subsection: statusLabels[status] };
  }

  if (cleanPath === '/admin/konten') {
    const tab = normalizeContentTab(params.get('tab'));
    const tabLabels: Record<string, string> = {
      kompetisi: 'Kompetisi',
      poin: 'Aturan Poin & Sub-Lomba',
      roadmap: 'Roadmap',
      konsultan: 'Kontak Konsultasi',
      seleksi: 'Seleksi Internal',
    };
    return { section: 'Kelola Lomba', subsection: tabLabels[tab] };
  }

  if (cleanPath === '/admin/sistem') {
    const tab = normalizeSystemTab(params.get('tab'));
    const tabLabels: Record<string, string> = {
      users: 'Akun & Admin',
      periods: 'Periode Akademik',
      points: 'Template & Aturan Poin',
      audit: 'Jejak Audit',
      health: 'Kesehatan Sistem',
    };
    return { section: 'Pengaturan Sistem', subsection: tabLabels[tab] };
  }

  return { section: 'Portal Admin' };
}

interface AdminSidebarProps {
  onNavigate?: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  onNavigate,
  showCloseButton = false,
  onClose,
}) => {
  const { currentUser, logout } = useAuth();
  const { counts } = useAdminNav();
  const location = useLocation();
  const navigate = useNavigate();

  const cleanPath = stripBasePath(location.pathname);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const groups: SidebarGroup[] = useMemo(
    () => [
      {
        id: 'prestasi',
        label: 'Validasi Prestasi',
        icon: CheckCheck,
        headBadge: counts.achievements.menunggu > 0 ? counts.achievements.menunggu : null,
        headBadgeTone: 'amber',
        isGroupActive: (p) => p === '/admin/prestasi' || p.startsWith('/admin/prestasi/'),
        items: [
          {
            id: 'prestasi-menunggu',
            label: 'Menunggu Verifikasi',
            to: '/admin/prestasi?status=menunggu',
            icon: Clock,
            badge: counts.achievements.menunggu,
            badgeTone: counts.achievements.menunggu > 0 ? 'amber' : 'slate',
            isActive: (p, q) =>
              p === '/admin/prestasi' && normalizeAchievementStatus(q.get('status')) === 'menunggu',
          },
          {
            id: 'prestasi-perbaikan',
            label: 'Perlu Perbaikan',
            to: '/admin/prestasi?status=perlu_perbaikan',
            icon: AlertCircle,
            badge: counts.achievements.perlu_perbaikan,
            badgeTone: counts.achievements.perlu_perbaikan > 0 ? 'orange' : 'slate',
            isActive: (p, q) =>
              p === '/admin/prestasi' &&
              normalizeAchievementStatus(q.get('status')) === 'perlu_perbaikan',
          },
          {
            id: 'prestasi-disetujui',
            label: 'Telah Disetujui',
            to: '/admin/prestasi?status=disetujui',
            icon: CheckCircle2,
            badge: counts.achievements.disetujui,
            badgeTone: 'emerald',
            isActive: (p, q) =>
              p === '/admin/prestasi' &&
              normalizeAchievementStatus(q.get('status')) === 'disetujui',
          },
          {
            id: 'prestasi-ditolak',
            label: 'Ditolak',
            to: '/admin/prestasi?status=ditolak',
            icon: XCircle,
            badge: counts.achievements.ditolak,
            badgeTone: counts.achievements.ditolak > 0 ? 'rose' : 'slate',
            isActive: (p, q) =>
              p === '/admin/prestasi' && normalizeAchievementStatus(q.get('status')) === 'ditolak',
          },
          {
            id: 'prestasi-semua',
            label: 'Semua Riwayat',
            to: '/admin/prestasi?status=semua',
            icon: ListChecks,
            badge: counts.achievements.semua,
            badgeTone: 'slate',
            isActive: (p, q) =>
              p === '/admin/prestasi' && normalizeAchievementStatus(q.get('status')) === 'semua',
          },
        ],
      },
      {
        id: 'konten',
        label: 'Kelola Lomba',
        icon: Trophy,
        isGroupActive: (p) => p === '/admin/konten',
        items: [
          {
            id: 'konten-kompetisi',
            label: 'Kompetisi',
            to: '/admin/konten?tab=kompetisi',
            icon: Trophy,
            badge: counts.competitions,
            badgeTone: 'slate',
            isActive: (p, q) => p === '/admin/konten' && normalizeContentTab(q.get('tab')) === 'kompetisi',
          },
          {
            id: 'konten-poin',
            label: 'Aturan Poin & Sub-Lomba',
            to: '/admin/konten?tab=poin',
            icon: Award,
            isActive: (p, q) => p === '/admin/konten' && normalizeContentTab(q.get('tab')) === 'poin',
          },
          {
            id: 'konten-roadmap',
            label: 'Roadmap',
            to: '/admin/konten?tab=roadmap',
            icon: BookOpenCheck,
            isActive: (p, q) => p === '/admin/konten' && normalizeContentTab(q.get('tab')) === 'roadmap',
          },
          {
            id: 'konten-konsultan',
            label: 'Kontak Konsultasi',
            to: '/admin/konten?tab=konsultan',
            icon: Contact,
            badge: counts.consultants,
            badgeTone: 'slate',
            isActive: (p, q) => p === '/admin/konten' && normalizeContentTab(q.get('tab')) === 'konsultan',
          },
          {
            id: 'konten-seleksi',
            label: 'Seleksi Internal',
            to: '/admin/konten?tab=seleksi',
            icon: UsersRound,
            badge: counts.selections,
            badgeTone: 'slate',
            isActive: (p, q) => p === '/admin/konten' && normalizeContentTab(q.get('tab')) === 'seleksi',
          },
        ],
      },
      {
        id: 'sistem',
        label: 'Pengaturan Sistem',
        icon: Settings2,
        isGroupActive: (p) => p === '/admin/sistem',
        items: [
          {
            id: 'sistem-users',
            label: 'Akun & Admin',
            to: '/admin/sistem?tab=users',
            icon: Users,
            badge: counts.users,
            badgeTone: 'slate',
            isActive: (p, q) => p === '/admin/sistem' && normalizeSystemTab(q.get('tab')) === 'users',
          },
          {
            id: 'sistem-periods',
            label: 'Periode Akademik',
            to: '/admin/sistem?tab=periods',
            icon: CalendarRange,
            isActive: (p, q) => p === '/admin/sistem' && normalizeSystemTab(q.get('tab')) === 'periods',
          },
          {
            id: 'sistem-points',
            label: 'Template & Aturan Poin',
            to: '/admin/sistem?tab=points',
            icon: SlidersHorizontal,
            isActive: (p, q) => p === '/admin/sistem' && normalizeSystemTab(q.get('tab')) === 'points',
          },
          {
            id: 'sistem-audit',
            label: 'Jejak Audit',
            to: '/admin/sistem?tab=audit',
            icon: History,
            isActive: (p, q) => p === '/admin/sistem' && normalizeSystemTab(q.get('tab')) === 'audit',
          },
          {
            id: 'sistem-health',
            label: 'Kesehatan Sistem',
            to: '/admin/sistem?tab=health',
            icon: Activity,
            isActive: (p, q) => p === '/admin/sistem' && normalizeSystemTab(q.get('tab')) === 'health',
          },
        ],
      },
    ],
    [counts]
  );

  // Grup yang aktif pada rute saat ini otomatis terbuka
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    prestasi: cleanPath === '/admin/prestasi' || cleanPath.startsWith('/admin/prestasi/'),
    konten: cleanPath === '/admin/konten',
    sistem: cleanPath === '/admin/sistem',
  }));

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      if (cleanPath === '/admin/prestasi' || cleanPath.startsWith('/admin/prestasi/')) {
        next.prestasi = true;
      } else if (cleanPath === '/admin/konten') {
        next.konten = true;
      } else if (cleanPath === '/admin/sistem') {
        next.sistem = true;
      }
      return next;
    });
  }, [cleanPath]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleLogout = async () => {
    onNavigate?.();
    await logout();
    navigate('/masuk');
  };

  const isDashboardActive = cleanPath === '/admin' || cleanPath === '/admin/';

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 select-none">
      {/* Header Brand Sidebar */}
      <div className="h-16 px-4 border-b border-slate-200/90 flex items-center justify-between gap-2 shrink-0">
        <Link
          to="/admin"
          onClick={() => onNavigate?.()}
          className="flex items-center gap-2.5 min-w-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xl"
        >
          <img
            src={assetUrl('images/logo-icon.png')}
            alt="Logo TALENTA UNIDA Gontor"
            className="w-9 h-9 rounded-xl shadow-xs object-cover border border-slate-200 shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black tracking-tight text-sm text-blue-950 leading-none">
                TALENTA
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70">
                Admin
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 block truncate mt-1">
              UNIDA Gontor
            </span>
          </div>
        </Link>

        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup navigasi admin"
            className="min-w-[40px] min-h-[40px] rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Area Navigasi Utama (Scrollable) */}
      <nav
        aria-label="Navigasi portal admin"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
      >
        {/* Menu Utama */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Menu Utama
          </div>

          <Link
            to="/admin"
            onClick={() => onNavigate?.()}
            aria-current={isDashboardActive ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-bold transition-colors ${
              isDashboardActive
                ? 'bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs'
                : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-950 border border-transparent'
            }`}
          >
            <LayoutDashboard
              className={`w-4 h-4 shrink-0 ${isDashboardActive ? 'text-blue-700' : 'text-slate-500'}`}
              aria-hidden="true"
            />
            <span className="truncate">Dashboard</span>
          </Link>
        </div>

        {/* Grup Accordion Head + Sub-Menu */}
        <div className="space-y-1.5">
          <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Modul Pengelolaan
          </div>

          {groups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = Boolean(openGroups[group.id]);
            const groupActive = group.isGroupActive(cleanPath);
            const panelId = `admin-sidebar-group-${group.id}`;

            return (
              <div key={group.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    groupActive
                      ? 'bg-slate-100/90 text-slate-950 border border-slate-200/80'
                      : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-950 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <GroupIcon
                      className={`w-4 h-4 shrink-0 ${groupActive ? 'text-blue-700' : 'text-slate-500'}`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{group.label}</span>
                  </span>

                  <span className="flex items-center gap-1.5 shrink-0">
                    {group.headBadge !== undefined && group.headBadge !== null && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-full border leading-none ${
                          BADGE_TONE_CLASSES[group.headBadgeTone || 'amber']
                        }`}
                      >
                        {group.headBadge}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-slate-700' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                </button>

                {isExpanded && (
                  <div
                    id={panelId}
                    role="region"
                    aria-label={`Sub-menu ${group.label}`}
                    className="ml-4 pl-3 border-l border-slate-200 space-y-0.5 py-0.5"
                  >
                    {group.items.map((sub) => {
                      const SubIcon = sub.icon;
                      const active = sub.isActive(cleanPath, searchParams);
                      return (
                        <Link
                          key={sub.id}
                          to={sub.to}
                          onClick={() => onNavigate?.()}
                          aria-current={active ? 'page' : undefined}
                          className={`flex items-center justify-between gap-2 px-2.5 py-2 min-h-[38px] rounded-lg text-xs transition-colors ${
                            active
                              ? 'bg-blue-50 text-blue-800 font-bold'
                              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 font-medium'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <SubIcon
                              className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-blue-700' : 'text-slate-400'}`}
                              aria-hidden="true"
                            />
                            <span className="truncate">{sub.label}</span>
                          </span>
                          {sub.badge !== undefined && sub.badge !== null && (
                            <span
                              className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border leading-none shrink-0 ${
                                active
                                  ? 'bg-blue-100 text-blue-900 border-blue-200'
                                  : BADGE_TONE_CLASSES[sub.badgeTone || 'slate']
                              }`}
                            >
                              {sub.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tautan Cepat Halaman Publik */}
        <div className="space-y-1 pt-2 border-t border-slate-100">
          <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Tampilan Publik
          </div>
          <Link
            to="/kompetisi"
            onClick={() => onNavigate?.()}
            className="flex items-center gap-3 px-3 py-2 min-h-[38px] rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 transition-colors"
          >
            <Globe className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span className="truncate">Katalog Lomba</span>
          </Link>
          <Link
            to="/ranking"
            onClick={() => onNavigate?.()}
            className="flex items-center gap-3 px-3 py-2 min-h-[38px] rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 transition-colors"
          >
            <Medal className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span className="truncate">Papan Ranking</span>
          </Link>
        </div>
      </nav>

      {/* Footer Akun Admin & Keluar */}
      {currentUser && (
        <div className="p-3 border-t border-slate-200/90 bg-slate-50/70 shrink-0 space-y-2.5">
          <div className="flex items-center gap-2.5 px-1">
            <UserAvatar
              src={currentUser.avatar}
              name={currentUser.nama}
              size="sm"
              shape="circle"
              tone="blue"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-slate-900 truncate leading-tight">
                {currentUser.nama}
              </p>
              <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                {currentUser.email || 'Admin Pengelola'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 min-h-[38px] rounded-xl text-xs font-bold text-rose-700 bg-rose-50/60 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 shadow-2xs transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Keluar dari Portal</span>
          </button>
        </div>
      )}
    </div>
  );
};
