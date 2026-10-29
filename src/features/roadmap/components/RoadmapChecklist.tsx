import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, BookOpen, ExternalLink } from 'lucide-react';
import { RoadmapPhase } from '../../../types';
import { Card, CardHeader, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

interface RoadmapChecklistProps {
  fase: RoadmapPhase[];
  checklist: Record<string, boolean>;
  onToggle: (taskId: string) => void;
}

export const RoadmapChecklist: React.FC<RoadmapChecklistProps> = ({
  fase,
  checklist,
  onToggle,
}) => {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  return (
    <div className="space-y-4">
      {fase.map((phase, pIdx) => {
        const phaseTasks = phase.latihan.map((_, lIdx) => `p${pIdx}-l${lIdx}`);
        const doneCount = phaseTasks.filter((t) => checklist[t]).length;
        const isCollapsed = collapsed[pIdx] || false;
        const isAllDone = doneCount === phase.latihan.length && phase.latihan.length > 0;

        return (
          <Card key={pIdx} className="bg-white border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="py-3.5 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCollapsed((prev) => ({ ...prev, [pIdx]: !prev[pIdx] }))}
                aria-expanded={!isCollapsed}
                className="flex items-center gap-2.5 text-left min-h-[36px] cursor-pointer group flex-1"
              >
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Minggu {phase.minggu}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {phase.judul}
                </span>
              </button>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <Badge color={isAllDone ? 'emerald' : 'slate'} size="sm" dot>
                  {doneCount}/{phase.latihan.length} tugas selesai
                </Badge>
              </div>
            </CardHeader>

            <div className="px-5 py-2 bg-slate-50/40 text-[11px] text-slate-500 border-b border-slate-100 flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">Target Fase:</span>
              <span>{phase.target}</span>
            </div>

            {!isCollapsed && (
              <CardContent className="space-y-5 p-5">
                {/* Materi Panduan */}
                <div>
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                    Materi & Panduan Belajar:
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {phase.materi.map((m, mIdx) => (
                      <span
                        key={mIdx}
                        className="bg-slate-100/80 border border-slate-200/70 px-2.5 py-1 rounded-lg text-slate-700 font-medium text-[11px]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                  {phase.skillDilati.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-2">
                      Skill yang diasah: <strong className="text-slate-700">{phase.skillDilati.join(', ')}</strong>
                    </p>
                  )}
                </div>

                {/* Tugas & Latihan Mandiri */}
                <div>
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Checklist Latihan & Target Mandiri:
                  </span>
                  <div className="space-y-2">
                    {phase.latihan.map((lat, lIdx) => {
                      const taskId = `p${pIdx}-l${lIdx}`;
                      const isChecked = Boolean(checklist[taskId]);

                      return (
                        <label
                          key={lIdx}
                          className={`flex items-start gap-3 text-xs p-3 rounded-xl border transition-all cursor-pointer min-h-[44px] ${
                            isChecked
                              ? 'bg-emerald-50/40 border-emerald-200/60 text-slate-500'
                              : 'bg-slate-50/70 border-slate-200/70 text-slate-800 hover:bg-slate-100/70 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggle(taskId)}
                            aria-label={`Tandai selesai: ${lat}`}
                            className="mt-0.5 rounded text-blue-700 focus:ring-blue-600 w-4 h-4 cursor-pointer shrink-0"
                          />
                          <span className={`leading-relaxed ${isChecked ? 'line-through text-slate-400 font-normal' : 'font-medium'}`}>
                            {lat}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Indikator Keberhasilan */}
                {phase.indikator.length > 0 && (
                  <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3.5 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-900 block flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Indikator Keberhasilan Fase Ini:
                    </span>
                    <ul className="text-[11px] text-emerald-900 list-disc list-inside space-y-1">
                      {phase.indikator.map((ind, i) => (
                        <li key={i} className="leading-relaxed">{ind}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sumber Belajar */}
                {phase.sumber.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                      Referensi & Dokumen Resmi:
                    </span>
                    <ul className="space-y-1.5">
                      {phase.sumber.map((s, i) => (
                        <li key={i} className="text-xs flex flex-wrap items-center gap-2">
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 hover:text-blue-900 font-bold inline-flex items-center gap-1 hover:underline min-h-[32px]"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                            {s.judul}
                          </a>
                          {s.wajib && (
                            <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">
                              Wajib Belmawa
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};