import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Users,
  Target,
  Award,
  ArrowRight,
  Plus,
  Compass,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  ChevronRight,
  Check,
  BookOpenCheck,
  Info,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import type { StudentDashboardData } from '../../services/types';
import { dashboardService } from '@talenta/services';
import { formatDate, parseFlexibleDate } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoading } from '../../components/ui/Skeleton';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { AchievementStatusBadge } from '../prestasi/components/StatusBadge';

const PROFILE_COMPLETE_THRESHOLD = 80;

interface ReadinessStep {
  id: 'profile' | 'target' | 'join-team' | 'team-ready' | 'roadmap';
  label: string;
  done: boolean;
  inProgress?: boolean;
  unavailable?: boolean;
  subLabel?: string;
  to: string;
}

export const BerandaPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!currentUser) return;
      setLoading(true);
      setError('');
      try {
        const dash = await dashboardService.getStudentDashboard();
        if (isCancelled?.()) return;
        setDashboardData(dash);
      } catch (err: any) {
        if (isCancelled?.()) return;
        setError(err?.message || 'Gagal memuat data beranda mahasiswa. Silakan coba lagi.');
      } finally {
        if (!isCancelled?.()) setLoading(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    let cancelled = false;
    void loadDashboard(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  if (loading) return <PageLoading message="Memuat beranda mahasiswa..." />;

  if (error || !dashboardData) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50/90 p-6 text-center space-y-4 shadow-2xs"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-extrabold text-rose-950">Beranda Gagal Dimuat</h1>
            <p className="text-sm text-rose-800">
              {error || 'Terjadi kendala saat mengambil ringkasan aktivitas Anda.'}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void loadDashboard()}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Muat Ulang Beranda
          </Button>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        hour12: false,
      }).format(new Date())
    );
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const profileCompletion = dashboardData.profile?.completionPercentage ?? 0;
  const targetComp = dashboardData.targetCompetition;
  const activeTeam = dashboardData.activeTeam;
  const pendingJoinReqsSent = (dashboardData.myPendingJoinRequests || []).filter(
    (req) => !targetComp || req.competitionSlug === targetComp.slug
  );
  const roadmap = dashboardData.roadmapProgress;
  const hasRoadmap = Boolean(roadmap && roadmap.totalTasks > 0);
  const isRoadmapCompleted = Boolean(hasRoadmap && roadmap && roadmap.completedTasks >= roadmap.totalTasks);

  const isIndividualTarget =
    targetComp?.format === 'individu' ||
    (Boolean(targetComp) && targetComp!.minTeamMembers === 1 && targetComp!.maxTeamMembers === 1);

  const teamReadiness = activeTeam?.readiness || null;
  const teamStatus: string | null = activeTeam?.status ?? null;
  const teamMemberCount: number =
    teamReadiness?.activeMemberCount ??
    (Array.isArray(activeTeam?.members) ? activeTeam.members.length : 0);
  const minTeamMembers = teamReadiness?.minRequired ?? targetComp?.minTeamMembers ?? 1;
  const maxTeamMembers = teamReadiness?.maxAllowed ?? targetComp?.maxTeamMembers ?? minTeamMembers;

  const isTeamFormed = Boolean(
    activeTeam &&
      (teamReadiness?.hasEnoughMembers ||
        teamStatus === 'terbentuk' ||
        teamStatus === 'terkunci_seleksi')
  );
  const isSelectionReady = Boolean(activeTeam && teamReadiness?.isSelectionReady);
  const isLockedSelection = teamStatus === 'terkunci_seleksi';
  const unmetCriteria: string[] = Array.isArray(teamReadiness?.unmetCriteria)
    ? teamReadiness.unmetCriteria
    : [];
  const advisoryNotes: string[] = Array.isArray(teamReadiness?.advisoryNotes)
    ? teamReadiness.advisoryNotes
    : [];

  const incomingJoinRequests = activeTeam?.isLeader
    ? (activeTeam.pendingJoinRequestsCount ?? 0)
    : 0;

  const verifiedCount = dashboardData.submissions?.disetujui ?? 0;
  const pendingCount = dashboardData.submissions?.menunggu ?? 0;
  const revisionCount = dashboardData.submissions?.perlu_perbaikan ?? 0;
  const rejectedCount = dashboardData.submissions?.ditolak ?? 0;
  const cancelledCount = dashboardData.submissions?.dibatalkan ?? 0;
  const totalAchievementCount = dashboardData.submissions?.total ?? 0;
  const recentAchievements = dashboardData.recentAchievements || [];

  const revisionActionUrl =
    revisionCount === 1 && dashboardData.firstRevisionAchievementId
      ? `/app/prestasi/${dashboardData.firstRevisionAchievementId}`
      : '/app/prestasi?status=perlu_perbaikan';

  // Stepper fokus murni pada alur kesiapan target kompetisi aktif (tanpa mencampur prestasi historis)
  const roadmapStep: ReadinessStep = !targetComp
    ? {
        id: 'roadmap',
        label: 'Roadmap & Pembinaan',
        done: false,
        to: '/kompetisi',
      }
    : !hasRoadmap
      ? {
          id: 'roadmap',
          label: 'Roadmap & Pembinaan',
          done: false,
          unavailable: true,
          subLabel: 'Belum Tersedia',
          to: `/app/kompetisi/${targetComp.slug}/persiapan`,
        }
      : {
          id: 'roadmap',
          label: 'Roadmap & Pembinaan',
          done: isRoadmapCompleted,
          inProgress: Boolean(roadmap && roadmap.completedTasks > 0 && !isRoadmapCompleted),
          subLabel: isRoadmapCompleted
            ? `Selesai (${roadmap!.completedTasks}/${roadmap!.totalTasks})`
            : roadmap && roadmap.completedTasks > 0
              ? `${roadmap.completedTasks}/${roadmap.totalTasks} Tugas (${roadmap.percentage}%)`
              : undefined,
          to: `/app/kompetisi/${targetComp.slug}/persiapan`,
        };

  const steps: ReadinessStep[] = isIndividualTarget
    ? [
        {
          id: 'profile',
          label: 'Identitas & Skill',
          done: profileCompletion >= PROFILE_COMPLETE_THRESHOLD,
          subLabel:
            profileCompletion >= PROFILE_COMPLETE_THRESHOLD
              ? 'Lengkap'
              : `Terisi ${profileCompletion}%`,
          to: '/app/profil',
        },
        {
          id: 'target',
          label: 'Target Kompetisi',
          done: Boolean(targetComp),
          to: targetComp ? '/app/profil?need=target' : '/kompetisi',
        },
        roadmapStep,
      ]
    : [
        {
          id: 'profile',
          label: 'Identitas & Skill',
          done: profileCompletion >= PROFILE_COMPLETE_THRESHOLD,
          subLabel:
            profileCompletion >= PROFILE_COMPLETE_THRESHOLD
              ? 'Lengkap'
              : `Terisi ${profileCompletion}%`,
          to: '/app/profil',
        },
        {
          id: 'target',
          label: 'Target Kompetisi',
          done: Boolean(targetComp),
          to: targetComp ? '/app/profil?need=target' : '/kompetisi',
        },
        {
          id: 'join-team',
          label: 'Bergabung Tim',
          done: Boolean(activeTeam),
          inProgress: !activeTeam && pendingJoinReqsSent.length > 0,
          subLabel: activeTeam
            ? 'Tergabung'
            : pendingJoinReqsSent.length > 0
              ? 'Menunggu Ketua'
              : undefined,
          to: !activeTeam && pendingJoinReqsSent.length > 0 ? '/app/tim?tab=pengajuan' : '/app/tim',
        },
        {
          id: 'team-ready',
          label: 'Kesiapan Tim',
          done: isSelectionReady || isLockedSelection,
          inProgress: Boolean(activeTeam && isTeamFormed && !isSelectionReady && !isLockedSelection),
          subLabel: isLockedSelection
            ? 'Terkunci Seleksi'
            : isSelectionReady
              ? 'Siap Seleksi'
              : isTeamFormed
                ? 'Cek Syarat Wajib'
                : undefined,
          to: '/app/tim',
        },
        roadmapStep,
      ];

  const activeSteps = steps.filter((s) => !s.unavailable);
  const completedStepsCount = activeSteps.filter((s) => s.done).length;
  const progressPercent =
    activeSteps.length > 0 ? Math.round((completedStepsCount / activeSteps.length) * 100) : 0;

  const nextStep = activeSteps.find((s) => !s.done) || null;

  // Resolusi jadwal jujur: pisahkan agenda mendatang vs jadwal yang seluruhnya sudah berlalu
  const rawSchedule = Array.isArray(targetComp?.scheduleTimeline) ? targetComp.scheduleTimeline : [];
  const parsedSchedule = rawSchedule.map((item) => ({
    ...item,
    parsedTime: parseFlexibleDate(item.tanggal)?.getTime() ?? null,
  }));
  const nowThreshold = Date.now() - 86400000;
  const upcomingAgenda = parsedSchedule
    .filter((item) => item.parsedTime === null || item.parsedTime >= nowThreshold)
    .sort((a, b) => (a.parsedTime ?? Number.MAX_SAFE_INTEGER) - (b.parsedTime ?? Number.MAX_SAFE_INTEGER))[0];
  const latestPastAgenda =
    !upcomingAgenda && parsedSchedule.length > 0
      ? [...parsedSchedule].sort((a, b) => (b.parsedTime ?? 0) - (a.parsedTime ?? 0))[0]
      : null;

  const capacityText =
    minTeamMembers === maxTeamMembers
      ? `${teamMemberCount} dari ${minTeamMembers} Anggota`
      : `${teamMemberCount} dari ${minTeamMembers}–${maxTeamMembers} Anggota`;

  const secondaryHeroAction = isIndividualTarget && targetComp
    ? {
        label: 'Ruang Persiapan',
        to: `/app/kompetisi/${targetComp.slug}/persiapan`,
        icon: BookOpenCheck,
      }
    : !isIndividualTarget
      ? activeTeam
        ? { label: 'Ruang Tim Saya', to: '/app/tim', icon: Users }
        : pendingJoinReqsSent.length > 0
          ? { label: 'Pantau Pengajuan Tim', to: '/app/tim?tab=pengajuan', icon: Clock }
          : { label: 'Atur Tim', to: '/app/tim', icon: Users }
      : null;

  const extraStatusParts: string[] = [];
  if (rejectedCount > 0) extraStatusParts.push(`${rejectedCount} ditolak`);
  if (cancelledCount > 0) extraStatusParts.push(`${cancelledCount} dibatalkan`);

  const stepperGridClass =
    steps.length === 3
      ? 'grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1'
      : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1';

  return (
    <div className="space-y-7">
      {/* Banner 1: Prioritas Tertinggi — Revisi Prestasi */}
      {revisionCount > 0 && (
        <div className="p-4 rounded-2xl bg-orange-50/90 border border-orange-200 text-orange-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-sm font-bold text-orange-900">
                Perhatian: {revisionCount} Pengajuan Prestasi Memerlukan Perbaikan
              </div>
              <div className="text-sm text-orange-800/90 mt-0.5">
                Validator meminta revisi kelengkapan berkas atau data pendukung. Periksa catatan review dan kirim perbaikan agar pengajuan segera diproses ulang.
              </div>
            </div>
          </div>
          <Link to={revisionActionUrl} className="shrink-0">
            <Button size="sm" variant="warning-outline">
              Periksa &amp; Perbaiki
            </Button>
          </Link>
        </div>
      )}

      {/* Banner 2: Permintaan Bergabung Masuk (Khusus Ketua Tim) */}
      {incomingJoinRequests > 0 && activeTeam && (
        <div className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200 text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-sm font-bold text-blue-900">
                {incomingJoinRequests} Permintaan Bergabung ke {activeTeam.name} Menunggu Persetujuan
              </div>
              <div className="text-sm text-blue-700 mt-0.5">
                Tinjau profil ringkas pelamar di Ruang Tim Saya untuk menerima atau menolak pengajuan anggota baru.
              </div>
            </div>
          </div>
          <Link to="/app/tim" className="shrink-0">
            <Button size="sm" variant="primary">
              Tinjau Pengajuan
            </Button>
          </Link>
        </div>
      )}

      {/* Banner 3: Pengajuan Gabung Terkirim Menunggu Ketua (Khusus Pelamar Tanpa Tim) */}
      {!activeTeam && pendingJoinReqsSent.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200 text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-sm font-bold text-indigo-950">
                {pendingJoinReqsSent.length === 1
                  ? `Pengajuan Bergabung ke ${pendingJoinReqsSent[0].teamName} Menunggu Persetujuan Ketua`
                  : `${pendingJoinReqsSent.length} Pengajuan Bergabung Tim Menunggu Persetujuan Ketua`}
              </div>
              <div className="text-sm text-indigo-800/90 mt-0.5">
                Anda dapat memantau status pengajuan, membatalkan, atau memilih tim lain melalui tab Pengajuan Saya.
              </div>
            </div>
          </div>
          <Link to="/app/tim?tab=pengajuan" className="shrink-0">
            <Button size="sm" variant="outline">
              Lihat Status Pengajuan
            </Button>
          </Link>
        </div>
      )}

      {/* Top Welcome Card */}
      <div className="relative overflow-hidden rounded-[1.5rem] border border-blue-100 bg-[#eaf7fc] p-5 sm:p-8 lg:p-9">

        <div className="relative flex flex-col justify-between gap-7 xl:flex-row xl:items-center">
          <div className="flex items-start sm:items-center gap-3 sm:gap-5">
            <UserAvatar
              src={currentUser?.avatar}
              name={currentUser?.nama || 'Mahasiswa'}
              size="lg"
              shape="rounded"
              className="sm:w-20 sm:h-20 sm:text-2xl border-2 border-white shadow-sm"
            />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-extrabold text-blue-700 uppercase tracking-wider">
                {getGreeting()},
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-950 tracking-tight break-words">
                {currentUser?.nama}
              </h1>
              <p className="text-sm sm:text-base text-slate-700 font-medium leading-6">
                {currentUser?.prodi}
                {currentUser?.angkatan ? ` • Angkatan ${currentUser.angkatan}` : ''} • Universitas Darussalam Gontor
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs bg-blue-50 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200/60">
                  Mahasiswa
                </span>
                {dashboardData.points && (
                  <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {dashboardData.points.totalPoints} Poin ({dashboardData.points.currentPeriod})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {nextStep && (
              <Link to={nextStep.to} className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-blue-700 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-800">
                Lanjutkan: {nextStep.label}
              </Link>
            )}
            {secondaryHeroAction && secondaryHeroAction.to !== nextStep?.to && (
              <Link to={secondaryHeroAction.to} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-blue-200 bg-white px-5 py-2 text-sm font-bold text-blue-900 transition-colors hover:bg-blue-50">
                <secondaryHeroAction.icon className="h-4 w-4" aria-hidden="true" />
                {secondaryHeroAction.label}
              </Link>
            )}
            <Link to="/app/prestasi/baru" className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-colors ${nextStep ? 'border border-blue-200 bg-white text-blue-900 hover:bg-blue-50' : 'bg-blue-700 text-white hover:bg-blue-800'}`}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Catat Prestasi Baru
            </Link>
          </div>
        </div>

        {/* Milestone Pipeline Header & Progress Bar */}
        <div className="mt-7 space-y-4 border-t border-blue-200/70 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-sm font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
              <span>Alur Perjalanan Kesiapan Kompetisi</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <span className="text-slate-600">Progres Kesiapan:</span>
              <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                {completedStepsCount} dari {activeSteps.length} Langkah ({progressPercent}%)
              </span>
            </div>
          </div>

          {/* Progress bar visual */}
          <div className="w-full bg-white rounded-full h-2 overflow-hidden" aria-hidden="true">
            <div
              className="bg-blue-700 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stepper Pipeline Grid (simetris 3 kolom untuk individu, 5 kolom untuk beregu) */}
          <div className={stepperGridClass}>
            {steps.map((st, idx) => {
              const isNext = nextStep?.id === st.id;
              return (
                <Link
                  key={st.id}
                  to={st.to}
                  className={`p-3 rounded-2xl border transition-all text-left flex items-start gap-2.5 relative group ${
                    st.done
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/60'
                      : st.unavailable
                        ? 'bg-white/60 border-dashed border-slate-200 text-slate-500 hover:bg-white'
                        : isNext
                          ? 'bg-white border-blue-400 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                          : st.inProgress
                            ? 'bg-amber-50/70 border-amber-200 text-amber-950 hover:bg-amber-100/60'
                            : 'bg-white/75 border-blue-100 text-slate-600 hover:bg-white'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      st.done
                        ? 'bg-emerald-600 text-white'
                        : st.unavailable
                          ? 'bg-slate-200 text-slate-500'
                          : isNext
                            ? 'bg-blue-700 text-white'
                            : st.inProgress
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {st.done ? <Check className="w-3 h-3" aria-hidden="true" /> : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold leading-snug break-words">{st.label}</div>
                    <div
                      className={`text-xs mt-0.5 leading-snug break-words ${
                        st.done
                          ? 'text-emerald-700 font-semibold'
                          : isNext
                            ? 'text-blue-700 font-semibold'
                            : st.inProgress
                              ? 'text-amber-700 font-semibold'
                              : 'text-slate-400'
                      }`}
                    >
                      {st.subLabel || (st.done ? 'Selesai' : isNext ? 'Perlu Dikerjakan' : `Langkah ${idx + 1}`)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Callout Langkah Berikutnya atau Status Tuntas */}
          {nextStep ? (
            <div className="p-4 rounded-2xl bg-white/80 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <span className="text-blue-900 font-semibold">
                {nextStep.id === 'join-team' && pendingJoinReqsSent.length > 0 ? (
                  <>
                    Pengajuan bergabung ke <strong>{pendingJoinReqsSent[0].teamName}</strong> sedang menunggu persetujuan ketua tim.
                  </>
                ) : nextStep.id === 'team-ready' && activeTeam && !activeTeam.isLeader ? (
                  <>
                    Tim <strong>{activeTeam.name}</strong> sedang melengkapi syarat kesiapan — koordinasi dengan ketua atau lanjutkan persiapan roadmap.
                  </>
                ) : (
                  <>
                    Langkah berikutnya yang disarankan: <strong>{nextStep.label}</strong>
                    {nextStep.id === 'roadmap' && roadmap && roadmap.completedTasks > 0
                      ? ` (${roadmap.completedTasks}/${roadmap.totalTasks} tugas selesai)`
                      : ''}
                  </>
                )}
              </span>
              <Link
                to={nextStep.to}
                className="font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 shrink-0"
              >
                {nextStep.id === 'join-team' && pendingJoinReqsSent.length > 0
                  ? 'Pantau Pengajuan'
                  : 'Selesaikan Sekarang'}{' '}
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>
          ) : targetComp ? (
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <span className="text-emerald-900 font-semibold inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>
                  {isIndividualTarget
                    ? 'Seluruh langkah kesiapan lomba individu telah terpenuhi.'
                    : isLockedSelection
                      ? 'Tim Anda sudah terkunci sebagai peserta seleksi internal. Fokus pada persiapan pelaksanaan!'
                      : 'Seluruh langkah kesiapan aktif terpenuhi — tim Anda siap mendaftar seleksi internal.'}
                </span>
              </span>
              <Link
                to={
                  isIndividualTarget || isLockedSelection
                    ? `/app/kompetisi/${targetComp.slug}/persiapan`
                    : '/app/tim'
                }
                className="font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 shrink-0"
              >
                {isIndividualTarget || isLockedSelection ? 'Buka Ruang Persiapan' : 'Daftar Seleksi di Ruang Tim'}{' '}
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Grid: Target & Recent Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Target Kompetisi Aktif */}
        <div className="lg:col-span-7">
          <Card className="h-full bg-white flex flex-col justify-between border-slate-200/90 shadow-2xs">
            <div>
              <CardHeader className="py-3.5">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-700" aria-hidden="true" />
                  <CardTitle level={2} className="text-sm font-bold">
                    Target Kompetisi Aktif
                  </CardTitle>
                </div>
                <Link
                  to={targetComp ? '/app/profil?need=target' : '/kompetisi'}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline min-h-[44px] inline-flex items-center"
                >
                  {targetComp ? 'Ganti Target' : 'Jelajahi Lomba'}
                </Link>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {targetComp ? (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge color="blue" dot>
                        {targetComp.category}
                      </Badge>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Tingkat {targetComp.level}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900 text-base leading-snug">
                        {targetComp.name}
                      </h3>
                      {targetComp.description && (
                        <p
                          className="text-sm text-slate-500 mt-1 leading-relaxed line-clamp-2"
                          title={targetComp.description}
                        >
                          {targetComp.description}
                        </p>
                      )}
                    </div>

                    {/* Team Health Meter & Status Box */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-slate-600 font-semibold">
                          {isIndividualTarget ? 'Format Kepesertaan:' : 'Status Formasi Tim:'}
                        </span>
                        <span
                          className={`font-black px-2.5 py-1 rounded-full text-sm inline-flex items-center gap-1 ${
                            isIndividualTarget || isSelectionReady
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isLockedSelection
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : activeTeam
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : pendingJoinReqsSent.length > 0
                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                    : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isIndividualTarget ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                              Kompetisi Individu (Perseorangan)
                            </>
                          ) : isLockedSelection ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-blue-700" aria-hidden="true" />
                              Terkunci Seleksi Internal
                            </>
                          ) : isSelectionReady ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                              Siap Seleksi Internal
                            </>
                          ) : isTeamFormed ? (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" aria-hidden="true" />
                              Anggota Cukup &middot; Cek Syarat
                            </>
                          ) : activeTeam ? (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" aria-hidden="true" />
                              Masih Mencari Anggota
                            </>
                          ) : pendingJoinReqsSent.length > 0 ? (
                            <>
                              <Clock className="w-3 h-3 text-indigo-700" aria-hidden="true" />
                              Menunggu Persetujuan Ketua
                            </>
                          ) : (
                            'Belum Memiliki Tim'
                          )}
                        </span>
                      </div>

                      {isIndividualTarget ? (
                        <p className="text-xs text-slate-600 pt-1">
                          Kompetisi target Anda bersifat individu. Buka Ruang Persiapan untuk melengkapi roadmap dan berkonsultasi dengan dosen pembimbing.
                        </p>
                      ) : activeTeam ? (
                        <div className="space-y-2 pt-2 border-t border-slate-200/60 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500">Nama Tim:</span>
                            <span className="font-extrabold text-slate-900 text-right">
                              {activeTeam.name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500">Kapasitas Anggota:</span>
                            <span className="font-bold text-slate-800">{capacityText}</span>
                          </div>

                          {/* Syarat wajib yang belum terpenuhi (K-23) */}
                          {unmetCriteria.length > 0 && (
                            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-xs text-amber-950 space-y-1">
                              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                                <span>Syarat wajib belum terpenuhi:</span>
                              </div>
                              <ul className="list-disc pl-5 space-y-0.5 text-amber-900">
                                {unmetCriteria.map((reason, idx) => (
                                  <li key={idx}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Saran opsional (tidak menyesatkan sebagai wajib) */}
                          {advisoryNotes.length > 0 && (
                            <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 flex items-start gap-1.5">
                              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                              <span>
                                <strong className="text-slate-700">Saran opsional:</strong>{' '}
                                {advisoryNotes.join(' · ')}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : pendingJoinReqsSent.length > 0 ? (
                        <div className="space-y-1.5 pt-2 border-t border-slate-200/60 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500">Tim Tujuan:</span>
                            <span className="font-extrabold text-indigo-950">
                              {pendingJoinReqsSent[0].teamName}
                            </span>
                          </div>
                          {pendingJoinReqsSent[0].preferredRole && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500">Peran Diajukan:</span>
                              <span className="font-semibold text-slate-700">
                                {pendingJoinReqsSent[0].preferredRole}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Buat tim baru, cari tim yang membuka rekrutmen, atau gabung memakai kode undangan ketua.
                        </p>
                      )}

                      {/* Ringkasan Progres Roadmap */}
                      {hasRoadmap && roadmap && (
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-500 flex items-center gap-1">
                            <BookOpenCheck className="w-3 h-3 text-blue-700" aria-hidden="true" />
                            Progres Roadmap:
                          </span>
                          <span className="font-bold text-slate-800">
                            {roadmap.completedTasks}/{roadmap.totalTasks} tugas ({roadmap.percentage}%)
                          </span>
                        </div>
                      )}

                      {/* Agenda Terdekat / Jadwal Terakhir (jujur terhadap tanggal lewat) */}
                      {upcomingAgenda ? (
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-500 flex items-center gap-1 shrink-0">
                            <Calendar className="w-3 h-3 text-blue-700" aria-hidden="true" />
                            Agenda Terdekat:
                          </span>
                          <span className="font-bold text-blue-800 text-right">
                            {upcomingAgenda.label} ({formatDate(upcomingAgenda.tanggal)})
                          </span>
                        </div>
                      ) : latestPastAgenda ? (
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-500 flex items-center gap-1 shrink-0">
                            <Calendar className="w-3 h-3 text-slate-400" aria-hidden="true" />
                            Jadwal Terakhir (Berlalu):
                          </span>
                          <span className="font-semibold text-slate-600 text-right">
                            {latestPastAgenda.label} ({formatDate(latestPastAgenda.tanggal)})
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 mx-auto flex items-center justify-center">
                      <Trophy className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800">Belum Ada Target Kompetisi</h4>
                      <p className="text-sm text-slate-500 max-w-xs mx-auto">
                        Pilih satu kompetisi acuan untuk mengaktifkan alur pembentukan tim dan roadmap persiapan.
                      </p>
                    </div>
                    <Link to="/kompetisi">
                      <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}>
                        Pilih Kompetisi Sekarang
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </div>

            {targetComp && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <Link
                  to={`/kompetisi/${targetComp.slug}`}
                  className="text-sm text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1"
                >
                  Panduan Lomba <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                  {!isIndividualTarget && (
                    <Link to={!activeTeam && pendingJoinReqsSent.length > 0 ? '/app/tim?tab=pengajuan' : '/app/tim'}>
                      <Button size="sm" variant="outline" rightIcon={<Users className="w-3.5 h-3.5" aria-hidden="true" />}>
                        {activeTeam
                          ? `Ruang Tim (${teamMemberCount} Org)`
                          : pendingJoinReqsSent.length > 0
                            ? 'Pantau Pengajuan'
                            : 'Atur Tim'}
                      </Button>
                    </Link>
                  )}
                  <Link to={`/app/kompetisi/${targetComp.slug}/persiapan`}>
                    <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}>
                      Buka Ruang Persiapan
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Portofolio & Prestasi Terbaru */}
        <div className="lg:col-span-5">
          <Card className="h-full bg-white flex flex-col justify-between border-slate-200/90 shadow-2xs">
            <div>
              <CardHeader className="py-3.5">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  <CardTitle level={2} className="text-sm font-bold">
                    Portofolio &amp; Prestasi
                  </CardTitle>
                </div>
                <Link
                  to="/app/prestasi"
                  className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline min-h-[44px] inline-flex items-center"
                >
                  Lihat Semua
                </Link>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5">
                {/* Metric Summary Counters (klik langsung filter daftar prestasi) */}
                <div className="grid grid-cols-3 gap-2">
                  <Link
                    to="/app/prestasi?status=disetujui"
                    className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/70 text-center transition-colors"
                  >
                    <div className="text-lg font-black text-emerald-700 leading-tight">{verifiedCount}</div>
                    <div className="text-xs font-semibold text-emerald-800 leading-tight">Disetujui</div>
                  </Link>
                  <Link
                    to="/app/prestasi?status=menunggu"
                    className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/70 border border-amber-200/70 text-center transition-colors"
                  >
                    <div className="text-lg font-black text-amber-700 leading-tight">{pendingCount}</div>
                    <div className="text-xs font-semibold text-amber-800 leading-tight">Verifikasi</div>
                  </Link>
                  <Link
                    to="/app/prestasi?status=perlu_perbaikan"
                    className={`p-2.5 rounded-xl border text-center transition-colors ${
                      revisionCount > 0
                        ? 'bg-orange-50 hover:bg-orange-100/70 border-orange-300 text-orange-800'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div
                      className={`text-lg font-black leading-tight ${
                        revisionCount > 0 ? 'text-orange-700' : 'text-slate-700'
                      }`}
                    >
                      {revisionCount}
                    </div>
                    <div
                      className={`text-xs font-semibold leading-tight ${
                        revisionCount > 0 ? 'text-orange-800' : 'text-slate-600'
                      }`}
                    >
                      Revisi
                    </div>
                  </Link>
                </div>

                {recentAchievements.length === 0 ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                      <Award className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800">Belum Ada Capaian Tercatat</h4>
                      <p className="text-sm text-slate-500 max-w-xs mx-auto">
                        Pernah menjuarai lomba atau jadi presenter konferensi? Daftarkan bukti prestasimu agar terdata di kampus.
                      </p>
                    </div>
                    <Link to="/app/prestasi/baru">
                      <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}>
                        Ajukan Prestasi Sekarang
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {recentAchievements.map((item) => (
                      <li key={item.id}>
                        <Link
                          to={`/app/prestasi/${item.id}`}
                          className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 transition-colors flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0">
                            <h4
                              className="font-bold text-sm text-slate-800 group-hover:text-blue-800 truncate transition-colors"
                              title={item.name}
                            >
                              {item.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {item.organizer} • {formatDate(item.eventDate)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <AchievementStatusBadge status={item.status} />
                            <ChevronRight
                              className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all"
                              aria-hidden="true"
                            />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 font-medium">
                {totalAchievementCount} pengajuan tercatat
                {extraStatusParts.length > 0 ? ` (${extraStatusParts.join(', ')})` : ''}
              </span>
              <Link
                to="/app/prestasi"
                className="text-sm font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 shrink-0"
              >
                Kelola Prestasi <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
