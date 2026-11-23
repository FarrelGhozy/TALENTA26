import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Info,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Competition, TeamDirectoryItem } from '../../../types';
import { teamService } from '@talenta/services';
import { useToast } from '../../../components/ui/Toast';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';

interface TeamDirectoryPanelProps {
  competition: Competition;
  teams: TeamDirectoryItem[];
  myActiveTeamId: string | null;
  onReload: () => Promise<void>;
  onCreateTeam: () => void;
  onGoToMyTeam: () => void;
}

export const TeamDirectoryPanel: React.FC<TeamDirectoryPanelProps> = ({
  competition,
  teams,
  myActiveTeamId,
  onReload,
  onCreateTeam,
  onGoToMyTeam,
}) => {
  const { notify } = useToast();

  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('semua');

  // Modal ajukan gabung
  const [applyTarget, setApplyTarget] = useState<TeamDirectoryItem | null>(null);
  const [preferredRole, setPreferredRole] = useState('');
  const [applyNote, setApplyNote] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    (competition.komposisi.peranWajib || []).forEach((r) => set.add(r));
    teams.forEach((t) => t.neededRoles.forEach((r) => set.add(r)));
    return Array.from(set);
  }, [competition, teams]);

  const filteredTeams = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const role = roleFilter.toLowerCase();
    return teams.filter((t) => {
      if (role !== 'semua') {
        if (!t.neededRoles.some((r) => r.toLowerCase().includes(role))) return false;
      }
      if (q) {
        const hay = [
          t.name,
          t.description,
          t.leader.fullName,
          t.leader.studyProgram,
          ...t.neededRoles,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [teams, searchText, roleFilter]);

  const openApplyModal = (team: TeamDirectoryItem) => {
    setApplyTarget(team);
    setPreferredRole(team.neededRoles[0] || '');
    setApplyNote('');
  };

  const handleSubmitApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyTarget || !teamService.requestJoin) return;
    setSubmittingApply(true);
    try {
      await teamService.requestJoin(applyTarget.id, {
        preferredRole: preferredRole.trim() || undefined,
        note: applyNote.trim() || undefined,
      });
      notify(
        `Pengajuan bergabung ke ${applyTarget.name} berhasil dikirim. Menunggu persetujuan ketua tim.`,
      );
      setApplyTarget(null);
      await onReload();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Gagal mengirim pengajuan bergabung.', 'error');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!teamService.cancelJoinRequest) return;
    setCancellingId(requestId);
    try {
      await teamService.cancelJoinRequest(requestId);
      notify('Pengajuan bergabung berhasil dibatalkan.', 'info');
      await onReload();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Gagal membatalkan pengajuan.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {myActiveTeamId && (
        <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-blue-950 leading-relaxed">
              Kamu sudah tergabung dalam tim aktif pada{' '}
              <strong>{competition.namaResmi}</strong>. Direktori di bawah bersifat referensi
              (termasuk pratinjau lowongan timmu bila rekrutmen terbuka).
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 bg-white"
            onClick={onGoToMyTeam}
          >
            Kembali ke Ruang Tim Saya
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 cols: Search + Cards + Empty state */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Role Filter */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 relative">
              <Search
                className="w-4 h-4 text-slate-400 pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Cari nama tim atau kebutuhan skill..."
                aria-label="Cari nama tim atau kebutuhan skill"
                className="pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter kebutuhan peran"
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 min-h-[42px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="semua">Semua Peran</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {(searchText || roleFilter !== 'semua') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchText('');
                  setRoleFilter('semua');
                }}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                Reset
              </Button>
            )}
          </div>

          {/* Team Cards */}
          {filteredTeams.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTeams.map((team) => {
                const isPending = team.myRequestStatus === 'menunggu';
                const canApply = !myActiveTeamId && !team.isMyTeam && !isPending;
                return (
                  <article
                    key={team.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between gap-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge color="emerald" size="sm" dot>
                          Membuka rekrutmen
                        </Badge>
                        <span className="text-[11px] font-bold text-slate-400 truncate max-w-[140px]">
                          {competition.kategori}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">{team.name}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Ketua: <strong className="text-slate-700">{team.leader.fullName}</strong>
                          {team.leader.studyProgram ? ` · ${team.leader.studyProgram}` : ''}
                        </p>
                        {team.description && (
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">
                            {team.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Anggota disetujui</span>
                          <strong className="text-slate-900">
                            {team.activeMemberCount} dari {team.maxAllowed}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Posisi dibutuhkan</span>
                          <strong className="text-slate-900">
                            {team.neededRoles.length > 0
                              ? `${team.neededRoles.length} peran`
                              : `${team.slotsRemaining} slot`}
                          </strong>
                        </div>
                      </div>

                      {team.neededRoles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {team.neededRoles.map((role) => (
                            <Badge key={role} color="blue" size="sm">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {team.isMyTeam ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={onGoToMyTeam}
                        >
                          Ini Tim Kamu &mdash; Buka Ruang Tim
                        </Button>
                      ) : isPending && team.myRequestId ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Menunggu Ketua</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            isLoading={cancellingId === team.myRequestId}
                            onClick={() => handleCancelRequest(team.myRequestId!)}
                            leftIcon={<X className="w-3.5 h-3.5" aria-hidden="true" />}
                          >
                            Batal
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="w-full"
                          disabled={!canApply}
                          onClick={() => openApplyModal(team)}
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                        >
                          {myActiveTeamId ? 'Sudah Punya Tim Aktif' : 'Ajukan Gabung'}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Friendly Empty / No-Dead-End Box */}
          <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 space-y-2.5">
            <h3 className="text-sm font-extrabold text-slate-900">
              {filteredTeams.length === 0
                ? 'Belum ada tim terbuka yang cocok — dan itu bukan error.'
                : 'Belum menemukan tim yang pas?'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              Kamu bisa membuat tim sendiri dan membuka rekrutmen, mengubah filter pencarian, atau
              kembali saat tim lain membuka lowongan. Kamu juga tetap bisa membuka roadmap persiapan
              lebih awal.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {!myActiveTeamId && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onCreateTeam}
                  leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  Buat Tim Baru
                </Button>
              )}
              <Link to={`/app/kompetisi/${competition.slug}/persiapan`}>
                <Button type="button" size="sm" variant="ghost">
                  Buka Roadmap Persiapan
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Process & Privacy */}
        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-700" aria-hidden="true" />
              Bagaimana prosesnya?
            </h3>
            <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
              <li>Pilih tim dengan target kompetisi yang sama.</li>
              <li>Baca kebutuhan posisi atau keahlian tim.</li>
              <li>Kirim pengajuan bergabung beserta peran pilihanmu.</li>
              <li>Ketua tim menerima atau menolak pengajuan tersebut.</li>
              <li>Jika disetujui, kamu otomatis masuk daftar anggota aktif.</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-2.5">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              Jaga privasi profil
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Calon ketua cukup melihat nama tampilan, program studi, peran, keahlian, dan
              pengalaman relevan. NIM, email, serta nomor telepon tidak ditampilkan di direktori
              maupun kartu pelamar.
            </p>
          </div>
        </aside>
      </div>

      {/* Modal Ajukan Gabung */}
      <Modal
        isOpen={Boolean(applyTarget)}
        onClose={() => setApplyTarget(null)}
        title={applyTarget ? `Ajukan Gabung ke ${applyTarget.name}` : 'Ajukan Gabung'}
      >
        {applyTarget && (
          <form onSubmit={handleSubmitApply} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Ketua tim ({applyTarget.leader.fullName}) akan melihat profil ringkas kamu (prodi,
              peran, keahlian, pengalaman) untuk memutuskan pengajuan ini.
            </p>

            {applyTarget.neededRoles.length > 0 && (
              <div className="space-y-1.5">
                <span className="block text-xs font-bold text-slate-700">
                  Pilih posisi yang diminati (opsional)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {applyTarget.neededRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setPreferredRole(role)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                        preferredRole === role
                          ? 'bg-blue-50 border-blue-500 text-blue-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Input
              label="Peran yang diajukan"
              value={preferredRole}
              onChange={(e) => setPreferredRole(e.target.value)}
              placeholder="Contoh: Penulis Proposal / Analis Data"
            />

            <div>
              <label
                htmlFor="join-note"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Catatan singkat untuk ketua tim (opsional)
              </label>
              <textarea
                id="join-note"
                rows={3}
                value={applyNote}
                onChange={(e) => setApplyNote(e.target.value)}
                placeholder="Ceritakan singkat kontribusi atau pengalaman relevan yang bisa kamu bantu..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApplyTarget(null)}
                disabled={submittingApply}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={submittingApply}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                Kirim Pengajuan
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
