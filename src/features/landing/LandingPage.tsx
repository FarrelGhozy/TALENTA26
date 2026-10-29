import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Users,
  ArrowRight,
  Layers,
  Award,
  Zap,
  Target,
  ShieldCheck,
  Play,
  ArrowDown,
  Sparkles,
} from 'lucide-react';
import { Competition } from '../../types';
import { competitionService } from '../../services/factory';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoading } from '../../components/ui/Skeleton';

const heroSlides = [
  {
    kicker: 'PORTAL PRESTASI MAHASISWA',
    title1: 'Menembus',
    title2: 'Batas Potensi,',
    titleHighlight: 'Menginspirasi Dunia',
    desc: 'Platform akselerasi mahasiswa Universitas Darussalam Gontor untuk merintis ide, menemukan partner lintas prodi, dan meraih kejayaan di panggung kompetisi Belmawa nasional.',
    tags: ['PKM BELMAWA', 'GEMASTIK & KRI', 'RISET & INOVASI', 'PRESTASI GLOBAL'],
  },
  {
    kicker: 'KOLABORASI LINTAS DISIPLIN',
    title1: 'Satukan Visi,',
    title2: 'Bentuk Tim Tangguh,',
    titleHighlight: 'Raih Juara Bersama',
    desc: 'Algoritma matching cerdas mempertemukan mahasiswa dengan keahlian komplementer: koding, penulisan proposal, analisis data, hingga desain presentasi visual.',
    tags: ['MATCHMAKING TIM', 'LINTAS FAKULTAS', 'MENTORING DOSEN', 'SIMULASI PITCH'],
  },
  {
    kicker: 'REKOGNISI RESMI & SKPI',
    title1: 'Dari Kampus,',
    title2: 'Untuk Peradaban,',
    titleHighlight: 'Menorehkan Sejarah',
    desc: 'Setiap proses persiapan dan raihan juara diverifikasi resmi oleh BAAK UNIDA Gontor untuk pengakuan angka kredit SKPI dan apresiasi beasiswa institusi.',
    tags: ['VERIFIKASI BAAK', 'REKOGNISI SKPI', 'DANA HIBAH RISET', 'AWARD REKTORAT'],
  },
];

