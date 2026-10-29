import React, { useState } from 'react';

export const MatchReasonTooltip: React.FC<{ reasons: string[]; score: number }> = ({
  reasons,
  score,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Lihat alasan kecocokan, skor ${score} persen`}
        onClick={() => setOpen((v) => !v)}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        className="inline-flex items-center gap-1 text-xs text-blue-700 font-bold cursor-pointer underline decoration-dotted min-h-[32px] px-1"
      >
        Kenapa cocok?
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Dasar kesesuaian partner"
          className="absolute z-30 bottom-full right-0 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl space-y-1.5"
        >
          <div className="font-bold border-b border-slate-700 pb-1">Dasar Kesesuaian ({score}%):</div>
          <ul className="space-y-1 list-disc list-inside leading-snug">
            {reasons.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
          <p className="text-[10px] text-slate-300 pt-1 italic">
            Skor adalah saran relevansi, bukan peringkat kemampuan.
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-1 text-[11px] underline text-slate-200 min-h-[32px]"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
};
