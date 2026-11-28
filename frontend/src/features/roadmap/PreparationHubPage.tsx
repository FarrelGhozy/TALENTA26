import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  History,
  Layers,
  Lock,
  Target,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { Competition, Team } from '../../types';
import type { StudentDashboardData } from '../../services/types';
import {
  competitionService,
  dashboardService,
  teamService,
  userService,
} from '@talenta/services';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { validateTeamFormation } from '../../lib/teamRules';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoading } from '../../components/ui/Skeleton';

interface TargetHistoryRow {
  id: string;
  status: string;
  createdAt: string;
  competition: { id: string; slug: string; name: string };
  academicPeriod?: { id: string; name: string } | null;
}

export const PreparationHubPage: React.FC = () => {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
  const [activeTargetSlug, setActiveTargetSlug] = useState('');
  const [historyRows, setHistoryRows] = useState<TargetHistoryRow[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Modal konfirmasi pindah lomba saat punya tim aktif
  const [switchCandidate, setSwitchCandidate] = useState<Competition | null>(null);
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null);

  const loadData = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!currentUser) return;
      try {
        setLoadError('');
        // Hemat waterfall: gunakan getStudentDashboard() sebagai sumber target & tim aktif (fallback bila mode mock)
        const [dash, hist, comps] = await Promise.all([
          dashboardService.getStudentDashboard().catch(() => null),
          userService.getTargetHistory ? userService.getTargetHistory().catch(() => []) : Promise.resolve([]),
          competitionService.getAll(),
        ]);
        if (isCancelled?.()) return;

        let resolvedTargetSlug = dash?.targetCompetition?.slug || '';
        let resolvedTeam: Team | null = null;

        if (dash?.activeTeam && dash.activeTeam.status !== 'arsip') {
          const rawT = dash.activeTeam;
          resolvedTeam = {
            id: rawT.id,
            institutionId: 'unida-gontor',
            competitionSlug: rawT.competition?.slug || '',
            nama: rawT.name || '',
            leaderId: rawT.leaderId,
            isLeader: rawT.isLeader,
            status: rawT.status,
            isFormed: rawT.status === 'terbentuk' || rawT.status === 'terkunci_seleksi',
            readiness: rawT.readiness || null,
            anggota: Array.isArray(rawT.members)
              ? rawT.members.map((m: any) => ({
                  userId: m.userId,
                  status: 'diterima' as const,
                  roleInTeam: m.roleInTeam || 'Anggota',
                  nama: m.user?.studentProfile?.fullName || 'Mahasiswa',
                  prodi: m.user?.studentProfile?.studyProgram || '',
                }))
              : [],
          };
        } else if (!dash) {
          const [prof, team] = await Promise.all([
            userService.getProfile(currentUser.id).catch(() => null),
            teamService.getTeamByUserId(currentUser.id).catch(() => null),
          ]);
          if (isCancelled?.()) return;
          resolvedTargetSlug = prof?.targetKompetisiSlug || '';
          resolvedTeam = team && team.status !== 'arsip' ? team : null;
        }

        setDashboard(dash);
        setActiveTargetSlug(resolvedTargetSlug);
        setHistoryRows(Array.isArray(hist) ? hist : []);
        setActiveTeam(resolvedTeam);
        setCompetitions(comps);
      } catch (err: any) {
        if (isCancelled?.()) return;
        setLoadError(err?.message || 'Gagal memuat daftar ruang persiapan.');
      } finally {
        if (!isCancelled?.()) setLoading(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    let cancelled = false;
    void loadData(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const activeCompetition = useMemo(
    () => competitions.find((c) => c.slug === activeTargetSlug) || null,
    [competitions, activeTargetSlug]
  );

  const historyCompetitions = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ competition: Competition; periodName?: string }> = [];
    for (const row of historyRows) {
      const slug = row.competition?.slug;
      if (!slug || slug === activeTargetSlug || seen.has(slug)) continue;
      const comp = competitions.find((c) => c.slug === slug);
      if (comp) {
        seen.add(slug);
        list.push({ competition: comp, periodName: row.academicPeriod?.name });
      }
    }
    return list;
  }, [historyRows, activeTargetSlug, competitions]);

  const otherCompetitions = useMemo(() => {
    const historySlugs = new Set(historyCompetitions.map((h) => h.competition.slug));
    return competitions.filter(
      (c) => c.slug !== activeTargetSlug && !historySlugs.has(c.slug)
    );
  }, [competitions, activeTargetSlug, historyCompetitions]);

  const executeEnterCompetition = async (comp: Competition) => {
    if (!currentUser) return;
    setSwitchingSlug(comp.slug);
    setSwitchCandidate(null);
    try {
      await userService.setTargetCompetition(currentUser.id, comp.slug);
      await refreshUser();
      notify(`Ruang persiapan dialihkan ke ${comp.namaResmi}.`);
      navigate(`/app/kompetisi/${comp.slug}/persiapan`);
    } catch (err: any) {
      notify(err?.message || 'Gagal berpindah ruang persiapan. Coba lagi.', 'error');
    } finally {
      setSwitchingSlug(null);
    }
  };

  const handleChooseCompetition = (comp: Competition) => {
    if (switchingSlug) return;
    if (comp.slug === activeTargetSlug) {
      navigate(`/app/kompetisi/${comp.slug}/persiapan`);
      return;
    }
    if (activeTeam && activeTeam.competitionSlug !== comp.slug) {
      setSwitchCandidate(comp);
      return;
    }
    void executeEnterCompetition(comp);
  };

  if (loading) return <PageLoading message="Memuat daftar ruang persiapan lomba..." />;

  if (loadError) {
    return (
      <div className="p-12 text-center space-y-4">
        <p role="alert" className="text-xs text-rose-600 font-semibold">{loadError}</p>
        <Button
          size="sm"
          variant="outline"
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

  const isActiveIndividu =
    activeCompetition?.format === 'individu' ||
    (activeCompetition &&
      activeCompetition.komposisi.min === 1 &&
      activeCompetition.komposisi.max === 1);

  const activeTeamValidation =
    activeTeam && activeCompetition && activeTeam.competitionSlug === activeCompetition.slug
      ? validateTeamFormation(activeTeam, [], activeCompetition)
      : null;

  const roadmapProgress = dashboard?.roadmapProgress;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Pusat Pembinaan &amp; Roadmap
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight mt-1">
            Ruang Persiapan Lomba
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Lihat lomba yang sedang kamu ikuti, pantau progres roadmap, dan pilih ruang persiapan yang ingin dimasuki.
          </p>
        </div>

        <Link to="/kompetisi">
          <Button size="sm" variant="outline" leftIcon={<Compass className="w-3.5 h-3.5" aria-hidden="true" />}>
            Jelajahi Katalog Lomba
          </Button>
        </Link>
      </div>

      {/* Section 1: Active Competition Room */}
      <section aria-labelledby="active-room-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="active-room-heading" className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-700" aria-hidden="true" />
            Lomba yang Sedang Diikuti
          </h2>
          {activeCompetition && (
            <Badge color="emerald" size="sm" dot>
              Target Aktif
            </Badge>
          )}
        </div>

        {activeCompetition ? (
          <div className="bg-white rounded-2xl border border-blue-200/90 shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 bg-gradient-to-r from-[#10347A] via-[#154194] to-[#1A4DB0] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-white/15 px-2.5 py-0.5 rounded-full">
                    {activeCompetition.kategori}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-white/15 px-2.5 py-0.5 rounded-full">
                    Tingkat {activeCompetition.tingkat}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 px-2.5 py-0.5 rounded-full">
                    {isActiveIndividu
                      ? 'Individu (1 Peserta)'
                      : `Beregu (${activeCompetition.komposisi.min}–${activeCompetition.komposisi.max} Anggota)`}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  {activeCompetition.namaResmi}
                </h3>
                <p className="text-xs text-blue-100 max-w-2xl leading-relaxed line-clamp-2">
                  {activeCompetition.deskripsi}
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 shrink-0">
                <Link to={`/app/kompetisi/${activeCompetition.slug}/persiapan`}>
                  <Button
                    size="md"
                    variant="white"
                    leftIcon={<BookOpen className="w-4 h-4" aria-hidden="true" />}
                    rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
                  >
                    Masuk Ruang Persiapan
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 bg-white">
              {/* Roadmap Progress Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-700" aria-hidden="true" />
                    Progres Roadmap Persiapan
                  </span>
                  <span className="font-black text-blue-700">
                    {roadmapProgress ? `${roadmapProgress.percentage}%` : '0%'}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${roadmapProgress?.percentage ?? 0}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {roadmapProgress && roadmapProgress.totalTasks > 0
                    ? `${roadmapProgress.completedTasks} dari ${roadmapProgress.totalTasks} tugas persiapan telah ditandai selesai.`
                    : 'Roadmap dan materi pembinaan dapat langsung dipelajari di dalam ruang persiapan.'}
                </p>
              </div>

              {/* Team / Individual Status Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-3">
                {isActiveIndividu ? (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <UserIcon className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                        Format Kepesertaan
                      </span>
                      <Badge color="emerald" size="sm" dot>
                        Jalur Individu
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Kompetisi ini diikuti secara perseorangan tanpa perlu membentuk tim. Kamu bisa langsung fokus pada checklist persiapan &amp; seleksi internal.
                    </p>
                  </>
                ) : activeTeam && activeTeamValidation ? (
                  <>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                        <Users className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                        <span className="truncate">{activeTeam.nama}</span>
                      </span>
                      <Badge
                        color={
                          activeTeam.status === 'terkunci_seleksi'
                            ? 'blue'
                            : activeTeamValidation.isSelectionReady
                            ? 'emerald'
                            : 'amber'
                        }
                        size="sm"
                        dot
                      >
                        {activeTeamValidation.statusText}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>
                        {activeTeamValidation.acceptedCount}/{activeTeamValidation.maxAllowed} anggota aktif
                      </span>
                      <Link to="/app/tim" className="font-bold text-blue-700 hover:underline inline-flex items-center gap-1">
                        Kelola Ruang Tim <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" aria-hidden="true" />
                        Status Tim
                      </span>
                      <Badge color="amber" size="sm">
                        Belum Bergabung Tim
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>Roadmap tetap boleh dibuka lebih awal sambil membentuk tim.</span>
                      <Link to="/app/tim" className="font-bold text-blue-700 hover:underline shrink-0">
                        Pilih Cara Gabung →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<BookOpen className="w-8 h-8 text-blue-700" />}
            title="Belum Ada Lomba Aktif Dipilih"
            description="Pilih salah satu kompetisi di bawah ini untuk membuka ruang persiapan, roadmap latihan, jadwal, dan kontak konsultasi."
          />
        )}
      </section>

      {/* Section 2: Previously Followed Competitions */}
      {historyCompetitions.length > 0 && (
        <section aria-labelledby="history-rooms-heading" className="space-y-3">
          <h2 id="history-rooms-heading" className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" aria-hidden="true" />
            Lomba yang Pernah Diikuti Sebelumnya
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {historyCompetitions.map(({ competition, periodName }) => {
              const isInd =
                competition.format === 'individu' ||
                (competition.komposisi.min === 1 && competition.komposisi.max === 1);
              return (
                <article
                  key={competition.slug}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between gap-4 shadow-2xs hover:border-blue-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge color="slate" size="sm">
                        {periodName || 'Riwayat Target'}
                      </Badge>
                      <span className="text-[11px] font-bold text-slate-400">
                        {isInd ? 'Individu' : `${competition.komposisi.min}–${competition.komposisi.max} Org`}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {competition.namaResmi}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {competition.deskripsi}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <Link
                      to={`/kompetisi/${competition.slug}`}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      Detail
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={switchingSlug === competition.slug}
                      disabled={Boolean(switchingSlug)}
                      onClick={() => handleChooseCompetition(competition)}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                    >
                      Buka Ruang Ini
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 3: Other Available Competitions */}
      {otherCompetitions.length > 0 && (
        <section aria-labelledby="other-rooms-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="other-rooms-heading" className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-700" aria-hidden="true" />
              Pilih Ruang Persiapan Lomba Lainnya
            </h2>
            <span className="text-xs text-slate-400">{otherCompetitions.length} lomba tersedia</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherCompetitions.map((comp) => {
              const isInd =
                comp.format === 'individu' ||
                (comp.komposisi.min === 1 && comp.komposisi.max === 1);
              return (
                <article
                  key={comp.slug}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between gap-4 shadow-2xs hover:border-blue-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge color="blue" size="sm">
                        {comp.kategori}
                      </Badge>
                      <span className="text-[11px] font-bold text-slate-500">
                        {isInd ? 'Individu' : `Beregu · ${comp.komposisi.min}–${comp.komposisi.max} Org`}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {comp.namaResmi}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {comp.deskripsi}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <Link
                      to={`/kompetisi/${comp.slug}`}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      Lihat Syarat
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={switchingSlug === comp.slug}
                      disabled={Boolean(switchingSlug)}
                      onClick={() => handleChooseCompetition(comp)}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                    >
                      Pilih &amp; Masuk Ruang
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Confirmation modal when switching competition while in an active team */}
      <Modal
        isOpen={Boolean(switchCandidate)}
        onClose={() => setSwitchCandidate(null)}
        title="Pindah Ruang Persiapan & Target Lomba?"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setSwitchCandidate(null)}>
              Batal
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={activeTeam?.status === 'terkunci_seleksi'}
              isLoading={Boolean(switchingSlug)}
              onClick={() => switchCandidate && void executeEnterCompetition(switchCandidate)}
            >
              Ya, Pindah &amp; Masuk Ruang
            </Button>
          </div>
        }
      >
        {activeTeam?.status === 'terkunci_seleksi' ? (
          <div className="flex items-start gap-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3.5 rounded-xl">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              Tim aktif kamu (<strong>{activeTeam.nama}</strong>) sudah <strong>terkunci untuk seleksi internal</strong> sehingga target lomba tidak dapat diubah secara mandiri saat ini.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-600 leading-relaxed">
            Kamu saat ini tergabung dalam tim aktif <strong className="text-slate-900">{activeTeam?.nama}</strong>.
            Berpindah ke ruang persiapan <strong className="text-slate-900">{switchCandidate?.namaResmi}</strong> akan menjadikan lomba tersebut sebagai target aktif, mengeluarkan kamu dari tim sebelumnya secara otomatis (transfer ketua ke anggota terlama jika kamu ketua, atau arsip jika sendirian), dan membatalkan pengajuan gabung pada lomba sebelumnya.
          </p>
        )}
      </Modal>
    </div>
  );
};
