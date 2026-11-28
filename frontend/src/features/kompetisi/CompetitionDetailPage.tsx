import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Target,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  ListOrdered,
  Award,
} from 'lucide-react';
import { Competition, Profile, Team } from '../../types';
import { achievementService, competitionService, teamService, userService } from '@talenta/services';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { PageLoading } from '../../components/ui/Skeleton';
import { ScheduleTimeline } from './components/ScheduleTimeline';
import { TeamRuleBox } from './components/TeamRuleBox';
import { formatAchievementType } from '../../lib/format';
import { useDocumentMeta } from '../../lib/seo';

const VALID_TABS = ['ringkasan', 'syarat', 'jadwal', 'poin'] as const;

export const CompetitionDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, refreshUser } = useAuth();
  const { notify } = useToast();
  const [competition, setCompetition] = useState<Competition | null>(null);

  useDocumentMeta({
    title: competition
      ? `${competition.namaResmi} — UNIDA Student Championship (USC)`
      : 'Detail Kompetisi — UNIDA Student Championship (USC)',
    description: competition
      ? competition.deskripsi.slice(0, 160)
      : 'Informasi resmi syarat peserta, jadwal pembinaan, konsultan, dan aturan poin kompetisi di UNIDA Student Championship (USC).',
    path: slug ? `/kompetisi/${slug}` : '/kompetisi',
  });
  const [pointConfig, setPointConfig] = useState<Awaited<ReturnType<NonNullable<typeof achievementService.getCompetitionPointConfig>>> | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [confirmSwitchOpen, setConfirmSwitchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const activeTab = (searchParams.get('tab') as string) || 'ringkasan';

  const setActiveTab = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });
  };

  const fetchDetail = (isCancelled?: () => boolean) => {
    if (!slug) return;
    setLoading(true);
    setLoadError(null);
    const isMahasiswa = Boolean(currentUser && currentUser.role.includes('mahasiswa'));
    Promise.all([
      competitionService.getBySlug(slug),
      isMahasiswa && currentUser ? userService.getProfile(currentUser.id).catch(() => null) : Promise.resolve(null),
      isMahasiswa && currentUser ? teamService.getTeamByUserId(currentUser.id).catch(() => null) : Promise.resolve(null),
      achievementService.getCompetitionPointConfig ? achievementService.getCompetitionPointConfig(slug).catch(() => null) : Promise.resolve(null),
    ])
      .then(([comp, prof, team, pConf]) => {
        if (isCancelled?.()) return;
        setCompetition(comp);
        setProfile(prof);
        setActiveTeam(team && team.status !== 'arsip' ? team : null);
        setPointConfig(pConf);
        setLoading(false);
      })
      .catch((err: any) => {
        if (isCancelled?.()) return;
        if (err?.status === 404) {
          setCompetition(null);
        } else {
          setLoadError(err?.message || 'Gagal memuat detail kompetisi. Periksa koneksi Anda.');
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    fetchDetail(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, currentUser?.id]);

  const executeSelectTarget = async () => {
    if (saving || !currentUser || !slug) return;
    setSaving(true);
    setConfirmSwitchOpen(false);
    try {
      await userService.setTargetCompetition(currentUser.id, slug);
      await refreshUser();
      notify('Target kompetisi berhasil diperbarui.');
      const isIndividu =
        competition?.format === 'individu' ||
        (competition && competition.komposisi.min === 1 && competition.komposisi.max === 1);
      if (isIndividu) {
        navigate(`/app/kompetisi/${slug}/persiapan`);
      } else {
        navigate('/app/tim');
      }
    } catch (err: any) {
      notify(err?.message || 'Gagal memilih target. Coba lagi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAsTarget = async () => {
    if (!currentUser) {
      navigate(`/masuk?redirect=${encodeURIComponent(`/kompetisi/${slug}`)}`);
      return;
    }
    if (!slug) return;
    if (activeTeam && activeTeam.competitionSlug !== slug) {
      setConfirmSwitchOpen(true);
      return;
    }
    await executeSelectTarget();
  };

  if (loading) return <PageLoading message="Memuat detail kompetisi..." />;
  if (loadError) {
    return (
      <div className="p-12 text-center space-y-4">
        <p role="alert" className="text-rose-600 text-sm font-semibold">{loadError}</p>
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="primary" onClick={() => fetchDetail()}>
            Muat Ulang
          </Button>
          <Link to="/kompetisi">
            <Button size="sm" variant="outline">Kembali ke Katalog</Button>
          </Link>
        </div>
      </div>
    );
  }
  if (!competition) {
    return (
      <div className="p-12 text-center space-y-4">
        <p role="alert" className="text-rose-500 text-sm font-semibold">Kompetisi tidak ditemukan.</p>
        <Link to="/kompetisi" className="text-xs font-bold text-blue-700 underline">
          Kembali ke katalog lomba
        </Link>
      </div>
    );
  }

  const isCurrentTarget = profile?.targetKompetisiSlug === competition.slug;
  const currentTab = VALID_TABS.includes(activeTab as never) ? activeTab : 'ringkasan';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link to="/kompetisi" className="hover:text-blue-700 transition-colors font-medium">
          Katalog Lomba
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span aria-current="page" className="text-slate-700 font-bold truncate max-w-md">
          {competition.namaResmi}
        </span>
      </nav>

      {/* Main Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge color="blue" size="md" dot>
            {competition.kategori}
          </Badge>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider inline-flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Tingkat {competition.tingkat}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight leading-snug">
            {competition.namaResmi}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            {competition.deskripsi}
          </p>
        </div>

        {(!currentUser || currentUser.role.includes('mahasiswa')) && (
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {isCurrentTarget ? (
              <div className="flex flex-wrap items-center gap-3">
                <Badge color="emerald" size="lg" dot>
                  Target Pembinaan Aktif Kamu
                </Badge>
                {competition.format !== 'individu' &&
                  !(competition.komposisi.min === 1 && competition.komposisi.max === 1) && (
                    <Link to="/app/tim">
                      <Button size="md" variant="outline">
                        Atur / Gabung Tim
                      </Button>
                    </Link>
                  )}
                <Link to={`/app/kompetisi/${competition.slug}/persiapan`}>
                  <Button size="md" rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}>
                    Buka Ruang Persiapan
                  </Button>
                </Link>
              </div>
            ) : (
              <Button
                size="md"
                onClick={handleSelectAsTarget}
                isLoading={saving}
                leftIcon={<Target className="w-4 h-4" aria-hidden="true" />}
              >
                Pilih sebagai Target Kompetisi Saya
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs & Content */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
        <Tabs
          tabs={[
            { id: 'ringkasan', label: 'Tahapan Perlombaan' },
            { id: 'syarat', label: 'Syarat & Ketentuan Tim' },
            { id: 'jadwal', label: 'Jadwal & Seleksi Internal' },
            { id: 'poin', label: 'Keterangan & Bobot Poin' },
          ]}
          activeTab={currentTab}
          onChange={setActiveTab}
        />

        <div id={`panel-${currentTab}`} role="tabpanel" aria-labelledby={`tab-${currentTab}`}>
          {currentTab === 'ringkasan' && (
            <div className="space-y-4 text-xs text-slate-600">
              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-blue-700" />
                  <h2 className="font-bold text-slate-900 text-sm">Alur Tahapan Pelaksanaan Lomba</h2>
                </div>
                <p className="text-xs text-slate-500">
                  Siklus persiapan delegasi UNIDA Gontor hingga pengajuan prestasi di USC.
                </p>
              </div>

              <div className="space-y-3">
                {competition.tahapan.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                    Tahapan roadmap pembinaan untuk kompetisi ini sedang disiapkan oleh pengelola lomba.
                  </p>
                ) : (
                  competition.tahapan.map((t, idx) => {
                  const isObject = typeof t === 'object' && t !== null;
                  const judul = isObject ? t.judul : t;
                  const deskripsi = isObject ? t.deskripsi : null;
                  const kategori = isObject ? t.kategori : null;
                  const nomor = isObject && t.nomor ? t.nomor : `0${idx + 1}`;

                  const stepStyles = [
                    {
                      badge: 'bg-blue-700 text-white shadow-xs',
                      kategoriBadge: 'bg-blue-50 text-blue-800 border-blue-200/80',
                      borderHover: 'hover:border-blue-300',
                    },
                    {
                      badge: 'bg-amber-600 text-white shadow-xs',
                      kategoriBadge: 'bg-amber-50 text-amber-800 border-amber-200/80',
                      borderHover: 'hover:border-amber-300',
                    },
                    {
                      badge: 'bg-emerald-700 text-white shadow-xs',
                      kategoriBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
                      borderHover: 'hover:border-emerald-300',
                    },
                  ];
                  const currentStyle = stepStyles[idx % stepStyles.length];

                  return (
                    <div
                      key={idx}
                      className={`relative flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 transition-all ${currentStyle.borderHover}`}
                    >
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${currentStyle.badge}`}
                      >
                        {nomor}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{judul}</h3>
                          {kategori && (
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${currentStyle.kategoriBadge}`}
                            >
                              {kategori}
                            </span>
                          )}
                        </div>
                        {deskripsi ? (
                          <p className="text-xs text-slate-600 leading-relaxed">{deskripsi}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })
                )}
              </div>
            </div>
          )}

          {currentTab === 'syarat' && (
            <TeamRuleBox
              komposisi={competition.komposisi}
              syarat={competition.syarat}
              competition={competition}
            />
          )}

          {currentTab === 'jadwal' && (
            <ScheduleTimeline
              jadwalResmi={competition.jadwal}
              seleksiInternal={competition.seleksiInternal}
            />
          )}

          {currentTab === 'poin' && (
            <div className="space-y-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-700" aria-hidden="true" />
                <h2 className="font-bold text-slate-900 text-sm">Ketentuan Bobot Poin Kompetisi</h2>
              </div>
              <p className="text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4">
                {pointConfig?.pointDescription ||
                  competition.pointDescription ||
                  'Kompetisi ini menggunakan template bobot poin kampus aktif berdasarkan tingkat dan capaian, kecuali diatur khusus oleh validator per sub-lomba.'}
              </p>
              {pointConfig?.customRules && pointConfig.customRules.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Sub-Lomba</th>
                        <th className="py-2.5 px-3">Tingkat</th>
                        <th className="py-2.5 px-3">Capaian</th>
                        <th className="py-2.5 px-3">Poin</th>
                        <th className="py-2.5 px-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pointConfig.customRules.map((rule, idx) => (
                        <tr key={rule.id || idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {rule.subCategory?.name || 'Semua sub-lomba'}
                          </td>
                          <td className="py-2.5 px-3 capitalize">{rule.level}</td>
                          <td className="py-2.5 px-3">{formatAchievementType(rule.result)}</td>
                          <td className="py-2.5 px-3 font-extrabold text-blue-700">{rule.points} poin</td>
                          <td className="py-2.5 px-3 text-slate-500">{rule.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Belum ada pengecualian poin khusus; sistem akan menerapkan aturan template standar atau default sub-lomba saat verifikasi.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={confirmSwitchOpen}
        onClose={() => setConfirmSwitchOpen(false)}
        title="Konfirmasi Ganti Target Kompetisi"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmSwitchOpen(false)}>
              Batal
            </Button>
            <Button size="sm" isLoading={saving} onClick={() => void executeSelectTarget()}>
              Ya, Pindah Target
            </Button>
          </div>
        }
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Kamu saat ini tergabung di tim aktif{' '}
          <strong className="text-slate-900">{activeTeam?.nama}</strong>. Memilih{' '}
          <strong className="text-slate-900">{competition.namaResmi}</strong> sebagai target baru
          akan mengeluarkanmu dari tim lama secara otomatis (atau mengarsipkannya bila kamu
          anggota terakhir). Lanjutkan?
        </p>
      </Modal>
    </div>
  );
};
