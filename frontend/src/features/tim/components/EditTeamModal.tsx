import React, { useEffect, useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Competition, Team } from '../../../types';
import { UpdateTeamOptions } from '../../../services/types';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

interface EditTeamModalProps {
  isOpen: boolean;
  team: Team;
  competition: Competition;
  onClose: () => void;
  onSave: (options: UpdateTeamOptions) => Promise<void>;
}

const DEFAULT_ROLES = [
  'Penulis Proposal',
  'Analis Data',
  'Desain UI/UX',
  'Programmer',
  'Riset & Literatur',
  'Presentasi & Pitch',
];

export const EditTeamModal: React.FC<EditTeamModalProps> = ({
  isOpen,
  team,
  competition,
  onClose,
  onSave,
}) => {
  const activeCount = team.anggota.filter((m) => m.status === 'diterima').length;
  const minAllowedCap = Math.max(competition.komposisi.min || 1, activeCount);
  const maxAllowedCap = Math.max(minAllowedCap, competition.komposisi.max || minAllowedCap);

  const [teamName, setTeamName] = useState(team.nama);
  const [description, setDescription] = useState(team.description || '');
  const [neededRoles, setNeededRoles] = useState<string[]>(team.neededRoles || []);
  const [customRole, setCustomRole] = useState('');
  const [targetMaxMembers, setTargetMaxMembers] = useState(
    Math.min(Math.max(team.targetMaxMembers ?? maxAllowedCap, minAllowedCap), maxAllowedCap)
  );
  const [recruitmentType, setRecruitmentType] = useState<'terbuka' | 'privat'>(
    team.recruitmentType || 'terbuka'
  );
  const [isRecruiting, setIsRecruiting] = useState(team.isRecruiting !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTeamName(team.nama);
    setDescription(team.description || '');
    setNeededRoles(team.neededRoles || []);
    setTargetMaxMembers(
      Math.min(Math.max(team.targetMaxMembers ?? maxAllowedCap, minAllowedCap), maxAllowedCap)
    );
    setRecruitmentType(team.recruitmentType || 'terbuka');
    setIsRecruiting(team.isRecruiting !== false);
    setError('');
  }, [isOpen, team, minAllowedCap, maxAllowedCap]);

  const isFullAtSelection = activeCount >= targetMaxMembers;

  const rolePool = useMemo(() => {
    const set = new Set<string>([
      ...(competition.komposisi.peranWajib || []).filter(
        (r) => !['ketua tim', 'anggota', 'anggota tim', 'peserta'].includes(r.toLowerCase())
      ),
      ...DEFAULT_ROLES,
      ...neededRoles,
    ]);
    return Array.from(set);
  }, [competition.komposisi.peranWajib, neededRoles]);

  const capOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [];
    for (let n = minAllowedCap; n <= maxAllowedCap; n++) {
      opts.push({ value: String(n), label: `${n} anggota` });
    }
    return opts;
  }, [minAllowedCap, maxAllowedCap]);

  const toggleRole = (role: string) => {
    setNeededRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const addCustomRole = () => {
    const trimmed = customRole.trim();
    if (!trimmed) return;
    if (!neededRoles.includes(trimmed)) {
      setNeededRoles((prev) => [...prev, trimmed]);
    }
    setCustomRole('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim().length < 3) {
      setError('Nama tim minimal 3 karakter.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        teamName: teamName.trim(),
        description: description.trim() || null,
        neededRoles,
        targetMaxMembers,
        recruitmentType,
        isRecruiting: recruitmentType === 'terbuka' && !isFullAtSelection ? isRecruiting : false,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan perubahan tim.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pengaturan & Info Tim">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nama Tim"
          value={teamName}
          onChange={(e) => {
            setTeamName(e.target.value);
            setError('');
          }}
          error={error || undefined}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Batas Anggota Maksimal"
            value={String(targetMaxMembers)}
            onChange={(e) => setTargetMaxMembers(Number(e.target.value))}
            options={capOptions}
          />
          <Select
            label="Tipe Rekrutmen"
            value={recruitmentType}
            onChange={(e) => {
              const next = e.target.value as 'terbuka' | 'privat';
              setRecruitmentType(next);
              if (next === 'privat') setIsRecruiting(false);
              else if (!isFullAtSelection) setIsRecruiting(true);
            }}
            options={[
              { value: 'terbuka', label: 'Tim Terbuka (Tampil di Direktori)' },
              { value: 'privat', label: 'Tim Privat (Hanya Kode Undangan)' },
            ]}
          />
        </div>

        {recruitmentType === 'terbuka' && (
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={!isFullAtSelection && isRecruiting}
              disabled={isFullAtSelection}
              onChange={(e) => setIsRecruiting(e.target.checked)}
              className="mt-0.5 accent-blue-700"
            />
            <span className="text-slate-700 leading-relaxed">
              {isFullAtSelection
                ? `Kapasitas tim sudah penuh (${activeCount}/${targetMaxMembers}). Naikkan batas anggota atau keluarkan anggota jika ingin membuka lowongan lagi.`
                : 'Tampilkan tim di Direktori Cari Tim dan terima pengajuan bergabung baru.'}
            </span>
          </label>
        )}

        <div>
          <label htmlFor="edit-team-desc" className="block text-xs font-bold text-slate-700 mb-1">
            Deskripsi Singkat Proyek
          </label>
          <textarea
            id="edit-team-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan gagasan proyek dan ekspektasi kolaborasi tim..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-bold text-slate-700">Kebutuhan Posisi / Keahlian</span>
          <div className="flex flex-wrap gap-1.5">
            {rolePool.map((role) => {
              const active = neededRoles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                    active
                      ? 'bg-blue-50 border-blue-500 text-blue-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {active && <Check className="w-3 h-3" aria-hidden="true" />}
                  <span>{role}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomRole();
                }
              }}
              placeholder="Tambah kebutuhan lain..."
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <Button type="button" size="sm" variant="outline" onClick={addCustomRole} leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}>
              Tambah
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={saving} leftIcon={<X className="w-3.5 h-3.5" aria-hidden="true" />}>
            Batal
          </Button>
          <Button type="submit" size="sm" isLoading={saving}>
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </Modal>
  );
};
