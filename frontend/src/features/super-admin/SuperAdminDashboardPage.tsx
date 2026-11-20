import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Database,
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
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageLoading } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { systemService } from '@talenta/services';
import type {
  AcademicPeriodItem,
  AuditLogItem,
  PointRuleItem,
  SystemHealthSummary,
} from '../../services/types';

export const SuperAdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();

  // Tab 1: Pengguna & Staf
  const [users, setUsers] = useState<any[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState('semua');
  const [userSearch, setUserSearch] = useState('');
  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: '',
    password: '',
    role: 'validator' as 'validator' | 'super_admin',
  });

  // Tab 2: Periode Akademik
  const [periods, setPeriods] = useState<AcademicPeriodItem[]>([]);
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    name: '',
    year: Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(new Date())),
    semester: 'ganjil' as 'ganjil' | 'genap',
  });

  // Tab 3: Aturan Poin
  const [pointRulesData, setPointRulesData] = useState<{
    activeVersion: number | null;
    activeRules: PointRuleItem[];
    versions: any[];
  } | null>(null);
  const [isNewRuleVersionOpen, setIsNewRuleVersionOpen] = useState(false);
  const [newRulesMatrix, setNewRulesMatrix] = useState<PointRuleItem[]>([]);

  // Tab 4: Jejak Audit
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Tab 5: Kesehatan Sistem
  const [health, setHealth] = useState<SystemHealthSummary | null>(null);

  // Loaders
  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await systemService.getUsers({
        role: userRoleFilter === 'semua' ? undefined : userRoleFilter,
        search: userSearch || undefined,
      });
      setUsers(res.users);
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
      const res = await systemService.getPointRules();
      setPointRulesData(res);
      if (res.activeRules && res.activeRules.length > 0) {
        setNewRulesMatrix([...res.activeRules]);
      } else {
        setNewRulesMatrix([
          { level: 'lokal', result: 'juara_1', points: 8 },
          { level: 'nasional', result: 'juara_1', points: 18 },
          { level: 'nasional', result: 'juara_2', points: 14 },
          { level: 'internasional', result: 'juara_1', points: 30 },
        ]);
      }
    } catch (err: any) {
      notify(err.message || 'Gagal memuat aturan poin', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await systemService.getAuditLogs({ limit: 50 });
      setAuditLogs(res.logs);
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
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'periods') loadPeriods();
    else if (activeTab === 'points') loadPointRules();
    else if (activeTab === 'audit') loadAuditLogs();
    else if (activeTab === 'health') loadHealth();
  }, [activeTab]);

  // Actions: Staf & Pengguna
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.email || staffForm.password.length < 8) {
      notify('Email dan password minimal 8 karakter wajib diisi', 'error');
      return;
    }
    try {
      await systemService.createStaff(staffForm);
      notify('Akun staf berhasil dibuat', 'success');
      setIsCreateStaffOpen(false);
      setStaffForm({ email: '', password: '', role: 'validator' });
      loadUsers();
    } catch (err: any) {
      notify(err.message || 'Gagal membuat akun staf', 'error');
    }
  };

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await systemService.updateUserStatus(user.id, newStatus);
      notify(
        newStatus === 'suspended'
          ? 'Akun ditangguhkan & seluruh sesi aktif dicabut'
          : 'Akun berhasil diaktifkan kembali',
        'success'
      );
      loadUsers();
    } catch (err: any) {
      notify(err.message || 'Gagal memperbarui status akun', 'error');
    }
  };

  const handleToggleRole = async (user: any) => {
    const nextRole = user.role === 'validator' ? 'super_admin' : 'validator';
    try {
      await systemService.updateStaffRole(user.id, nextRole);
      notify(`Peran berhasil diubah menjadi ${nextRole}`, 'success');
      loadUsers();
    } catch (err: any) {
      notify(err.message || 'Gagal mengubah peran staf', 'error');
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
      await systemService.createAcademicPeriod(periodForm);
      notify('Periode akademik baru berhasil ditambahkan', 'success');
      setIsCreatePeriodOpen(false);
      setPeriodForm({ name: '', year: Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(new Date())), semester: 'ganjil' });
      loadPeriods();
    } catch (err: any) {
      notify(err.message || 'Gagal membuat periode akademik', 'error');
    }
  };

  const handleActivatePeriod = async (id: string, name: string) => {
    try {
      await systemService.activateAcademicPeriod(id);
      notify(`Periode ${name} sekarang berstatus AKTIF`, 'success');
      loadPeriods();
    } catch (err: any) {
      notify(err.message || 'Gagal mengaktifkan periode', 'error');
    }
  };

  // Actions: Aturan Poin
  const handlePublishPointRules = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await systemService.createPointRuleVersion(newRulesMatrix);
      notify('Versi aturan poin baru berhasil diterbitkan dan diaktifkan', 'success');
      setIsNewRuleVersionOpen(false);
      loadPointRules();
    } catch (err: any) {
      notify(err.message || 'Gagal menerbitkan aturan poin', 'error');
    }
  };

  const tabs = [
    { id: 'users', label: 'Staf & Akun' },
    { id: 'periods', label: 'Periode Akademik' },
    { id: 'points', label: 'Aturan Poin' },
    { id: 'audit', label: 'Jejak Audit' },
    { id: 'health', label: 'Kesehatan Sistem' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pusat Kendali Operasional"
        title="Super Admin TALENTA"
        description="Kelola akun staf, siklus periode akademik, aturan bobot poin kompetisi, jejak audit, dan pemantauan kesehatan sistem."
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'users' && (
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateStaffOpen(true)}
              >
                Tambah Staf
              </Button>
            )}
            {activeTab === 'periods' && (
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreatePeriodOpen(true)}
              >
                Tambah Periode
              </Button>
            )}
            {activeTab === 'points' && (
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsNewRuleVersionOpen(true)}
              >
                Terbitkan Versi Baru
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => {
                if (activeTab === 'users') loadUsers();
                if (activeTab === 'periods') loadPeriods();
                if (activeTab === 'points') loadPointRules();
                if (activeTab === 'audit') loadAuditLogs();
                if (activeTab === 'health') loadHealth();
              }}
            >
              Segarkan
            </Button>
          </div>
        }
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} tabIndex={0}>
      {loading && <PageLoading message="Memuat data operasional super admin..." />}

      {/* ========================================================================= */}
      {/* TAB 1: PENGGUNA & STAF */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'users' && (
        <div className="space-y-4">
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Cari email, nama, NIM..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                      className="pl-9 text-xs"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={loadUsers}>
                    Cari
                  </Button>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Peran:</span>
                  <div className="w-40">
                    <Select
                      value={userRoleFilter}
                      onChange={(e) => {
                        setUserRoleFilter(e.target.value);
                        setTimeout(loadUsers, 50);
                      }}
                      options={[
                        { value: 'semua', label: 'Semua Peran' },
                        { value: 'super_admin', label: 'Super Admin' },
                        { value: 'validator', label: 'Validator' },
                        { value: 'mahasiswa', label: 'Mahasiswa' },
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
                      const isStudent = u.role === 'mahasiswa';
                      const isSuspended = u.status === 'suspended';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">
                              {u.studentProfile?.fullName || u.email}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {u.email} {u.studentProfile?.nim ? `• NIM: ${u.studentProfile.nim}` : ''}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <Badge
                              color={
                                u.role === 'super_admin'
                                  ? 'purple'
                                  : u.role === 'validator'
                                  ? 'blue'
                                  : 'slate'
                              }
                              size="sm"
                            >
                              {u.role}
                            </Badge>
                          </td>
                          <td className="p-3.5">
                            <Badge
                              color={u.status === 'active' ? 'emerald' : 'rose'}
                              dot
                              size="sm"
                            >
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
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {!isStudent && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleRole(u)}
                                title="Ubah peran staf"
                                className="text-[11px] h-8"
                              >
                                {u.role === 'validator' ? 'Jadikan Super Admin' : 'Jadikan Validator'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant={isSuspended ? 'outline' : 'danger'}
                              onClick={() => handleToggleStatus(u)}
                              className="text-[11px] h-8"
                            >
                              {isSuspended ? 'Aktifkan' : 'Suspend'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PERIODE AKADEMIK */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'periods' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {periods.map((p) => (
              <Card
                key={p.id}
                className={`bg-white border transition-all ${
                  p.isActive
                    ? 'border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-slate-200'
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
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Kompetisi:</span>
                      <strong className="text-slate-800 text-sm">
                        {p._count?.competitions ?? 0}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Prestasi:</span>
                      <strong className="text-slate-800 text-sm">
                        {p._count?.achievements ?? 0}
                      </strong>
                    </div>
                  </div>
                  {!p.isActive ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => handleActivatePeriod(p.id, p.name)}
                    >
                      Aktifkan Periode Ini
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

      {/* ========================================================================= */}
      {/* TAB 3: ATURAN POIN */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'points' && (
        <div className="space-y-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle level={2} className="text-sm font-bold flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-700" />
                  <span>Matriks Bobot Poin Prestasi — Versi Aktif: v{pointRulesData?.activeVersion || 1}</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aturan poin terversi memastikan riwayat capaian masa lalu tidak terdampak saat bobot penilaian diubah.
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

      {/* ========================================================================= */}
      {/* TAB 4: JEJAK AUDIT */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'audit' && (
        <Card className="bg-white border-slate-200 overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle level={2} className="text-sm font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-blue-700" />
              <span>Log Jejak Audit Operasional Sistem</span>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Mencatat seluruh aksi administratif dan perubahan data penting untuk akuntabilitas operasional.
            </p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-3">Waktu</th>
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
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {log.actor?.studentProfile?.fullName || log.actor?.email || 'Sistem'}
                        </div>
                        {log.actor?.role && (
                          <span className="text-[10px] text-slate-400">{log.actor.role}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-700 text-[11px]">
                        {log.action}
                      </td>
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
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: KESEHATAN SISTEM */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'health' && health && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-white border-slate-200">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Basis Data</span>
                  <Database className="w-4 h-4 text-blue-700" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    color={health.database.status === 'connected' ? 'emerald' : 'rose'}
                    dot
                  >
                    {health.database.status === 'connected' ? 'Terhubung' : 'Terputus'}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {health.database.type}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Penyimpanan Berkas</span>
                  <Server className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    color={health.storage.status === 'connected' ? 'emerald' : 'rose'}
                    dot
                  >
                    {health.storage.status === 'connected' ? 'Terhubung' : 'Terputus'}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {health.storage.type}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Waktu Aktif (Uptime)</span>
                  <Activity className="w-4 h-4 text-emerald-600" />
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
                  <UserCheck className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-xl font-black text-slate-900">
                  {health.metrics.totalUsers} Akun
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  Antrean: {health.metrics.pendingVerifications} | Audit: {health.metrics.auditLogsCount}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-emerald-50/60 border-emerald-200/80">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-950">
                <strong>Status Keseluruhan Sistem: {health.status.toUpperCase()}</strong>.
                Seluruh komponen basis data MySQL dan penyimpanan privat RustFS S3 siap melayani operasional pembinaan dan verifikasi prestasi kampus.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH STAF */}
      {/* ========================================================================= */}
      </div>
      <Modal
        isOpen={isCreateStaffOpen}
        onClose={() => setIsCreateStaffOpen(false)}
        title="Tambah Akun Staf Baru"
      >
        <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Email Staf</label>
            <Input
              type="email"
              required
              placeholder="staf@unida.gontor.ac.id"
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Password (Minimal 8 Karakter)</label>
            <Input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={staffForm.password}
              onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Peran Staf</label>
            <Select
              value={staffForm.role}
              onChange={(e) =>
                setStaffForm({
                  ...staffForm,
                  role: e.target.value as 'validator' | 'super_admin',
                })
              }
              options={[
                { value: 'validator', label: 'Validator (Verifikasi Prestasi & Lomba)' },
                { value: 'super_admin', label: 'Super Admin (Kendali Penuh Sistem)' },
              ]}
              className="text-xs"
            />
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateStaffOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" size="sm">
              Buat Akun Staf
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH PERIODE AKADEMIK */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreatePeriodOpen}
        onClose={() => setIsCreatePeriodOpen(false)}
        title="Tambah Periode Akademik Baru"
      >
        <form onSubmit={handleCreatePeriod} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Nama Periode</label>
            <Input
              required
              placeholder="Contoh: Tahun Akademik 2026/2027 Ganjil"
              value={periodForm.name}
              onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
              className="text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tahun</label>
              <Input
                type="number"
                required
                min={2020}
                max={2035}
                value={periodForm.year}
                onChange={(e) =>
                  setPeriodForm({ ...periodForm, year: Number(e.target.value) })
                }
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Semester</label>
              <Select
                value={periodForm.semester}
                onChange={(e) =>
                  setPeriodForm({
                    ...periodForm,
                    semester: e.target.value as 'ganjil' | 'genap',
                  })
                }
                options={[
                  { value: 'ganjil', label: 'Ganjil' },
                  { value: 'genap', label: 'Genap' },
                ]}
                className="text-xs"
              />
            </div>
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreatePeriodOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" size="sm">
              Simpan Periode
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: TERBITKAN VERSI ATURAN POIN BARU */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewRuleVersionOpen}
        onClose={() => setIsNewRuleVersionOpen(false)}
        title="Terbitkan Versi Aturan Poin Baru"
      >
        <form onSubmit={handlePublishPointRules} className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Penyesuaian nilai poin di bawah ini akan disimpan sebagai versi aturan baru dan langsung aktif untuk perhitungan capaian prestasi selanjutnya.
          </p>
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {newRulesMatrix.map((rule, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800 capitalize">{rule.level}</div>
                  <div className="text-[11px] text-slate-500 capitalize">
                    {rule.result.replace(/_/g, ' ')}
                  </div>
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
          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewRuleVersionOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" size="sm">
              Terbitkan Versi Baru
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
