import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Hash,
  Plus,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { Competition, Team, TeamDirectoryItem, TeamJoinRequestItem } from '../../types';
import { CreateTeamOptions } from '../../services/types';
import { competitionService, teamService, userService } from '@talenta/services';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { validateTeamFormation } from '../../lib/teamRules';
import { TeamOnboardingHub } from './components/TeamOnboardingHub';
import { TeamCreateForm } from './components/TeamCreateForm';
import { JoinByCodeModal } from './components/JoinByCodeModal';
import { MyTeamWorkspace } from './components/MyTeamWorkspace';
import { TeamDirectoryPanel } from './components/TeamDirectoryPanel';
import { MyJoinRequestsPanel } from './components/MyJoinRequestsPanel';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { PageLoading } from '../../components/ui/Skeleton';

type TeamTabId = 'mulai' | 'tim-saya' | 'cari' | 'pengajuan';

function normalizeTabParam(raw: string | null, hasTeam: boolean): TeamTabId {
  if (raw === 'cari' || raw === 'direktori') return 'cari';
  if (raw === 'pengajuan' || raw === 'pengajuan-saya') return 'pengajuan';
  if (hasTeam) {
    if (raw === 'tim-saya' || raw === 'mulai' || !raw) return 'tim-saya';
    return 'tim-saya';
  }
  if (raw === 'mulai' || raw === 'tim-saya' || !raw) return 'mulai';
  return 'mulai';
}

