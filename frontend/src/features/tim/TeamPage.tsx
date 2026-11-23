import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Hash,
  Info,
  Lock,
  LogOut,
  RefreshCw,
  Send,
  Settings2,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { Competition, Team } from '../../types';
import { CreateTeamOptions, UpdateTeamOptions } from '../../services/types';
import { competitionService, teamService, userService } from '@talenta/services';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { validateTeamFormation } from '../../lib/teamRules';
import { MemberList } from './components/MemberList';
import { LeaveTeamModal } from './components/LeaveTeamModal';
import { TeamOnboardingHub } from './components/TeamOnboardingHub';
import { TeamCreateForm } from './components/TeamCreateForm';
import { JoinByCodeModal } from './components/JoinByCodeModal';
import { EditTeamModal } from './components/EditTeamModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { PageLoading } from '../../components/ui/Skeleton';

export const TeamPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');

  const [team, setTeam] = useState<Team | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [targetCompetition, setTargetCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // State interaksi
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(modeParam === 'kode');
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [lastDecisionMsg, setLastDecisionMsg] = useState('');
  const [rotatingCode, setRotatingCode] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<{ userId: string; name: string } | null>(null);
  const [registeringSelection, setRegisteringSelection] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    if (modeParam === 'kode') setCodeModalOpen(true);
  }, [modeParam]);

  const setMode = (mode: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (mode) next.set('mode', mode);
      else next.delete('mode');
      return next;
    });
  };

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoadError('');
      const [t, prof] = await Promise.all([
        teamService.getTeamByUserId(currentUser.id),
        userService.getProfile(currentUser.id).catch(() => null),
      ]);
      setTeam(t);

      if (t) {
        const comp = await competitionService.getBySlug(t.competitionSlug);
        setCompetition(comp);
      } else {
        setCompetition(null);
      }
      if (prof?.targetKompetisiSlug) {
        const targetComp = await competitionService.getBySlug(prof.targetKompetisiSlug).catch(() => null);
        setTargetCompetition(targetComp);
      } else {
        setTargetCompetition(null);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Gagal memuat data tim. Coba muat ulang.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateTeam = async (teamName: string, options: CreateTeamOptions) => {
    if (!currentUser || !targetCompetition) return;
    setCreatingTeam(true);
    try {
      await teamService.createTeam(targetCompetition.slug, currentUser.id, teamName, options);
      notify(`Ruang tim "${teamName}" berhasil dibuat!`);
      setMode(null);
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'Gagal membuat tim baru.', 'error');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleJoinByCode = async (inviteCode: string) => {
    if (!teamService.joinByCode) return;
    const res = await teamService.joinByCode(inviteCode);
    notify(res.message);
    setMode(null);
    await loadData();
  };

  const handleLeaveConfirm = async () => {
    if (!currentUser || !team) return;
    setLeaving(true);
    try {
      await teamService.leaveTeam(currentUser.id, team.id);
      setIsLeaveModalOpen(false);
      notify('Kamu berhasil keluar dari tim.', 'info');
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'Gagal keluar dari tim.', 'error');
    } finally {
      setLeaving(false);
    }
  };

  const handleDecideRequest = async (requestId: string, action: 'disetujui' | 'ditolak') => {
    if (!teamService.decideJoinRequest) return;
    setDecidingId(requestId);
    try {
      const res = await teamService.decideJoinRequest(requestId, action);
      setLastDecisionMsg(res.message || 'Permintaan telah diproses. Status tim diperbarui.');
      notify(res.message || 'Permintaan berhasil diproses.');
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'Gagal memproses permintaan bergabung.', 'error');
    } finally {
      setDecidingId(null);
    }
  };

  const handleCopyCode = async () => {
    if (!team?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(team.inviteCode);
      notify(`Kode tim ${team.inviteCode} berhasil disalin.`);
    } catch {
      notify(`Salin manual kode tim: ${team.inviteCode}`, 'info');
    }
  };

  const handleRotateCode = async () => {
    if (!team || !teamService.rotateInviteCode) return;
    setRotatingCode(true);
    try {
      const res = await teamService.rotateInviteCode(team.id);
      notify(`Kode undangan baru dibuat: ${res.inviteCode}. Kode lama tidak lagi berlaku.`);
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'Gagal memperbarui kode undangan.', 'error');
    } finally {
      setRotatingCode(false);
    }
  };

  const handleUpdateTeam = async (options: UpdateTeamOptions) => {
    if (!team || !teamService.updateTeam) return;
    await teamService.updateTeam(team.id, options);
    notify('Pengaturan dan informasi tim berhasil diperbarui.');
    await loadData();
  };

  const handleConfirmRemoveMember = async () => {
    if (!team || !removeConfirm || !teamService.removeMember) return;
    setRemovingUserId(removeConfirm.userId);
    try {
      await teamService.removeMember(team.id, removeConfirm.userId);
      notify(`${removeConfirm.name} dikeluarkan dari tim.`, 'info');
      setRemoveConfirm(null);
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'Gagal mengeluarkan anggota.', 'error');
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleRegisterSelection = async () => {
    if (!team || !teamService.registerSelection) return;
    setRegisteringSelection(true);
    try {
      await teamService.registerSelection(team.id);
      notify('Kesiapan tim berhasil diajukan ke daftar seleksi internal validator!');
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'Tim belum memenuhi seluruh syarat seleksi internal.', 'error');
    } finally {
      setRegisteringSelection(false);
    }
  };

  if (loading) return <PageLoading message="Memuat informasi tim..." />;

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

  // Belum memiliki tim aktif
  if (!team || !competition) {
    const isIndividualTarget =
      targetCompetition?.format === 'individu' ||
      (targetCompetition &&
        targetCompetition.komposisi.min === 1 &&
        targetCompetition.komposisi.max === 1);

    if (isIndividualTarget && targetCompetition) {
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Alur Lomba Individu
              </span>
              <Badge color="emerald" size="md" dot>
                Tidak perlu membuat tim
              </Badge>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Lomba individu langsung menuju ruang persiapan
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Target aktif kamu ({targetCompetition.namaResmi}) bersifat perseorangan (kapasitas 1 peserta).
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-blue-700" aria-hidden="true" />
                  Aturan yang dibaca sistem
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Jenis kompetisi</span>
                  <strong className="text-slate-900 uppercase">Individu</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Kapasitas peserta</span>
                  <strong className="text-slate-900">1 peserta</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Fitur buat/cari tim</span>
                  <strong className="text-slate-900">Dilewati otomatis</strong>
                </div>
              </div>
              <div className="flex flex-col justify-between p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kamu bisa langsung mempelajari roadmap persiapan, checklist latihan, dan kontak konsultasi pada Ruang Persiapan.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/app/kompetisi/${targetCompetition.slug}/persiapan`}>
                    <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}>
                      Buka Ruang Persiapan
                    </Button>
                  </Link>
                  <Link to="/app/profil?need=target">
                    <Button size="sm" variant="outline">
                      Ubah Target Lomba
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!targetCompetition) {
      return (
        <div className="max-w-2xl mx-auto">
          <EmptyState
            icon={<Users className="w-8 h-8 text-blue-700" />}
            title="Pilih Target Kompetisi Terlebih Dahulu"
            description="Setelah kamu memilih target lomba di halaman Profil, kamu dapat membuat tim, mencari tim terbuka, atau masuk menggunakan kode undangan."
            action={
              <div className="flex flex-wrap gap-2.5 justify-center">
                <Link to="/app/profil?need=target">
                  <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}>
                    Pilih Target Kompetisi
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCodeModalOpen(true)}
                  leftIcon={<Hash className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  Sudah Punya Kode Tim
                </Button>
              </div>
            }
          />
          <JoinByCodeModal
            isOpen={codeModalOpen}
            onClose={() => {
              setCodeModalOpen(false);
              if (modeParam === 'kode') setMode(null);
            }}
            onJoin={handleJoinByCode}
          />
        </div>
      );
    }

    // Mode Formulir Buat Tim Baru (Visual 3)
    if (modeParam === 'buat' && currentUser) {
      return (
        <TeamCreateForm
          competition={targetCompetition}
          currentUser={currentUser}
          submitting={creatingTeam}
          onCancel={() => setMode(null)}
          onSubmit={handleCreateTeam}
        />
      );
    }

    // Mode Hub 3 Jalur: Cara Mengikuti Lomba (Visual 1)
    return (
      <>
        <TeamOnboardingHub
          competition={targetCompetition}
          onCreateNew={() => setMode('buat')}
          onOpenCodeModal={() => setCodeModalOpen(true)}
        />
        <JoinByCodeModal
          isOpen={codeModalOpen}
          onClose={() => {
            setCodeModalOpen(false);
            if (modeParam === 'kode') setMode(null);
          }}
          onJoin={handleJoinByCode}
        />
      </>
    );
  }

  // =========================================================================
  // SUDAH MEMILIKI TIM AKTIF -> RUANG TIM SAYA (Visual 4)
  // =========================================================================
  const validation = validateTeamFormation(team, [], competition);
  const isLocked = team.status === 'terkunci_seleksi';
  const isLeader = Boolean(team.isLeader ?? (team.leaderId && team.leaderId === currentUser?.id));
  const pendingRequests = team.joinRequests || [];
  const pendingCount = team.pendingJoinRequestsCount ?? pendingRequests.length;
  const progressPct = Math.min(100, Math.round((validation.acceptedCount / Math.max(1, validation.maxAllowed)) * 100));
  const alreadyRegisteredSelection = Boolean(team.latestSelection);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link to="/app/beranda" className="hover:text-blue-700 font-medium">
          Beranda
        </Link>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <Link to={`/kompetisi/${competition.slug}`} className="hover:text-blue-700 font-medium truncate max-w-[200px]">
          {competition.namaResmi}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <span aria-current="page" className="text-slate-700 font-bold">
          Tim Saya
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Ruang Tim &amp; Pengajuan Anggota
            </span>
            <Badge
              color={
                isLocked
                  ? 'blue'
                  : validation.level === 'siap_seleksi'
                  ? 'emerald'
                  : validation.level === 'anggota_cukup'
                  ? 'blue'
                  : 'amber'
              }
              size="sm"
              dot
            >
              {validation.statusText}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {team.nama}
            </h1>
            <Badge color="blue" size="sm">
              {competition.namaResmi}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Ketua: <strong className="text-slate-700">{team.leaderName || team.anggota[0]?.nama || 'Ketua Tim'}</strong>
            {' · '}
            Rekrutmen {team.recruitmentType === 'privat' ? 'privat (kode undangan)' : 'terbuka'}
            {' · '}
            Kampus: UNIDA Gontor
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isLeader && team.inviteCode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              leftIcon={<Hash className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Salin Kode Tim
            </Button>
          )}
          {isLeader && !isLocked && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(true)}
              leftIcon={<Settings2 className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Edit Info Tim
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLocked}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
            onClick={() => setIsLeaveModalOpen(true)}
            leftIcon={isLocked ? <Lock className="w-3.5 h-3.5" aria-hidden="true" /> : <LogOut className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            {isLocked ? 'Terkunci Seleksi' : 'Keluar dari Tim'}
          </Button>
        </div>
      </div>

      {/* 3 Metric Summary Cards (Visual 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Anggota Disetujui
          </span>
          <div className="text-2xl font-black text-slate-900">
            {validation.acceptedCount}/{validation.maxAllowed}
          </div>
          <p className="text-xs text-slate-500">
            {validation.isFormed
              ? 'Sudah memenuhi minimum jumlah anggota'
              : `Perlu minimal ${validation.minNeeded} anggota untuk siap seleksi`}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Pengajuan Menunggu
          </span>
          <div className="text-2xl font-black text-slate-900">{pendingCount}</div>
          <p className="text-xs text-slate-500">
            {isLeader ? 'Harus diputuskan oleh kamu sebagai ketua tim' : 'Diputuskan oleh ketua tim'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Status Seleksi
          </span>
          <div className="text-lg font-black text-slate-900 leading-tight pt-0.5">
            {alreadyRegisteredSelection
              ? `Terdaftar (${team.latestSelection?.result || 'menunggu'})`
              : validation.selectionStatusLabel}
          </div>
          <p className="text-xs text-slate-500">Roadmap boleh dibuka lebih awal</p>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Members + Team Readiness */}
        <div className="lg:col-span-7 space-y-6">
          {/* Anggota Tim */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-slate-900">Anggota Tim</h2>
              <Badge color="slate" size="sm">
                Maksimal {validation.maxAllowed} Anggota
              </Badge>
            </div>

            {team.description && (
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {team.description}
              </p>
            )}

            <MemberList
              members={team.anggota}
              leaderId={team.leaderId}
              currentUserId={currentUser?.id || ''}
              isLeader={isLeader}
              isLocked={isLocked}
              removingUserId={removingUserId}
              onRemoveMember={(userId, name) => setRemoveConfirm({ userId, name })}
            />

            {/* Kesiapan Tim */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-slate-900">Kesiapan Tim</h3>
                <Badge
                  color={
                    isLocked
                      ? 'blue'
                      : validation.isSelectionReady
                      ? 'emerald'
                      : validation.isFormed
                      ? 'amber'
                      : 'amber'
                  }
                  size="sm"
                >
                  {isLocked
                    ? 'Terkunci Seleksi'
                    : validation.isSelectionReady
                    ? 'Siap Seleksi Internal'
                    : validation.isFormed
                    ? 'Cek syarat lainnya'
                    : 'Belum siap seleksi'}
                </Badge>
              </div>

              <div
                className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progres kelengkapan anggota tim"
              >
                <div
                  className={`h-full rounded-full transition-all ${
                    validation.isSelectionReady ? 'bg-emerald-600' : 'bg-teal-500'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {validation.unmetCriteria.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {validation.unmetCriteria.map((criterion) => (
                    <li key={criterion} className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-emerald-800 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  Seluruh syarat minimal jumlah anggota &amp; aturan lomba telah terpenuhi.
                </p>
              )}

              {validation.advisoryNotes.length > 0 && (
                <div className="text-[11px] text-slate-500 space-y-1">
                  {validation.advisoryNotes.map((note) => (
                    <p key={note}>Catatan saran: {note}</p>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2.5 pt-2">
                <Link to={`/app/kompetisi/${competition.slug}/persiapan`}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    leftIcon={<BookOpen className="w-3.5 h-3.5" aria-hidden="true" />}
                  >
                    Buka Roadmap Persiapan
                  </Button>
                </Link>

                {isLeader && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={!validation.isSelectionReady || isLocked || alreadyRegisteredSelection}
                    isLoading={registeringSelection}
                    onClick={handleRegisterSelection}
                    leftIcon={<Send className="w-3.5 h-3.5" aria-hidden="true" />}
                  >
                    {alreadyRegisteredSelection
                      ? 'Terdaftar Seleksi Internal'
                      : 'Daftar Seleksi Internal'}
                  </Button>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Join Requests + Invite Code */}
        <div className="lg:col-span-5 space-y-5">
          {/* Permintaan Bergabung */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-slate-900">Permintaan Bergabung</h2>
              <Badge color={pendingCount > 0 ? 'amber' : 'slate'} size="sm">
                {pendingCount} Menunggu
              </Badge>
            </div>

            {lastDecisionMsg && (
              <div
                role="status"
                className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium"
              >
                {lastDecisionMsg}
              </div>
            )}

            {!isLeader ? (
              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                Hanya ketua tim ({team.leaderName || 'Ketua'}) yang dapat meninjau dan memutuskan permintaan bergabung dari calon anggota.
              </p>
            ) : pendingRequests.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 leading-relaxed">
                Belum ada permintaan bergabung yang menunggu keputusan saat ini.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => {
                  const applicantName = req.applicant?.nama || 'Mahasiswa';
                  const applicantSub = [
                    req.applicant?.prodi,
                    req.preferredRole,
                    ...(req.applicant?.peranBisa || []).slice(0, 2),
                  ]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          aria-hidden="true"
                          className="w-9 h-9 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0"
                        >
                          {applicantName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <h3 className="text-xs font-extrabold text-slate-900">{applicantName}</h3>
                          <p className="text-[11px] text-slate-500">{applicantSub}</p>
                          {req.note && (
                            <p className="text-xs text-slate-600 leading-relaxed">&ldquo;{req.note}&rdquo;</p>
                          )}
                          {req.applicant?.skill && req.applicant.skill.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {req.applicant.skill.slice(0, 3).map((s) => (
                                <Badge key={s.nama} color="blue" size="sm">
                                  {s.nama}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                          disabled={decidingId === req.id}
                          isLoading={decidingId === req.id}
                          onClick={() => handleDecideRequest(req.id, 'disetujui')}
                          leftIcon={<Check className="w-3.5 h-3.5" aria-hidden="true" />}
                        >
                          Terima
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={decidingId === req.id}
                          onClick={() => handleDecideRequest(req.id, 'ditolak')}
                          leftIcon={<X className="w-3.5 h-3.5" aria-hidden="true" />}
                        >
                          Tolak
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Kode Undangan Tim */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold text-slate-900">Kode undangan tim</h3>
                {isLeader && !isLocked && (
                  <button
                    type="button"
                    disabled={rotatingCode}
                    onClick={handleRotateCode}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${rotatingCode ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span>Ganti Kode</span>
                  </button>
                )}
              </div>

              {isLeader && team.inviteCode ? (
                <>
                  <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-slate-100 border border-slate-200">
                    <code className="text-sm sm:text-base font-black tracking-wider text-slate-900 select-all">
                      {team.inviteCode}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      aria-label="Salin kode undangan tim"
                      className="p-2 rounded-lg text-slate-600 hover:bg-white hover:text-blue-700 cursor-pointer transition-colors"
                    >
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Bagikan hanya kepada rekan yang sudah disepakati. Kamu dapat mengganti kode kapan saja jika diperlukan.
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Kode undangan dikelola khusus oleh ketua tim agar keanggotaan tetap berada dalam kendali ketua.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Role Separation Footer Callout */}
      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900">Pemisahan tugas:</strong> ketua menyetujui anggota tim, pengelola konten mengatur aturan dan jadwal lomba, sedangkan verifikator prestasi memeriksa bukti capaian setelah pengajuan prestasi.
        </p>
      </div>

      <EditTeamModal
        isOpen={editModalOpen}
        team={team}
        competition={competition}
        onClose={() => setEditModalOpen(false)}
        onSave={handleUpdateTeam}
      />

      <LeaveTeamModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={handleLeaveConfirm}
        isLoading={leaving}
      />

      {/* Modal Konfirmasi Keluarkan Anggota */}
      <Modal
        isOpen={Boolean(removeConfirm)}
        onClose={() => setRemoveConfirm(null)}
        title="Keluarkan Anggota Tim?"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Apakah kamu yakin ingin mengeluarkan <strong>{removeConfirm?.name}</strong> dari {team.nama}? Status kelengkapan tim akan dihitung ulang otomatis.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setRemoveConfirm(null)}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              isLoading={Boolean(removingUserId)}
              onClick={handleConfirmRemoveMember}
            >
              Ya, Keluarkan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
