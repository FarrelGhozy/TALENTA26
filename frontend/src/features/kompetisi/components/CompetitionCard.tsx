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

  const getCategoryTheme = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'PKM':
        return {
          banner: 'from-blue-700 via-blue-800 to-indigo-900',
          badgeColor: 'blue' as const,
        };
      case 'GEMASTIK':
        return {
          banner: 'from-indigo-700 via-purple-800 to-slate-900',
          badgeColor: 'blue' as const,
        };
      case 'ON-MIPA':
        return {
          banner: 'from-emerald-700 via-teal-800 to-slate-900',
          badgeColor: 'emerald' as const,
        };
      case 'KMI':
        return {
          banner: 'from-amber-600 via-orange-700 to-slate-900',
          badgeColor: 'amber' as const,
        };
      default:
        return {
          banner: 'from-slate-700 via-blue-800 to-slate-900',
          badgeColor: 'blue' as const,
        };
    }
  };

  const theme = getCategoryTheme(competition.kategori);

  return (
    <Card className="hover:border-blue-400 hover:shadow-lg transition-all duration-200 flex flex-col justify-between h-full bg-white group border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Top Category Visual Header Bar */}
      <div className={`h-2.5 w-full bg-gradient-to-r ${theme.banner}`} />

      <CardContent className="space-y-4 p-5 sm:p-6 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Badge color={theme.badgeColor} dot>
              {competition.kategori}
            </Badge>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Tingkat {competition.tingkat}
            </span>
          </div>

          <div>
            <h3
              className="font-black text-base text-slate-900 line-clamp-2 min-h-[2.5rem] group-hover:text-blue-700 transition-colors leading-snug"
              title={competition.namaResmi}
            >
              {competition.namaResmi}
            </h3>
            <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed" title={competition.deskripsi}>
              {competition.deskripsi}
            </p>
          </div>
        </div>

        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-2.5 mt-3">
          <div className="flex items-center justify-between gap-2 text-slate-600">
            <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
              <Users className="w-3.5 h-3.5 text-blue-700" />
              Komposisi Tim:
            </span>
            <span className="font-extrabold text-slate-800 text-right">
              {competition.komposisi.min === 1 && competition.komposisi.max === 1
                ? 'Individu (1 Orang)'
                : `${competition.komposisi.min}–${competition.komposisi.max} Anggota`}
            </span>
          </div>

          {nextSchedule && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
              <span className="inline-flex items-center gap-1.5 text-slate-500 shrink-0 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Agenda Terdekat:
              </span>
              <span className="font-bold text-slate-800 text-right truncate text-[11px]">
                {nextSchedule.label} • <time dateTime={nextSchedule.tanggal}>{formatDate(nextSchedule.tanggal)}</time>
              </span>
            </div>
          )}
        </div>
      </CardContent>

      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
          Resmi Belmawa Dikti
        </span>
        <Link
          to={`/kompetisi/${competition.slug}`}
          aria-label={`Lihat detail ${competition.namaResmi}`}
          className="font-extrabold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 group-hover:translate-x-1.5 transition-transform"
        >
          Detail & Syarat <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </Card>
  );
};
