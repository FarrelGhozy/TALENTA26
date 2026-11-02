import React from 'react';
import { Building2, Calendar, Database } from 'lucide-react';

export const ScopeBanner: React.FC = () => {
  return (
    <div className="bg-slate-100/80 border border-slate-200/90 rounded-2xl px-4 py-2.5 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
        <span className="font-extrabold text-slate-900">Cakupan Institusi:</span>
        <span className="font-semibold text-blue-900">Universitas Darussalam Gontor</span>
        <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
          inst-01
        </span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          Periode: <strong className="text-slate-800">2026 Belmawa</strong>
        </span>
        <span aria-hidden="true">•</span>
        <span className="flex items-center gap-1">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          Pangkalan Data: <strong className="text-emerald-700">Simulasi Sinkron</strong>
        </span>
      </div>
    </div>
  );
};
