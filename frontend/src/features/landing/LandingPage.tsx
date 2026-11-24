import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Flag,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Target,
  Trophy,
  UserRound,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import { achievementService, competitionService } from '@talenta/services';
import { Competition, RankingResponse } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { TalentaMark } from '../../components/common/TalentaMark';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../lib/format';

const journey = [
  {
    icon: Target,
    title: 'Pilih lomba',
    description: 'Kenali syarat, format, dan jadwal kompetisi yang sesuai dengan minatmu.',
  },
  {
    icon: Users,
    title: 'Siapkan diri atau tim',
    description:
      'Lomba individu langsung ke persiapan. Untuk beregu, bentuk atau gabung tim sesuai aturan lomba.',
  },
  {
    icon: BookOpen,
    title: 'Ikuti persiapan',
    description:
      'Jalani roadmap, pantau tugas, dan hubungi kontak konsultasi yang tersedia. Ikuti seleksi internal sesuai ketentuan lomba.',
  },
  {
    icon: Award,
    title: 'Catat capaian',
    description:
      'Ajukan prestasi dengan bukti, pantau hasil pemeriksaan, dan perbaiki pengajuan jika diminta validator.',
  },
];

const teamPaths = [
  {
    icon: UserRoundPlus,
    title: 'Buat tim baru',
    description: 'Tentukan kebutuhan anggota dan kelola pengajuan bergabung sebagai ketua tim.',
  },
  {
    icon: Users,
    title: 'Cari tim terbuka',
    description:
      'Temukan tim pada lomba targetmu, lalu ajukan diri. Ketua tim akan meninjau pengajuanmu.',
  },
  {
    icon: KeyRound,
    title: 'Sudah punya tim',
    description: 'Gabung langsung menggunakan kode undangan yang dibagikan ketua tim.',
  },
];

const questions = [
  {
    question: 'Apakah saya harus punya tim untuk ikut lomba?',
    answer:
      'Tidak. Lomba individu langsung menuju ruang persiapan. Untuk lomba beregu, kamu bisa membuat tim, mengajukan bergabung ke tim terbuka, atau memakai kode undangan ketua.',
  },
  {
    question: 'Apa saja yang bisa dilihat tanpa akun?',
    answer:
      'Kamu bisa melihat katalog, syarat dan jadwal lomba, serta ranking prestasi. Daftar dan masuk untuk memilih target, mengelola tim, mengikuti persiapan, dan mengajukan prestasi.',
  },
  {
    question: 'Bagaimana prestasi masuk ke ranking?',
    answer:
      'Poin ranking berasal dari prestasi kategori lomba yang sudah disetujui validator. Nilainya mengikuti aturan poin yang berlaku untuk pengajuan tersebut dan dihitung pada periode akademiknya.',
  },
  {
    question: 'Apakah berkas bukti prestasi tampil untuk umum?',
    answer:
      'Tidak. Bukti pengajuan bersifat privat. Landing dan ranking hanya menampilkan ringkasan capaian yang diizinkan, tanpa NIM, email, nomor pribadi, atau berkas bukti.',
  },
];

const actionClass =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors';
const textLinkClass =
  'inline-flex min-h-11 items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900';

function PreviewLoading({ label }: { label: string }) {
  return (
    <div role="status" className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          aria-hidden="true"
          className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

function PreviewError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6"
    >
      <p className="flex items-center gap-3 text-sm text-amber-950">
        <CircleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
        {message}
      </p>
      <Button
        variant="outline"
        className="min-h-11"
        onClick={onRetry}
        leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
      >
        Coba lagi
      </Button>
    </div>
  );
}

