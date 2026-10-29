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
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoading } from '../../components/ui/Skeleton';
import { AchievementStatusBadge } from '../prestasi/components/StatusBadge';

export const BerandaPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [targetComp, setTargetComp] = useState<Competition | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isTeamFormed, setIsTeamFormed] = useState(false);
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
        setAchievements(achs.slice(0, 3));
        if (prof?.targetKompetisiSlug) {
          const comp = await competitionService.getBySlug(prof.targetKompetisiSlug);
          if (cancelled) return;
          setTargetComp(comp);
          if (t && comp && t.competitionSlug === comp.slug) {
            setIsTeamFormed(validateTeamFormation(t, users, comp).isFormed);
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
    { label: 'Profil & Minat', done: true, to: '/app/profil' },
    { label: 'Target Kompetisi', done: !!targetComp, to: '/app/profil?need=target' },
    { label: 'Partner Tim', done: !!team, to: '/app/partner' },
    { label: 'Tim Terbentuk', done: isTeamFormed, to: '/app/tim' },
    {
      label: 'Ruang Persiapan',
      done: isTeamFormed && !!targetComp,
      to: targetComp ? `/app/kompetisi/${targetComp.slug}/persiapan` : '/kompetisi',
    },
    { label: 'Prestasi', done: achievements.some((a) => a.status === 'disetujui'), to: '/app/prestasi' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-40 bg-gradient-to-l from-blue-50/80 to-transparent pointer-events-none -z-0" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                {getGreeting()},
              </span>
              <span className="text-[11px] bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded-full border border-blue-200/60">
                Portal Prestasi 2026
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {currentUser?.nama}
            </h1>
            <p className="text-xs text-slate-500">
              {currentUser?.prodi} • Angkatan {currentUser?.angkatan} • Siap menyongsong ajang Belmawa nasional.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
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

        {/* Stepper Pipeline */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-700" />
            Alur Perjalanan Prestasimu
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {steps.map((st, idx) => (
              <Link
                key={st.label}
                to={st.to}
                className={`p-2.5 rounded-xl border transition-all text-left flex items-start gap-2 ${
                  st.done
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/60'
                    : 'bg-slate-50/80 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                    st.done
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {st.done ? '✓' : idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold leading-tight truncate">{st.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                    {st.done ? 'Lengkap' : 'Langkah ' + (idx + 1)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Target & Recent Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Target Pembinaan Aktif */}
        <div className="lg:col-span-7">
          <Card className="h-full bg-white flex flex-col justify-between">
            <div>
              <CardHeader className="py-3.5">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-700" />
                  <CardTitle level={2} className="text-sm font-bold">
                    Target Pembinaan Belmawa Aktif
                  </CardTitle>
                </div>
                <Link
                  to="/app/profil"
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline min-h-[32px] inline-flex items-center"
                >
                  Ubah Target
                </Link>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {targetComp ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge color="blue" dot>
                        {targetComp.kategori}
                      </Badge>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase">
                        Tingkat {targetComp.tingkat}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                        {targetComp.namaResmi}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2" title={targetComp.deskripsi}>
                        {targetComp.deskripsi}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Status Tim Saat Ini:</span>
                        <span
                          className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
                            isTeamFormed
                              ? 'bg-emerald-100 text-emerald-800'
                              : team
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {team ? (isTeamFormed ? '✓ Tim Terbentuk & Solid' : '⏳ Mencari Anggota') : 'Belum Memiliki Tim'}
                        </span>
                      </div>

                      {team && (
                        <div className="text-[11px] text-slate-600 flex items-center justify-between pt-2 border-t border-slate-200/60">
                          <span>Nama Tim: <strong className="text-slate-900">{team.nama}</strong></span>
                          <span>{team.anggota.length} Anggota Terdaftar</span>
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
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Panduan Lomba →
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
          <Card className="h-full bg-white flex flex-col justify-between">
            <div>
              <CardHeader className="py-3.5">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <CardTitle level={2} className="text-sm font-bold">
                    Pengajuan Prestasi Terbaru
                  </CardTitle>
                </div>
                <Link
                  to="/app/prestasi"
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline min-h-[32px] inline-flex items-center"
                >
                  Lihat Semua
                </Link>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {achievements.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
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
                  <ul className="space-y-2.5">
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
                            {item.penyelenggara} • {item.tanggal}
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
                {achievements.length} pengajuan terdaftar
              </span>
              <Link to="/app/prestasi/baru">
                <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Ajukan Prestasi
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};