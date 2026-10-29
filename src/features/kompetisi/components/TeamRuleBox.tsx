import React from 'react';
import { Users, CheckCircle2 } from 'lucide-react';
import { KomposisiTim } from '../../../types';
import { Badge } from '../../../components/ui/Badge';

export const TeamRuleBox: React.FC<{ komposisi: KomposisiTim; syarat: string[] }> = ({
  komposisi,
  syarat,
}) => {
  const isIndividual = komposisi.min === 1 && komposisi.max === 1;

  return (
    <div className="space-y-6">
      <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-700" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Ketentuan Jumlah & Peran Anggota
          </h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={isIndividual ? 'slate' : 'blue'} size="md">
            {isIndividual ? 'Kompetisi Individu (1 Peserta)' : `${komposisi.min} s/d ${komposisi.max} Anggota`}
          </Badge>
        </div>
        {!isIndividual && komposisi.peranWajib.length > 0 && (
          <div className="text-xs text-slate-600 pt-1">
            <span className="font-semibold text-slate-700">Peran yang disarankan dalam tim: </span>
            <span className="capitalize font-medium text-blue-800">
              {komposisi.peranWajib.join(', ')}
            </span>
          </div>
        )}
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Persyaratan Peserta Belmawa
          </h4>
        </div>
        <ul className="text-xs text-slate-600 space-y-2.5">
          {syarat.map((s, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};