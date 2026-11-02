import React from 'react';
import { Clock, Check, Users } from 'lucide-react';
import { Competition, User } from '../../../types';
import { Badge } from '../../../components/ui/Badge';

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
      <fieldset className="space-y-3">
        <div className="flex items-center justify-between">
          <legend className="block text-xs font-bold text-slate-800">
            Pilih 1 Target Kompetisi Utama
          </legend>
          <span className="text-[11px] text-slate-400">Dasar algoritma matchmaking</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Target kompetisi">
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
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between min-h-[110px] focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 text-blue-950 shadow-xs ring-1 ring-blue-600/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <Badge color="blue" size="sm">
                      {comp.kategori}
                    </Badge>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                        isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-transparent border'
                      }`}
                    >
                      ✓
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{comp.namaResmi}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {comp.deskripsi}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                    <Users className="w-3.5 h-3.5 text-blue-700" />
                    {comp.komposisi.min === 1 && comp.komposisi.max === 1
                      ? 'Individu'
                      : `${comp.komposisi.min}–${comp.komposisi.max} Orang`}
                  </span>
                  <span className="font-medium text-slate-400">Tingkat {comp.tingkat}</span>
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="pt-4 border-t border-slate-100 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-800">
              Hari Ketersediaan untuk Diskusi & Bimbingan ({currentDays.length} hari dipilih)
            </label>
            <span className="text-[11px] text-slate-400">Digunakan untuk mencocokkan waktu luang</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5" role="group">
            {daysList.map((d) => {
              const isChecked = currentDays.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDay(d)}
                  aria-pressed={isChecked}
                  className={`text-xs py-2 px-1 rounded-xl border font-bold cursor-pointer transition-all min-h-[42px] flex items-center justify-center gap-1.5 ${
                    isChecked
                      ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 text-white" />}
                  <span>{d}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Commitment Hours Slider / Input */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-700" />
              Komitmen Waktu Belajar / Persiapan:
            </span>
            <p className="text-[11px] text-slate-500">
              Perkiraan waktu luang yang dialokasikan di luar jam kuliah.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <input
              type="number"
              min={1}
              max={40}
              value={currentHours}
              onChange={(e) => handleHoursChange(Number(e.target.value))}
              aria-label="Jumlah jam komitmen per minggu"
              className="w-16 px-2.5 py-1.5 rounded-xl border border-slate-300 text-center text-xs font-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <span className="text-xs font-bold text-slate-700">Jam / Minggu</span>
          </div>
        </div>
      </div>
    </div>
  );
};
