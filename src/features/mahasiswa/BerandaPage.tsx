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
  Sparkles,
  Calendar,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Achievement, Competition, Team } from '../../types';
import {
  achievementService,
  competitionService,
  teamService,
  userService,
} from '../../services/factory';
import { validateTeamFormation } from '../../lib/teamRules';
import { formatDate } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoading } from '../../components/ui/Skeleton';
import { AchievementStatusBadge } from '../prestasi/components/StatusBadge';
import { assetUrl } from '../../lib/asset';

export const BerandaPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [targetComp, setTargetComp] = useState<Competition | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isTeamFormed, setIsTeamFormed] = useState(false);
  const [missingRoles, setMissingRoles] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    Promise.all([
      userService.getProfile(currentUser.id),
      teamService.getTeamByUserId(currentUser.id),
      achievementService.getAll(currentUser.id),
      userService.getAll(),
    ])
      .then(async ([prof, t, achs, users]) => {
        if (cancelled) return;
        setTeam(t);
        setAchievements(achs.slice(0, 4));
        if (prof?.targetKompetisiSlug) {
          const comp = await competitionService.getBySlug(prof.targetKompetisiSlug);
          if (cancelled) return;
          setTargetComp(comp);
          if (t && comp && t.competitionSlug === comp.slug) {
            const validation = validateTeamFormation(t, users, comp);
            setIsTeamFormed(validation.isFormed);
            setMissingRoles(validation.missingRoles);
          } else {
            setIsTeamFormed(false);
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

  const steps = [
    { label: 'Identitas & Skill', done: true, to: '/app/profil' },
    { label: 'Target Belmawa', done: !!targetComp, to: '/app/profil?need=target' },
    { label: 'Cari Partner', done: !!team, to: '/app/partner' },
    { label: 'Tim Terbentuk', done: isTeamFormed, to: '/app/tim' },
    {
      label: 'Ruang Persiapan',
      done: isTeamFormed && !!targetComp,
      to: targetComp ? `/app/kompetisi/${targetComp.slug}/persiapan` : '/kompetisi',
    },
    { label: 'Validasi Prestasi', done: achievements.some((a) => a.status === 'disetujui'), to: '/app/prestasi' },
  ];

  const completedStepsCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedStepsCount / steps.length) * 100);

  // Next recommended action
  const nextStepIndex = steps.findIndex((s) => !s.done);
  const nextStep = nextStepIndex !== -1 ? steps[nextStepIndex] : null;

  // Metric counts for achievements
  const verifiedCount = achievements.filter((a) => a.status === 'disetujui').length;
  const pendingCount = achievements.filter((a) => a.status === 'menunggu').length;
  const revisionCount = achievements.filter((a) => a.status === 'perlu_perbaikan').length;

  // Next agenda item
  const nextAgenda = targetComp?.jadwal
    .filter((j) => new Date(j.tanggal).getTime() >= Date.now() - 86400000)
    .sort((a, b) => +new Date(a.tanggal) - +new Date(b.tanggal))[0] || targetComp?.jadwal[0];

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-l from-blue-100/60 via-sky-50/40 to-transparent pointer-events-none -z-0" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <img
              src={assetUrl(currentUser?.avatar) || assetUrl('images/avatar-andi.jpg')}
              alt={currentUser?.nama || 'Foto Profil'}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-blue-600/30 shadow-md shrink-0"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-blue-700 uppercase tracking-wider">
                  {getGreeting()},
                </span>
                <span className="text-[11px] bg-blue-50 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200/60">
                  Mahasiswa Binaan Belmawa 2026
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {currentUser?.nama}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {currentUser?.prodi} • Angkatan {currentUser?.angkatan} • Universitas Darussalam Gontor
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link to="/app/partner">
              <Button size="sm" variant="outline" leftIcon={<Users className="w-3.5 h-3.5" />}>
                Cari Partner
              </Button>
            </Link>
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
                    {st.done ? '✓' : idx + 1}
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
              <span className="text-blue-900 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-700 shrink-0" />
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
                        <span className="text-slate-600 font-semibold">Status Formasi Tim:</span>
                        <span
                          className={`font-black px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1 ${
                            isTeamFormed
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : team
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isTeamFormed ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Tim Terbentuk & Memenuhi Syarat
                            </>
                          ) : team ? (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              Masih Mencari Rekan
                            </>
                          ) : (
                            'Belum Memiliki Tim'
                          )}
                        </span>
                      </div>

                      {team ? (
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
                          Undang calon partner dengan keahlian pelengkap untuk mulai berkolaborasi.
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
                        Pilih satu kompetisi Belmawa acuan untuk mengaktifkan fitur pencocokan partner dan roadmap mandiri.
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

                {isTeamFormed ? (
                  <Link to={`/app/kompetisi/${targetComp.slug}/persiapan`}>
                    <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Buka Ruang Persiapan
                    </Button>
                  </Link>
                ) : (
                  <Link to="/app/tim">
                    <Button size="sm" variant="secondary" rightIcon={<Users className="w-3.5 h-3.5" />}>
                      Kelola Tim ({team ? team.anggota.length : 0} Org)
                    </Button>
                  </Link>
                )}
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
                    <div className="text-[10px] font-semibold text-emerald-800 leading-tight">Disahkan SKPI</div>
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
                {achievements.length} pengajuan tercatat
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
