import React from 'react';
import { Users, CheckCircle2, ExternalLink } from 'lucide-react';
import { Competition, KomposisiTim } from '../../../types';
import { Badge } from '../../../components/ui/Badge';

interface TeamRuleBoxProps {
  komposisi: KomposisiTim;
  syarat: string[];
  competition?: Competition;
}

export const TeamRuleBox: React.FC<TeamRuleBoxProps> = ({
  komposisi,
  syarat,
  competition,
}) => {
  const isIndividual =
    competition?.format === 'individu' || (komposisi.min === 1 && komposisi.max === 1);
  const isClosed = competition?.registrationStatus === 'tutup';

  return (
    <div className="space-y-6">
      <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-700" aria-hidden="true" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Ketentuan Format, Anggota &amp; Aturan Dinamis
          </h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={isIndividual ? 'slate' : 'blue'} size="md">
            {isIndividual ? 'Kompetisi Individu (1 Peserta)' : `Beregu · ${komposisi.min} s/d ${komposisi.max} Anggota`}
          </Badge>
          <Badge color={isClosed ? 'rose' : 'emerald'} size="md" dot>
            {isClosed ? 'Rekrutmen Internal Tutup' : 'Rekrutmen Internal Buka'}
          </Badge>
          {!isIndividual && competition && (
            <>
              <Badge color={competition.requireRoles ? 'amber' : 'slate'} size="sm">
                Peran anggota: {competition.requireRoles ? 'Wajib' : 'Opsional'}
              </Badge>
              <Badge color={competition.requireCrossStudyProgram ? 'amber' : 'slate'} size="sm">
                Lintas prodi: {competition.requireCrossStudyProgram ? 'Wajib' : 'Opsional'}
              </Badge>
              {competition.singleTeamPerCompetition !== false && (
                <Badge color="blue" size="sm">
                  Batas satu tim per cabang: Aktif
                </Badge>
              )}
            </>
          )}
        </div>
        {!isIndividual && komposisi.peranWajib.length > 0 && (
          <div className="text-xs text-slate-600 pt-1">
            <span className="font-semibold text-slate-700">
              {competition?.requireRoles ? 'Peran wajib dalam tim: ' : 'Peran yang disarankan dalam tim: '}
            </span>
            <span className="capitalize font-medium text-blue-800">
              {komposisi.peranWajib.join(', ')}
            </span>
          </div>
        )}
        {competition?.sourceUrl && (
          <div className="pt-1">
            <a
              href={competition.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
            >
              <span>Lihat Pedoman Resmi &amp; Sumber Aturan</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Persyaratan Peserta Kompetisi
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