export const LandingPage: React.FC = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    let cancelled = false;
    competitionService
      .getAll()
      .then((list) => {
        if (cancelled) return;
        setCompetitions([...list].sort((a, b) => a.namaResmi.localeCompare(b.namaResmi)).slice(0, 3));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Subtle auto-advance for the aesthetic hero slider
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const currentSlide = heroSlides[activeSlide];

  return (
    <div className="w-full">
      {/* Full-Screen 100dvh Cinematic Hero Section */}
      <section
        className="w-full relative h-[100dvh] min-h-[560px] sm:min-h-[640px] pt-16 sm:pt-24 lg:pt-28 pb-3 sm:pb-7 px-4 sm:px-8 lg:px-12 bg-[#060a14] text-white overflow-hidden flex flex-col justify-between border-b border-slate-800/80 group"
        aria-labelledby="hero-title"
      >
        {/* Background Image: Extends 100% across the full viewport height */}
        <img
          src="/images/hero-unida.jpg"
          alt="Mahasiswa Berjas UNIDA Gontor Menatap Gedung Utama Berkubah Emas di Kala Sunrise"
          className="absolute inset-0 w-full h-full object-cover object-[80%_center] sm:object-center select-none pointer-events-none transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
        />

        {/* Ambient Dark Gradient Overlays for High Contrast Typography & Seamless Top-Bar Flow */}
        {/* Mobile: Shadow HANYA di bagian bawah tempat teks dan tombol. Bagian atas (kubah emas, langit fajar, wajah mahasiswa) 100% jernih dan terang tanpa shadow */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060a14] from-10% via-[#060a14]/90 via-35% to-transparent to-55% sm:hidden pointer-events-none" />
        {/* Desktop Horizontal Gradient: Preserves PC layout 100% */}
        <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-[#060a14] via-[#060a14]/65 md:via-[#060a14]/35 to-transparent pointer-events-none" />
        {/* Vertical atmospheric fade from bottom and top for PC */}
        <div className="hidden sm:block absolute inset-0 bg-gradient-to-t from-[#060a14] via-[#060a14]/30 to-[#060a14]/70 pointer-events-none" />

        {/* Ethereal Glow Orbs (Desktop only so mobile image remains crisp and pure) */}
        <div className="hidden sm:block absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="hidden sm:block absolute bottom-1/3 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Middle & Bottom Container */}
        <div className="max-w-7xl mx-auto w-full relative z-10 flex-1 flex flex-col justify-between h-full">
          {/* Hero Content: Anchored at bottom on mobile (mt-auto) so scenery above is open; Centered vertically on PC (sm:my-auto) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-center py-1 sm:py-4 mt-auto mb-2 sm:my-auto">
            {/* Left Column: Kicker, Big Headline, Paragraph & Aesthetic Action Buttons */}
            <div className="lg:col-span-8 space-y-2.5 sm:space-y-6 text-left">
              {/* Kicker tag with accent divider */}
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] sm:tracking-[0.25em] text-sky-300 uppercase font-mono">
                  {currentSlide.kicker}
                </span>
                <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-sky-400 to-transparent" />
              </div>

              {/* Main Editorial Headline: 2 clean lines on mobile, 3 editorial lines on PC */}
              <h1
                id="hero-title"
                className="text-[1.35rem] sm:text-4xl md:text-5xl lg:text-6xl font-extrabold sm:font-black text-white tracking-tight leading-[1.2] sm:leading-[1.08] font-editorial drop-shadow-md"
              >
                <span>{currentSlide.title1} </span>
                <span className="hidden sm:inline"><br /></span>
                <span>{currentSlide.title2} </span>
                <span className="hidden sm:inline"><br /></span>
                <span className="bg-gradient-to-r from-sky-300 via-blue-200 to-amber-200 bg-clip-text text-transparent italic font-editorial drop-shadow-lg block sm:inline mt-0.5 sm:mt-0">
                  {currentSlide.titleHighlight}
                </span>
              </h1>

              {/* Description Text */}
              <p className="text-[12px] sm:text-sm lg:text-base text-slate-200/90 leading-relaxed max-w-xl font-normal drop-shadow-xs line-clamp-2 sm:line-clamp-none">
                {currentSlide.desc}
              </p>

              {/* Action Buttons: Responsive Side-by-Side on Mobile (Not bulky/menumpul), Classic Pill on Desktop */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center sm:gap-4 pt-0.5 sm:pt-2">
                {/* Primary Button */}
                <Link
                  to="/kompetisi"
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 sm:px-7 sm:py-3.5 rounded-xl sm:rounded-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-blue-950/70 hover:shadow-blue-900/90 border border-blue-400/30 hover:scale-[1.02] active:scale-[0.98] transition-all group/btn"
                >
                  <span className="truncate">Jelajahi Lomba</span>
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-950/80 border border-blue-400/40 flex items-center justify-center text-white group-hover/btn:translate-x-0.5 transition-transform shrink-0">
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-200" />
                  </span>
                </Link>

                {/* Secondary Button */}
                <Link
                  to="/masuk"
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm backdrop-blur-md border border-white/25 hover:border-white/40 active:scale-[0.98] transition-all group/demo"
                >
                  <span className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-white/40 flex items-center justify-center bg-white/10 group-hover/demo:bg-white/25 transition-colors shrink-0">
                    <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white fill-white ml-0.5" />
                  </span>
                  <span className="truncate">Coba Demo</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Stacked Category Labels (Matching Image 1's Top-Right Layout) */}
            <div className="lg:col-span-4 hidden lg:flex flex-col justify-between items-end self-stretch py-2">
              <div className="border-l border-white/25 pl-4 space-y-2 text-left self-end">
                {currentSlide.tags.map((tag, idx) => (
                  <div
                    key={idx}
                    className="text-[10px] font-bold tracking-[0.22em] text-white/70 uppercase hover:text-white transition-colors cursor-default"
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar: Slider Pagination (01 02 03), Scroll to Explore & Down Arrow */}
          <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/15">
            {/* Left: 01 02 03 & Scroll to Explore */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 sm:gap-4">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`text-xs font-mono font-bold transition-all relative py-1 px-1.5 cursor-pointer outline-none focus:outline-none focus-visible:outline-none select-none ${
                      activeSlide === idx
                        ? 'text-white font-black'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    aria-label={`Slide ${idx + 1}`}
                  >
                    0{idx + 1}
                    {activeSlide === idx && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              <a
                href="#alur-section"
                className="hidden sm:flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] text-white/60 hover:text-white uppercase border-l border-white/25 pl-4 transition-colors"
              >
                <span>Scroll to explore</span>
              </a>
            </div>

            {/* Right: Down Arrow in Circle Button */}
            <div className="flex items-center gap-3">
              <a
                href="#alur-section"
                aria-label="Gulir ke alur pembinaan"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/30 hover:border-white/70 bg-white/5 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all hover:translate-y-0.5 shadow-md"
              >
                <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container below Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-16 py-16">
        {/* Trust & Key Metrics Strip below Hero */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-800 border border-blue-200/80 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 leading-tight">12+</div>
            <div className="text-[11px] font-bold text-slate-500">Kompetisi Belmawa</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 leading-tight">100%</div>
            <div className="text-[11px] font-bold text-slate-500">Skill Matching Cerdas</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-800 leading-tight">Resmi</div>
            <div className="text-[11px] font-bold text-slate-500">Verifikasi BAAK UNIDA</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-amber-800 leading-tight">SKPI Ready</div>
            <div className="text-[11px] font-bold text-slate-500">Rekognisi Capaian Juara</div>
          </div>
        </div>
      </section>

      {/* 4 Steps Journey Section */}
      <section id="alur-section" className="space-y-6 pt-4" aria-labelledby="alur-title">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge color="blue">Alur Pembinaan UNIDA Gontor</Badge>
          <h2 id="alur-title" className="text-2xl font-black text-slate-900 tracking-tight">
            4 Langkah Mudah Meraih Prestasi Kampus
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Dari pemetaan awal hingga penghargaan terverifikasi, TALENTA mendampingi setiap fase perjalananmu.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Tentukan Target',
              desc: 'Eksplorasi katalog kompetisi Belmawa dan tentukan target lomba yang selaras dengan minatmu.',
              icon: Target,
              color: 'text-blue-700 bg-blue-50 border-blue-200/80',
            },
            {
              step: '02',
              title: 'Cari Partner Tim',
              desc: 'Algoritma matching mencarikan rekan yang melengkapi keahlian teknis dan peran dalam tim.',
              icon: Users,
              color: 'text-blue-800 bg-blue-50 border-blue-200/80',
            },
            {
              step: '03',
              title: 'Roadmap & Bimbingan',
              desc: 'Ikuti fase persiapan mandiri, pantau jadwal tenggat, dan konsultasikan kendala ke dosen pembimbing.',
              icon: Layers,
              color: 'text-sky-700 bg-sky-50 border-sky-200/80',
            },
            {
              step: '04',
              title: 'Verifikasi Prestasi',
              desc: 'Unggah berkas sertifikat dan SK juara untuk divalidasi resmi oleh verifikator institusi.',
              icon: Award,
              color: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.step}
                className="hover:-translate-y-1 hover:shadow-md transition-all duration-200 border-slate-200 bg-white"
              >
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-slate-300 font-mono">
                      {item.step}
                    </span>
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Team Matching Spotlight Feature */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-10 overflow-hidden relative shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 font-bold text-xs border border-blue-400/30">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Fitur Unggulan Mahasiswa
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              Temukan Partner Sesuai Kebutuhan Tim Tanpa Canggung
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Sering kesulitan mencari rekan yang bisa koding, riset data, desain, atau menulis proposal? Algoritma kami memperhitungkan kombinasi minat, variasi keahlian teknis, dan jadwal waktu untuk merekomendasikan partner yang saling melengkapi.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-3 py-1 rounded-lg bg-blue-800/80 border border-blue-700/60 text-xs font-bold text-blue-100">
                Transparansi Nilai Kecocokan
              </span>
              <span className="px-3 py-1 rounded-lg bg-blue-800/80 border border-blue-700/60 text-xs font-bold text-blue-100">
                Lintas Prodi & Fakultas
              </span>
              <span className="px-3 py-1 rounded-lg bg-blue-800/80 border border-blue-700/60 text-xs font-bold text-blue-100">
                Sistem Undangan Terstruktur
              </span>
            </div>
            <div className="pt-4">
              <Link to="/app/partner">
                <Button size="md" variant="white">
                  Coba Pencocokan Partner →
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            {/* Visual Skill Match Puzzle Card */}
            <div className="rounded-2xl border border-blue-400/30 bg-blue-950/70 p-5 space-y-3 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-blue-800/60 pb-3">
                <span className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-300" />
                  Kombinasi Tim Ideal
                </span>
                <span className="text-[11px] font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  95% Match Score
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Riset & Teori</span>
                    <span className="text-[10px] text-blue-200">Andi Pratama (Informatika)</span>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-800 text-blue-200 px-2 py-0.5 rounded">
                    Data & AI
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-blue-900/60 border border-blue-700/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Desain UI/UX & Presentasi</span>
                    <span className="text-[10px] text-blue-200">Rina Kartika (DKV)</span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded">
                    Figma & Pitch
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-blue-300/80 text-center pt-1 italic">
                *Algoritma menghitung komplementaritas keahlian untuk memaksimalkan potensi juara.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Competitions Section */}
      <section className="space-y-6" aria-labelledby="kompetisi-preview">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 mb-1">
              <Trophy className="w-3.5 h-3.5" />
              Agenda Utama Belmawa 2026
            </div>
            <h2 id="kompetisi-preview" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pilihan Lomba Paling Populer
            </h2>
            <p className="text-xs text-slate-500">
              Terbuka untuk mahasiswa Universitas Darussalam Gontor di berbagai cabang lomba.
            </p>
          </div>
          <Link to="/kompetisi">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Buka Semua Katalog
            </Button>
          </Link>
        </div>

        {loading ? (
          <PageLoading message="Memuat preview kompetisi..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {competitions.map((comp) => (
              <Card
                key={comp.slug}
                className="hover:border-blue-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full bg-white group"
              >
                <CardContent className="space-y-3.5 p-5">
                  <div className="flex justify-between items-start gap-2">
                    <Badge color="blue" dot>{comp.kategori}</Badge>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {comp.tingkat}
                    </span>
                  </div>

                  <div>
                    <h3
                      className="font-bold text-sm text-slate-900 line-clamp-2 group-hover:text-blue-700 transition-colors"
                      title={comp.namaResmi}
                    >
                      {comp.namaResmi}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed" title={comp.deskripsi}>
                      {comp.deskripsi}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {comp.komposisi.min === comp.komposisi.max
                          ? `${comp.komposisi.min} Orang`
                          : `${comp.komposisi.min}–${comp.komposisi.max} Anggota`}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Resmi Belmawa
                    </span>
                  </div>
                </CardContent>

                <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Tahun 2026</span>
                  <Link
                    to={`/kompetisi/${comp.slug}`}
                    aria-label={`Detail ${comp.namaResmi}`}
                    className="font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    Pelajari Syarat & Jadwal →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Call to Action Banner - Buttons clearly visible with proper variants! */}
      <section className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 rounded-3xl p-8 sm:p-10 text-white text-center space-y-4 shadow-xl">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          Mulai Perjalanan Prestasimu di UNIDA Gontor
        </h2>
        <p className="text-xs sm:text-sm text-blue-100 max-w-xl mx-auto leading-relaxed">
          Buktikan kemampuan dan bawa nama harum kampus di ajang kompetisi nasional. Gabung ke TALENTA, bentuk tim juara, dan raih prestasi gemilang.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-3">
          <Link to="/masuk">
            <Button size="lg" variant="white">
              Masuk dengan Akun Demo
            </Button>
          </Link>
          <Link to="/kompetisi">
            <Button size="lg" variant="outline-white">
              Lihat Semua Lomba
            </Button>
          </Link>
        </div>
      </section>
      </div>
    </div>
  );
};