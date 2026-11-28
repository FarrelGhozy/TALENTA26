import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Building2,
  Calendar,
  Crown,
  Layers,
  Lock,
  Medal,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Target,
  Trophy,
  User,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { Competition, RankingResponse } from '../../types';
import { achievementService, competitionService } from '@talenta/services';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoading } from '../../components/ui/Skeleton';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { UscBrand } from '../../components/common/UscBrand';

const heroSlides = [
  {
    kicker: 'PORTAL PRESTASI MAHASISWA',
    title1: 'Temukan peluang,',
    title2: 'siapkan langkah,',
    titleHighlight: 'raih prestasi.',
    desc: 'Temukan kompetisi, bangun tim, dan siapkan perjalanan prestasimu bersama UNIDA Student Championship.',
    tags: ['KATALOG LOMBA', 'REKRUTMEN TIM', 'ROADMAP & KONSULTAN', 'PAPAN PERINGKAT'],
  },
  {
    kicker: 'KOLABORASI LINTAS PRODI',
    title1: 'Temukan rekan,',
    title2: 'bangun tim,',
    titleHighlight: 'tumbuh bersama.',
    desc: 'Buat ruang tim sendiri, ajukan gabung ke tim terbuka, atau masuk lewat kode ketua; lomba individu langsung ke persiapan.',
    tags: ['TIM TERBUKA', 'KODE UNDANGAN', 'KONSULTASI WA', 'SELEKSI INTERNAL'],
  },
  {
    kicker: 'PENCATATAN PRESTASI SAH',
    title1: 'Setiap langkah',
    title2: 'punya cerita,',
    titleHighlight: 'catat prestasimu.',
    desc: 'Ajukan prestasi individu maupun kelompok dengan bukti privat untuk diverifikasi validator dan tercatat di ranking.',
    tags: ['INDIVIDU & KELOMPOK', 'BUKTI PRIVAT', 'VALIDASI BERJENJANG', 'POIN TRANSPARAN'],
  },
];

function getPodiumTheme(rank: number) {
  if (rank === 1) {
    return {
      card: 'border-amber-300 bg-gradient-to-b from-amber-50/90 via-white to-white ring-1 ring-amber-200/80 shadow-md',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      avatarTone: 'amber' as const,
      avatarRing: 'ring-4 ring-amber-200/80',
      label: 'Peringkat #1',
      iconColor: 'text-amber-600',
    };
  }
  if (rank === 2) {
    return {
      card: 'border-slate-300 bg-gradient-to-b from-slate-50/90 via-white to-white shadow-xs',
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
      avatarTone: 'slate' as const,
      avatarRing: 'ring-4 ring-slate-200/80',
      label: 'Peringkat #2',
      iconColor: 'text-slate-500',
    };
  }
  return {
    card: 'border-orange-200 bg-gradient-to-b from-orange-50/80 via-white to-white shadow-xs',
    badge: 'bg-orange-100 text-orange-900 border-orange-200',
    avatarTone: 'orange' as const,
    avatarRing: 'ring-4 ring-orange-200/70',
    label: 'Peringkat #3',
    iconColor: 'text-orange-600',
  };
}

