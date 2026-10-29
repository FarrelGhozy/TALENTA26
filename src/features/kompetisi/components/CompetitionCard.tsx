import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import { Competition } from '../../../types';
import { formatDate } from '../../../lib/format';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export const CompetitionCard: React.FC<{ competition: Competition }> = ({ competition }) => {
  const nextSchedule = [...competition.jadwal].sort(
    (a, b) => +new Date(a.tanggal) - +new Date(b.tanggal)
  ).find((j) => new Date(j.tanggal).getTime() >= Date.now()) || competition.jadwal[0];

  return (
    <Card className="hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full bg-white group">
      <CardContent className="space-y-3.5 p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge color="blue" dot>{competition.kategori}</Badge>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {competition.tingkat}
          </span>
        </div>

        <div>
          <h3
            className="font-bold text-sm text-slate-900 line-clamp-2 min-h-[2.5rem] group-hover:text-blue-700 transition-colors"
            title={competition.namaResmi}
          >
            {competition.namaResmi}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed" title={competition.deskripsi}>
            {competition.deskripsi}
          </p>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-xs space-y-2">
          <div className="flex items-center justify-between gap-2 text-slate-600">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Komposisi:
            </span>
            <span className="font-bold text-slate-800 text-right">
              {competition.komposisi.min === 1 && competition.komposisi.max === 1
                ? 'Individu (1 Org)'
                : `${competition.komposisi.min}–${competition.komposisi.max} Anggota`}
            </span>
          </div>

          {nextSchedule && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50">
              <span className="inline-flex items-center gap-1.5 text-slate-500 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Agenda:
              </span>
              <span className="font-semibold text-blue-800 text-right truncate text-[11px]">
                {nextSchedule.label} • <time dateTime={nextSchedule.tanggal}>{formatDate(nextSchedule.tanggal)}</time>
              </span>
            </div>
          )}
        </div>
      </CardContent>

      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          Resmi Belmawa
        </span>
        <Link
          to={`/kompetisi/${competition.slug}`}
          aria-label={`Lihat detail ${competition.namaResmi}`}
          className="font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform"
        >
          Detail & Syarat <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </Card>
  );
};