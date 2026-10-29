import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, LogOut, ArrowRight, AlertCircle } from 'lucide-react';
import { Competition, Team, User } from '../../types';
import { competitionService, teamService, userService } from '../../services/factory';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { validateTeamFormation } from '../../lib/teamRules';
import { TeamStatusBanner } from './components/TeamStatusBanner';
import { MemberList } from './components/MemberList';
import { LeaveTeamModal } from './components/LeaveTeamModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoading } from '../../components/ui/Skeleton';

export const TeamPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { notify } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      const [t, users] = await Promise.all([
        teamService.getTeamByUserId(currentUser.id),
        userService.getAll(),
      ]);
      setTeam(t);
      setAllUsers(users);

      if (t) {
        const comp = await competitionService.getBySlug(t.competitionSlug);
        setCompetition(comp);
      }
      setLoading(false);
    } catch {
      setLoadError('Gagal memuat data tim. Coba muat ulang.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleLeaveConfirm = async () => {
    if (!currentUser || !team) return;
    setLeaving(true);
    try {
      await teamService.leaveTeam(currentUser.id, team.id);
      setIsLeaveModalOpen(false);
      notify('Kamu keluar dari tim. Status tim kembali mencari anggota.', 'info');
      await loadData();
    } catch {
      notify('Gagal keluar tim. Coba lagi.', 'error');
    } finally {
      setLeaving(false);
    }
  };

  if (loading) return <PageLoading message="Memuat informasi tim..." />;
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

  if (!team || !competition) {
    return (
      <EmptyState
        icon={<Users className="w-8 h-8 text-blue-700" />}
        title="Kamu Belum Memiliki Tim Kompetisi"
        description="Pilih salah satu kompetisi Belmawa dan undang calon partner untuk membentuk tim yang solid."
        action={
          <div className="flex flex-wrap gap-2.5 justify-center">
            <Link to="/app/partner">
              <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Cari Partner Tim
              </Button>
            </Link>
            <Link to="/kompetisi">
              <Button size="sm" variant="outline">
                Lihat Katalog Lomba
              </Button>
            </Link>
          </div>
        }
      />
    );
  }

  const validation = validateTeamFormation(team, allUsers, competition);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Ruang Tim Mahasiswa
            </span>
            <span className="text-[11px] bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded-full border border-blue-200/60">
              {validation.acceptedCount}/{validation.maxAllowed} Anggota
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{team.nama}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Target Lomba: <strong className="text-slate-800">{competition.namaResmi}</strong>
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 self-start sm:self-center"
          onClick={() => setIsLeaveModalOpen(true)}
          leftIcon={<LogOut className="w-3.5 h-3.5" />}
        >
          Keluar dari Tim
        </Button>
      </div>

      {/* Team Status Banner */}
      <TeamStatusBanner
        isFormed={validation.isFormed}
        statusText={validation.statusText}
        competitionSlug={team.competitionSlug}
      />

      {/* Missing Roles Alert */}
      {validation.missingRoles.length > 0 && (
        <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-xs text-amber-950 flex flex-wrap items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-bold">Peran yang masih diperlukan:</span>
          {validation.missingRoles.map((r) => (
            <Badge key={r} color="amber" size="sm" className="capitalize">
              {r}
            </Badge>
          ))}
          <Link
            to="/app/partner"
            className="ml-auto font-bold text-blue-700 hover:text-blue-900 underline inline-flex items-center gap-1"
          >
            Cari partner dengan peran ini →
          </Link>
        </div>
      )}

      {/* Member Roster */}
      <MemberList
        members={team.anggota}
        allUsers={allUsers}
        currentUserId={currentUser?.id || ''}
      />

      <LeaveTeamModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={handleLeaveConfirm}
        isLoading={leaving}
      />
    </div>
  );
};