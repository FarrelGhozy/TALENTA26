import React from 'react';
import { Competition, User } from '../../../types';
import { Input } from '../../../components/ui/Input';

interface StepTargetProps {
  user: Partial<User>;
  targetSlug: string;
  competitions: Competition[];
  onUserChange: (field: keyof User, val: unknown) => void;
  onTargetChange: (slug: string) => void;
}

export const StepTarget: React.FC<StepTargetProps> = ({
  user,
  targetSlug,
  competitions,
  onUserChange,
  onTargetChange,
}) => {
  const daysList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const currentDays = user.ketersediaan?.hari || [];
  const currentHours = user.ketersediaan?.jam ?? 8;

  const toggleDay = (day: string) => {
    let updated = [...currentDays];
    if (updated.includes(day)) {
      updated = updated.filter((d) => d !== day);
    } else {
      updated.push(day);
    }
    onUserChange('ketersediaan', { hari: updated, jam: currentHours });
  };

  const handleHoursChange = (hours: number) => {
    const clamped = Number.isNaN(hours) ? 0 : Math.min(40, Math.max(0, hours));
    onUserChange('ketersediaan', { hari: currentDays, jam: clamped });
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="block text-xs font-semibold text-slate-700 mb-1.5">
          Pilih 1 Target Kompetisi Utama
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Target kompetisi">
          {competitions.map((comp) => {
            const isSelected = targetSlug === comp.slug;
            return (
              <button
                key={comp.slug}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onTargetChange(comp.slug)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onTargetChange(comp.slug);
                  }
                }}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors text-left min-h-[64px] focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/60 text-blue-950 font-semibold'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1 gap-2">
                  <span className="font-bold text-slate-800">{comp.namaResmi}</span>
                  {isSelected && <span aria-hidden="true" className="text-blue-700 text-sm font-black">✓</span>}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2">{comp.deskripsi}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Tim: {comp.komposisi.min}–{comp.komposisi.max} orang
                </p>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="pt-2 border-t border-slate-100 space-y-3">
        <span id="hari-label" className="block text-xs font-semibold text-slate-700">
          Ketersediaan Hari untuk Persiapan Bersama ({currentDays.length} hari dipilih)
        </span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="hari-label">
          {daysList.map((d) => {
            const isChecked = currentDays.includes(d);
            return (
              <button
                type="button"
                key={d}
                onClick={() => toggleDay(d)}
                aria-pressed={isChecked}
                className={`text-xs px-3 py-2 rounded-md border font-medium cursor-pointer min-h-[40px] ${
                  isChecked
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>

        <div className="w-full sm:w-64 pt-2">
          <Input
            label="Estimasi Jam per Minggu (disarankan 6+ untuk tim)"
            type="number"
            min={2}
            max={40}
            value={currentHours}
            onChange={(e) => handleHoursChange(Number(e.target.value))}
            helper={currentHours < 6 ? 'Di bawah 6 jam/minggu bisa menyulitkan sinkronisasi tim.' : 'Komitmen waktu yang baik untuk persiapan tim.'}
          />
        </div>
      </div>
    </div>
  );
};
