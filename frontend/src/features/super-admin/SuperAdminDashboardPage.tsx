import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Database,
  Edit3,
  History,
  Plus,
  RefreshCw,
  Search,
  Server,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageLoading } from '../../components/ui/Skeleton';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { useToast } from '../../components/ui/Toast';
import { useAdminNav } from '../admin/AdminNavContext';
import { systemService } from '@talenta/services';
import type {
  AcademicPeriodActivationPreview,
  AcademicPeriodItem,
  AuditLogItem,
  PointRuleItem,
  PointTemplateItem,
  SystemHealthSummary,
} from '../../services/types';

function normalizeTab(raw: string | null): 'users' | 'periods' | 'points' | 'audit' | 'health' {
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

const DEFAULT_RULES_MATRIX: PointRuleItem[] = [
  { level: 'lokal', result: 'partisipasi', points: 1 },
  { level: 'lokal', result: 'finalis', points: 2 },
  { level: 'lokal', result: 'juara_3', points: 4 },
  { level: 'lokal', result: 'juara_2', points: 6 },
  { level: 'lokal', result: 'juara_1', points: 8 },
  { level: 'lokal', result: 'penghargaan_khusus', points: 2 },
  { level: 'nasional', result: 'partisipasi', points: 2 },
  { level: 'nasional', result: 'finalis', points: 5 },
  { level: 'nasional', result: 'juara_3', points: 10 },
  { level: 'nasional', result: 'juara_2', points: 14 },
  { level: 'nasional', result: 'juara_1', points: 18 },
  { level: 'nasional', result: 'penghargaan_khusus', points: 5 },
  { level: 'internasional', result: 'partisipasi', points: 3 },
  { level: 'internasional', result: 'finalis', points: 8 },
  { level: 'internasional', result: 'juara_3', points: 16 },
  { level: 'internasional', result: 'juara_2', points: 22 },
  { level: 'internasional', result: 'juara_1', points: 30 },
  { level: 'internasional', result: 'penghargaan_khusus', points: 8 },
];

export const SuperAdminDashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeTab = normalizeTab(searchParams.get('tab'));

  const [loading, setLoading] = useState(false);
  const { notify } = useToast();
  const { refreshNavCounts } = useAdminNav();

  // Tab 1: Pengguna & Staf
  const [users, setUsers] = useState<any[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [userRoleFilter, setUserRoleFilter] = useState('semua');
  const [userStatusFilter, setUserStatusFilter] = useState('semua');
  const [userSearch, setUserSearch] = useState('');
  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const [editNameTarget, setEditNameTarget] = useState<{ id: string; fullName: string } | null>(null);
  const [confirmUserAction, setConfirmUserAction] = useState<{
    user: any;
  } | null>(null);

  // Tab 2: Periode Akademik & Pergantian Periode
  const [periods, setPeriods] = useState<AcademicPeriodItem[]>([]);
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    name: '',
    year: Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(new Date())),
    semester: 'ganjil' as 'ganjil' | 'genap',
    startDate: '',
    endDate: '',
  });
  const [switchPreview, setSwitchPreview] = useState<AcademicPeriodActivationPreview | null>(null);
  const [archiveOldTargets, setArchiveOldTargets] = useState(true);
  const [switchingPeriod, setSwitchingPeriod] = useState(false);

  // Tab 3: Template & Aturan Poin
  const [pointRulesData, setPointRulesData] = useState<{
    activeVersion: number | null;
    activeRules: PointRuleItem[];
    versions: any[];
  } | null>(null);
  const [pointTemplates, setPointTemplates] = useState<PointTemplateItem[]>([]);
  const [isNewRuleVersionOpen, setIsNewRuleVersionOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [activateTemplateImmediately, setActivateTemplateImmediately] = useState(true);
  const [newRulesMatrix, setNewRulesMatrix] = useState<PointRuleItem[]>(DEFAULT_RULES_MATRIX);

  // Tab 4: Jejak Audit
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState('');

  // Tab 5: Kesehatan Sistem
  const [health, setHealth] = useState<SystemHealthSummary | null>(null);

  const loadUsers = async (
    page = usersPage,
    overrides?: { role?: string; status?: string; search?: string }
  ) => {
    const effectiveRole = overrides?.role ?? userRoleFilter;
    const effectiveStatus = overrides?.status ?? userStatusFilter;
    const effectiveSearch = overrides?.search ?? userSearch;
    try {
      setLoading(true);
      const res = await systemService.getUsers({
        role: effectiveRole === 'semua' ? undefined : effectiveRole,
        status: effectiveStatus === 'semua' ? undefined : effectiveStatus,
        search: effectiveSearch || undefined,
        page,
        limit: 15,
      });
      setUsers(res.users);
      setUsersPage(res.page);
      setUsersTotalPages(res.totalPages || 1);
    } catch (err: any) {
      notify(err.message || 'Gagal memuat pengguna', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const res = await systemService.getAcademicPeriods();
      setPeriods(res);
    } catch (err: any) {
      notify(err.message || 'Gagal memuat periode akademik', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPointRules = async () => {
    try {
      setLoading(true);
      const [res, tpls] = await Promise.all([
        systemService.getPointRules(),
        systemService.getPointTemplates?.().catch(() => []) ?? Promise.resolve([]),
      ]);
      setPointRulesData(res);
      setPointTemplates(tpls);
      if (res.activeRules && res.activeRules.length > 0) {
        setNewRulesMatrix([...res.activeRules]);
      } else {
        setNewRulesMatrix([...DEFAULT_RULES_MATRIX]);
      }
    } catch (err: any) {
      notify(err.message || 'Gagal memuat aturan poin', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async (page = auditPage) => {
    try {
      setLoading(true);
      const res = await systemService.getAuditLogs({
        action: auditActionFilter.trim() || undefined,
        page,
        limit: 25,
      });
      setAuditLogs(res.logs);
      setAuditPage(res.page);
      setAuditTotalPages(res.totalPages || 1);
    } catch (err: any) {
      notify(err.message || 'Gagal memuat jejak audit', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadHealth = async () => {
    try {
      setLoading(true);
      const res = await systemService.getHealth();
      setHealth(res);
    } catch (err: any) {
      notify(err.message || 'Gagal memuat status kesehatan sistem', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') void loadUsers(1);
    else if (activeTab === 'periods') void loadPeriods();
    else if (activeTab === 'points') void loadPointRules();
    else if (activeTab === 'audit') void loadAuditLogs(1);
    else if (activeTab === 'health') void loadHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Actions: Akun Admin & Pengguna
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (staffForm.fullName.trim().length < 2) {
      notify('Nama lengkap admin minimal 2 karakter wajib diisi', 'error');
      return;
    }
    if (!staffForm.email || staffForm.password.length < 8) {
      notify('Email dan password minimal 8 karakter wajib diisi', 'error');
      return;
    }
    try {
      await systemService.createStaff({
        email: staffForm.email.trim(),
        fullName: staffForm.fullName.trim(),
        password: staffForm.password,
        role: 'super_admin',
      });
      notify('Akun admin berhasil dibuat', 'success');
      setIsCreateStaffOpen(false);
      setStaffForm({ fullName: '', email: '', password: '' });
      await loadUsers(1);
      void refreshNavCounts();
    } catch (err: any) {
      notify(err.message || 'Gagal membuat akun admin', 'error');
    }
  };

  const handleSaveUserName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameTarget || !systemService.updateUserName) return;
    try {
      await systemService.updateUserName(editNameTarget.id, editNameTarget.fullName);
      notify('Nama pengguna berhasil diperbarui.');
      setEditNameTarget(null);
      await loadUsers();
    } catch (err: any) {
      notify(err.message || 'Gagal memperbarui nama pengguna', 'error');
    }
  };

  const executeConfirmUserAction = async () => {
    if (!confirmUserAction) return;
    const { user } = confirmUserAction;
    try {
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await systemService.updateUserStatus(user.id, newStatus);
      notify(
        newStatus === 'suspended'
          ? 'Akun ditangguhkan & seluruh sesi aktif dicabut'
          : 'Akun berhasil diaktifkan kembali',
        'success'
      );
      setConfirmUserAction(null);
      await loadUsers();
    } catch (err: any) {
      notify(err.message || 'Gagal memperbarui akun pengguna', 'error');
    }
  };

  // Actions: Periode Akademik
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodForm.name.trim()) {
      notify('Nama periode wajib diisi', 'error');
      return;
    }
    try {
      await systemService.createAcademicPeriod({
        name: periodForm.name.trim(),
        year: periodForm.year,
        semester: periodForm.semester,
        startDate: periodForm.startDate || undefined,
        endDate: periodForm.endDate || undefined,
      });
      notify('Periode akademik baru berhasil ditambahkan', 'success');
      setIsCreatePeriodOpen(false);
      setPeriodForm({
        name: '',
        year: Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(new Date())),
        semester: 'ganjil',
        startDate: '',
        endDate: '',
      });
      await loadPeriods();
    } catch (err: any) {
      notify(err.message || 'Gagal membuat periode akademik', 'error');
    }
  };

  const openPeriodSwitchConfirm = async (period: AcademicPeriodItem) => {
    if (systemService.getAcademicPeriodPreview) {
      try {
        const preview = await systemService.getAcademicPeriodPreview(period.id);
        setArchiveOldTargets(true);
        setSwitchPreview(preview);
        return;
      } catch (err: any) {
        notify(err.message || 'Gagal memuat pratinjau pergantian periode', 'error');
      }
    }
    setSwitchPreview({
      targetPeriod: period,
      currentActivePeriod: periods.find((p) => p.isActive) || null,
      activeTargetsToArchive: 0,
      activeTeamsToArchive: 0,
    });
  };

  const confirmActivatePeriod = async () => {
    if (!switchPreview) return;
    setSwitchingPeriod(true);
    try {
      await systemService.activateAcademicPeriod(switchPreview.targetPeriod.id, archiveOldTargets);
      notify(`Periode ${switchPreview.targetPeriod.name} sekarang berstatus AKTIF`, 'success');
      setSwitchPreview(null);
      await loadPeriods();
    } catch (err: any) {
      notify(err.message || 'Gagal mengaktifkan periode', 'error');
    } finally {
      setSwitchingPeriod(false);
    }
  };

  // Actions: Template & Aturan Poin
  const handlePublishPointRules = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (systemService.createPointTemplate && templateName.trim().length >= 3) {
        await systemService.createPointTemplate({
          name: templateName.trim(),
          description: templateDescription.trim() || undefined,
          activateAsDefault: activateTemplateImmediately,
          rules: newRulesMatrix,
        });
        notify('Template aturan poin baru berhasil dibuat.');
      } else {
        await systemService.createPointRuleVersion(newRulesMatrix);
        notify('Versi aturan poin baru berhasil diterbitkan dan diaktifkan', 'success');
      }
      setIsNewRuleVersionOpen(false);
      setTemplateName('');
      setTemplateDescription('');
      await loadPointRules();
    } catch (err: any) {
      notify(err.message || 'Gagal menerbitkan aturan poin', 'error');
    }
  };

  const sectionLabels: Record<typeof activeTab, string> = {
    users: 'Akun & Admin',
    periods: 'Periode Akademik',
    points: 'Template & Aturan Poin',
    audit: 'Jejak Audit',
    health: 'Kesehatan Sistem',
  };

  const activePeriodObj = periods.find((p) => p.isActive);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Pengaturan Sistem · ${sectionLabels[activeTab]}`}
        title="Pengaturan Sistem & Operasional"
        description="Kelola akun admin dan mahasiswa, siklus pergantian periode akademik, template bobot poin kompetisi, jejak audit, dan kesehatan sistem."
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'users' && (
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />} onClick={() => setIsCreateStaffOpen(true)}>
                Tambah Admin
              </Button>
            )}
            {activeTab === 'periods' && (
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />} onClick={() => setIsCreatePeriodOpen(true)}>
                Tambah Periode
              </Button>
            )}
            {activeTab === 'points' && (
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />} onClick={() => setIsNewRuleVersionOpen(true)}>
                Buat Template Poin Baru
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
              onClick={() => {
                if (activeTab === 'users') void loadUsers();
                if (activeTab === 'periods') void loadPeriods();
                if (activeTab === 'points') void loadPointRules();
                if (activeTab === 'audit') void loadAuditLogs();
                if (activeTab === 'health') void loadHealth();
              }}
            >
              Segarkan
            </Button>
          </div>
        }
      />

      <div id={`panel-${activeTab}`} className="space-y-4">
        {loading && <PageLoading message="Memuat data pengaturan sistem..." />}

        {/* TAB 1: PENGGUNA & STAF */}
        {!loading && activeTab === 'users' && (
          <div className="space-y-4">
            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                  <div className="flex items-center gap-2 w-full lg:w-auto">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <Input
                        placeholder="Cari email, nama, NIM..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadUsers(1)}
                        className="pl-9 text-xs"
                      />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => loadUsers(1)}>
                      Cari
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="w-36">
                      <Select
                        value={userRoleFilter}
                        onChange={(e) => {
                          const nextRole = e.target.value;
                          setUserRoleFilter(nextRole);
                          void loadUsers(1, { role: nextRole });
                        }}
                        options={[
                          { value: 'semua', label: 'Semua Peran' },
                          { value: 'admin', label: 'Admin' },
                          { value: 'mahasiswa', label: 'Mahasiswa' },
                        ]}
                        className="text-xs min-h-[38px] py-1.5"
                      />
                    </div>
                    <div className="w-36">
                      <Select
                        value={userStatusFilter}
                        onChange={(e) => {
                          const nextStatus = e.target.value;
                          setUserStatusFilter(nextStatus);
                          void loadUsers(1, { status: nextStatus });
                        }}
                        options={[
                          { value: 'semua', label: 'Semua Status' },
                          { value: 'active', label: 'Aktif' },
                          { value: 'suspended', label: 'Ditangguhkan' },
                        ]}
                        className="text-xs min-h-[38px] py-1.5"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="p-3.5">Pengguna</th>
                      <th className="p-3.5">Peran</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Terdaftar</th>
                      <th className="p-3.5 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          Tidak ada pengguna yang cocok dengan kriteria pencarian.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isAdminUser = u.role === 'super_admin' || u.role === 'validator';
                        const isSuspended = u.status === 'suspended';
                        const displayName = u.studentProfile?.fullName || u.fullName || u.email;

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <UserAvatar
                                  src={u.avatarUrl || u.studentProfile?.avatarUrl}
                                  name={displayName}
                                  size="sm"
                                  tone={isAdminUser ? 'blue' : 'slate'}
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate">{displayName}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                    {u.email} {u.studentProfile?.nim ? `• NIM: ${u.studentProfile.nim}` : ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <Badge color={isAdminUser ? 'blue' : 'slate'} size="sm">
                                {isAdminUser ? 'Admin' : 'Mahasiswa'}
                              </Badge>
                            </td>
                            <td className="p-3.5">
                              <Badge color={u.status === 'active' ? 'emerald' : 'rose'} dot size="sm">
                                {u.status === 'active' ? 'Aktif' : 'Ditangguhkan'}
                              </Badge>
                            </td>
                            <td className="p-3.5 text-slate-500">
                              {new Date(u.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-2">
                                {systemService.updateUserName && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditNameTarget({ id: u.id, fullName: u.fullName || displayName })}
                                    leftIcon={<Edit3 className="w-3.5 h-3.5" aria-hidden="true" />}
                                  >
                                    Nama
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant={isSuspended ? 'info-outline' : 'danger-outline'}
                                  onClick={() => setConfirmUserAction({ user: u })}
                                >
                                  {isSuspended ? 'Aktifkan' : 'Suspend'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {usersTotalPages > 1 && (
                <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Halaman {usersPage} dari {usersTotalPages}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={usersPage <= 1} onClick={() => loadUsers(usersPage - 1)}>
                      Sebelumnya
                    </Button>
                    <Button size="sm" variant="outline" disabled={usersPage >= usersTotalPages} onClick={() => loadUsers(usersPage + 1)}>
                      Berikutnya
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 2: PERIODE AKADEMIK & PERGANTIAN PERIODE */}
        {!loading && activeTab === 'periods' && (
          <div className="space-y-4">
            <Card className="bg-blue-50/70 border-blue-200">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <CalendarRange className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <strong className="text-blue-950 block">Manajemen Pergantian Periode Akademik</strong>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      Periode berjalan saat ini: <strong>{activePeriodObj ? activePeriodObj.name : 'Belum ada periode aktif'}</strong>. Mengaktifkan periode baru akan menutup periode lama dan mengarsipkan target kompetisi/tim periode sebelumnya sesuai konfirmasi.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {periods.map((p) => (
                <Card
                  key={p.id}
                  className={`bg-white border transition-all ${
                    p.isActive ? 'border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm' : 'border-slate-200'
                  }`}
                >
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                    <Badge color={p.isActive ? 'emerald' : 'slate'} dot size="sm">
                      {p.isActive ? 'Periode Aktif' : 'Arsip'}
                    </Badge>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {p.semester} {p.year}
                    </span>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-3">
                    <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                    {(p.startDate || p.endDate) && (
                      <p className="text-[11px] text-slate-500">
                        {p.startDate ? new Date(p.startDate).toLocaleDateString('id-ID') : '?'} —{' '}
                        {p.endDate ? new Date(p.endDate).toLocaleDateString('id-ID') : '?'}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Kompetisi:</span>
                        <strong className="text-slate-800 text-sm">{p._count?.competitions ?? 0}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Prestasi:</span>
                        <strong className="text-slate-800 text-sm">{p._count?.achievements ?? 0}</strong>
                      </div>
                    </div>
                    {!p.isActive ? (
                      <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => openPeriodSwitchConfirm(p)}>
                        Aktifkan & Ganti Periode
                      </Button>
                    ) : (
                      <div className="text-center text-[11px] font-bold text-emerald-700 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                        Sedang Digunakan Sistem
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TEMPLATE & ATURAN POIN */}
        {!loading && activeTab === 'points' && (
          <div className="space-y-5">
            {pointTemplates.length > 0 && (
              <Card className="bg-white border-slate-200">
                <CardHeader className="p-4 border-b border-slate-100">
                  <CardTitle level={2} className="text-sm font-bold">
                    Daftar Template Poin Berversi ({pointTemplates.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid gap-3 sm:grid-cols-2">
                  {pointTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        tpl.isActive ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-slate-900">{tpl.name} (v{tpl.version})</strong>
                        <Badge color={tpl.isActive ? 'emerald' : 'slate'} size="sm">
                          {tpl.isActive ? 'Aktif Default' : 'Tersedia'}
                        </Badge>
                      </div>
                      {tpl.description && <p className="text-slate-600">{tpl.description}</p>}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500">
                          {tpl.rules.length} aturan • {tpl._count?.competitions ?? 0} lomba terhubung
                        </span>
                        {!tpl.isActive && systemService.activatePointTemplate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await systemService.activatePointTemplate?.(tpl.id);
                              notify(`Template "${tpl.name}" diaktifkan sebagai default kampus.`);
                              await loadPointRules();
                            }}
                          >
                            Aktifkan Default
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="bg-white border-slate-200">
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle level={2} className="text-sm font-bold flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-blue-700" aria-hidden="true" />
                    <span>Matriks Bobot Poin Standar — Versi Aktif: v{pointRulesData?.activeVersion || 1}</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aturan poin terversi menjadi fallback apabila perlombaan/sub-lomba tidak memiliki aturan khusus.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3">Tingkat Prestasi</th>
                        <th className="p-3">Hasil / Capaian</th>
                        <th className="p-3 text-right">Poin Resmi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pointRulesData?.activeRules.map((rule, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="p-3 font-semibold capitalize text-slate-800">{rule.level}</td>
                          <td className="p-3 capitalize text-slate-600">{rule.result.replace(/_/g, ' ')}</td>
                          <td className="p-3 text-right font-black text-blue-700">{rule.points} Poin</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 4: JEJAK AUDIT */}
        {!loading && activeTab === 'audit' && (
          <Card className="bg-white border-slate-200 overflow-hidden">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle level={2} className="text-sm font-bold flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-700" aria-hidden="true" />
                  <span>Log Jejak Audit Operasional Sistem</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mencatat seluruh aksi administratif dan perubahan data penting dengan nama lengkap aktor.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Filter aksi (misal: ACHIEVEMENT_)"
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadAuditLogs(1)}
                  className="text-xs w-56"
                />
                <Button size="sm" variant="outline" onClick={() => loadAuditLogs(1)}>Filter</Button>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-3">Waktu (WIB)</th>
                    <th className="p-3">Aktor</th>
                    <th className="p-3">Aksi</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Belum ada catatan log jejak audit.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80">
                        <td className="p-3 whitespace-nowrap text-slate-500">
                          {new Date(log.createdAt).toLocaleString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            {log.actor?.studentProfile?.fullName || (log.actor as any)?.fullName || log.actor?.email || 'Sistem'}
                          </div>
                          {log.actor?.role && (
                            <span className="text-[10px] text-slate-400">
                              {log.actor.role === 'super_admin' || log.actor.role === 'validator'
                                ? 'Admin'
                                : log.actor.role === 'mahasiswa'
                                  ? 'Mahasiswa'
                                  : log.actor.role}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-700 text-[11px]">{log.action}</td>
                        <td className="p-3 whitespace-nowrap text-slate-600">
                          {log.targetType} {log.targetId ? `(${log.targetId})` : ''}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-500 max-w-xs truncate">
                          {log.metadata ? JSON.stringify(log.metadata) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {auditTotalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Halaman {auditPage} dari {auditTotalPages}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={auditPage <= 1} onClick={() => loadAuditLogs(auditPage - 1)}>
                    Sebelumnya
                  </Button>
                  <Button size="sm" variant="outline" disabled={auditPage >= auditTotalPages} onClick={() => loadAuditLogs(auditPage + 1)}>
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* TAB 5: KESEHATAN SISTEM */}
        {!loading && activeTab === 'health' && health && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-white border-slate-200">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Basis Data</span>
                    <Database className="w-4 h-4 text-blue-700" aria-hidden="true" />
                  </div>
                  <Badge color={health.database.status === 'connected' ? 'emerald' : 'rose'} dot>
                    {health.database.status === 'connected' ? 'Terhubung' : 'Terputus'}
                  </Badge>
                  <div className="text-[11px] text-slate-400 font-medium">{health.database.type}</div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Penyimpanan Berkas</span>
                    <Server className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                  </div>
                  <Badge color={health.storage.status === 'connected' ? 'emerald' : 'rose'} dot>
                    {health.storage.status === 'connected' ? 'Terhubung' : 'Terputus'}
                  </Badge>
                  <div className="text-[11px] text-slate-400 font-medium">{health.storage.type}</div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Waktu Aktif (Uptime)</span>
                    <Activity className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  </div>
                  <div className="text-xl font-black text-slate-900">
                    {Math.floor(health.system.uptimeSeconds / 3600)}j{' '}
                    {Math.floor((health.system.uptimeSeconds % 3600) / 60)}m
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Heap: {health.system.memory.heapUsedMb} MB / RSS: {health.system.memory.rssMb} MB
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Total Pengguna</span>
                    <UserCheck className="w-4 h-4 text-purple-600" aria-hidden="true" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{health.metrics.totalUsers} Akun</div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Antrean: {health.metrics.pendingVerifications} | Audit: {health.metrics.auditLogsCount}
                  </div>
                </CardContent>
              </Card>
            </div>

            {health.status === 'degraded' ? (
              <Card className="bg-rose-50 border-rose-300">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
                  <div className="text-xs text-rose-950">
                    <strong>Peringatan Sistem (DEGRADED):</strong> Salah satu komponen (basis data atau object storage) mengalami gangguan koneksi. Segera periksa layanan server atau konfigurasi lingkungan.
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-emerald-50/60 border-emerald-200/80">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                  <div className="text-xs text-emerald-950">
                    <strong>Status Keseluruhan Sistem: {health.status.toUpperCase()}</strong>.
                    Seluruh komponen basis data MySQL dan penyimpanan privat RustFS S3 siap melayani operasional pembinaan dan verifikasi prestasi kampus.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* MODAL: TAMBAH ADMIN */}
      <Modal
        isOpen={isCreateStaffOpen}
        onClose={() => setIsCreateStaffOpen(false)}
        title="Tambah Akun Admin Baru"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateStaffOpen(false)}>Batal</Button>
            <Button type="submit" form="create-staff-form" size="sm">Buat Akun Admin</Button>
          </div>
        }
      >
        <form id="create-staff-form" onSubmit={handleCreateStaff} className="space-y-4">
          <Input
            label="Nama Lengkap Admin"
            required
            placeholder="contoh: Ustadz Ahmad Pembina, M.Kom."
            value={staffForm.fullName}
            onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
          />
          <Input
            label="Email Admin"
            type="email"
            required
            placeholder="admin@unida.gontor.ac.id"
            value={staffForm.email}
            onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
          />
          <Input
            label="Password (Minimal 8 Karakter)"
            type="password"
            required
            minLength={8}
            placeholder="••••••••"
            value={staffForm.password}
            onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
          />
        </form>
      </Modal>

      {/* MODAL: UBAH NAMA PENGGUNA */}
      <Modal
        isOpen={Boolean(editNameTarget)}
        onClose={() => setEditNameTarget(null)}
        title="Perbarui Nama Lengkap Pengguna"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditNameTarget(null)}>Batal</Button>
            <Button type="submit" form="edit-name-form" size="sm">Simpan Nama</Button>
          </div>
        }
      >
        <form id="edit-name-form" onSubmit={handleSaveUserName} className="space-y-3">
          <Input
            label="Nama Lengkap"
            required
            value={editNameTarget?.fullName || ''}
            onChange={(e) => setEditNameTarget((prev) => (prev ? { ...prev, fullName: e.target.value } : null))}
          />
        </form>
      </Modal>

      {/* MODAL: KONFIRMASI SUSPEND / AKTIFKAN */}
      <Modal
        isOpen={Boolean(confirmUserAction)}
        onClose={() => setConfirmUserAction(null)}
        title="Konfirmasi Status Akun"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmUserAction(null)}>Batal</Button>
            <Button
              variant={confirmUserAction?.user.status === 'active' ? 'danger' : 'primary'}
              size="sm"
              onClick={executeConfirmUserAction}
            >
              {confirmUserAction?.user.status === 'active' ? 'Ya, Tangguhkan' : 'Ya, Aktifkan'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          {confirmUserAction?.user.status === 'active'
            ? `Menangguhkan akun ${confirmUserAction.user.fullName || confirmUserAction.user.email} akan mencabut seluruh sesi login aktifnya. Lanjutkan?`
            : `Aktifkan kembali akun ${confirmUserAction?.user.fullName || confirmUserAction?.user.email}?`}
        </p>
      </Modal>

      {/* MODAL: TAMBAH PERIODE AKADEMIK */}
      <Modal
        isOpen={isCreatePeriodOpen}
        onClose={() => setIsCreatePeriodOpen(false)}
        title="Tambah Periode Akademik Baru"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreatePeriodOpen(false)}>Batal</Button>
            <Button type="submit" form="create-period-form" size="sm">Simpan Periode</Button>
          </div>
        }
      >
        <form id="create-period-form" onSubmit={handleCreatePeriod} className="space-y-4">
          <Input
            label="Nama Periode"
            required
            placeholder="Contoh: Tahun Akademik 2026/2027 Ganjil"
            value={periodForm.name}
            onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tahun"
              type="number"
              required
              min={2020}
              max={2035}
              value={periodForm.year}
              onChange={(e) => setPeriodForm({ ...periodForm, year: Number(e.target.value) })}
            />
            <Select
              label="Semester"
              value={periodForm.semester}
              onChange={(e) => setPeriodForm({ ...periodForm, semester: e.target.value as 'ganjil' | 'genap' })}
              options={[
                { value: 'ganjil', label: 'Ganjil' },
                { value: 'genap', label: 'Genap' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tanggal Mulai (Opsional)"
              type="date"
              value={periodForm.startDate}
              onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
            />
            <Input
              label="Tanggal Selesai (Opsional)"
              type="date"
              value={periodForm.endDate}
              onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* MODAL: KONFIRMASI PERGANTIAN PERIODE DENGAN PREVIEW DAMPAK */}
      <Modal
        isOpen={Boolean(switchPreview)}
        onClose={() => setSwitchPreview(null)}
        title="Konfirmasi Pergantian Periode Akademik"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSwitchPreview(null)} disabled={switchingPeriod}>
              Batal
            </Button>
            <Button variant="primary" size="sm" isLoading={switchingPeriod} onClick={confirmActivatePeriod}>
              Aktifkan Periode Baru
            </Button>
          </div>
        }
      >
        {switchPreview && (
          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <p>
              Anda akan mengaktifkan periode <strong className="text-slate-900">{switchPreview.targetPeriod.name}</strong>
              {switchPreview.currentActivePeriod
                ? ` dan menonaktifkan ${switchPreview.currentActivePeriod.name}.`
                : '.'}
            </p>
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
              <strong className="block">Dampak Pergantian Periode:</strong>
              <p>• Target kompetisi mahasiswa periode lama terdampak: <strong>{switchPreview.activeTargetsToArchive} target</strong></p>
              <p>• Tim pembinaan periode lama terdampak: <strong>{switchPreview.activeTeamsToArchive} tim</strong></p>
            </div>
            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={archiveOldTargets}
                onChange={(e) => setArchiveOldTargets(e.target.checked)}
                className="mt-0.5 rounded text-blue-700"
              />
              <span>Arsipkan otomatis target mahasiswa & tim aktif dari periode sebelumnya</span>
            </label>
          </div>
        )}
      </Modal>

      {/* MODAL: BUAT TEMPLATE & MATRIKS POIN BARU */}
      <Modal
        isOpen={isNewRuleVersionOpen}
        onClose={() => setIsNewRuleVersionOpen(false)}
        title="Buat Template & Versi Aturan Poin Baru"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewRuleVersionOpen(false)}>Batal</Button>
            <Button type="submit" form="publish-point-template-form" size="sm">Simpan & Terbitkan</Button>
          </div>
        }
      >
        <form id="publish-point-template-form" onSubmit={handlePublishPointRules} className="space-y-4">
          <Input
            label="Nama Template Poin"
            placeholder="Contoh: Template Bobot Prestasi 2027"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            required
          />
          <Input
            label="Keterangan Template (Opsional)"
            placeholder="Catatan penggunaan template poin..."
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={activateTemplateImmediately}
              onChange={(e) => setActivateTemplateImmediately(e.target.checked)}
            />
            Jadikan template default aktif kampus
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {newRulesMatrix.map((rule, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800 capitalize">{rule.level}</div>
                  <div className="text-[11px] text-slate-500 capitalize">{rule.result.replace(/_/g, ' ')}</div>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    min={0}
                    value={rule.points}
                    onChange={(e) => {
                      const updated = [...newRulesMatrix];
                      updated[idx].points = Number(e.target.value) || 0;
                      setNewRulesMatrix(updated);
                    }}
                    className="text-xs text-right font-bold"
                  />
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>
    </div>
  );
};
