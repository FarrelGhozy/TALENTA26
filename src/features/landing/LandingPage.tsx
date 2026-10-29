import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Users,
  ArrowRight,
  CheckCircle2,
  Layers,
  Award,
  Zap,
  Target,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { Competition } from '../../types';
import { competitionService } from '../../services/factory';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoading } from '../../components/ui/Skeleton';

export const LandingPage: React.FC = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-4 pb-8" aria-labelledby="hero-title">
        {/* Subtle background glow with UNIDA blue */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-blue-400/20 via-sky-300/15 to-emerald-200/15 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Headline & CTA */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 shadow-2xs">
              <GraduationCap className="w-4 h-4 text-blue-700" />
              <span className="text-xs font-bold text-blue-900 tracking-wide">
                Portal Pembinaan Prestasi Mahasiswa UNIDA Gontor
              </span>
            </div>

            <h1
              id="hero-title"
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]"
            >
              Kenali Potensi, Temukan Partner,{' '}
              <span className="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-950 bg-clip-text text-transparent">
                Raih Prestasi Gemilang.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Platform pembinaan terpadu Universitas Darussalam Gontor untuk membimbing mahasiswa menuju ajang Belmawa nasional: eksplorasi kompetisi resmi, pembentukan tim lintas program studi, roadmap persiapan mandiri, dan pencatatan capaian terverifikasi.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link to="/kompetisi">
                <Button size="lg" variant="primary" className="w-full sm:w-auto" rightIcon={<Trophy className="w-4 h-4" />}>
                  Jelajahi Katalog Lomba
                </Button>
              </Link>
              <Link to="/masuk">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-slate-800 border-slate-300" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Coba Demo Instan
                </Button>
              </Link>
            </div>

            {/* Quick Metrics / Trust Indicators */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200">
              <div>
                <div className="text-2xl font-black text-blue-900">12+</div>
                <div className="text-[11px] font-bold text-slate-500 mt-0.5">Kompetisi Belmawa</div>
              </div>
              <div>
                <div className="text-2xl font-black text-blue-700">100%</div>
                <div className="text-[11px] font-bold text-slate-500 mt-0.5">Match Skill Komplementer</div>
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-700">Resmi</div>
                <div className="text-[11px] font-bold text-slate-500 mt-0.5">Verifikasi Kampus UNIDA</div>
              </div>
            </div>
          </div>

          {/* Right Column: UNIDA Campus Showcase Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="rounded-3xl border border-slate-200/90 shadow-xl bg-gradient-to-b from-white to-slate-50/80 p-6 space-y-5">
                {/* Header of showcase card */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="/images/logo-icon.png"
                      alt="Logo TALENTA UNIDA Gontor"
                      className="w-12 h-12 rounded-2xl shadow-sm object-cover border border-blue-900/10"
                    />
                    <div>
                      <h4 className="text-sm font-black text-blue-950">TALENTA UNIDA</h4>
                      <p className="text-[11px] text-slate-500">Universitas Darussalam Gontor</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Aktif 2026
                  </span>
                </div>

                {/* Simulated Student Progress Widget */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Target Utama Belmawa:</span>
                      <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        PKM-RE Riset Eksakta
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs">
                      <div className="w-6 h-6 rounded-full bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center">
                        AP
                      </div>
                      <span className="font-bold text-slate-800 text-[11px]">Andi Pratama</span>
                      <span className="text-slate-400 text-[10px]">• Informatika 2023</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Status Pembentukan Tim:</span>
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        ✓ Lengkap (3/3 Anggota)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-700 rounded-full w-full" />
                    </div>
                  </div>
                </div>

                {/* Bottom trust tag */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                    Terverifikasi BAAK & Kemahasiswaan
                  </span>
                  <span className="font-bold text-slate-400">Belmawa Ready</span>
                </div>
              </div>

              {/* Floating Pill Badge 1 */}
              <div className="absolute -bottom-4 -left-3 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3 shadow-lg flex items-center gap-3 max-w-[210px]">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-900 leading-tight">Siap Belmawa 2026</div>
                  <div className="text-[10px] text-slate-500 leading-tight">PKM, GEMASTIK, KRI</div>
                </div>
              </div>

              {/* Floating Pill Badge 2 */}
              <div className="absolute -top-3 -right-3 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3 shadow-lg flex items-center gap-2.5 max-w-[200px]">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-900 leading-tight">Verifikasi Berkas</div>
                  <div className="text-[10px] text-emerald-700 font-bold">Resmi Kampus UNIDA</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Steps Journey Section */}
      <section className="space-y-6" aria-labelledby="alur-title">
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
  );
};