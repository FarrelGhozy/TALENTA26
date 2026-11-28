import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, ShieldCheck, Trophy } from 'lucide-react';
import { Competition } from '../../../types';
import { formatDate, parseFlexibleDate } from '../../../lib/format';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export const CompetitionCard: React.FC<{ competition: Competition }> = ({ competition }) => {
  const nextSchedule =
    [...competition.jadwal]
      .sort((a, b) => {
        const da = parseFlexibleDate(a.tanggal)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const db = parseFlexibleDate(b.tanggal)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return da - db;
      })
      .find((j) => {
        const d = parseFlexibleDate(j.tanggal);
        return d ? d.getTime() >= Date.now() - 86400000 : true;
      }) || competition.jadwal[0];

  const isIndividual = competition.format === 'individu' ||
    (competition.komposisi.min === 1 && competition.komposisi.max === 1);
  const isClosed = competition.registrationStatus === 'tutup';

  return (
    <Card className="group flex h-full flex-col border-slate-200 bg-white transition-all duration-200 hover:border-blue-300 hover:shadow-lg">
      <div className="relative flex min-h-36 items-end justify-between overflow-hidden bg-[#e3f4fa] px-5 py-5 sm:px-6">
        <div aria-hidden="true" className="absolute -right-5 -top-12 h-44 w-44 rounded-full border-[24px] border-white/45" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-800">Kompetisi</p>
          <p className="mt-2 text-2xl font-extrabold uppercase tracking-tight text-blue-950">{competition.kategori}</p>
        </div>
        <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-blue-700 shadow-sm">
          <Trophy className="h-6 w-6" aria-hidden="true" />
        </span>
      </div>
      <CardContent className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="blue" className="capitalize">{competition.tingkat}</Badge>
          <Badge color={isClosed ? 'rose' : 'emerald'} size="sm">
            {isClosed ? 'Rekrutmen Tutup' : 'Pendaftaran Dibuka'}
          </Badge>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-extrabold leading-snug tracking-tight text-blue-950 group-hover:text-blue-800" title={competition.namaResmi}>
            {competition.namaResmi}
          </h3>
          <p className="line-clamp-3 text-sm leading-6 text-slate-600" title={competition.deskripsi}>{competition.deskripsi}</p>
        </div>
        <div className="mt-auto space-y-3 border-t border-slate-100 pt-4 text-sm">
          <div className="flex items-start gap-2 text-slate-600">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
            <span>{isIndividual ? 'Individu (1 Peserta)' : `Beregu · ${competition.komposisi.min}–${competition.komposisi.max} Anggota`}</span>
          </div>
          {nextSchedule && <div className="flex items-start gap-2 text-slate-600">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
            <span>{nextSchedule.label} · <time dateTime={nextSchedule.tanggal}>{formatDate(nextSchedule.tanggal)}</time></span>
          </div>}
        </div>
      </CardContent>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-2 sm:px-6">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500"><ShieldCheck className="h-4 w-4 text-blue-700" aria-hidden="true" /> Informasi kompetisi</span>
        <Link to={`/kompetisi/${competition.slug}`} aria-label={`Lihat detail ${competition.namaResmi}`}
          className="inline-flex min-h-[44px] items-center text-sm font-bold text-blue-700 hover:text-blue-900 hover:underline">Detail &amp; Syarat</Link>
      </div>
    </Card>
  );
};
