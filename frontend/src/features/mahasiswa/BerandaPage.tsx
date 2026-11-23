import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Achievement, Competition, Team } from '../../types';
import type { StudentDashboardData } from '../../services/types';
import {
  achievementService,
  competitionService,
  dashboardService,
  teamService,
  userService,
} from '@talenta/services';
import { validateTeamFormation } from '../../lib/teamRules';
import { formatDate, parseFlexibleDate } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoading } from '../../components/ui/Skeleton';
import { AchievementStatusBadge } from '../prestasi/components/StatusBadge';
import { assetUrl } from '../../lib/asset';

export const BerandaPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);
  const [targetComp, setTargetComp] = useState<Competition | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isTeamFormed, setIsTeamFormed] = useState(false);
  const [isSelectionReady, setIsSelectionReady] = useState(false);
  const [missingRoles, setMissingRoles] = useState<string[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    Promise.all([
      dashboardService.getStudentDashboard().catch(() => null),
      userService.getProfile(currentUser.id),
      teamService.getTeamByUserId(currentUser.id),
      achievementService.getAll(currentUser.id),
    ])
      .then(async ([dash, prof, t, achs]) => {
        if (cancelled) return;
        setDashboardData(dash);
        setTeam(t);
        setAllAchievements(achs);
        setAchievements(achs.slice(0, 4));
        const slug = dash?.targetCompetition?.slug || prof?.targetKompetisiSlug;
        if (slug) {
          const comp = await competitionService.getBySlug(slug);
          if (cancelled) return;
          setTargetComp(comp);
          if (t && comp && t.competitionSlug === comp.slug) {
            const validation = validateTeamFormation(t, [], comp);
            setIsTeamFormed(validation.isFormed);
            setIsSelectionReady(validation.isSelectionReady);
            setMissingRoles(validation.missingRoles);
          } else {
            setIsTeamFormed(false);
            setIsSelectionReady(false);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  if (loading) return <PageLoading message="Memuat beranda mahasiswa..." />;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const getInitials = (name?: string) => {
    if (!name) return 'M';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isIndividualTarget =
    targetComp?.format === 'individu' ||
    (Boolean(targetComp) && targetComp!.komposisi.min === 1 && targetComp!.komposisi.max === 1);

  const verifiedCount = dashboardData?.submissions?.disetujui ?? allAchievements.filter((a) => a.status === 'disetujui').length;
  const pendingCount = dashboardData?.submissions?.menunggu ?? allAchievements.filter((a) => a.status === 'menunggu').length;
  const revisionCount = dashboardData?.submissions?.perlu_perbaikan ?? allAchievements.filter((a) => a.status === 'perlu_perbaikan').length;
  const totalAchievementCount = dashboardData?.submissions?.total ?? allAchievements.length;

  const steps = isIndividualTarget
    ? [
        { label: 'Identitas & Skill', done: (dashboardData?.profile?.completionPercentage ?? 100) >= 60, to: '/app/profil' },
        { label: 'Target Kompetisi', done: !!targetComp, to: '/app/profil?need=target' },
        {
          label: 'Roadmap & Pembinaan',
          done: Boolean(dashboardData?.roadmapProgress && dashboardData.roadmapProgress.percentage > 0),
          to: targetComp ? `/app/kompetisi/${targetComp.slug}/persiapan` : '/kompetisi',
        },
        { label: 'Validasi Prestasi', done: verifiedCount > 0, to: '/app/prestasi' },
      ]
    : [
        { label: 'Identitas & Skill', done: (dashboardData?.profile?.completionPercentage ?? 100) >= 60, to: '/app/profil' },
        { label: 'Target Kompetisi', done: !!targetComp, to: '/app/profil?need=target' },
        { label: 'Cara Bergabung', done: !!team, to: '/app/tim' },
        { label: 'Kesiapan Tim', done: isTeamFormed, to: '/app/tim' },
        {
          label: 'Roadmap & Pembinaan',
          done: Boolean(dashboardData?.roadmapProgress && dashboardData.roadmapProgress.percentage > 0),
          to: targetComp ? `/app/kompetisi/${targetComp.slug}/persiapan` : '/kompetisi',
        },
        { label: 'Validasi Prestasi', done: verifiedCount > 0, to: '/app/prestasi' },
      ];

  const completedStepsCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedStepsCount / steps.length) * 100);

  // Next recommended action
  const nextStepIndex = steps.findIndex((s) => !s.done);
  const nextStep = nextStepIndex !== -1 ? steps[nextStepIndex] : null;

  // Next agenda item (mendukung format tanggal Indonesia maupun ISO)
  const nextAgenda =
    targetComp?.jadwal
      .filter((j) => {
        const d = parseFlexibleDate(j.tanggal);
        return d ? d.getTime() >= Date.now() - 86400000 : true;
      })
      .sort((a, b) => {
        const da = parseFlexibleDate(a.tanggal)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const db = parseFlexibleDate(b.tanggal)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return da - db;
      })[0] || targetComp?.jadwal[0];

  const pendingJoinRequests =
    team?.isLeader ? (team.pendingJoinRequestsCount ?? team.joinRequests?.length ?? 0) : 0;

  return (
    <div className="space-y-6">
      {/* Banner Perhatian Jika Ada Permintaan Bergabung Tim (Khusus Ketua) */}
      {pendingJoinRequests > 0 && team && (
        <div className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200 text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-xs font-bold text-blue-900">
                {pendingJoinRequests} Permintaan Bergabung ke {team.nama} Menunggu Persetujuan
              </div>
              <div className="text-xs text-blue-700 mt-0.5">
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

      {/* Banner Perhatian Jika Ada Revisi Prestasi */}
      {revisionCount > 0 && (
        <div className="p-4 rounded-2xl bg-orange-50/90 border border-orange-200 text-orange-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-orange-900">
                Perhatian: {revisionCount} Pengajuan Prestasi Memerlukan Perbaikan
              </div>
              <div className="text-xs text-orange-700 mt-0.5">
                Validator meminta revisi kelengkapan berkas/bukti pendukung. Silakan periksa catatan review dan unggah dokumen perbaikan.
              </div>
            </div>
          </div>
          <Link to="/app/prestasi" className="shrink-0">
            <Button size="sm" variant="outline" className="border-orange-300 text-orange-900 hover:bg-orange-100">
              Periksa Berkas Sekarang
            </Button>
          </Link>
        </div>
      )}

      {/* Top Welcome Card */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-l from-blue-100/60 via-sky-50/40 to-transparent pointer-events-none -z-0" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {currentUser?.avatar ? (
              <img
                src={assetUrl(currentUser.avatar)}
                alt={currentUser?.nama || 'Foto Profil'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-blue-600/30 shadow-md shrink-0"
              />
            ) : (
              <div
                aria-hidden="true"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-800 to-indigo-900 text-white font-black text-xl sm:text-2xl flex items-center justify-center border-2 border-blue-500/30 shadow-md shrink-0"
              >
                {getInitials(currentUser?.nama)}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-blue-700 uppercase tracking-wider">
                  {getGreeting()},
                </span>
                <span className="text-[11px] bg-blue-50 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200/60">
                  Mahasiswa
                </span>
                {dashboardData?.points && (
                  <span className="text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {dashboardData.points.totalPoints} Poin ({dashboardData.points.currentPeriod})
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {currentUser?.nama}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {currentUser?.prodi}{currentUser?.angkatan ? ` • Angkatan ${currentUser.angkatan}` : ''} • Universitas Darussalam Gontor
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isIndividualTarget && (
              <Link to={team ? '/app/tim' : '/app/tim?tab=cari'}>
                <Button size="sm" variant="outline" leftIcon={<Users className="w-3.5 h-3.5" aria-hidden="true" />}>
                  {team ? 'Ruang Tim Saya' : 'Cari Tim'}
                </Button>
              </Link>
            )}
            <Link to="/app/prestasi/baru">
              <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Catat Prestasi Baru
              </Button>
            </Link>
          </div>
        </div>

        {/* Milestone Pipeline Header & Progress Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-700" />
              <span>Alur Perjalanan Kesiapan Kompetisi</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="text-slate-400">Progres Kesiapan:</span>
              <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                {completedStepsCount} dari {steps.length} Langkah ({progressPercent}%)
              </span>
            </div>
          </div>

          {/* Progress bar visual */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stepper Pipeline Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
            {steps.map((st, idx) => {
              const isNext = nextStep?.label === st.label;
              return (
                <Link
                  key={st.label}
                  to={st.to}
                  className={`p-2.5 rounded-xl border transition-all text-left flex items-start gap-2 relative group ${
                    st.done
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/60'
                      : isNext
                      ? 'bg-blue-50/90 border-blue-300 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                      st.done
                        ? 'bg-emerald-600 text-white'
                        : isNext
                        ? 'bg-blue-700 text-white animate-pulse'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {st.done ? <Check className="w-3 h-3" aria-hidden="true" /> : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold leading-tight truncate">{st.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      {st.done ? 'Selesai' : isNext ? 'Perlu Dikerjakan' : `Langkah ${idx + 1}`}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {nextStep && (
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs">
              <span className="text-blue-900 font-semibold">
                Langkah berikutnya yang disarankan: <strong>{nextStep.label}</strong>
              </span>
              <Link to={nextStep.to} className="font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 shrink-0">
                Selesaikan Sekarang <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Target & Recent Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Target Pembinaan Aktif */}
        <div className="lg:col-span-7">
          <Card className="h-full bg-white flex flex-col justify-between border-slate-200/90 shadow-2xs">
            <div>
              <CardHeader className="py-3.5">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-700" />
                  <CardTitle level={2} className="text-sm font-bold">
                    Target Pembinaan Belmawa Aktif
                  </CardTitle>
                </div>
                <Link
                  to="/app/profil?need=target"
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline min-h-[32px] inline-flex items-center"
                >
                  Ganti Target
                </Link>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {targetComp ? (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge color="blue" dot>
                        {targetComp.kategori}
                      </Badge>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Tingkat {targetComp.tingkat}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900 text-base leading-snug">
                        {targetComp.namaResmi}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2" title={targetComp.deskripsi}>
                        {targetComp.deskripsi}
                      </p>
                    </div>

                    {/* Team Health Meter & Status Box */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-semibold">
                          {isIndividualTarget ? 'Format Kepesertaan:' : 'Status Formasi Tim:'}
                        </span>
                        <span
                          className={`font-black px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1 ${
                            isIndividualTarget || isSelectionReady
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : team?.status === 'terkunci_seleksi'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : team
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isIndividualTarget ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                              Kompetisi Individu (Perseorangan)
                            </>
                          ) : team?.status === 'terkunci_seleksi' ? (
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
                          ) : team ? (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" aria-hidden="true" />
                              Masih Mencari Anggota
                            </>
                          ) : (
                            'Belum Memiliki Tim'
                          )}
                        </span>
                      </div>

                      {isIndividualTarget ? (
                        <p className="text-[11px] text-slate-600 pt-1">
                          Kompetisi target Anda bersifat individu. Anda dapat langsung membuka Ruang Persiapan untuk melengkapi roadmap dan berkonsultasi dengan dosen pembimbing.
                        </p>
                      ) : team ? (
                        <div className="space-y-2 pt-2 border-t border-slate-200/60 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Nama Tim:</span>
                            <span className="font-extrabold text-slate-900">{team.nama}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Kapasitas Anggota:</span>
                            <span className="font-bold text-slate-800">
                              {team.anggota.length} dari {targetComp.komposisi.min}–{targetComp.komposisi.max} Anggota
                            </span>
                          </div>
                          {missingRoles.length > 0 && (
                            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/70 text-[11px] text-amber-900 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Butuh peran pelengkap: <strong>{missingRoles.join(', ')}</strong></span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Buat tim baru, cari tim yang membuka rekrutmen, atau gabung memakai kode undangan ketua.
                        </p>
                      )}

                      {/* Next Agenda Countdown */}
                      {nextAgenda && (
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-blue-700" />
                            Agenda Terdekat:
                          </span>
                          <span className="font-bold text-blue-800">
                            {nextAgenda.label} ({formatDate(nextAgenda.tanggal)})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 mx-auto flex items-center justify-center">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800">Belum Ada Target Kompetisi</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Pilih satu kompetisi acuan untuk mengaktifkan alur pembentukan tim dan roadmap persiapan.
                      </p>
                    </div>
                    <Link to="/kompetisi">
                      <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Pilih Kompetisi Sekarang
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </div>

            {targetComp && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to={`/kompetisi/${targetComp.slug}`}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1"
                >
                  Panduan Lomba <ChevronRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                  {!isIndividualTarget && (
                    <Link to="/app/tim">
                      <Button size="sm" variant="outline" rightIcon={<Users className="w-3.5 h-3.5" aria-hidden="true" />}>
                        {team ? `Ruang Tim (${team.anggota.length} Org)` : 'Atur Tim'}
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

        {/* Right Column: Pengajuan Prestasi Terbaru */}
        <div className="lg:col-span-5">
          <Card className="h-full bg-white flex flex-col justify-between border-slate-200/90 shadow-2xs">
            <div>
              <CardHeader className="py-3.5">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <CardTitle level={2} className="text-sm font-bold">
                    Portofolio & Prestasi
                  </CardTitle>
                </div>
                <Link
                  to="/app/prestasi"
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline min-h-[32px] inline-flex items-center"
                >
                  Lihat Semua
                </Link>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5">
                {/* Metric Summary Counters */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-center">
                    <div className="text-lg font-black text-emerald-700 leading-tight">{verifiedCount}</div>
                    <div className="text-[10px] font-semibold text-emerald-800 leading-tight">Disetujui</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/70 text-center">
                    <div className="text-lg font-black text-amber-700 leading-tight">{pendingCount}</div>
                    <div className="text-[10px] font-semibold text-amber-800 leading-tight">Verifikasi</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-lg font-black text-slate-700 leading-tight">{revisionCount}</div>
                    <div className="text-[10px] font-semibold text-slate-600 leading-tight">Revisi</div>
                  </div>
                </div>

                {achievements.length === 0 ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                      <Award className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800">Belum Ada Capaian Tercatat</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Pernah menjuarai lomba atau jadi presenter konferensi? Daftarkan bukti prestasimu agar terdata di kampus.
                      </p>
                    </div>
                    <Link to="/app/prestasi/baru">
                      <Button size="sm" variant="outline" rightIcon={<Plus className="w-3.5 h-3.5" />}>
                        Ajukan Prestasi Sekarang
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {achievements.map((item) => (
                      <li
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-800 truncate" title={item.nama}>
                            {item.nama}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {item.penyelenggara} • {formatDate(item.tanggal)}
                          </p>
                        </div>
                        <AchievementStatusBadge status={item.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                {totalAchievementCount} pengajuan tercatat
              </span>
              <Link to="/app/prestasi/baru">
                <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Catat Prestasi Baru
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
