import React from 'react';
import { Calendar, Building2 } from 'lucide-react';
import { JadwalItem, SeleksiInternalItem } from '../../../types';
import { formatDate } from '../../../lib/format';
import { Badge } from '../../../components/ui/Badge';

export const ScheduleTimeline: React.FC<{
  jadwalResmi: JadwalItem[];
  seleksiInternal: SeleksiInternalItem[];
}> = ({ jadwalResmi, seleksiInternal }) => {
  return (
    <div className="space-y-8">
      <section aria-labelledby="jadwal-resmi">
        <h3 id="jadwal-resmi" className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-700" />
          <span>Jadwal Resmi Kompetisi Nasional Belmawa</span>
        </h3>
        <ol className="border-l-2 border-blue-200 ml-3 pl-5 space-y-5">
          {jadwalResmi.map((item, idx) => (
            <li key={idx} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-blue-700 ring-4 ring-blue-100"
              />
              <div className="text-xs font-bold text-slate-800">{item.label}</div>
              <time dateTime={item.tanggal} className="text-[11px] text-slate-500 font-medium">
                {formatDate(item.tanggal)}
              </time>
            </li>
          ))}
        </ol>
      </section>

      {seleksiInternal && seleksiInternal.length > 0 && (
        <section aria-labelledby="seleksi-internal" className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4 mt-3">
            <h3 id="seleksi-internal" className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Tahapan Seleksi Internal Kampus</span>
            </h3>
            <Badge color="amber" size="sm" dot>
              Wajib Tim Internal
            </Badge>
          </div>
          <ol className="border-l-2 border-amber-300 ml-3 pl-5 space-y-5">
            {seleksiInternal.map((item, idx) => (
              <li key={idx} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100"
                />
                <div className="text-xs font-bold text-slate-800">{item.tahap}</div>
                <time dateTime={item.tanggal} className="text-[11px] text-slate-500 font-medium">
                  {formatDate(item.tanggal)}
                </time>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
};