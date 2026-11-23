import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Hash,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { Competition, TeamDirectoryItem, TeamJoinRequestItem } from '../../types';
import { teamService } from '@talenta/services';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageLoading } from '../../components/ui/Skeleton';
import { JoinByCodeModal } from './components/JoinByCodeModal';

function formatRequestStatus(status: TeamJoinRequestItem['status']) {
  switch (status) {
    case 'menunggu':
      return { label: 'Menunggu Persetujuan', color: 'amber' as const };
    case 'disetujui':
      return { label: 'Disetujui', color: 'emerald' as const };
    case 'ditolak':
      return { label: 'Ditolak', color: 'rose' as const };
    case 'dibatalkan':
      return { label: 'Dibatalkan', color: 'slate' as const };
    case 'kedaluwarsa':
      return { label: 'Kedaluwarsa', color: 'slate' as const };
    default:
      return { label: status, color: 'slate' as const };
  }
}

export const TeamDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab');
  const activeTab = rawTab === 'pengajuan-saya' ? 'pengajuan-saya' : 'direktori';
  const competitionSlugParam = searchParams.get('kompetisi') || undefined;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [teams, setTeams] = useState<TeamDirectoryItem[]>([]);
  const [myActiveTeamId, setMyActiveTeamId] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<TeamJoinRequestItem[]>([]);

  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('semua');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Modal ajukan gabung
  const [applyTarget, setApplyTarget] = useState<TeamDirectoryItem | null>(null);
  const [preferredRole, setPreferredRole] = useState('');
  const [applyNote, setApplyNote] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);

  // Modal kode undangan
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const setActiveTab = (nextTab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', nextTab);
      return next;
    });
  };

  const loadData = useCallback(async () => {
    try {
      setLoadError('');
      const [dirRes, reqsRes] = await Promise.all([
        teamService.getDirectory
          ? teamService.getDirectory({ competitionSlug: competitionSlugParam })
          : Promise.resolve({ competition: null, teams: [], myActiveTeamId: null }),
        teamService.getMyJoinRequests
          ? teamService.getMyJoinRequests()
          : Promise.resolve([]),
      ]);
      setCompetition(dirRes.competition);
      setTeams(dirRes.teams);
      setMyActiveTeamId(dirRes.myActiveTeamId);
      setMyRequests(reqsRes);
    } catch (err: any) {
      setLoadError(err?.message || 'Gagal memuat direktori tim terbuka.');
    } finally {
      setLoading(false);
    }
  }, [competitionSlugParam]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    (competition?.komposisi.peranWajib || []).forEach((r) => set.add(r));
    teams.forEach((t) => t.neededRoles.forEach((r) => set.add(r)));
    return Array.from(set);
  }, [competition, teams]);

  const filteredTeams = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const role = roleFilter.toLowerCase();
    return teams.filter((t) => {
      if (role !== 'semua') {
        if (!t.neededRoles.some((r) => r.toLowerCase().includes(role))) return false;
      }
      if (q) {
        const hay = [t.name, t.description, t.leader.fullName, t.leader.studyProgram, ...t.neededRoles]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [teams, searchText, roleFilter]);

  const openApplyModal = (team: TeamDirectoryItem) => {
    setApplyTarget(team);
    setPreferredRole(team.neededRoles[0] || '');
    setApplyNote('');
  };

  const handleSubmitApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyTarget || !teamService.requestJoin) return;
    setSubmittingApply(true);
    try {
      await teamService.requestJoin(applyTarget.id, {
        preferredRole: preferredRole.trim() || undefined,
        note: applyNote.trim() || undefined,
      });
      notify(`Pengajuan bergabung ke ${applyTarget.name} berhasil dikirim. Menunggu persetujuan ketua tim.`);
      setApplyTarget(null);
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'Gagal mengirim pengajuan bergabung.', 'error');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!teamService.cancelJoinRequest) return;
    setCancellingId(requestId);
    try {
      await teamService.cancelJoinRequest(requestId);
      notify('Pengajuan bergabung berhasil dibatalkan.', 'info');
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'Gagal membatalkan pengajuan.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const handleJoinByCode = async (inviteCode: string) => {
    if (!teamService.joinByCode) return;
    const res = await teamService.joinByCode(inviteCode);
    notify(res.message);
    navigate('/app/tim');
  };

  if (loading) return <PageLoading message="Memuat direktori rekrutmen tim..." />;

  if (loadError) {
    return (
      <div className="p-12 text-center space-y-4">
        <p role="alert" className="text-xs text-rose-600 font-semibold">{loadError}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            void loadData();
          }}
        >
          Muat Ulang
        </Button>
      </div>
    );
  }

  const isIndividual =
    competition?.format === 'individu' ||
    (competition && competition.komposisi.min === 1 && competition.komposisi.max === 1);

  const pendingMyRequestsCount = myRequests.filter((r) => r.status === 'menunggu').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link to="/app/beranda" className="hover:text-blue-700 font-medium">
          Beranda
        </Link>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <Link to="/app/tim" className="hover:text-blue-700 font-medium">
          Tim Saya
        </Link>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <span aria-current="page" className="text-slate-700 font-bold">
          Cari Tim
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Direktori Rekrutmen Tim
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Temukan tim yang membutuhkan kamu
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Lihat posisi yang kosong, baca kebutuhan tim, lalu kirim pengajuan. Ketua tim yang memutuskan.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {!myActiveTeamId && !isIndividual && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCodeModalOpen(true)}
                leftIcon={<Hash className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                Punya Kode Tim
              </Button>
              <Link to="/app/tim?mode=buat">
                <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}>
                  Buat Tim Sendiri
                </Button>
              </Link>
            </>
          )}
          {myActiveTeamId && (
            <Link to="/app/tim">
              <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}>
                Buka Ruang Tim Saya
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* No Target Competition */}
      {!competition ? (
        <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
          <Users className="w-8 h-8 text-blue-700 mx-auto" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-slate-900">Pilih Target Kompetisi Terlebih Dahulu</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Direktori rekrutmen menampilkan tim yang sesuai dengan target kompetisi aktif kamu.
          </p>
          <div className="flex justify-center gap-2 pt-1">
            <Link to="/app/profil?need=target">
              <Button size="sm">Pilih Target di Profil</Button>
            </Link>
            <Link to="/kompetisi">
              <Button size="sm" variant="outline">
                Lihat Katalog Lomba
              </Button>
            </Link>
          </div>
        </div>
      ) : isIndividual ? (
        /* Individual Competition Redirect Notice (Visual 5) */
        <div className="p-6 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
          <div className="flex items-center gap-2 text-blue-900 font-extrabold text-sm">
            <UserIcon className="w-4 h-4 text-blue-700" aria-hidden="true" />
            <span>Lomba individu tidak perlu membuat atau mencari tim ({competition.namaResmi})</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
            Kompetisi target kamu berformat individu (1 peserta). Kamu bisa langsung menuju Ruang Persiapan untuk mempelajari roadmap dan tahapan seleksi.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <Link to={`/app/kompetisi/${competition.slug}/persiapan`}>
              <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}>
                Buka Ruang Persiapan
              </Button>
            </Link>
            <Link to="/app/profil?need=target">
              <Button size="sm" variant="outline">
                Ganti ke Lomba Beregu
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#10347A] via-[#154194] to-[#1A4DB0] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="space-y-1">
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-white/15 px-2.5 py-0.5 rounded-full">
                Filter Kompetisi
              </span>
              <h2 className="text-lg font-black tracking-tight">{competition.namaResmi}</h2>
              <p className="text-xs text-blue-100">
                Menampilkan tim terbuka pada target kompetisi yang sama ({competition.komposisi.min}–{competition.komposisi.max} anggota).
              </p>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/15 border border-white/25 text-xs font-bold">
                {teams.length} Tim Terbuka
              </span>
            </div>
          </div>

          <Tabs
            tabs={[
              { id: 'direktori', label: 'Tim Membuka Rekrutmen', badge: filteredTeams.length },
              {
                id: 'pengajuan-saya',
                label: 'Pengajuan Saya',
                badge: pendingMyRequestsCount > 0 ? `${pendingMyRequestsCount} Menunggu` : myRequests.length,
              },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === 'direktori' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left 2 cols: Search + Cards + Empty state */}
              <div className="lg:col-span-2 space-y-4">
                {/* Search & Role Filter */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1 relative">
                    <Search
                      className="w-4 h-4 text-slate-400 pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <Input
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Cari nama tim atau kebutuhan skill..."
                      aria-label="Cari nama tim atau kebutuhan skill"
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    aria-label="Filter kebutuhan peran"
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 min-h-[42px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="semua">Semua Peran</option>
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  {(searchText || roleFilter !== 'semua') && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchText('');
                        setRoleFilter('semua');
                      }}
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
                    >
                      Reset
                    </Button>
                  )}
                </div>

                {/* Team Cards */}
                {filteredTeams.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTeams.map((team) => {
                      const isPending = team.myRequestStatus === 'menunggu';
                      const canApply = !myActiveTeamId && !team.isMyTeam && !isPending;
                      return (
                        <article
                          key={team.id}
                          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between gap-4 hover:border-blue-300 transition-colors"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <Badge color="emerald" size="sm" dot>
                                Membuka rekrutmen
                              </Badge>
                              <span className="text-[11px] font-bold text-slate-400 truncate max-w-[140px]">
                                {competition.kategori}
                              </span>
                            </div>

                            <div>
                              <h3 className="text-base font-extrabold text-slate-900">{team.name}</h3>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Ketua: <strong className="text-slate-700">{team.leader.fullName}</strong>
                                {team.leader.studyProgram ? ` · ${team.leader.studyProgram}` : ''}
                              </p>
                              {team.description && (
                                <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">
                                  {team.description}
                                </p>
                              )}
                            </div>

                            <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Anggota disetujui</span>
                                <strong className="text-slate-900">
                                  {team.activeMemberCount} dari {team.maxAllowed}
                                </strong>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Posisi dibutuhkan</span>
                                <strong className="text-slate-900">
                                  {team.neededRoles.length > 0
                                    ? `${team.neededRoles.length} peran`
                                    : `${team.slotsRemaining} slot`}
                                </strong>
                              </div>
                            </div>

                            {team.neededRoles.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {team.neededRoles.map((role) => (
                                  <Badge key={role} color="blue" size="sm">
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="pt-2">
                            {team.isMyTeam ? (
                              <Link to="/app/tim" className="block">
                                <Button size="sm" variant="outline" className="w-full">
                                  Ini Tim Kamu &mdash; Buka Ruang Tim
                                </Button>
                              </Link>
                            ) : isPending && team.myRequestId ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Menunggu Ketua</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  isLoading={cancellingId === team.myRequestId}
                                  onClick={() => handleCancelRequest(team.myRequestId!)}
                                  leftIcon={<X className="w-3.5 h-3.5" aria-hidden="true" />}
                                >
                                  Batal
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="w-full"
                                disabled={!canApply}
                                onClick={() => openApplyModal(team)}
                                rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                              >
                                {myActiveTeamId ? 'Sudah Punya Tim Aktif' : 'Ajukan Gabung'}
                              </Button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* Friendly Empty / No-Dead-End Box */}
                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 space-y-2.5">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {filteredTeams.length === 0
                      ? 'Belum ada tim terbuka yang cocok — dan itu bukan error.'
                      : 'Belum menemukan tim yang pas?'}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                    Kamu bisa membuat tim sendiri dan membuka rekrutmen, mengubah filter pencarian, atau kembali saat tim lain membuka lowongan. Kamu juga tetap bisa membuka roadmap persiapan lebih awal.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {!myActiveTeamId && (
                      <Link to="/app/tim?mode=buat">
                        <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}>
                          Buat Tim Baru
                        </Button>
                      </Link>
                    )}
                    <Link to={`/app/kompetisi/${competition.slug}/persiapan`}>
                      <Button size="sm" variant="ghost">
                        Buka Roadmap Persiapan
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Right Sidebar: Process & Privacy */}
              <aside className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-700" aria-hidden="true" />
                    Bagaimana prosesnya?
                  </h3>
                  <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
                    <li>Pilih tim dengan target kompetisi yang sama.</li>
                    <li>Baca kebutuhan posisi atau keahlian tim.</li>
                    <li>Kirim pengajuan bergabung beserta peran pilihanmu.</li>
                    <li>Ketua tim menerima atau menolak pengajuan tersebut.</li>
                    <li>Jika disetujui, kamu otomatis masuk daftar anggota aktif.</li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-2.5">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    Jaga privasi profil
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Calon ketua cukup melihat nama tampilan, program studi, peran, keahlian, dan pengalaman relevan. NIM, email, serta nomor telepon tidak ditampilkan di direktori maupun kartu pelamar.
                  </p>
                </div>
              </aside>
            </div>
          )}

          {activeTab === 'pengajuan-saya' && (
            <div className="space-y-3">
              {myRequests.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-800">Belum Ada Pengajuan Bergabung</p>
                  <p className="text-xs text-slate-500">
                    Pilih salah satu tim terbuka pada tab direktori untuk mengirim pengajuan bergabung.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((req) => {
                    const st = formatRequestStatus(req.status);
                    return (
                      <div
                        key={req.id}
                        className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-extrabold text-slate-900">
                              {req.team?.name || 'Tim Kompetisi'}
                            </h3>
                            <Badge color={st.color} size="sm" dot>
                              {st.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">
                            {req.team?.competitionName || ''}
                            {req.preferredRole ? ` · Peran dilamar: ${req.preferredRole}` : ''}
                          </p>
                          {req.note && (
                            <p className="text-xs text-slate-600 italic">&ldquo;{req.note}&rdquo;</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {req.status === 'menunggu' && (
                            <Button
                              size="sm"
                              variant="outline"
                              isLoading={cancellingId === req.id}
                              onClick={() => handleCancelRequest(req.id)}
                            >
                              Batalkan Pengajuan
                            </Button>
                          )}
                          {req.status === 'disetujui' && (
                            <Link to="/app/tim">
                              <Button size="sm">Buka Ruang Tim</Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal Ajukan Gabung */}
      <Modal
        isOpen={Boolean(applyTarget)}
        onClose={() => setApplyTarget(null)}
        title={applyTarget ? `Ajukan Gabung ke ${applyTarget.name}` : 'Ajukan Gabung'}
      >
        {applyTarget && (
          <form onSubmit={handleSubmitApply} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Ketua tim ({applyTarget.leader.fullName}) akan melihat profil ringkas kamu (prodi, peran, keahlian, pengalaman) untuk memutuskan pengajuan ini.
            </p>

            {applyTarget.neededRoles.length > 0 && (
              <div className="space-y-1.5">
                <span className="block text-xs font-bold text-slate-700">
                  Pilih posisi yang diminati (opsional)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {applyTarget.neededRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setPreferredRole(role)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                        preferredRole === role
                          ? 'bg-blue-50 border-blue-500 text-blue-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Input
              label="Peran yang diajukan"
              value={preferredRole}
              onChange={(e) => setPreferredRole(e.target.value)}
              placeholder="Contoh: Penulis Proposal / Analis Data"
            />

            <div>
              <label htmlFor="join-note" className="block text-xs font-bold text-slate-700 mb-1.5">
                Catatan singkat untuk ketua tim (opsional)
              </label>
              <textarea
                id="join-note"
                rows={3}
                value={applyNote}
                onChange={(e) => setApplyNote(e.target.value)}
                placeholder="Ceritakan singkat kontribusi atau pengalaman relevan yang bisa kamu bantu..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApplyTarget(null)}
                disabled={submittingApply}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={submittingApply}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                Kirim Pengajuan
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <JoinByCodeModal
        isOpen={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
        onJoin={handleJoinByCode}
      />
    </div>
  );
};
