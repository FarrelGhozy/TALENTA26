import React from 'react';

export const ScopeBanner: React.FC = () => {
  return (
    <div className="bg-slate-100 border border-slate-200/80 rounded-xl px-4 py-2.5 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-800">🏛️ Cakupan Institusi:</span>
        <span>Universitas Mock Nusantara (inst-01)</span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-slate-500">
        <span>Periode: <strong>2026-Ganjil</strong></span>
        <span>•</span>
        <span>Sumber: <strong>Data Lokal Mock</strong></span>
      </div>
    </div>
  );
};
