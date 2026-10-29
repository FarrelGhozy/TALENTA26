import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import { APP_ENV, USE_MOCK } from '../../config/env';

export const DemoBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  if ((APP_ENV !== 'DEPLOYMENT' && !USE_MOCK) || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-blue-50 px-4 py-2 text-xs font-medium text-center flex items-center justify-between gap-3 border-b border-blue-950/40 shadow-2xs">
      <div className="max-w-6xl mx-auto w-full flex items-center justify-center gap-2">
        <Info className="w-3.5 h-3.5 text-blue-300 shrink-0" />
        <span className="font-extrabold uppercase tracking-wider text-[10px] bg-blue-950/60 text-blue-200 px-2 py-0.5 rounded-full border border-blue-700/50">
          Mode Simulasi UNIDA Gontor
        </span>
        <span className="text-blue-100 font-medium hidden sm:inline">
          Data simulasi (Mock: {USE_MOCK ? 'Aktif' : 'Nonaktif'}).
        </span>
        <span className="text-blue-200/90 text-[11px]">
          Uji coba pembinaan Belmawa dan prestasi mahasiswa tanpa batas.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Sembunyikan banner demo"
        className="p-1 rounded-lg hover:bg-blue-700/50 text-blue-200 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};