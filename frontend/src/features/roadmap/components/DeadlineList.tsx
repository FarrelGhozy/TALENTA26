import React from 'react';
import { Clock } from 'lucide-react';
import { formatDate } from '../../../lib/format';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';

const getUrgency = (tanggal: string): { label: string; classes: string } => {
  const target = new Date(tanggal).getTime();
  if (Number.isNaN(target)) return { label: 'Jadwal', classes: 'bg-slate-100 text-slate-600' };
  const diffDays = Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Terlewat', classes: 'bg-slate-100 text-slate-500 font-medium' };
  if (diffDays <= 14) return { label: `H-${diffDays}`, classes: 'bg-rose-100 text-rose-800 font-bold border border-rose-200' };
  if (diffDays <= 45) return { label: `H-${diffDays}`, classes: 'bg-amber-100 text-amber-900 font-bold border border-amber-200' };
  return { label: `H-${diffDays}`, classes: 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200' };
};

export const DeadlineList: React.FC<{ deadlines: { label: string; tanggal: string }[] }> = ({
  deadlines,
}) => {
  const sorted = [...deadlines].sort((a, b) => +new Date(a.tanggal) - +new Date(b.tanggal));
  return (
    <Card className="bg-white shadow-2xs">
      <CardHeader className="py-3.5">
        <CardTitle level={2} className="text-xs flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-700" />
          <span>Tenggat Waktu Penting</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2.5 text-xs">
        {sorted.length === 0 ? (
          <p className="text-slate-400 text-center py-2">Tidak ada tenggat waktu aktif.</p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((d, idx) => {
              const urgency = getUrgency(d.tanggal);
              return (
                <li
                  key={idx}
                  className="flex justify-between items-center gap-2 p-3 rounded-xl bg-slate-50/80 border border-slate-200/70"
                >
                  <span className="font-bold text-slate-800 truncate" title={d.label}>
                    {d.label}
                  </span>
                  <div className="text-right shrink-0">
                    <time dateTime={d.tanggal} className="text-[11px] text-slate-500 block font-medium">
                      {formatDate(d.tanggal)}
                    </time>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-0.5 ${urgency.classes}`}>
                      {urgency.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};