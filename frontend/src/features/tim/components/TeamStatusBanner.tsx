import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, ArrowRight, Lock, UserPlus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

interface TeamStatusBannerProps {
  isFormed: boolean;
  isLocked?: boolean;
  statusText: string;
  competitionSlug: string;
}

export const TeamStatusBanner: React.FC<TeamStatusBannerProps> = ({
  isFormed,
  isLocked = false,
  statusText,
  competitionSlug,
}) => {
  return (
    <div
      role="status"
      className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs ${
        isLocked
          ? 'bg-gradient-to-r from-indigo-50/90 to-blue-50/70 border-indigo-200/80 text-indigo-950'
          : isFormed
          ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/70 border-emerald-200/80 text-emerald-950'
          : 'bg-gradient-to-r from-amber-50/90 to-orange-50/70 border-amber-200/80 text-amber-950'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
            isLocked
              ? 'bg-indigo-100/80 text-indigo-700 border-indigo-200'
              : isFormed
              ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200'
              : 'bg-amber-100/80 text-amber-700 border-amber-200'
          }`}
        >
          {isLocked ? <Lock className="w-5 h-5" aria-hidden="true" /> : isFormed ? <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> : <Clock className="w-5 h-5" aria-hidden="true" />}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge color={isLocked ? 'blue' : isFormed ? 'emerald' : 'amber'} size="md" dot>
              {isLocked ? 'Terkunci Seleksi' : isFormed ? 'Tim Terbentuk & Sah' : 'Mencari Anggota'}
            </Badge>
            <span className="text-xs font-bold">{statusText}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
            {isLocked
              ? 'Tim Anda tercatat dalam proses seleksi internal kampus. Keanggotaan terkunci sementara hingga keputusan seleksi selesai.'
              : isFormed
              ? 'Susunan tim telah memenuhi batas minimal anggota kompetisi. Ruang persiapan & roadmap belajar kini dapat diakses penuh.'
              : 'Susunan tim belum mencapai jumlah minimal anggota kompetisi. Cari rekan tim tambahan melalui pencocokan partner.'}
          </p>
        </div>
      </div>

      <div className="shrink-0 self-end sm:self-center">
        {isFormed ? (
          <Link to={`/app/kompetisi/${competitionSlug}/persiapan`}>
            <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Buka Ruang Persiapan
            </Button>
          </Link>
        ) : (
          <Link to="/app/partner">
            <Button size="sm" variant="outline" leftIcon={<UserPlus className="w-3.5 h-3.5" />}>
              Cari Anggota Tim
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};