import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, ArrowRight, Lock, BookOpen } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

interface TeamStatusBannerProps {
  isFormed: boolean;
  isSelectionReady?: boolean;
  isLocked?: boolean;
  statusText: string;
  competitionSlug: string;
}

export const TeamStatusBanner: React.FC<TeamStatusBannerProps> = ({
  isFormed,
  isSelectionReady = false,
  isLocked = false,
  statusText,
  competitionSlug,
}) => {
  return (
    <div
      role="status"
      className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs ${
        isLocked
          ? 'bg-gradient-to-r from-indigo-50/90 to-blue-50/70 border-indigo-200/80 text-indigo-950'
          : isSelectionReady
          ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/70 border-emerald-200/80 text-emerald-950'
          : 'bg-gradient-to-r from-amber-50/90 to-orange-50/70 border-amber-200/80 text-amber-950'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
            isLocked
              ? 'bg-indigo-100/80 text-indigo-700 border-indigo-200'
              : isSelectionReady
              ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200'
              : 'bg-amber-100/80 text-amber-700 border-amber-200'
          }`}
        >
          {isLocked ? (
            <Lock className="w-5 h-5" aria-hidden="true" />
          ) : isSelectionReady ? (
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Clock className="w-5 h-5" aria-hidden="true" />
          )}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge
              color={isLocked ? 'blue' : isSelectionReady ? 'emerald' : 'amber'}
              size="md"
              dot
            >
              {statusText}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
            {isLocked
              ? 'Tim Anda tercatat dalam proses seleksi internal kampus. Keanggotaan terkunci sementara hingga keputusan seleksi selesai.'
              : isSelectionReady
              ? 'Jumlah anggota dan seluruh syarat kompetisi terpenuhi. Ketua tim kini dapat mengajukan pendaftaran seleksi internal.'
              : isFormed
              ? 'Jumlah anggota minimal sudah terpenuhi. Periksa rincian syarat tambahan lomba sebelum mendaftar seleksi internal.'
              : 'Tim masih mencari anggota tambahan. Kamu tetap boleh membuka ruang persiapan dan mempelajari roadmap lebih awal.'}
          </p>
        </div>
      </div>

      <div className="shrink-0 self-end sm:self-center">
        <Link to={`/app/kompetisi/${competitionSlug}/persiapan`}>
          <Button
            size="sm"
            variant={isSelectionReady ? 'primary' : 'outline'}
            leftIcon={<BookOpen className="w-3.5 h-3.5" aria-hidden="true" />}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Buka Ruang Persiapan
          </Button>
        </Link>
      </div>
    </div>
  );
};
