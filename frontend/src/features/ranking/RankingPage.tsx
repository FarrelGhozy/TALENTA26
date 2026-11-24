import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Calendar,
  Crown,
  Lock,
  Medal,
  RefreshCw,
  Search,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { achievementService } from '@talenta/services';
import { RankingItem, RankingResponse } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoading } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';
import { UserAvatar } from '../../components/ui/UserAvatar';

function getRankStyle(rank: number) {
  if (rank === 1) {
    return {
      card: 'border-amber-300 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-sm ring-1 ring-amber-200/70',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      avatarRing: 'ring-4 ring-amber-200/80 border-amber-300',
      avatarTone: 'amber' as const,
      label: 'Juara Puncak',
      medalColor: 'text-amber-600',
    };
  }
  if (rank === 2) {
    return {
      card: 'border-slate-300 bg-gradient-to-b from-slate-50/90 via-white to-white shadow-2xs',
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
      avatarRing: 'ring-4 ring-slate-200/80 border-slate-300',
      avatarTone: 'slate' as const,
      label: 'Peringkat 2',
      medalColor: 'text-slate-500',
    };
  }
  return {
    card: 'border-orange-200 bg-gradient-to-b from-orange-50/70 via-white to-white shadow-2xs',
    badge: 'bg-orange-100 text-orange-900 border-orange-200',
    avatarRing: 'ring-4 ring-orange-200/70 border-orange-300',
    avatarTone: 'orange' as const,
    label: 'Peringkat 3',
    medalColor: 'text-orange-600',
  };
}

