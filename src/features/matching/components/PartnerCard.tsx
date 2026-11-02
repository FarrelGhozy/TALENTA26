import React, { useState } from 'react';
import { Target, Send, X, RotateCcw, Clock } from 'lucide-react';
import { MatchCandidate } from '../../../types';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { MatchReasonTooltip } from './MatchReasonTooltip';
import { assetUrl } from '../../../lib/asset';

interface PartnerCardProps {
  candidate: MatchCandidate;
  inviteStatus?: 'diajukan' | 'diterima' | 'ditolak' | 'kedaluwarsa';
  onInvite: (userId: string) => Promise<void>;
  onCancel?: (userId: string) => Promise<void>;
}

export const PartnerCard: React.FC<PartnerCardProps> = ({ candidate, inviteStatus, onInvite, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const { user, matchScore, reasons, isOverlapTime } = candidate;

  const handleInvite = async () => {
    setLoading(true);
    try {
      await onInvite(user.id);
    } finally {
      setLoading(false);
    }
  };

  const extraDays = Math.max(0, user.ketersediaan.hari.length - 3);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-300';
    if (score >= 60) return 'text-blue-800 bg-blue-50 border-blue-300';
    return 'text-amber-700 bg-amber-50 border-amber-300';
  };

  return (
    <Card className="hover:border-blue-400 hover:shadow-lg transition-all duration-200 bg-white group flex flex-col justify-between border-slate-200/90 shadow-2xs">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {user.avatar ? (
              <img
                src={assetUrl(user.avatar)}
                alt={user.nama}
                className="w-12 h-12 shrink-0 rounded-2xl object-cover border-2 border-blue-600/30 shadow-xs"
              />
            ) : (
              <div
                aria-hidden="true"
                className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-800 to-blue-900 text-white font-black text-sm flex items-center justify-center shadow-xs"
              >
                {user.nama.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h4 className="text-sm font-extrabold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                {user.nama}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                {user.prodi} • Angkatan {user.angkatan}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-2xs ${getScoreColor(
                matchScore
              )}`}
              aria-label={`Skor kecocokan ${matchScore} persen`}
            >
              <Target className="w-3.5 h-3.5 text-blue-700" />
              {matchScore}% Cocok
            </div>
            <div className="mt-1 flex justify-end">
              <MatchReasonTooltip reasons={reasons} score={matchScore} />
            </div>
          </div>
        </div>

        {/* Highlights: Inline reasons */}
        {reasons.length > 0 && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Alasan Komplementer:
            </div>
            <ul className="text-[11px] text-slate-600 space-y-0.5">
              {reasons.slice(0, 2).map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold shrink-0">•</span>
                  <span className="truncate">{r.replace(/^([+!][a-z]+:\s*)/, '')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2 text-xs">
          {/* Peran & Skill */}
          <div className="flex flex-wrap gap-1.5" aria-label={`Peran dan skill ${user.nama}`}>
            {user.peranBisa.map((r) => (
              <Badge key={r} color="blue" size="sm" className="capitalize">
                Peran: {r}
              </Badge>
            ))}
            {user.skill.slice(0, 3).map((s) => (
              <Badge key={s.nama} color="emerald" size="sm" title={`Level ${s.level}`}>
                {s.nama} · Lv{s.level}
              </Badge>
            ))}
          </div>

          {/* Ketersediaan */}
          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 border-t border-slate-100">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
              <Clock className="w-3 h-3 text-slate-400" />
              {user.ketersediaan.jam} jam/minggu
            </span>
            <span aria-hidden="true" className="text-slate-300">•</span>
            <span className={isOverlapTime ? 'text-slate-600 font-medium' : 'text-amber-700 font-semibold'}>
              Hari: {user.ketersediaan.hari.slice(0, 3).join(', ')}
              {extraDays > 0 ? ` +${extraDays} hari` : ''}
              {!isOverlapTime ? ' (perlu penyesuaian)' : ' (sinkron)'}
            </span>
          </div>
        </div>
      </CardContent>

      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400">Target Belmawa Sama</span>
        <div>
          {inviteStatus === 'diajukan' ? (
            <div className="flex items-center gap-2">
              <Badge color="amber" size="sm" dot>
                Undangan Terkirim
              </Badge>
              {onCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCancel(user.id)}
                  isLoading={loading}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  leftIcon={<X className="w-3.5 h-3.5" />}
                >
                  Batalkan
                </Button>
              )}
            </div>
          ) : inviteStatus === 'diterima' ? (
            <Badge color="emerald" size="sm" dot>
              Sudah di Tim Kamu
            </Badge>
          ) : inviteStatus === 'ditolak' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleInvite}
              isLoading={loading}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Undang Ulang
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={handleInvite}
              isLoading={loading}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Undang ke Tim
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