function CompetitionPreview({ competition }: { competition: Competition }) {
  const isIndividual =
    competition.format === 'individu' || (!competition.format && competition.komposisi.max === 1);
  const FormatIcon = isIndividual ? UserRound : Users;
  const deadline = competition.internalSelectionDeadline;

  return (
    <article className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white transition-colors hover:border-blue-300">
      <div className="flex items-start justify-between gap-3 px-6 pt-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Trophy className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-600">
          {competition.tingkat}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-6 pt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
          {competition.kategori}
        </p>
        <h3 className="mt-2 break-words text-lg font-extrabold leading-snug tracking-tight text-slate-950 [overflow-wrap:anywhere]">
          {competition.namaResmi}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
          {competition.deskripsi}
        </p>
        <dl className="mt-auto space-y-3 pt-6 text-sm">
          <div className="flex items-start gap-2.5">
            <dt className="flex shrink-0 items-center gap-2 text-slate-500">
              <FormatIcon className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Format</span>
            </dt>
            <dd className="text-slate-700">
              {isIndividual
                ? 'Individu'
                : `Beregu · ${competition.komposisi.min === competition.komposisi.max ? competition.komposisi.min : `${competition.komposisi.min}–${competition.komposisi.max}`} anggota`}
            </dd>
          </div>
          <div className="flex items-start gap-2.5">
            <dt>
              <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span className="sr-only">Tenggat seleksi internal</span>
            </dt>
            <dd className="text-slate-700">
              {deadline ? (
                <>
                  Seleksi internal: <time dateTime={deadline}>{formatDate(deadline)}</time>
                </>
              ) : (
                'Lihat jadwal pada detail lomba'
              )}
            </dd>
          </div>
        </dl>
      </div>
      <div className="mx-6 mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-4">
        <span className="text-xs font-semibold text-slate-500">
          {competition.registrationStatus === 'tutup'
            ? 'Pendaftaran ditutup'
            : competition.registrationStatus === 'buka'
              ? 'Pendaftaran dibuka'
              : 'Informasi lomba'}
        </span>
        <Link
          to={`/kompetisi/${competition.slug}`}
          aria-label={`Detail ${competition.namaResmi}`}
          className={textLinkClass}
        >
          Detail lomba
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export const LandingPage: React.FC = () => {
  const { currentUser, currentRole, isLoading: authLoading } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[] | null>(null);
  const [competitionError, setCompetitionError] = useState(false);
  const [competitionReload, setCompetitionReload] = useState(0);
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [rankingError, setRankingError] = useState(false);
  const [rankingReload, setRankingReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCompetitions(null);
    setCompetitionError(false);
    competitionService
      .getAll()
      .then((data) => {
        if (!cancelled) setCompetitions(data.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setCompetitionError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [competitionReload]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setRanking(null);
    setRankingError(false);
    const request = achievementService.getRanking
      ? achievementService.getRanking()
      : Promise.reject(new Error('Layanan ranking tidak tersedia.'));
    request
      .then((data) => {
        if (!cancelled) setRanking(data);
      })
      .catch(() => {
        if (!cancelled) setRankingError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUser?.id, rankingReload]);

  const portalTarget = currentUser
    ? currentRole === 'mahasiswa'
      ? '/app/beranda'
      : '/admin'
    : '/daftar';
  const teamTarget = currentUser
    ? currentRole === 'mahasiswa'
      ? '/app/tim'
      : '/admin/konten'
    : '/masuk?redirect=%2Fapp%2Ftim';
  const rankingLoading = authLoading || (!ranking && !rankingError);

  return (
    <div className="bg-white text-slate-900">
      <section
        aria-labelledby="hero-title"
        className="relative isolate overflow-hidden bg-[#0B1428] px-4 pb-12 pt-28 text-white sm:px-6 sm:pb-16 sm:pt-36 lg:pb-20"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-56 -top-64 -z-10 h-[680px] w-[680px] rounded-full bg-blue-700/15 blur-3xl"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div>
            <p className="flex items-center gap-3 text-xs font-bold tracking-[0.16em] text-blue-200">
              <span aria-hidden="true" className="h-px w-8 bg-blue-400" />
              TALENTA UNIDA GONTOR
            </p>
            <h1
              id="hero-title"
              className="mt-6 max-w-2xl text-[2.75rem] font-extrabold leading-[1.12] tracking-[-0.045em] sm:text-6xl lg:text-7xl"
            >
              Dari potensi,
              <br />
              <span className="text-blue-300">menuju prestasi.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
              Temukan lomba yang tepat, siapkan diri atau tim, dan catat capaianmu. Satu ruang
              pembinaan untuk mahasiswa Universitas Darussalam Gontor.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/kompetisi"
                className={`${actionClass} bg-blue-600 text-white hover:bg-blue-500`}
              >
                Jelajahi Lomba
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to={portalTarget}
                className={`${actionClass} border border-slate-600 text-white hover:bg-white/10`}
              >
                {currentUser ? 'Buka Portal' : 'Buat Akun Mahasiswa'}
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs leading-relaxed text-slate-400">
              <Check className="h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
              Katalog dan ranking dapat dilihat tanpa akun.
            </p>
          </div>

          <div className="relative hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-3 sm:p-4 lg:block">
            <div className="overflow-hidden rounded-2xl bg-white text-slate-900">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <TalentaMark />
                <div>
                  <p className="text-sm font-extrabold tracking-tight">
                    Satu ruang. Setiap langkah.
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Alur pembinaan di TALENTA</p>
                </div>
              </div>
              <ol className="space-y-0 px-5 py-2 sm:px-6">
                {[
                  {
                    icon: Flag,
                    title: 'Temukan arahmu',
                    text: 'Jelajahi lomba dan tentukan target.',
                  },
                  {
                    icon: Users,
                    title: 'Tumbuh dengan persiapan',
                    text: 'Individu atau tim, ikuti roadmapmu.',
                  },
                  {
                    icon: ClipboardCheck,
                    title: 'Jadikan capaian tercatat',
                    text: 'Ajukan prestasi untuk ditinjau validator.',
                  },
                ].map((item, index) => (
                  <li
                    key={item.title}
                    className="flex gap-4 border-b border-slate-100 py-5 last:border-0"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.text}</p>
                    </div>
                    <span
                      className="pt-0.5 text-xs font-bold tabular-nums text-slate-300"
                      aria-hidden="true"
                    >
                      0{index + 1}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="flex items-center gap-2 border-t border-blue-100 bg-blue-50 px-5 py-4 text-xs font-semibold text-blue-800 sm:px-6">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                Capaian diperiksa. Bukti pengajuan tetap privat.
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-400 sm:mt-14">
          <p className="hidden sm:block">Peluang, persiapan, dan prestasi. Saling terhubung.</p>
          <a
            href="#kompetisi-preview"
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-slate-200 hover:text-white"
          >
            Temukan langkah pertamamu
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>

      <section
        aria-labelledby="kompetisi-preview"
        className="scroll-mt-20 bg-slate-50 px-4 py-16 sm:px-6 lg:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700">
                Temukan peluangmu
              </p>
              <h2
                id="kompetisi-preview"
                className="mt-3 scroll-mt-24 text-3xl font-extrabold tracking-tight sm:text-4xl"
              >
                Mulai dari lomba yang tepat.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
                Kenali syarat, komposisi peserta, dan jadwal sebelum menentukan targetmu.
              </p>
            </div>
            <Link to="/kompetisi" className={textLinkClass}>
              Lihat semua lomba
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {competitionError ? (
            <PreviewError
              message="Daftar lomba belum berhasil dimuat."
              onRetry={() => setCompetitionReload((value) => value + 1)}
            />
          ) : !competitions ? (
            <PreviewLoading label="Memuat lomba terbit..." />
          ) : competitions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <Trophy className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-bold">Belum ada lomba terbit</h3>
              <p className="mt-2 text-sm text-slate-600">
                Informasi lomba akan muncul setelah diterbitkan pengelola.
              </p>
              <Link to="/kompetisi" className={`${textLinkClass} mt-4`}>
                Buka katalog
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {competitions.map((competition) => (
                <CompetitionPreview
                  key={competition.id || competition.slug}
                  competition={competition}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section
        id="alur-section"
        aria-labelledby="alur-title"
        className="scroll-mt-24 px-4 py-16 sm:px-6 lg:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr] lg:gap-24">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700">
                Alur pembinaan
              </p>
              <h2
                id="alur-title"
                className="mt-3 max-w-lg text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
              >
                Langkah kecil.
                <br />
                Persiapan yang lebih terarah.
              </h2>
            </div>
            <p className="max-w-lg self-end text-sm leading-relaxed text-slate-600">
              TALENTA menghubungkan proses sebelum dan sesudah lomba. Mulai dari memilih target
              hingga pengajuan capaian, kamu bisa melihat langkah yang perlu dilakukan.
            </p>
          </div>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {journey.map((item, index) => (
              <li key={item.title} className="border-t-2 border-slate-200 pt-5">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-slate-400">
                    0{index + 1}
                  </span>
                  <item.icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
                </div>
                <h3 className="text-base font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="team-title" className="px-4 pb-16 sm:px-6 lg:pb-20">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700">
              Individu atau beregu
            </p>
            <h2
              id="team-title"
              className="mt-3 text-3xl font-extrabold leading-tight tracking-tight"
            >
              Ada jalan untuk
              <br className="hidden sm:block" /> setiap cara berjuang.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Lomba individu langsung ke persiapan. Kalau lombamu beregu, pilih cara bergabung yang
              sesuai dengan kondisimu.
            </p>
            <Link to={teamTarget} className={`${textLinkClass} mt-4`}>
              {currentUser && currentRole !== 'mahasiswa'
                ? 'Kelola lomba dan tim'
                : 'Mulai siapkan tim'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-blue-900">
                <strong className="mb-1 block">Ikut sendiri? Tetap punya arah.</strong>Roadmap dan
                kontak konsultasi tersedia sesuai konten yang diterbitkan untuk lombamu.
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-200">
            {teamPaths.map((path) => (
              <div key={path.title} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-700">
                  <path.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold">{path.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{path.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="ranking-title"
        className="border-y border-slate-100 bg-slate-50 px-4 py-16 sm:px-6 lg:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700">
                Capaian yang tercatat
              </p>
              <h2
                id="ranking-title"
                className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl"
              >
                Usaha yang layak diapresiasi.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
                Sorotan mahasiswa dengan poin prestasi lomba yang sudah disetujui validator.
              </p>
            </div>
            <Link to="/ranking" className={textLinkClass}>
              Lihat ranking lengkap
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {rankingLoading ? (
            <PreviewLoading label="Memuat ranking prestasi..." />
          ) : rankingError ? (
            <PreviewError
              message="Ranking prestasi belum berhasil dimuat."
              onRetry={() => setRankingReload((value) => value + 1)}
            />
          ) : !ranking?.period ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-bold">Belum ada periode akademik aktif</h3>
              <p className="mt-2 text-sm text-slate-600">
                Ranking periode berjalan akan tersedia setelah periode diaktifkan pengelola.
              </p>
              <Link to="/ranking" className={`${textLinkClass} mt-3`}>
                Lihat halaman ranking
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {ranking.period.name}
              </p>
              {ranking.ranking.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                  <Award className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-bold">
                    Cerita prestasi berikutnya sedang dimulai.
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Belum ada poin prestasi lomba yang disetujui pada periode ini.
                  </p>
                </div>
              ) : (
                <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  {ranking.ranking.slice(0, 3).map((item) => (
                    <li
                      key={item.userId}
                      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-sm font-extrabold tabular-nums text-blue-700"
                          aria-label={`Peringkat ${item.rank}`}
                        >
                          {String(item.rank).padStart(2, '0')}
                        </span>
                        <Trophy className="h-5 w-5 text-blue-600" aria-hidden="true" />
                      </div>
                      <h3 className="mt-5 break-words text-lg font-extrabold text-slate-950 [overflow-wrap:anywhere]">
                        {item.fullName}
                      </h3>
                      <p className="mt-1 break-words text-sm text-slate-500 [overflow-wrap:anywhere]">
                        {item.studyProgram}
                      </p>
                      <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4">
                        <p>
                          <span className="text-3xl font-extrabold tabular-nums text-blue-700">
                            {item.points.toLocaleString('id-ID')}
                          </span>
                          <span className="ml-1.5 text-xs text-slate-500">poin</span>
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          {item.approvedCount} prestasi disetujui
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                Poin mengikuti aturan yang berlaku pada pengajuan. Hanya prestasi lomba yang
                disetujui dihitung.
              </p>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="faq-title" className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700">
              Sebelum mulai
            </p>
            <h2 id="faq-title" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Kenali TALENTA
              <br />
              lebih dekat.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
              Beberapa hal yang mungkin ingin kamu ketahui sebelum menentukan langkah pertama.
            </p>
            <p className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <LockKeyhole className="h-4 w-4 text-blue-700" aria-hidden="true" />
              Berkas bukti tidak dibuka untuk publik.
            </p>
          </div>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {questions.map((item) => (
              <details key={item.question} className="group py-1">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-4 text-sm font-bold [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </summary>
                <p className="pb-5 pr-6 text-sm leading-relaxed text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="start-title" className="px-4 pb-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 rounded-3xl bg-blue-700 p-7 text-white sm:p-10 lg:p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-200">
              Langkah berikutnya milikmu
            </p>
            <h2
              id="start-title"
              className="mt-3 max-w-xl text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl"
            >
              Mulai dari rasa ingin tahu.
              <br />
              Lanjutkan dengan persiapan.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-blue-100">
              Jelajahi peluang lomba atau masuk ke ruang pembinaanmu.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to={portalTarget}
              className={`${actionClass} bg-white text-blue-800 hover:bg-blue-50`}
            >
              {currentUser ? 'Buka Portal TALENTA' : 'Buat Akun Mahasiswa'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {!currentUser && (
              <Link
                to="/masuk"
                className={`${actionClass} border border-blue-300 text-white hover:bg-blue-600`}
              >
                Sudah punya akun? Masuk
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
