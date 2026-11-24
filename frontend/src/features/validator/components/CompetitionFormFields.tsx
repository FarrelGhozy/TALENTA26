import React from 'react';
import {
  CalendarDays,
  CheckSquare,
  Info,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import type { CompetitionFormState } from '../types';

interface CompetitionFormFieldsProps {
  form: CompetitionFormState;
  onChange: (next: CompetitionFormState) => void;
  compact?: boolean;
}

export const CompetitionFormFields: React.FC<CompetitionFormFieldsProps> = ({
  form,
  onChange,
  compact = false,
}) => {
  const sectionClass = compact
    ? 'rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-4'
    : 'rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-2xs';

  const updateField = <K extends keyof CompetitionFormState>(
    key: K,
    value: CompetitionFormState[K]
  ) => {
    onChange({ ...form, [key]: value });
  };

  const addRequirement = () => {
    updateField('requirements', [...form.requirements, '']);
  };

  const updateRequirement = (idx: number, val: string) => {
    const next = [...form.requirements];
    next[idx] = val;
    updateField('requirements', next);
  };

  const removeRequirement = (idx: number) => {
    updateField(
      'requirements',
      form.requirements.filter((_, i) => i !== idx)
    );
  };

  const addScheduleRow = () => {
    updateField('scheduleTimeline', [...form.scheduleTimeline, { label: '', tanggal: '' }]);
  };

  const updateScheduleRow = (idx: number, key: 'label' | 'tanggal', val: string) => {
    const next = [...form.scheduleTimeline];
    next[idx] = { ...next[idx], [key]: val };
    updateField('scheduleTimeline', next);
  };

  const removeScheduleRow = (idx: number) => {
    updateField(
      'scheduleTimeline',
      form.scheduleTimeline.filter((_, i) => i !== idx)
    );
  };

  return (
    <div className="space-y-5">
      {/* Bagian 1: Identitas & Deskripsi Lomba */}
      <section className={sectionClass} aria-label="Identitas dan deskripsi lomba">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
          <Info className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            1. Identitas &amp; Deskripsi Perlombaan
          </h3>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label="Nama Kompetisi"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="contoh: GEMASTIK XIX — Pengembangan Perangkat Lunak"
            required
          />
          <Input
            label="Penyelenggara"
            value={form.organizer}
            onChange={(e) => updateField('organizer', e.target.value)}
            placeholder="contoh: Belmawa Kemdiktisaintek"
            required
          />
          <Input
            label="Kategori Tampilan"
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            placeholder="contoh: PKM, GEMASTIK, ON-MIPA, Sains"
            required
          />
          <Select
            label="Tingkat Perlombaan"
            value={form.level}
            onChange={(e) => updateField('level', e.target.value)}
            options={[
              { value: 'lokal', label: 'Lokal / Wilayah' },
              { value: 'nasional', label: 'Nasional' },
              { value: 'internasional', label: 'Internasional' },
            ]}
          />
          <div className="sm:col-span-2">
            <Input
              label="Tautan Pedoman Resmi & Sumber Aturan (Opsional)"
              value={form.sourceUrl}
              onChange={(e) => updateField('sourceUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Deskripsi Singkat Perlombaan <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Jelaskan ruang lingkup lomba, fokus penilaian, dan target delegasi kampus..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>
      </section>

      {/* Bagian 2: Format & Aturan Dinamis Tim */}
      <section className={sectionClass} aria-label="Format kepesertaan dan aturan tim">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
          <Users className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            2. Format Kepesertaan &amp; Aturan Dinamis
          </h3>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Select
            label="Format Kepesertaan"
            value={form.format}
            onChange={(e) => {
              const nextFormat = e.target.value as 'individu' | 'beregu';
              onChange({
                ...form,
                format: nextFormat,
                minTeamMembers: nextFormat === 'individu' ? 1 : Math.max(2, form.minTeamMembers),
                maxTeamMembers: nextFormat === 'individu' ? 1 : Math.max(2, form.maxTeamMembers),
                requireRoles: nextFormat === 'individu' ? false : form.requireRoles,
                requireCrossStudyProgram:
                  nextFormat === 'individu' ? false : form.requireCrossStudyProgram,
              });
            }}
            options={[
              { value: 'beregu', label: 'Beregu (Tim)' },
              { value: 'individu', label: 'Individu (1 Peserta)' },
            ]}
          />

          <Select
            label="Status Rekrutmen Internal"
            value={form.registrationStatus}
            onChange={(e) =>
              updateField('registrationStatus', e.target.value as 'buka' | 'tutup')
            }
            options={[
              { value: 'buka', label: 'Buka rekrutmen internal' },
              { value: 'tutup', label: 'Tutup rekrutmen internal' },
            ]}
          />

          {form.format === 'beregu' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Min. Anggota Tim"
                type="number"
                min={1}
                value={String(form.minTeamMembers)}
                onChange={(e) => updateField('minTeamMembers', Number(e.target.value))}
              />
              <Input
                label="Maks. Anggota Tim"
                type="number"
                min={1}
                value={String(form.maxTeamMembers)}
                onChange={(e) => updateField('maxTeamMembers', Number(e.target.value))}
              />
            </div>
          )}

          <Input
            label="Tenggat Seleksi Internal (Opsional)"
            type="date"
            value={form.internalSelectionDeadline}
            onChange={(e) => updateField('internalSelectionDeadline', e.target.value)}
          />

          {form.format === 'beregu' && (
            <div className="sm:col-span-2">
              <Input
                label="Daftar Peran Tim (pisahkan koma)"
                value={form.requiredRolesText}
                onChange={(e) => updateField('requiredRolesText', e.target.value)}
                placeholder="contoh: Ketua Tim, Programmer, Desainer, Penulis"
              />
            </div>
          )}
        </div>

        {form.format === 'beregu' && (
          <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 space-y-2.5">
            <p className="text-[11px] font-extrabold text-slate-800">
              Syarat Tambahan Dinamis (Aktifkan hanya jika diwajibkan pada pedoman resmi lomba)
            </p>
            <div className="flex flex-wrap gap-2.5 text-xs">
              <label className="inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors">
                <input
                  type="checkbox"
                  checked={form.requireRoles}
                  onChange={(e) => updateField('requireRoles', e.target.checked)}
                  className="accent-blue-700 w-4 h-4"
                />
                <span className="font-semibold text-slate-700">
                  Peran anggota: {form.requireRoles ? 'Wajib terpenuhi' : 'Opsional (Saran)'}
                </span>
              </label>

              <label className="inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors">
                <input
                  type="checkbox"
                  checked={form.requireCrossStudyProgram}
                  onChange={(e) => updateField('requireCrossStudyProgram', e.target.checked)}
                  className="accent-blue-700 w-4 h-4"
                />
                <span className="font-semibold text-slate-700">
                  Lintas prodi: {form.requireCrossStudyProgram ? 'Wajib (≥2 prodi)' : 'Opsional'}
                </span>
              </label>

              <label className="inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors">
                <input
                  type="checkbox"
                  checked={form.singleTeamPerCompetition}
                  onChange={(e) => updateField('singleTeamPerCompetition', e.target.checked)}
                  className="accent-blue-700 w-4 h-4"
                />
                <span className="font-semibold text-slate-700">
                  Batas satu tim aktif per cabang
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-slate-600 leading-relaxed">
          <strong className="text-blue-950">Perilaku sistem otomatis:</strong>{' '}
          {form.format === 'individu'
            ? 'Fitur buat/cari tim disembunyikan otomatis dan mahasiswa yang memilih lomba ini langsung diarahkan ke Ruang Persiapan.'
            : 'Mahasiswa melihat 3 jalur tim (Buat Tim, Cari Tim Terbuka, Gabung Kode); roadmap tetap terbuka sebelum tim lengkap; tombol Daftar Seleksi Internal aktif saat seluruh syarat wajib terpenuhi.'}
        </div>
      </section>

      {/* Bagian 3: Syarat Pendaftaran & Jadwal Lomba (Editor Terstruktur) */}
      <section className={sectionClass} aria-label="Syarat pendaftaran dan jadwal perlombaan">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Syarat Pendaftaran */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Syarat Pendaftaran
                </h3>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addRequirement}
                leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                Tambah Syarat
              </Button>
            </div>

            {form.requirements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  Belum ada butir syarat pendaftaran yang dicatat.
                </p>
                <Button type="button" size="sm" variant="ghost" onClick={addRequirement}>
                  + Tambahkan Butir Pertama
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {form.requirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={req}
                      aria-label={`Syarat pendaftaran butir ${idx + 1}`}
                      onChange={(e) => updateRequirement(idx, e.target.value)}
                      placeholder="contoh: Mahasiswa aktif S1 UNIDA Gontor"
                      className="flex-1 min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="danger-outline"
                      className="px-2.5 shrink-0"
                      aria-label={`Hapus syarat butir ${idx + 1}`}
                      onClick={() => removeRequirement(idx)}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Jadwal / Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Jadwal &amp; Lini Masa
                </h3>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addScheduleRow}
                leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                Tambah Tahap
              </Button>
            </div>

            {form.scheduleTimeline.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  Belum ada jadwal tahap perlombaan. Tambahkan agar tampil pada katalog publik.
                </p>
                <Button type="button" size="sm" variant="ghost" onClick={addScheduleRow}>
                  + Tambahkan Tahap Jadwal
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {form.scheduleTimeline.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_150px_auto] gap-2 items-center p-2.5 rounded-xl bg-white border border-slate-200"
                  >
                    <input
                      type="text"
                      value={row.label}
                      aria-label={`Nama tahap jadwal ${idx + 1}`}
                      onChange={(e) => updateScheduleRow(idx, 'label', e.target.value)}
                      placeholder="contoh: Pengumpulan Proposal"
                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                    <input
                      type="text"
                      value={row.tanggal}
                      aria-label={`Tanggal tahap jadwal ${idx + 1}`}
                      onChange={(e) => updateScheduleRow(idx, 'tanggal', e.target.value)}
                      placeholder="15 Mar 2026"
                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="danger-outline"
                      className="px-2.5 justify-self-end"
                      aria-label={`Hapus tahap jadwal ${idx + 1}`}
                      onClick={() => removeScheduleRow(idx)}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