export const TeamPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab');
  const modeParam = searchParams.get('mode');
  const competitionSlugParam = searchParams.get('kompetisi') || undefined;

  const [team, setTeam] = useState<Team | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [targetCompetition, setTargetCompetition] = useState<Competition | null>(null);
  const [directoryCompetition, setDirectoryCompetition] = useState<Competition | null>(null);
  const [directoryTeams, setDirectoryTeams] = useState<TeamDirectoryItem[]>([]);
  const [myActiveTeamId, setMyActiveTeamId] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<TeamJoinRequestItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [creatingTeam, setCreatingTeam] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(modeParam === 'kode');

  useEffect(() => {
    if (modeParam === 'kode') setCodeModalOpen(true);
  }, [modeParam]);

  const setMode = (mode: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (mode) next.set('mode', mode);
      else next.delete('mode');
      return next;
    });
  };

  const setActiveTab = (nextTab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', nextTab);
      next.delete('mode');
      return next;
    });
  };

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoadError('');
      const [t, prof, dirRes, reqsRes] = await Promise.all([
        teamService.getTeamByUserId(currentUser.id),
        userService.getProfile(currentUser.id).catch(() => null),
        teamService.getDirectory
          ? teamService
              .getDirectory({ competitionSlug: competitionSlugParam })
              .catch(() => ({ competition: null, teams: [], myActiveTeamId: null }))
          : Promise.resolve({ competition: null, teams: [], myActiveTeamId: null }),
        teamService.getMyJoinRequests
          ? teamService.getMyJoinRequests().catch(() => [])
          : Promise.resolve([]),
      ]);

      setTeam(t);
      setDirectoryCompetition(dirRes.competition);
      setDirectoryTeams(dirRes.teams);
      setMyActiveTeamId(dirRes.myActiveTeamId ?? t?.id ?? null);
      setMyRequests(reqsRes);

      if (t) {
        const comp = await competitionService
          .getBySlug(t.competitionSlug)
          .catch(() => t.competitionDetail ?? null);
        setCompetition(comp || t.competitionDetail || null);
      } else {
        setCompetition(null);
      }

      if (prof?.targetKompetisiSlug) {
        const targetComp = await competitionService
          .getBySlug(prof.targetKompetisiSlug)
          .catch(() => null);
        setTargetCompetition(targetComp);
      } else {
        setTargetCompetition(null);
      }
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error ? err.message : 'Gagal memuat data tim. Coba muat ulang.',
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser, competitionSlugParam]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateTeam = async (teamName: string, options: CreateTeamOptions) => {
    const activeComp = targetCompetition || directoryCompetition;
    if (!currentUser || !activeComp) return;
    setCreatingTeam(true);
    try {
      await teamService.createTeam(activeComp.slug, currentUser.id, teamName, options);
      notify(`Ruang tim "${teamName}" berhasil dibuat!`);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('mode');
        next.set('tab', 'tim-saya');
        return next;
      });
      window.scrollTo({ top: 0, behavior: 'instant' });
      await loadData();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Gagal membuat tim baru.', 'error');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleJoinByCode = async (inviteCode: string) => {
    if (!teamService.joinByCode) return;
    const res = await teamService.joinByCode(inviteCode);
    notify(res.message);
    setCodeModalOpen(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('mode');
      next.set('tab', 'tim-saya');
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
    await loadData();
  };

  if (loading) return <PageLoading message="Memuat ruang tim & rekrutmen..." />;

  if (loadError) {
    return (
      <div className="p-12 text-center space-y-4">
        <p role="alert" className="text-xs text-rose-600 font-semibold">
          {loadError}
        </p>
        <Button
          variant="outline"
          size="sm"
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

  const hasActiveTeam = Boolean(team && competition);
  const activeTab = normalizeTabParam(rawTab, hasActiveTeam);
  const activeCompetition = competition || targetCompetition || directoryCompetition;
  const pendingMyRequestsCount = myRequests.filter((r) => r.status === 'menunggu').length;

  // =========================================================================
  // 1. BELUM PUNYA TIM & TARGET LOMBA INDIVIDU -> LANGSUNG RUANG PERSIAPAN
  // =========================================================================
  if (!hasActiveTeam) {
    const isIndividualTarget =
      activeCompetition?.format === 'individu' ||
      Boolean(
        activeCompetition &&
          activeCompetition.komposisi.min === 1 &&
          activeCompetition.komposisi.max === 1,
      );

    if (isIndividualTarget && activeCompetition) {
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Alur Lomba Individu
              </span>
              <Badge color="emerald" size="md" dot>
                Tidak perlu membuat tim
              </Badge>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Lomba individu langsung menuju ruang persiapan
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Target aktif kamu ({activeCompetition.namaResmi}) bersifat perseorangan (kapasitas
                1 peserta).
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-blue-700" aria-hidden="true" />
                  Aturan yang dibaca sistem
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Jenis kompetisi</span>
                  <strong className="text-slate-900 uppercase">Individu</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Kapasitas peserta</span>
                  <strong className="text-slate-900">1 peserta</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Fitur buat/cari tim</span>
                  <strong className="text-slate-900">Dilewati otomatis</strong>
                </div>
              </div>
              <div className="flex flex-col justify-between p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kamu bisa langsung mempelajari roadmap persiapan, checklist latihan, dan kontak
                  konsultasi pada Ruang Persiapan.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/app/kompetisi/${activeCompetition.slug}/persiapan`}>
                    <Button
                      size="sm"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                    >
                      Buka Ruang Persiapan
                    </Button>
                  </Link>
                  <Link to="/app/profil?need=target">
                    <Button size="sm" variant="outline">
                      Ubah Target Lomba
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 2. BELUM MEMILIH TARGET KOMPETISI
    if (!activeCompetition) {
      return (
        <div className="max-w-2xl mx-auto">
          <EmptyState
            icon={<Users className="w-8 h-8 text-blue-700" />}
            title="Pilih Target Kompetisi Terlebih Dahulu"
            description="Setelah kamu memilih target lomba di halaman Profil, kamu dapat membuat tim, mencari tim terbuka, atau masuk menggunakan kode undangan."
            action={
              <div className="flex flex-wrap gap-2.5 justify-center">
                <Link to="/app/profil?need=target">
                  <Button
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                  >
                    Pilih Target Kompetisi
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCodeModalOpen(true)}
                  leftIcon={<Hash className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  Sudah Punya Kode Tim
                </Button>
              </div>
            }
          />
          <JoinByCodeModal
            isOpen={codeModalOpen}
            onClose={() => {
              setCodeModalOpen(false);
              if (modeParam === 'kode') setMode(null);
            }}
            onJoin={handleJoinByCode}
          />
        </div>
      );
    }

    // 3. MODE FORMULIR BUAT TIM BARU
    if (modeParam === 'buat' && currentUser) {
      return (
        <TeamCreateForm
          competition={activeCompetition}
          currentUser={currentUser}
          submitting={creatingTeam}
          onCancel={() => setMode(null)}
          onSubmit={handleCreateTeam}
        />
      );
    }

    // 4. BEREGU & BELUM PUNYA TIM -> TABS TERPADU (CARA BERGABUNG | CARI TIM | PENGAJUAN SAYA)
    const isClosed = activeCompetition.registrationStatus === 'tutup';
    const noTeamTabs: TabItem[] = [
      { id: 'mulai', label: 'Cara Bergabung' },
      { id: 'cari', label: 'Cari Tim', badge: directoryTeams.length },
      {
        id: 'pengajuan',
        label: 'Pengajuan',
        badge:
          pendingMyRequestsCount > 0 ? `${pendingMyRequestsCount} Menunggu` : myRequests.length,
      },
    ];

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400">
          <Link to="/app/beranda" className="hover:text-blue-700 font-medium">
            Beranda
          </Link>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <span aria-current="page" className="text-slate-700 font-bold">
            Tim &amp; Rekrutmen
          </span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Kolaborasi &amp; Rekrutmen Tim
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Tim Kompetisi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Bentuk tim baru, temukan tim yang sedang membuka posisi, atau masuk memakai kode
              undangan dari ketua tim.
            </p>
          </div>

          {activeTab !== 'mulai' && (
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isClosed}
                onClick={() => setCodeModalOpen(true)}
                leftIcon={<Hash className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                Punya Kode Tim
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isClosed}
                onClick={() => setMode('buat')}
                leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                Buat Tim Baru
              </Button>
            </div>
          )}
        </div>

        {/* Active Competition Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#10347A] via-[#154194] to-[#1A4DB0] text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-white/15 px-2.5 py-1 rounded-full">
              Target Kompetisi Aktif
            </span>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              {activeCompetition.namaResmi}
            </h2>
            <p className="text-xs text-blue-100">
              Kompetisi beregu &middot; Ketentuan {activeCompetition.komposisi.min}–
              {activeCompetition.komposisi.max} anggota
              {isClosed
                ? ' · Pendaftaran internal sedang ditutup'
                : ` · ${directoryTeams.length} tim terbuka`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link to={`/app/kompetisi/${activeCompetition.slug}/persiapan`}>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-blue-900 hover:bg-blue-50 border-0"
                leftIcon={<BookOpen className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                Lihat Roadmap Awal
              </Button>
            </Link>
          </div>
        </div>

        {/* Unified Tabs */}
        <Tabs tabs={noTeamTabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab Panels */}
        <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'mulai' && (
            <TeamOnboardingHub
              embedded
              competition={activeCompetition}
              openTeamsCount={directoryTeams.length}
              pendingRequestsCount={pendingMyRequestsCount}
              onCreateNew={() => setMode('buat')}
              onBrowseTeams={() => setActiveTab('cari')}
              onOpenCodeModal={() => setCodeModalOpen(true)}
              onViewRequests={() => setActiveTab('pengajuan')}
            />
          )}

          {activeTab === 'cari' && (
            <TeamDirectoryPanel
              competition={activeCompetition}
              teams={directoryTeams}
              myActiveTeamId={myActiveTeamId}
              onReload={loadData}
              onCreateTeam={() => setMode('buat')}
              onGoToMyTeam={() => setActiveTab('tim-saya')}
            />
          )}

          {activeTab === 'pengajuan' && (
            <MyJoinRequestsPanel
              requests={myRequests}
              hasActiveTeam={false}
              onReload={loadData}
              onBrowseTeams={() => setActiveTab('cari')}
              onGoToMyTeam={() => setActiveTab('tim-saya')}
            />
          )}
        </div>

        <JoinByCodeModal
          isOpen={codeModalOpen}
          onClose={() => {
            setCodeModalOpen(false);
            if (modeParam === 'kode') setMode(null);
          }}
          onJoin={handleJoinByCode}
        />
      </div>
    );
  }

  // =========================================================================
  // 5. SUDAH MEMILIKI TIM AKTIF -> TABS TERPADU (RUANG TIM SAYA | DIREKTORI | PENGAJUAN)
  // =========================================================================
  const activeTeam = team!;
  const activeComp = competition!;
  const validation = validateTeamFormation(activeTeam, [], activeComp);
  const isLeader = Boolean(
    activeTeam.isLeader ?? (activeTeam.leaderId && activeTeam.leaderId === currentUser?.id),
  );
  const incomingPendingCount =
    activeTeam.pendingJoinRequestsCount ?? activeTeam.joinRequests?.length ?? 0;

  const hasTeamTabs: TabItem[] = [
    {
      id: 'tim-saya',
      label: 'Ruang Tim Saya',
      badge:
        isLeader && incomingPendingCount > 0
          ? `${incomingPendingCount} Pelamar`
          : `${validation.acceptedCount}/${validation.maxAllowed}`,
    },
    {
      id: 'cari',
      label: 'Direktori Tim',
      badge: directoryTeams.length,
    },
  ];

  if (myRequests.length > 0 || activeTab === 'pengajuan') {
    hasTeamTabs.push({
      id: 'pengajuan',
      label: 'Pengajuan Saya',
      badge: myRequests.length,
    });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link to="/app/beranda" className="hover:text-blue-700 font-medium">
          Beranda
        </Link>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <Link
          to={`/kompetisi/${activeComp.slug}`}
          className="hover:text-blue-700 font-medium truncate max-w-[200px]"
        >
          {activeComp.namaResmi}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <span aria-current="page" className="text-slate-700 font-bold">
          Tim
        </span>
      </nav>

      {/* Unified Tabs */}
      <Tabs tabs={hasTeamTabs} activeTab={activeTab} onChange={setActiveTab} />

      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'tim-saya' && currentUser && (
          <MyTeamWorkspace
            team={activeTeam}
            competition={activeComp}
            currentUser={currentUser}
            onReload={loadData}
          />
        )}

        {activeTab === 'cari' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Direktori Tim Terbuka
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar tim yang sedang membuka rekrutmen pada {(directoryCompetition || activeComp).namaResmi}.
              </p>
            </div>
            <TeamDirectoryPanel
              competition={directoryCompetition || activeComp}
              teams={directoryTeams}
              myActiveTeamId={activeTeam.id}
              onReload={loadData}
              onCreateTeam={() => setMode('buat')}
              onGoToMyTeam={() => setActiveTab('tim-saya')}
            />
          </div>
        )}

        {activeTab === 'pengajuan' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Riwayat Pengajuan Bergabung
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau status pengajuan bergabung tim yang pernah kamu kirimkan.
              </p>
            </div>
            <MyJoinRequestsPanel
              requests={myRequests}
              hasActiveTeam
              onReload={loadData}
              onBrowseTeams={() => setActiveTab('cari')}
              onGoToMyTeam={() => setActiveTab('tim-saya')}
            />
          </div>
        )}
      </div>
    </div>
  );
};
