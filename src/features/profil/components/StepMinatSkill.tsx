import React, { useState } from 'react';
import { User, Skill } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

interface StepMinatSkillProps {
  user: Partial<User>;
  onChange: (field: keyof User, val: unknown) => void;
}

export const StepMinatSkill: React.FC<StepMinatSkillProps> = ({ user, onChange }) => {
  const [newSkill, setNewSkill] = useState('');
  const [skillLevel, setSkillLevel] = useState(2);
  const [newMinat, setNewMinat] = useState('');
  const [localError, setLocalError] = useState('');

  const currentSkills: Skill[] = user.skill || [];
  const currentMinat: string[] = user.minat || [];
  const currentRoles: string[] = user.peranBisa || [];

  const addSkill = () => {
    const name = newSkill.trim();
    if (!name) return;
    if (currentSkills.some((s) => s.nama.toLowerCase() === name.toLowerCase())) {
      setLocalError(`Keahlian "${name}" sudah ada di daftar.`);
      return;
    }
    if (currentSkills.length >= 8) {
      setLocalError('Maksimal 8 keahlian. Hapus salah satu untuk menambah.');
      return;
    }
    onChange('skill', [...currentSkills, { nama: name, level: skillLevel }]);
    setNewSkill('');
    setLocalError('');
  };

  const removeSkill = (name: string) => {
    onChange(
      'skill',
      currentSkills.filter((s) => s.nama !== name)
    );
  };

  const addMinat = () => {
    const m = newMinat.trim();
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

  const availableRoles = ['ketua', 'penulis', 'riset', 'programmer', 'desainer', 'presenter', 'hustler'];

  return (
    <div className="space-y-6">
      {localError && (
        <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">
          {localError}
        </p>
      )}
      <div>
        <span id="minat-label" className="block text-xs font-semibold text-slate-700 mb-1.5">
          Bidang Minat ({currentMinat.length}/5)
        </span>
        <div className="flex gap-2 mb-2">
          <Input
            aria-label="Tambah minat baru"
            placeholder="Ketik minat lalu tambah (misal: PKM, AI, UI/UX)"
            value={newMinat}
            onChange={(e) => setNewMinat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMinat();
              }
            }}
          />
          <Button type="button" size="sm" variant="secondary" onClick={addMinat} disabled={currentMinat.length >= 5}>
            Tambah
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-6" role="list" aria-labelledby="minat-label">
          {currentMinat.map((m) => (
            <button
              key={m}
              type="button"
              role="listitem"
              onClick={() => removeMinat(m)}
              aria-label={`Hapus minat ${m}`}
              className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-2.5 py-1 text-xs font-medium hover:bg-blue-100 min-h-[32px]"
            >
              {m} <span aria-hidden="true" className="text-[10px] ml-1">✕</span>
            </button>
          ))}
          {currentMinat.length === 0 && <span className="text-xs text-slate-400">Belum ada minat. Tambahkan minimal 1.</span>}
        </div>
      </div>

      <div>
        <span id="skill-label" className="block text-xs font-semibold text-slate-700 mb-1.5">
          Keahlian Utama ({currentSkills.length}/8)
        </span>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <div className="flex-1">
            <Input
              aria-label="Tambah keahlian baru"
              placeholder="Ketik keahlian (misal: Python, Figma)"
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
              className="rounded-lg border border-slate-300 px-2 py-2 text-xs min-h-[40px] bg-white"
            >
              <option value={1}>Lv 1 Dasar</option>
              <option value={2}>Lv 2 Menengah</option>
              <option value={3}>Lv 3 Mahir</option>
            </select>
            <Button type="button" size="sm" variant="secondary" onClick={addSkill}>
              Tambah
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-6" role="list" aria-labelledby="skill-label">
          {currentSkills.map((s) => (
            <button
              key={s.nama}
              type="button"
              role="listitem"
              onClick={() => removeSkill(s.nama)}
              aria-label={`Hapus keahlian ${s.nama} level ${s.level}`}
              title={`Level ${s.level} — klik untuk hapus`}
              className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full px-2.5 py-1 text-xs font-medium hover:bg-emerald-100 min-h-[32px]"
            >
              {s.nama} · Lv{s.level} <span aria-hidden="true" className="text-[10px]">✕</span>
            </button>
          ))}
          {currentSkills.length === 0 && <span className="text-xs text-slate-400">Belum ada keahlian. Tambahkan minimal 1.</span>}
        </div>
      </div>

      <div>
        <span id="peran-label" className="block text-xs font-semibold text-slate-700 mb-1.5">
          Peran yang Bisa Kamu Jalani di Tim
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="peran-label">
          {availableRoles.map((r) => {
            const isSelected = currentRoles.includes(r);
            return (
              <button
                type="button"
                key={r}
                onClick={() => toggleRole(r)}
                aria-pressed={isSelected}
                className={`text-xs px-3 py-2 rounded-lg border font-medium capitalize cursor-pointer min-h-[40px] transition-colors ${
                  isSelected
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
