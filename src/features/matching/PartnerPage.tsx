import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info } from 'lucide-react';
import { Invite, MatchCandidate, Team, User } from '../../types';
import { matchingService, teamService, userService } from '../../services/factory';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Tabs } from '../../components/ui/Tabs';
import { PageLoading } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { PartnerCard } from './components/PartnerCard';
import { InviteList } from './components/InviteList';
import { FallbackActions } from './components/FallbackActions';

const formatInviteStatus = (s: Invite['status']) => {
  switch (s) {
    case 'diajukan':
      return 'Diajukan';
    case 'diterima':
      return 'Diterima';
    case 'ditolak':
      return 'Ditolak';
    case 'kedaluwarsa':
      return 'Kedaluwarsa';
    default:
      return s;
  }
};

export { formatInviteStatus };

export const PartnerPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { notify } = useToast();
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [targetSlug, setTargetSlug] = useState('');
  const [activeTab, setActiveTab] = useState('rekomendasi');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoadError('');
      const [cands, invs, users, team, profile] = await Promise.all([
        matchingService.getMatchCandidates(currentUser.id),
        matchingService.getInvites(currentUser.id),
        userService.getAll(),
        teamService.getTeamByUserId(currentUser.id),
        userService.getProfile(currentUser.id),
      ]);
      setCandidates(cands);
      setInvites(invs);
      setAllUsers(users);
      setMyTeam(team);
      setTargetSlug(profile?.targetKompetisiSlug || team?.competitionSlug || '');
      setLoading(false);
    } catch {
      setLoadError('Gagal memuat data partner. Coba muat ulang.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleSendInvite = async (targetUserId: string) => {
    if (!currentUser) return;
    if (!targetSlug) {
      notify('Pilih target kompetisi dulu di halaman Profil.', 'error');
      return;
    }
    try {
      let teamId = myTeam?.id;
      if (!teamId || myTeam?.competitionSlug !== targetSlug) {
        const newTeam = await teamService.createTeam(targetSlug, currentUser.id, `Tim ${currentUser.nama}`);
        setMyTeam(newTeam);
        teamId = newTeam.id;
      }
      await matchingService.sendInvite(currentUser.id, targetUserId, teamId);
      notify('Undangan tim berhasil terkirim.');
      await loadData();
    } catch {
      notify('Gagal mengirim undangan. Coba lagi.', 'error');
    }
  };

  const handleCancelInvite = async (targetUserId: string) => {
    const inv = invites.find((i) => i.dari === currentUser?.id && i.ke === targetUserId && i.status === 'diajukan');
    if (!inv) return;
    try {
      await matchingService.respondInvite(inv.id, 'ditolak');
      notify('Undangan dibatalkan. Kamu bisa mengundang ulang nanti.', 'info');
      await loadData();
    } catch {
      notify('Gagal membatalkan undangan.', 'error');
    }
  };

  const handleRespondInvite = async (inviteId: string, status: 'diterima' | 'ditolak') => {
    try {
      await matchingService.respondInvite(inviteId, status);
      notify(status === 'diterima' ? 'Undangan diterima! Cek susunan di halaman Tim Saya.' : 'Undangan ditolak.', 'info');
      await loadData();
    } catch {
      notify('Gagal memproses undangan.', 'error');
    }
  };

  if (loading) return <PageLoading message="Mencari kecocokan rekan tim..." />;
  if (loadError) {
    return (
      <div className="p-12 text-center space-y-4">
        <p role="alert" className="text-xs text-rose-600 font-semibold">{loadError}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setLoading(true); loadData(); }}
        >
          Muat Ulang
        </Button>
      </div>
    );
  }

  const inviteByUser = new Map<string, Invite['status']>();
  invites
    .filter((i) => i.dari === currentUser?.id)
    .forEach((i) => {
      if (!inviteByUser.has(i.ke) || i.status === 'diajukan') inviteByUser.set(i.ke, i.status);
    });

  const incomingCount = invites.filter((i) => i.ke === currentUser?.id && i.status === 'diajukan').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Modul Kolaborasi
            </span>
            <span className="text-[11px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
              {candidates.length} Rekomendasi
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Rekomendasi Partner Tim
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sistem mencocokkan rekan berdasarkan target kompetisi yang sama, keahlian komplementer, dan jadwal ketersediaan.
          </p>
        </div>

        <Link to="/app/tim">
          <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Status Tim Saya
          </Button>
        </Link>
      </div>

      {/* Algorithm Transparency Pill Box */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-sky-50/40 to-slate-50 border border-blue-100 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 space-y-1">
          <span className="font-bold text-slate-800 block">
            Prinsip Kecocokan Partner:
          </span>
          <p className="leading-relaxed text-[11px] text-slate-500">
            Skor kecocokan dihitung secara adil berdasarkan: <strong>Kesesuaian Target Kompetisi (40%)</strong>, <strong>Komplementaritas Peran & Skill (30%)</strong>, <strong>Sinkronisasi Hari Belajar (20%)</strong>, dan <strong>Diversitas Angkatan/Prodi (10%)</strong>. Skor ini adalah alat bantu pencarian, bukan penilaian mutlak kecerdasan.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'rekomendasi', label: 'Calon Partner Relevan', badge: candidates.length },
          { id: 'undangan', label: 'Kelola Undangan', badge: incomingCount > 0 ? `${incomingCount} Baru` : undefined },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Panels */}
      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'rekomendasi' && (
          <div className="space-y-6">
            {candidates.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-slate-200/90 p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto text-xl">
                  🔍
                </div>
                <h4 className="text-sm font-bold text-slate-800">Belum Ada Calon Partner dengan Target Sama</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Belum ada mahasiswa lain di institusimu yang memilih target kompetisi yang sama saat ini.
                </p>
                <FallbackActions />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((cand) => (
                  <PartnerCard
                    key={cand.user.id}
                    candidate={cand}
                    inviteStatus={inviteByUser.get(cand.user.id)}
                    onInvite={handleSendInvite}
                    onCancel={handleCancelInvite}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'undangan' && (
          <InviteList
            invites={invites}
            allUsers={allUsers}
            currentUserId={currentUser?.id || ''}
            onRespond={handleRespondInvite}
          />
        )}
      </div>
    </div>
  );
};