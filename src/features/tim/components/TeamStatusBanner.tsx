import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, ArrowRight, UserPlus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

interface TeamStatusBannerProps {
  isFormed: boolean;
  statusText: string;
  competitionSlug: string;
}

export const TeamStatusBanner: React.FC<TeamStatusBannerProps> = ({
  isFormed,
  statusText,
  competitionSlug,
}) => {
  return (
    <div
      role="status"
      className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs ${
        isFormed
          ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/70 border-emerald-200/80 text-emerald-950'
          : 'bg-gradient-to-r from-amber-50/90 to-orange-50/70 border-amber-200/80 text-amber-950'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
            isFormed
              ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200'
              : 'bg-amber-100/80 text-amber-700 border-amber-200'
          }`}
        >
          {isFormed ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge color={isFormed ? 'emerald' : 'amber'} size="md" dot>
              {isFormed ? 'Tim Terbentuk & Sah' : 'Mencari Anggota'}
            </Badge>
            <span className="text-xs font-bold">{statusText}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
            {isFormed
              ? 'Susunan tim telah memenuhi batas minimal anggota resmi Belmawa. Ruang persiapan & roadmap belajar kini dapat diakses penuh.'
              : 'Susunan tim belum mencapai jumlah minimal atau peran wajib. Cari rekan tim tambahan melalui pencocokan partner.'}
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