export const LandingPage: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const currentUserId = currentUser?.id ?? null;

  const [allCompetitions, setAllCompetitions] = useState<Competition[]>([]);
  const [compLoading, setCompLoading] = useState(true);
  const [compError, setCompError] = useState<string | null>(null);

  const [rankingData, setRankingData] = useState<RankingResponse | null>(null);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [rankingError, setRankingError] = useState<string | null>(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);
  const [sliderHovered, setSliderHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const loadCompetitions = useCallback(async () => {
    setCompLoading(true);
    setCompError(null);
    try {
      const list = await competitionService.getAll();
      setAllCompetitions(list);
    } catch (err: any) {
      setCompError(err?.message || 'Gagal memuat daftar kompetisi.');
    } finally {
      setCompLoading(false);
    }
  }, []);

  const loadRanking = useCallback(async () => {
    if (!achievementService.getRanking) {
      setRankingLoading(false);
      return;
    }
    setRankingLoading(true);
    setRankingError(null);
    try {
      const data = await achievementService.getRanking();
      setRankingData(data);
    } catch (err: any) {
      setRankingError(err?.message || 'Gagal memuat sorotan papan peringkat.');
    } finally {
      setRankingLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCompLoading(true);
    setCompError(null);
    competitionService
      .getAll()
      .then((list) => {
        if (cancelled) return;
        setAllCompetitions(list);
        setCompLoading(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setCompError(err?.message || 'Gagal memuat daftar kompetisi.');
        setCompLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!achievementService.getRanking) {
      setRankingLoading(false);
      return;
    }
    let cancelled = false;
    setRankingLoading(true);
    setRankingError(null);
    achievementService
      .getRanking()
      .then((data) => {
        if (cancelled) return;
        setRankingData(data);
        setRankingLoading(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setRankingError(err?.message || 'Gagal memuat sorotan papan peringkat.');
        setRankingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  // Prioritaskan kompetisi dengan pendaftaran dibuka, lalu urut alfabetis
  const featuredCompetitions = useMemo(() => {
    return [...allCompetitions]
      .sort((a, b) => {
        const aOpen = a.registrationStatus !== 'tutup' ? 0 : 1;
        const bOpen = b.registrationStatus !== 'tutup' ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        return a.namaResmi.localeCompare(b.namaResmi);
      })
      .slice(0, 3);
  }, [allCompetitions]);

  const openCompetitionsCount = useMemo(
    () => allCompetitions.filter((c) => c.registrationStatus !== 'tutup').length,
    [allCompetitions]
  );

  const rankingEntries = useMemo(() => rankingData?.ranking ?? [], [rankingData]);
  const topThreeRanking = useMemo(() => rankingEntries.slice(0, 3), [rankingEntries]);
  const totalVerifiedAchievements = useMemo(
    () => rankingEntries.reduce((sum, item) => sum + item.approvedCount, 0),
    [rankingEntries]
  );

  const portalTarget = currentUser
    ? currentRole === 'mahasiswa'
      ? '/app/beranda'
      : '/admin'
    : '/masuk';
  const teamDirectoryTarget =
    currentUser && currentRole === 'mahasiswa'
      ? '/app/tim?tab=cari'
      : currentUser
        ? '/admin/konten'
        : '/masuk?redirect=%2Fapp%2Ftim%3Ftab%3Dcari';

  // Auto-advance slide yang menghormati prefers-reduced-motion, pause manual, dan hover/focus
  useEffect(() => {
    if (sliderPaused || sliderHovered || prefersReducedMotion) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [sliderPaused, sliderHovered, prefersReducedMotion]);

  const currentSlide = heroSlides[activeSlide];
  const activePeriodLabel = rankingLoading
    ? 'Memuat...'
    : rankingError ? 'Tidak dapat memuat periode' : rankingData?.period?.name || 'Belum Ada Periode Aktif';

  return (
    <div className="w-full bg-white">
      {/* Hero uses the existing slide content, controls, and destinations. */}
      <section
        className="relative overflow-hidden border-b border-blue-100 bg-[#eaf7fc]"
        aria-labelledby="hero-title"
        onMouseEnter={() => setSliderHovered(true)}
        onMouseLeave={() => setSliderHovered(false)}
        onFocusCapture={() => setSliderHovered(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSliderHovered(false);
        }}
      >
        <div aria-hidden="true" className="usc-hero-pattern absolute inset-0 pointer-events-none" />
        <div className="relative mx-auto flex min-h-[34rem] max-w-7xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8 sm:py-20 lg:min-h-[38rem] lg:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-xs font-extrabold tracking-[0.11em] text-blue-800">
            <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
            {currentSlide.kicker}
          </span>
          <h1 id="hero-title" className="mt-6 max-w-6xl text-[2rem] font-extrabold uppercase leading-[1.08] tracking-[-0.055em] text-blue-950 sm:text-[3.8rem] lg:text-[4.65rem]">
            <span className="block">{currentSlide.title1}</span>
            <span className="block">{currentSlide.title2}</span>
            <span className="block text-blue-700">{currentSlide.titleHighlight}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
            {currentSlide.desc}
          </p>
          <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link to="/kompetisi" className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-blue-700 px-8 text-base font-bold text-white shadow-[0_10px_24px_-12px_rgba(0,99,156,0.65)] transition-colors hover:bg-blue-800">
              Jelajahi Lomba
            </Link>
            <Link to={portalTarget} className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-blue-800 bg-white/70 px-8 text-base font-bold text-blue-900 transition-colors hover:bg-white">
              {currentUser ? 'Buka Portal' : 'Masuk Portal'}
            </Link>
          </div>
          <div className="mt-10 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <div className="flex flex-wrap items-center justify-center gap-x-2" role="tablist" aria-label="Pilihan sorotan utama">
              {heroSlides.map((slide, idx) => (
              <button key={slide.kicker} type="button" role="tab" aria-selected={activeSlide === idx}
                tabIndex={activeSlide === idx ? 0 : -1}
                aria-label={`Sorotan ${idx + 1}: ${slide.kicker}`} onClick={() => setActiveSlide(idx)}
                onKeyDown={(e) => {
                  let next = idx;
                  if (e.key === 'ArrowRight') next = (idx + 1) % heroSlides.length;
                  else if (e.key === 'ArrowLeft') next = (idx - 1 + heroSlides.length) % heroSlides.length;
                  else if (e.key === 'Home') next = 0;
                  else if (e.key === 'End') next = heroSlides.length - 1;
                  else return;
                  e.preventDefault();
                  setActiveSlide(next);
                  e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
                }}
                className={`min-h-[44px] rounded-full px-4 text-sm font-bold transition-colors cursor-pointer ${
                  activeSlide === idx ? 'bg-blue-950 text-white' : 'text-blue-900 hover:bg-blue-100'
                }`}>
                {['Program', 'Tim', 'Prestasi'][idx]}
              </button>
              ))}
            </div>
            <button type="button" onClick={() => setSliderPaused((p) => !p)} aria-pressed={sliderPaused}
              aria-label={sliderPaused ? 'Lanjutkan pergantian slide otomatis' : 'Jeda pergantian slide otomatis'}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-sm font-semibold text-blue-900 hover:bg-blue-100 cursor-pointer">
              {sliderPaused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
              <span>{sliderPaused ? 'Putar' : 'Jeda'}</span>
            </button>
          </div>
          <a href="#alur-section" className="mt-3 inline-flex min-h-[44px] items-center text-sm font-bold text-blue-800 underline decoration-blue-300 underline-offset-4 hover:text-blue-950">Kenali alurnya</a>
        </div>
      </section>

      {/* Main Content Container below Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-20 py-16 sm:space-y-24 sm:py-20">
        {/* 2. Live Ecosystem Summary Strip (Real API Data — bukan label statis Belmawa) */}
        <section
          id="ringkasan-section"
          aria-labelledby="ringkasan-title"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm"
        >
          <h2 id="ringkasan-title" className="sr-only">
            Ringkasan Ekosistem USC Periode Aktif
          </h2>

          <div className="flex items-center gap-3.5 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-800 border border-blue-200/80 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Periode Aktif
              </div>
              <div
                className="text-sm font-black text-slate-900 leading-tight line-clamp-2"
                title={activePeriodLabel}
              >
                {activePeriodLabel}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                {compLoading || compError ? '—' : `${allCompetitions.length} Kompetisi`}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 truncate">
                {compLoading
                  ? 'Memuat katalog terbit...'
                  : compError ? 'Katalog belum dapat dimuat' : `${openCompetitionsCount} sedang buka pendaftaran`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0">
              <Medal className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                {rankingLoading || rankingError ? '—' : `${rankingEntries.length} Mahasiswa`}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 truncate">
                Tercatat di papan peringkat
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-black text-emerald-800 leading-tight">
                {rankingLoading || rankingError ? '—' : `${totalVerifiedAchievements} Prestasi Sah`}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 truncate">
                Disetujui validator periode ini
              </div>
            </div>
          </div>
        </section>

        {/* 4. Featured Competitions Section (K-23 Status Buka/Tutup, Format, Penyelenggara, Jadwal) */}
        <section className="space-y-6" aria-labelledby="kompetisi-preview">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 mb-1">
                <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
                Daftar Kompetisi Terbit
              </div>
              <h2 id="kompetisi-preview" className="text-3xl sm:text-4xl font-extrabold text-blue-950 tracking-tight">
                Pilihan Kompetisi
              </h2>
              <p className="text-sm sm:text-base leading-7 text-slate-600 mt-2">
                Terbuka untuk mahasiswa Universitas Darussalam Gontor di berbagai cabang dan tingkat lomba.
              </p>
            </div>
            <Link
              to="/kompetisi"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 shadow-2xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <span>
                {allCompetitions.length > 0
                  ? `Buka Semua Katalog (${allCompetitions.length} Lomba)`
                  : 'Buka Semua Katalog'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {compLoading ? (
            <PageLoading message="Memuat pratinjau kompetisi..." />
          ) : compError ? (
            <div role="alert" className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
              <p className="text-xs font-semibold text-rose-800">{compError}</p>
              <Button size="sm" variant="outline" onClick={loadCompetitions} leftIcon={<RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}>
                Coba Muat Ulang
              </Button>
            </div>
          ) : featuredCompetitions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
              <p className="text-sm font-bold text-slate-800">Belum ada kompetisi terbit saat ini.</p>
              <p className="text-xs text-slate-500">
                Daftar kompetisi akan muncul otomatis setelah validator menerbitkan program lomba untuk periode berjalan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featuredCompetitions.map((comp) => {
                const isOpen = comp.registrationStatus !== 'tutup';
                const isIndividu = comp.format === 'individu' || comp.komposisi.max <= 1;
                const nearestSchedule = comp.jadwal?.[0];

                return (
                  <Card
                    key={comp.slug}
                    className="hover:border-blue-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full bg-white group"
                  >
                    <CardContent className="space-y-3.5 p-5 flex-1 flex flex-col">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge color="blue" dot>{comp.kategori}</Badge>
                          <Badge color={isOpen ? 'emerald' : 'slate'} size="sm">
                            {isOpen ? 'Pendaftaran Dibuka' : 'Pendaftaran Ditutup'}
                          </Badge>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          {comp.tingkat}
                        </span>
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <h3
                          className="font-extrabold text-xl leading-snug tracking-tight text-blue-950 line-clamp-2 group-hover:text-blue-700 transition-colors"
                          title={comp.namaResmi}
                        >
                          {comp.namaResmi}
                        </h3>
                        {comp.penyelenggara && (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                            <span className="truncate">{comp.penyelenggara}</span>
                          </div>
                        )}
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed pt-0.5" title={comp.deskripsi}>
                          {comp.deskripsi}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {isIndividu ? (
                            <User className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
                          ) : (
                            <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
                          )}
                          <span>
                            {isIndividu
                              ? 'Individu (1 Orang)'
                              : comp.komposisi.min === comp.komposisi.max
                                ? `Beregu · ${comp.komposisi.min} Anggota`
                                : `Beregu · ${comp.komposisi.min}–${comp.komposisi.max} Anggota`}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80 shrink-0">
                          {isIndividu ? 'Perorangan' : 'Tim'}
                        </span>
                      </div>
                    </CardContent>

                    <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <span
                        className="text-[11px] text-slate-500 font-medium truncate"
                        title={nearestSchedule ? `${nearestSchedule.label}: ${nearestSchedule.tanggal}` : undefined}
                      >
                        {nearestSchedule ? `${nearestSchedule.tanggal}` : 'Jadwal tersedia di detail'}
                      </span>
                      <Link
                        to={`/kompetisi/${comp.slug}`}
                        aria-label={`Pelajari syarat dan jadwal ${comp.namaResmi}`}
                        className="font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 shrink-0 min-h-[36px] group-hover:translate-x-0.5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md px-1"
                      >
                        <span>Syarat &amp; Jadwal</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. 5 Steps Journey Section */}
        <section id="alur-section" className="space-y-6 pt-2" aria-labelledby="alur-title">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <Badge color="blue">Alur Pembinaan UNIDA Gontor</Badge>
            <h2 id="alur-title" className="text-3xl sm:text-4xl font-extrabold text-blue-950 tracking-tight">
              Roadmap Prestasi Mahasiswa
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600">
              Dari pemilihan target kompetisi dan persiapan terstruktur hingga validasi prestasi serta papan peringkat.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {[
              {
                step: '01',
                title: 'Tentukan Target',
                desc: 'Jelajahi katalog kompetisi terbit, periksa syarat & aturan poin, lalu pilih satu target aktif periode ini.',
                icon: Target,
                color: 'text-blue-700 bg-blue-50 border-blue-200/80',
              },
              {
                step: '02',
                title: 'Bentuk / Gabung Tim',
                desc: 'Lomba beregu: buat tim baru, ajukan gabung di direktori terbuka, atau masuk lewat kode ketua. Lomba individu langsung ke persiapan.',
                icon: Users,
                color: 'text-blue-800 bg-blue-50 border-blue-200/80',
              },
              {
                step: '03',
                title: 'Roadmap & Konsultasi',
                desc: 'Ikuti fase persiapan mandiri, pantau lini masa tenggat, dan hubungi kontak WA konsultan yang disetujui validator.',
                icon: Layers,
                color: 'text-sky-700 bg-sky-50 border-sky-200/80',
              },
              {
                step: '04',
                title: 'Seleksi Internal Kampus',
                desc: 'Daftarkan kesiapan tim atau peserta individu saat seluruh syarat lomba terpenuhi untuk proses penjaringan delegasi.',
                icon: ShieldCheck,
                color: 'text-amber-700 bg-amber-50 border-amber-200/80',
              },
              {
                step: '05',
                title: 'Prestasi & Peringkat',
                desc: 'Ajukan capaian individu maupun kelompok dengan bukti privat untuk diverifikasi validator dan tercatat di papan peringkat.',
                icon: Award,
                color: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.step}
                  className="hover:-translate-y-1 hover:shadow-md transition-all duration-200 border-slate-200 bg-white flex flex-col"
                >
                  <CardContent className="space-y-2.5 p-4 sm:p-4.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-slate-300 font-mono" aria-hidden="true">
                        {item.step}
                      </span>
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${item.color}`}>
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* 5. Sorotan Papan Peringkat Mahasiswa (Top 3 Live — PRD §4, K-11, K-20) */}
        <section className="space-y-6" aria-labelledby="ranking-preview-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <Crown className="w-3.5 h-3.5" aria-hidden="true" />
                  Papan Peringkat Prestasi
                </span>
                {rankingData?.period?.name && (
                  <Badge color="amber" size="sm">
                    {rankingData.period.name}
                  </Badge>
                )}
              </div>
              <h2 id="ranking-preview-title" className="text-3xl sm:text-4xl font-extrabold text-blue-950 tracking-tight">
                Sorotan Mahasiswa Berprestasi
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Peringkat teratas berdasarkan akumulasi poin prestasi lomba yang telah disetujui validator pada periode aktif.
              </p>
            </div>
            <Link
              to="/ranking"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 shadow-2xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <span>Lihat Peringkat Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {rankingLoading ? (
            <PageLoading message="Memuat sorotan papan peringkat..." />
          ) : rankingError ? (
            <div role="alert" className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
              <p className="text-xs font-semibold text-rose-800">{rankingError}</p>
              <Button size="sm" variant="outline" onClick={loadRanking} leftIcon={<RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}>
                Coba Muat Ulang
              </Button>
            </div>
          ) : topThreeRanking.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
                <Trophy className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Belum Ada Prestasi Lomba Terverifikasi di Periode Ini
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Papan peringkat akan terisi otomatis segera setelah validator menyetujui pengajuan prestasi lomba mahasiswa.
                </p>
              </div>
              <div className="pt-1">
                <Link
                  to="/ranking"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 min-h-[40px] rounded-xl border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors"
                >
                  <span>Buka Halaman Ranking &amp; Riwayat Sepanjang Waktu</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {topThreeRanking.map((item) => {
                  const theme = getPodiumTheme(item.rank);
                  // Kepatuhan K-20: foto profil privat hanya ditampilkan jika sesi civitas sudah login
                  const safeAvatarSrc = currentUser ? item.avatarUrl : undefined;

                  return (
                    <div
                      key={item.userId}
                      className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-md ${theme.card}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${theme.badge}`}>
                          {item.rank === 1 ? (
                            <Crown className={`w-3.5 h-3.5 ${theme.iconColor}`} aria-hidden="true" />
                          ) : (
                            <Medal className={`w-3.5 h-3.5 ${theme.iconColor}`} aria-hidden="true" />
                          )}
                          {theme.label}
                        </span>
                        <div className="text-right">
                          <div className="text-2xl font-black text-slate-900 leading-none">
                            {item.points}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">
                            Total Poin
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <UserAvatar
                          name={item.fullName}
                          src={safeAvatarSrc}
                          size="lg"
                          tone={theme.avatarTone}
                          className={theme.avatarRing}
                        />
                        <div className="min-w-0">
                          <h3 className="text-base font-extrabold text-slate-900 truncate" title={item.fullName}>
                            {item.fullName}
                          </h3>
                          <p className="text-xs font-medium text-slate-600 truncate">
                            {item.studyProgram || 'Program Studi UNIDA Gontor'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/70 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-white/90 border border-slate-200/80 px-3 py-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Prestasi Sah
                          </div>
                          <div className="font-black text-slate-900 mt-0.5">
                            {item.approvedCount} Capaian
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/90 border border-slate-200/80 px-3 py-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Juara 1
                          </div>
                          <div className="font-black text-amber-800 mt-0.5">
                            {item.juara1Count} Kali
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-xl bg-slate-100/80 border border-slate-200/80 text-[11px] text-slate-600">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                  <span>
                    Hanya menghitung prestasi kategori lomba yang disetujui validator. NIM, email, nomor pribadi, dan berkas bukti tetap privat.
                  </span>
                </div>
                <Link
                  to="/ranking"
                  className="font-bold text-blue-700 hover:text-blue-900 whitespace-nowrap"
                >
                  Lihat rincian aturan &amp; peringkat →
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* 6. Team Recruitment Spotlight Feature */}
        <section
          aria-labelledby="kolaborasi-title"
          className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-10 overflow-hidden relative shadow-xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 font-bold text-xs border border-blue-400/30">
                <Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                Alur Kolaborasi Mahasiswa
              </span>
              <h2 id="kolaborasi-title" className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
                Rekrutmen Tim Terbuka atau Gabung Langsung Pakai Kode Tim
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                Belum punya tim? Lihat lowongan tim terbuka pada kompetisi target yang sama lalu kirim pengajuan ke ketua tim. Sudah punya kelompok? Cukup buat tim privat dan bagikan kode undangan ke rekanmu.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-3 py-1 rounded-lg bg-blue-800/80 border border-blue-700/60 text-xs font-bold text-blue-100">
                  Persetujuan Ketua Tim
                </span>
                <span className="px-3 py-1 rounded-lg bg-blue-800/80 border border-blue-700/60 text-xs font-bold text-blue-100">
                  Kode Undangan Tim Privat
                </span>
                <span className="px-3 py-1 rounded-lg bg-blue-800/80 border border-blue-700/60 text-xs font-bold text-blue-100">
                  Roadmap Terbuka Lebih Awal
                </span>
              </div>
              <div className="pt-4">
                <Link
                  to={teamDirectoryTarget}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl border border-white/80 bg-white text-blue-900 hover:bg-blue-50 text-sm font-bold shadow-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-950"
                >
                  <span>
                    {currentUser && currentRole !== 'mahasiswa' ? 'Kelola Lomba & Tim' : 'Jelajahi Direktori Tim'}
                  </span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              {/* Visual 3-Path Recruitment Summary Card */}
              <div className="rounded-2xl border border-blue-400/30 bg-blue-950/70 p-5 space-y-3 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-blue-800/60 pb-3">
                  <span className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-300" aria-hidden="true" />
                    3 Jalur Lomba Beregu
                  </span>
                  <span className="text-[11px] font-black text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    Aturan per lomba
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-white block">1. Buat Tim &amp; Buka Lowongan</span>
                      <span className="text-[11px] text-blue-200">Tentukan peran dibutuhkan, terima/tolak pelamar</span>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-800 text-blue-100 px-2 py-0.5 rounded shrink-0">
                      Ketua Tim
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-white block">2. Cari Tim Terbuka</span>
                      <span className="text-[11px] text-blue-200">Filter kompetisi &amp; peran lalu ajukan bergabung</span>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded shrink-0">
                      Ajukan Gabung
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-white block">3. Sudah Punya Tim</span>
                      <span className="text-[11px] text-blue-200">Masuk langsung memakai kode undangan rahasia</span>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-800/90 text-amber-100 px-2 py-0.5 rounded shrink-0">
                      Kode Tim
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-blue-200/90 text-center pt-1">
                  Lomba individu otomatis melewati tahap tim dan langsung menuju ruang persiapan.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Call to Action Banner — bebas nested <Link><Button> */}
        <section
          aria-labelledby="cta-title"
          className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 rounded-3xl p-8 sm:p-10 text-white text-center space-y-4 shadow-xl"
        >
          <div className="flex justify-center">
            <UscBrand variant="emblem" tone="light" size="md" />
          </div>
          <h2 id="cta-title" className="text-2xl sm:text-3xl font-black tracking-tight">
            Mulai Perjalanan Prestasimu di UNIDA Gontor
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl mx-auto leading-relaxed">
            Pilih target kompetisi, bangun tim yang solid, ikuti roadmap persiapan, dan catat setiap capaianmu secara terstruktur bersama UNIDA Student Championship (USC).
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-3">
            {currentUser ? (
              <>
                <Link
                  to={portalTarget}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[46px] rounded-xl border border-white/85 bg-white text-blue-900 hover:bg-blue-50 text-sm sm:text-base font-bold shadow-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-900"
                >
                  <span>Buka Portal USC</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/ranking"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[46px] rounded-xl border border-white/85 bg-white/10 text-white hover:bg-white hover:text-blue-950 text-sm sm:text-base font-bold shadow-xs backdrop-blur-xs transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-900"
                >
                  <Medal className="w-4 h-4" aria-hidden="true" />
                  <span>Lihat Papan Peringkat</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/daftar"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[46px] rounded-xl border border-white/85 bg-white text-blue-900 hover:bg-blue-50 text-sm sm:text-base font-bold shadow-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-900"
                >
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  <span>Daftar Akun Mahasiswa</span>
                </Link>
                <Link
                  to="/masuk"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[46px] rounded-xl border border-white/85 bg-white/10 text-white hover:bg-white hover:text-blue-950 text-sm sm:text-base font-bold shadow-xs backdrop-blur-xs transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-900"
                >
                  <span>Masuk</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