export const RankingPage: React.FC = () => {
  const { currentUser, currentRole, isLoading: authLoading } = useAuth();
  const isAuthenticated = Boolean(currentUser);
  const currentUserId = currentUser?.id ?? null;

  const [activeTab, setActiveTab] = useState<'current' | 'lifetime'>('current');
  const [rankingData, setRankingData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const handleRetry = useCallback(() => {
    setReloadTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    const fetcher =
      activeTab === 'lifetime' && achievementService.getLifetimeRanking
        ? achievementService.getLifetimeRanking()
        : achievementService.getRanking
          ? achievementService.getRanking()
          : Promise.reject(new Error('Layanan ranking tidak tersedia.'));

    fetcher
      .then((data) => {
        if (cancelled) return;
        setRankingData(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Gagal memuat rekapitulasi ranking prestasi mahasiswa.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, currentUserId, authLoading, reloadTick]);

  const ranking = useMemo(() => rankingData?.ranking || [], [rankingData]);

  const periodName =
    loading || authLoading
      ? 'Memuat periode'
      : error
        ? 'Periode tidak tersedia'
        : rankingData?.period?.name || 'Periode Akademik Aktif';

  const summary = useMemo(() => {
    const totalStudents = ranking.length;
    const totalAchievements = ranking.reduce((sum, item) => sum + item.approvedCount, 0);
    const totalPoints = ranking.reduce((sum, item) => sum + item.points, 0);
    const highestPoints = ranking[0]?.points ?? 0;
    return { totalStudents, totalAchievements, totalPoints, highestPoints };
  }, [ranking]);

  const myRankingEntry = useMemo(
    () => (currentUserId ? ranking.find((item) => item.userId === currentUserId) || null : null),
    [ranking, currentUserId]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const filteredRanking = useMemo(() => {
    if (!isSearching) return ranking;
    return ranking.filter(
      (item) =>
        item.fullName.toLowerCase().includes(normalizedQuery) ||
        item.studyProgram.toLowerCase().includes(normalizedQuery)
    );
  }, [ranking, isSearching, normalizedQuery]);

  const topThree = useMemo(() => {
    if (isSearching) return [];
    return ranking.slice(0, 3);
  }, [ranking, isSearching]);

  // Urutan visual desktop: #2 kiri, #1 tengah, #3 kanan; mobile: #1 → #2 → #3
  const podiumOrderClass = (rank: number) => {
    if (rank === 1) return 'order-1 md:order-2 md:-mt-3';
    if (rank === 2) return 'order-2 md:order-1 md:mt-3';
    return 'order-3 md:order-3 md:mt-3';
  };

  const listItems: RankingItem[] = isSearching ? filteredRanking : ranking.slice(3);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      {/* Header Halaman */}
      <PageHeader
        eyebrow={periodName}
        title="Ranking Prestasi Mahasiswa"
        description="Papan peringkat berdasarkan akumulasi poin prestasi lomba berstatus disetujui validator. Dihitung otomatis berdasar aturan poin berversi dengan tie-break deterministik."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
              <span>{periodName}</span>
            </div>
            <Badge color={isAuthenticated ? 'blue' : 'slate'} size="sm" dot>
              {isAuthenticated ? 'Mode Civitas Masuk' : 'Mode Publik'}
            </Badge>
          </div>
        }
      />

      {/* Strip Metrik Ringkas */}
      {!loading && !authLoading && !error && ranking.length > 0 && (
        <section
          aria-label="Ringkasan statistik papan peringkat"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3.5"
        >
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Mahasiswa Berperingkat
              </p>
              <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">
                {summary.totalStudents}{' '}
                <span className="text-xs font-semibold text-slate-500">mahasiswa</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Skor Puncak Saat Ini
              </p>
              <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">
                {summary.highestPoints}{' '}
                <span className="text-xs font-semibold text-slate-500">poin</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
              <Award className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Akumulasi Capaian Sah
              </p>
              <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">
                {summary.totalAchievements}{' '}
                <span className="text-xs font-semibold text-slate-500">
                  prestasi ({summary.totalPoints} poin)
                </span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Kartu Posisi Peringkat Mahasiswa Login */}
      {!loading && !authLoading && !error && isAuthenticated && myRankingEntry && (
        <section
          aria-label="Posisi peringkat Anda saat ini"
          className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white p-4 sm:p-5 shadow-2xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <UserAvatar
                  src={myRankingEntry.avatarUrl || currentUser?.avatar}
                  name={myRankingEntry.fullName}
                  size="lg"
                  shape="rounded"
                  tone="blue"
                  className="ring-2 ring-blue-300"
                />
                <span className="absolute -bottom-1.5 -right-1.5 inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-lg bg-blue-700 text-white text-[11px] font-black shadow-xs border-2 border-white">
                  #{myRankingEntry.rank}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                    Posisi Peringkat Anda
                  </span>
                  <Badge color="blue" size="sm">
                    Peringkat #{myRankingEntry.rank} dari {summary.totalStudents}
                  </Badge>
                </div>
                <p className="text-base font-black text-slate-900 mt-0.5 break-words">
                  {myRankingEntry.fullName}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {myRankingEntry.studyProgram} • {myRankingEntry.approvedCount} prestasi lomba sah
                  {myRankingEntry.juara1Count > 0 ? ` • ${myRankingEntry.juara1Count} Juara 1` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-blue-100 pt-3 sm:pt-0">
              <div className="text-left sm:text-right">
                <p className="text-2xl font-black text-blue-800 leading-none">
                  {myRankingEntry.points}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mt-1">
                  Total Poin
                </p>
              </div>
              {currentRole === 'mahasiswa' && (
                <Link to="/app/prestasi">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                  >
                    Prestasi Saya
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Bilah Tab & Pencarian */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
        <Tabs
          tabs={[
            { id: 'current', label: 'Periode Berjalan' },
            { id: 'lifetime', label: 'Sepanjang Waktu (Lifetime)' },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as 'current' | 'lifetime')}
        />

        <div className="relative w-full md:w-72">
          <Search
            className="w-4 h-4 text-slate-400 pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama mahasiswa atau prodi..."
            aria-label="Cari nama mahasiswa atau program studi"
            className="w-full pl-9 pr-9 py-2 min-h-[40px] rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus kata pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Konten Tab */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="space-y-6 focus:outline-none"
      >
        {(loading || authLoading) && <PageLoading message="Memuat ranking prestasi…" />}

        {!loading && !authLoading && error && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="text-sm font-semibold text-rose-800">{error}</div>
            <Button
              type="button"
              size="sm"
              variant="danger-outline"
              onClick={handleRetry}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}
              className="shrink-0"
            >
              Muat Ulang
            </Button>
          </div>
        )}

        {!loading && !authLoading && !error && ranking.length === 0 && (
          <EmptyState
            icon={<Trophy aria-hidden="true" className="h-6 w-6 text-slate-400" />}
            title="Belum Ada Prestasi di Papan Peringkat"
            description="Peringkat akan muncul secara otomatis setelah pengajuan prestasi lomba mahasiswa diverifikasi dan disahkan oleh validator."
          />
        )}

        {!loading && !authLoading && !error && ranking.length > 0 && (
          <>
            {/* Podium Top 3 (hanya saat tidak dalam mode filter pencarian) */}
            {!isSearching && topThree.length > 0 && (
              <section aria-label="Tiga besar peringkat teratas" className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                    <span>Podium Peringkat Teratas</span>
                  </h2>
                  {!isAuthenticated && (
                    <span className="text-[11px] font-medium text-slate-500">
                      Masuk sebagai civitas untuk melihat foto profil mahasiswa
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch pt-1">
                  {topThree.map((item) => {
                    const style = getRankStyle(item.rank);
                    const isMe = currentUserId === item.userId;

                    return (
                      <article
                        key={item.userId}
                        className={`relative rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all ${style.card} ${podiumOrderClass(item.rank)} ${
                          isMe ? 'ring-2 ring-blue-500/60' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${style.badge}`}
                          >
                            {item.rank === 1 ? (
                              <Trophy className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                            ) : (
                              <Medal className={`w-3.5 h-3.5 ${style.medalColor}`} aria-hidden="true" />
                            )}
                            <span>{style.label}</span>
                          </span>
                          {isMe && (
                            <Badge color="blue" size="sm">
                              Anda
                            </Badge>
                          )}
                        </div>

                        {/* Identitas Utama — Foto Wajah HANYA tampil bila sudah login */}
                        <div className="flex flex-col items-center text-center space-y-3 py-1">
                          {isAuthenticated ? (
                            <div className="relative">
                              <UserAvatar
                                src={item.avatarUrl}
                                name={item.fullName}
                                size="xl"
                                shape="circle"
                                tone={style.avatarTone}
                                className={style.avatarRing}
                              />
                              <span
                                aria-label={`Peringkat ${item.rank}`}
                                className={`absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-black shadow-xs ${style.badge}`}
                              >
                                #{item.rank}
                              </span>
                            </div>
                          ) : (
                            <div
                              aria-label={`Peringkat ${item.rank}`}
                              className={`h-14 w-14 rounded-2xl border flex items-center justify-center font-black text-xl shadow-2xs ${style.badge}`}
                            >
                              {item.rank === 1 ? (
                                <Trophy className="h-7 w-7 text-amber-600" aria-hidden="true" />
                              ) : (
                                `#${item.rank}`
                              )}
                            </div>
                          )}

                          <div className="space-y-1 min-w-0 w-full">
                            <h3 className="text-base sm:text-[17px] font-black text-slate-950 leading-snug break-words">
                              {item.fullName}
                            </h3>
                            <p className="text-xs font-semibold text-slate-600">
                              {item.studyProgram}
                            </p>
                          </div>
                        </div>

                        {/* Capaian & Skor Poin */}
                        <div className="pt-3.5 border-t border-slate-200/70 flex items-end justify-between gap-3">
                          <div className="space-y-1 text-left">
                            <p className="text-[11px] font-semibold text-slate-600">
                              {item.approvedCount} prestasi lomba sah
                            </p>
                            {item.juara1Count > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <Medal className="w-3 h-3 text-amber-600" aria-hidden="true" />
                                {item.juara1Count}× Juara 1
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] font-semibold text-slate-400">
                                Terverifikasi validator
                              </span>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-3xl font-black text-blue-800 leading-none">
                              {item.points}
                            </p>
                            <p className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">
                              <Award aria-hidden="true" className="h-3 w-3 text-blue-600" />
                              poin
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Hasil Pencarian Kosong */}
            {isSearching && filteredRanking.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center space-y-3">
                <p className="text-sm font-extrabold text-slate-800">
                  Tidak ditemukan mahasiswa dengan kata kunci &ldquo;{searchQuery}&rdquo;
                </p>
                <p className="text-xs text-slate-500">
                  Coba periksa ejaan nama atau program studi yang dicari.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                >
                  Tampilkan Semua Peringkat
                </Button>
              </div>
            )}

            {/* Daftar Peringkat Lengkap (#4 ke bawah, atau semua hasil pencarian) */}
            {listItems.length > 0 && (
              <section aria-label="Daftar peringkat mahasiswa" className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    {isSearching
                      ? `Hasil Pencarian (${filteredRanking.length} mahasiswa)`
                      : 'Peringkat Selanjutnya'}
                  </h2>
                  <span className="text-[11px] font-medium text-slate-400">
                    Urutan: Poin → Juara 1 → Prestasi Sah
                  </span>
                </div>

                <ol className="space-y-2.5" aria-label="Daftar peringkat prestasi mahasiswa">
                  {listItems.map((item) => {
                    const isTop1 = item.rank === 1;
                    const isTop2 = item.rank === 2;
                    const isTop3 = item.rank === 3;
                    const isMe = currentUserId === item.userId;

                    return (
                      <li
                        key={item.userId}
                        className={`flex items-center justify-between gap-3 sm:gap-4 rounded-2xl border p-3.5 sm:p-4 transition-all ${
                          isMe
                            ? 'border-blue-300 bg-blue-50/50 shadow-2xs'
                            : isTop1
                              ? 'border-amber-300 bg-amber-50/40 shadow-2xs'
                              : 'border-slate-200/90 bg-white shadow-2xs hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                          {/* Nomor Peringkat */}
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-xl font-black text-sm shrink-0 border ${
                              isTop1
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : isTop2
                                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                                  : isTop3
                                    ? 'bg-orange-100 text-orange-900 border-orange-200'
                                    : isMe
                                      ? 'bg-blue-700 text-white border-blue-700'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                            aria-label={`Peringkat ${item.rank}`}
                          >
                            {isTop1 ? (
                              <Medal className="h-5 w-5 text-amber-700" aria-hidden="true" />
                            ) : (
                              item.rank
                            )}
                          </span>

                          {/* Foto Profil — HANYA tampil untuk pengguna yang sudah login */}
                          {isAuthenticated && (
                            <UserAvatar
                              src={item.avatarUrl}
                              name={item.fullName}
                              size="md"
                              shape="circle"
                              tone={isMe ? 'blue' : 'slate'}
                            />
                          )}

                          {/* Nama Jelas & Metadata */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <p className="font-extrabold text-slate-950 text-sm sm:text-[15px] leading-snug break-words">
                                {item.fullName}
                              </p>
                              {isMe && (
                                <Badge color="blue" size="sm">
                                  Anda
                                </Badge>
                              )}
                              {isTop1 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                                  <Trophy className="w-3 h-3 text-amber-600" aria-hidden="true" />
                                  Juara Puncak
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">
                              <span className="font-semibold text-slate-700">
                                {item.studyProgram}
                              </span>{' '}
                              • {item.approvedCount} prestasi lomba sah
                              {item.juara1Count > 0 ? ` • ${item.juara1Count} Juara 1` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Skor Poin */}
                        <div className="text-right shrink-0 pl-2">
                          <p className="text-xl sm:text-2xl font-black text-blue-800 leading-none">
                            {item.points}
                          </p>
                          <p className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">
                            <Award aria-hidden="true" className="h-3.5 w-3.5 text-blue-600" />
                            poin
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}
          </>
        )}
      </div>

      {/* Catatan Perlindungan Data Pribadi (Adaptif Publik vs Login) */}
      <div className="rounded-2xl bg-slate-100/90 border border-slate-200 p-4 sm:p-5 text-xs leading-relaxed text-slate-600 flex items-start gap-3">
        {isAuthenticated ? (
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" aria-hidden="true" />
        )}
        <div>
          <strong className="block text-slate-800 font-bold mb-0.5">
            Perlindungan Data Pribadi &amp; Privasi Peringkat
          </strong>
          {isAuthenticated ? (
            <p>
              Anda melihat papan peringkat dalam mode civitas UNIDA Gontor yang masuk, sehingga foto
              profil mahasiswa dialirkan secara terotorisasi dari penyimpanan privat. Pada halaman
              publik (belum masuk), foto profil wajah <strong>tidak ditampilkan</strong>. NIM,
              email, nomor kontak, serta dokumen berkas bukti sertifikat tetap privat.
            </p>
          ) : (
            <p>
              Papan peringkat publik hanya menampilkan nama mahasiswa, program studi, perolehan poin
              lomba, dan jumlah capaian sah.{' '}
              <strong>
                Foto profil mahasiswa, NIM, email, nomor kontak, serta dokumen berkas bukti
                sertifikat tidak dipublikasikan
              </strong>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
