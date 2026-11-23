import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Flag, Lock, Plus, Users, X } from 'lucide-react';
import { Competition, User } from '../../../types';
import { CreateTeamOptions } from '../../../services/types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';

interface TeamCreateFormProps {
  competition: Competition;
  currentUser: User;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (teamName: string, options: CreateTeamOptions) => Promise<void>;
}

const DEFAULT_ROLE_SUGGESTIONS = [
  'Penulis Proposal',
  'Analis Data',
  'Desain UI/UX',
  'Programmer',
  'Riset & Literatur',
  'Presentasi & Pitch',
];

export const TeamCreateForm: React.FC<TeamCreateFormProps> = ({
  competition,
  currentUser,
  submitting,
  onCancel,
  onSubmit,
}) => {
  const minMembers = Math.max(1, competition.komposisi.min || 2);
  const maxMembers = Math.max(minMembers, competition.komposisi.max || 5);

  const [teamName, setTeamName] = useState('');
  const [targetMaxMembers, setTargetMaxMembers] = useState(maxMembers);
  const [description, setDescription] = useState('');
  const [recruitmentType, setRecruitmentType] = useState<'terbuka' | 'privat'>('terbuka');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(() => {
    const compRoles = (competition.komposisi.peranWajib || []).filter(
      (r) => !['ketua tim', 'anggota', 'anggota tim', 'peserta'].includes(r.toLowerCase())
    );
    return compRoles.length > 0 ? compRoles.slice(0, 2) : ['Penulis Proposal', 'Analis Data'];
  });
  const [customRole, setCustomRole] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [formError, setFormError] = useState('');

  const rolePool = useMemo(() => {
    const set = new Set<string>([
      ...(competition.komposisi.peranWajib || []).filter(
        (r) => !['ketua tim', 'anggota', 'anggota tim', 'peserta'].includes(r.toLowerCase())
      ),
      ...DEFAULT_ROLE_SUGGESTIONS,
      ...selectedRoles,
    ]);
    return Array.from(set);
  }, [competition.komposisi.peranWajib, selectedRoles]);

  const capacityOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [];
    for (let n = minMembers; n <= maxMembers; n++) {
      opts.push({ value: String(n), label: `${n} anggota` });
    }
    return opts;
  }, [minMembers, maxMembers]);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]
    );
  };

  const handleAddCustomRole = () => {
    const trimmed = customRole.trim();
    if (!trimmed) return;
    if (!selectedRoles.includes(trimmed)) {
      setSelectedRoles((prev) => [...prev, trimmed]);
    }
    setCustomRole('');
    setShowCustomInput(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = teamName.trim();
    if (cleanName.length < 3) {
      setFormError('Nama tim minimal 3 karakter.');
      return;
    }
    setFormError('');
    await onSubmit(cleanName, {
      description: description.trim() || undefined,
      neededRoles: selectedRoles,
      recruitmentType,
      targetMaxMembers,
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Ketua Tim &middot; Formulir Pembentukan
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Buat ruang tim dan buka rekrutmen
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cukup satu anggota yang menjadi ketua dan membuat tim. Anggota lain dapat bergabung setelah disetujui atau melalui kode undangan.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          leftIcon={<ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />}
        >
          Kembali ke Pilihan Jalur
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form utama */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5"
        >
          <h2 className="text-sm font-extrabold text-slate-900">Identitas dan kebutuhan tim</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Target kompetisi</label>
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                {competition.namaResmi}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Ketua Tim</label>
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                {currentUser.nama} (otomatis dari akun)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nama Tim"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                setFormError('');
              }}
              placeholder="Contoh: Tim Riset Alpha"
              required
              error={formError || undefined}
            />
            <Select
              label="Jumlah anggota maksimal (sesuai aturan lomba)"
              value={String(targetMaxMembers)}
              onChange={(e) => setTargetMaxMembers(Number(e.target.value))}
              options={capacityOptions}
            />
          </div>

          {/* Kebutuhan posisi / skill */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Kebutuhan posisi / keahlian
            </label>
            <div className="flex flex-wrap gap-2">
              {rolePool.map((role) => {
                const active = selectedRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer min-h-[36px] ${
                      active
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />}
                    <span>{role}</span>
                  </button>
                );
              })}

              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-blue-300 text-blue-700 hover:bg-blue-50 cursor-pointer min-h-[36px]"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Tambah Kebutuhan</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomRole();
                      }
                    }}
                    placeholder="Nama peran/skill..."
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[36px]"
                  />
                  <Button type="button" size="sm" onClick={handleAddCustomRole}>
                    Tambah
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomRole('');
                    }}
                    aria-label="Tutup input kebutuhan kustom"
                    className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Deskripsi singkat proyek */}
          <div>
            <label htmlFor="team-desc" className="block text-xs font-bold text-slate-700 mb-1.5">
              Deskripsi singkat proyek / fokus tim
            </label>
            <textarea
              id="team-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan gagasan awal atau kriteria rekan yang kamu cari..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Pengaturan rekrutmen */}
          <fieldset className="space-y-2.5">
            <legend className="text-xs font-bold text-slate-700">Pengaturan rekrutmen</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  recruitmentType === 'terbuka'
                    ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="recruitmentType"
                  value="terbuka"
                  checked={recruitmentType === 'terbuka'}
                  onChange={() => setRecruitmentType('terbuka')}
                  className="mt-0.5 accent-blue-700"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                    Tim Terbuka
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Tim muncul dalam direktori pencarian dan menerima pengajuan bergabung dari mahasiswa lain.
                  </p>
                </div>
              </label>

              <label
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  recruitmentType === 'privat'
                    ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="recruitmentType"
                  value="privat"
                  checked={recruitmentType === 'privat'}
                  onChange={() => setRecruitmentType('privat')}
                  className="mt-0.5 accent-blue-700"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                    Tim Privat
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Tim tidak muncul di direktori pencarian. Anggota bergabung menggunakan kode undangan dari ketua.
                  </p>
                </div>
              </label>
            </div>
          </fieldset>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              Persetujuan anggota dilakukan ketua tim; tidak ada pemeriksaan verifikator prestasi di tahap ini.
            </p>
            <Button
              type="submit"
              size="md"
              isLoading={submitting}
              rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
            >
              Buat Tim &amp; Buka Ruang
            </Button>
          </div>
        </form>

        {/* Pratinjau Rekrutmen */}
        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Pratinjau Rekrutmen
              </h3>
              <Badge color={recruitmentType === 'terbuka' ? 'emerald' : 'slate'} size="sm" dot>
                {recruitmentType === 'terbuka' ? 'Mencari Anggota' : 'Tim Privat'}
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="text-lg font-black text-slate-900 break-words">
                {teamName.trim() || 'Nama Tim Kamu'}
              </div>
              <p className="text-xs text-slate-500">
                Ketua: <strong className="text-slate-700">{currentUser.nama}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Kompetisi: <strong className="text-slate-700">{competition.namaResmi}</strong>
              </p>
            </div>

            {description.trim() && (
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {description.trim()}
              </p>
            )}

            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Anggota saat dibuat</span>
                <strong className="text-slate-900">1 dari {targetMaxMembers}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Minimal siap seleksi</span>
                <strong className="text-slate-900">{minMembers} anggota</strong>
              </div>
              {selectedRoles.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] text-slate-500 block mb-1.5">Kebutuhan utama:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRoles.map((r) => (
                      <Badge key={r} color="blue" size="sm">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-slate-600">
            <Flag className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              Jumlah anggota tidak boleh melebihi batas kompetisi ({minMembers}–{maxMembers} anggota). Batas ini berasal langsung dari konfigurasi pengelola lomba.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
