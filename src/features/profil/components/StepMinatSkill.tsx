import React, { useState } from 'react';
import { Sparkles, Plus, X, Check } from 'lucide-react';
import { User, Skill } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

interface StepMinatSkillProps {
  user: Partial<User>;
  onChange: (field: keyof User, val: unknown) => void;
}

const PRESET_MINAT = [
  'PKM Belmawa',
  'GEMASTIK',
  'KRI Robotika',
  'KIBM Bisnis',
  'UI/UX Design',
  'Artificial Intelligence',
  'Data Science',
  'Karya Tulis Ilmiah',
];

const PRESET_SKILLS = [
  { nama: 'Python', level: 2 },
  { nama: 'Figma', level: 3 },
  { nama: 'Penulisan Proposal', level: 2 },
  { nama: 'Analisis Data', level: 2 },
  { nama: 'Public Speaking', level: 2 },
  { nama: 'React / Web', level: 2 },
  { nama: 'Machine Learning', level: 1 },
  { nama: 'Statistika', level: 2 },
];

export const StepMinatSkill: React.FC<StepMinatSkillProps> = ({ user, onChange }) => {
  const [newSkill, setNewSkill] = useState('');
  const [skillLevel, setSkillLevel] = useState(2);
  const [newMinat, setNewMinat] = useState('');
  const [localError, setLocalError] = useState('');

  const currentSkills: Skill[] = user.skill || [];
  const currentMinat: string[] = user.minat || [];
  const currentRoles: string[] = user.peranBisa || [];

  const addSkill = (nameInput?: string, levelInput?: number) => {
    const name = (nameInput || newSkill).trim();
    const lvl = levelInput !== undefined ? levelInput : skillLevel;
    if (!name) return;
    if (currentSkills.some((s) => s.nama.toLowerCase() === name.toLowerCase())) {
      setLocalError(`Keahlian "${name}" sudah ada di daftar.`);
      return;
    }
    if (currentSkills.length >= 8) {
      setLocalError('Maksimal 8 keahlian. Hapus salah satu untuk menambah.');
      return;
    }
    onChange('skill', [...currentSkills, { nama: name, level: lvl }]);
    setNewSkill('');
    setLocalError('');
  };

  const removeSkill = (name: string) => {
    onChange(
      'skill',
      currentSkills.filter((s) => s.nama !== name)
    );
  };

  const addMinat = (minatInput?: string) => {
    const m = (minatInput || newMinat).trim();
    if (!m) return;
    if (currentMinat.some((x) => x.toLowerCase() === m.toLowerCase())) return;
    if (currentMinat.length >= 5) {
      setLocalError('Maksimal 5 minat. Hapus salah satu untuk menambah.');
      return;
    }
    onChange('minat', [...currentMinat, m]);
    setNewMinat('');
    setLocalError('');
  };

  const removeMinat = (m: string) => {
    onChange(
      'minat',
      currentMinat.filter((item) => item !== m)
    );
  };

  const toggleRole = (r: string) => {
    if (currentRoles.includes(r)) {
      onChange(
        'peranBisa',
        currentRoles.filter((item) => item !== r)
      );
    } else {
      onChange('peranBisa', [...currentRoles, r]);
    }
  };

  const availableRoles = [
    { id: 'ketua', label: 'Ketua Tim / Koordinator', desc: 'Memimpin visi dan timeline' },
    { id: 'penulis', label: 'Penulis Proposal / Paper', desc: 'Menyusun naskah ilmiah & sitasi' },
    { id: 'riset', label: 'Peneliti / Analis Data', desc: 'Riset pustaka & metodologi' },
    { id: 'programmer', label: 'Programmer / Engineer', desc: 'Membangun aplikasi / prototipe' },
    { id: 'desainer', label: 'Desainer UI/UX / Media', desc: 'Visual poster, prototipe & slide' },
    { id: 'presenter', label: 'Presenter / Pitcher', desc: 'Pemaparan di hadapan dewan juri' },
  ];

  return (
    <div className="space-y-6">
      {localError && (
        <div role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
          {localError}
        </div>
      )}

      {/* Bidang Minat */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="input-minat" className="block text-xs font-bold text-slate-800">
            Bidang Minat Kompetisi ({currentMinat.length}/5)
          </label>
          <span className="text-[11px] text-slate-400">Pilih atau ketik sendiri</span>
        </div>

        {/* Input & Add */}
        <div className="flex gap-2">
          <Input
            id="input-minat"
            placeholder="Ketik minat baru (misal: PKM-RE, AI, Desain Produk)"
            value={newMinat}
            onChange={(e) => setNewMinat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMinat();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => addMinat()}
            disabled={currentMinat.length >= 5}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Tambah
          </Button>
        </div>

        {/* Preset Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-600" />
            Rekomendasi Cepat:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_MINAT.map((p) => {
              const isAdded = currentMinat.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  disabled={isAdded || currentMinat.length >= 5}
                  onClick={() => addMinat(p)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    isAdded
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-default opacity-60'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  {isAdded ? `✓ ${p}` : `+ ${p}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Active Minat Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1 min-h-[36px]">
          {currentMinat.map((m) => (
            <span
              key={m}
              className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 border border-blue-200/80 rounded-full px-3 py-1 text-xs font-bold shadow-2xs"
            >
              {m}
              <button
                type="button"
                onClick={() => removeMinat(m)}
                className="hover:text-rose-600 cursor-pointer rounded-full p-0.5"
                aria-label={`Hapus minat ${m}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {currentMinat.length === 0 && (
            <span className="text-xs text-slate-400 italic">Belum ada minat yang dipilih (minimal 1).</span>
          )}
        </div>
      </div>

      {/* Keahlian Utama */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label htmlFor="input-skill" className="block text-xs font-bold text-slate-800">
            Keahlian & Kemampuan Utama ({currentSkills.length}/8)
          </label>
          <span className="text-[11px] text-slate-400">Level 1 (Dasar) s.d. Level 3 (Mahir)</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Input
              id="input-skill"
              placeholder="Ketik keahlian (misal: Python, Figma, Metodologi Riset)"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill();
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <select
              aria-label="Level keahlian"
              value={skillLevel}
              onChange={(e) => setSkillLevel(Number(e.target.value))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs min-h-[40px] bg-white font-semibold text-slate-700"
            >
              <option value={1}>Lv 1: Pemula / Dasar</option>
              <option value={2}>Lv 2: Menengah / Terampil</option>
              <option value={3}>Lv 3: Mahir / Lead</option>
            </select>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => addSkill()}
              disabled={currentSkills.length >= 8}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Tambah
            </Button>
          </div>
        </div>

        {/* Preset Skill Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Pilihan Keahlian Populer:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_SKILLS.map((sk) => {
              const isAdded = currentSkills.some((s) => s.nama.toLowerCase() === sk.nama.toLowerCase());
              return (
                <button
                  key={sk.nama}
                  type="button"
                  disabled={isAdded || currentSkills.length >= 8}
                  onClick={() => addSkill(sk.nama, sk.level)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    isAdded
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-default opacity-60'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                  }`}
                >
                  {isAdded ? `✓ ${sk.nama}` : `+ ${sk.nama} (Lv${sk.level})`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Active Skills */}
        <div className="flex flex-wrap gap-2 pt-1 min-h-[36px]">
          {currentSkills.map((s) => (
            <span
              key={s.nama}
              className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-900 border border-emerald-200/80 rounded-full px-3 py-1 text-xs font-bold shadow-2xs"
            >
              <span>{s.nama}</span>
              <span className="bg-emerald-200/80 text-emerald-950 text-[10px] px-1.5 py-0.2 rounded-full">
                Lv {s.level}
              </span>
              <button
                type="button"
                onClick={() => removeSkill(s.nama)}
                className="hover:text-rose-600 cursor-pointer rounded-full p-0.5"
                aria-label={`Hapus keahlian ${s.nama}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {currentSkills.length === 0 && (
            <span className="text-xs text-slate-400 italic">Belum ada keahlian yang dimasukkan (minimal 1).</span>
          )}
        </div>
      </div>

      {/* Peran Tim */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <label className="block text-xs font-bold text-slate-800">
          Peran Tim yang Siap Kamu Jalankan
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {availableRoles.map((r) => {
            const isSelected = currentRoles.includes(r.id);
            return (
              <button
                type="button"
                key={r.id}
                onClick={() => toggleRole(r.id)}
                aria-pressed={isSelected}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 min-h-[56px] ${
                  isSelected
                    ? 'bg-blue-50/90 border-blue-600 text-blue-950 shadow-xs ring-1 ring-blue-600/30'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-black ${
                    isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs text-slate-900 leading-tight">{r.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{r.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
