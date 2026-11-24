import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  Building2,
  Contact,
  ExternalLink,
  Send,
  Users,
  UsersRound,
} from 'lucide-react';
import type { ValidatorCompetitionItem } from '../../../services/types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  getLevelLabel,
  getRoadmapPhaseCount,
  getStatusBadgeColor,
  getStatusLabel,
  type WorkspaceTabId,
} from '../types';

interface CompetitionCardAdminProps {
  competition: ValidatorCompetitionItem;
  targetTab?: WorkspaceTabId;
  publishingId?: string | null;
  onQuickPublish?: (item: ValidatorCompetitionItem) => void;
}

export const CompetitionCardAdmin: React.FC<CompetitionCardAdminProps> = ({
  competition,
  targetTab,
  publishingId,
  onQuickPublish,
}) => {
  const workspaceUrl =
    targetTab && targetTab !== 'info'
      ? `/admin/konten/${competition.id}?tab=${targetTab}`
      : `/admin/konten/${competition.id}`;

  const phaseCount = getRoadmapPhaseCount(competition);
  const consultantCount = competition._count?.consultantContacts ?? 0;
  const selectionCount = competition._count?.selections ?? 0;
  const customRuleCount = competition._count?.competitionPointRules ?? 0;
  const teamCount = competition._count?.teams ?? 0;
  const targetCount = competition._count?.studentTargets ?? 0;

  const hasCustomPoints =
    customRuleCount > 0 || Boolean(competition.pointTemplateId) || Boolean(competition.competitionCategoryId);

  const topAccentClass =
    competition.status === 'published'
      ? 'from-blue-700 via-blue-600 to-emerald-600'
      : competition.status === 'archived'
        ? 'from-slate-400 via-slate-500 to-slate-600'
        : 'from-amber-500 via-orange-500 to-amber-600';

  const isPublishing = publishingId === competition.id;

  return (
    <article className="group bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
      {/* Accent bar berdasarkan status */}
      <div className={`h-2 w-full bg-gradient-to-r ${topAccentClass}`} aria-hidden="true" />

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-3">
          {/* Baris Status, Rekrutmen & Tingkat */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge color={getStatusBadgeColor(competition.status)} dot size="sm">
                {getStatusLabel(competition.status)}
              </Badge>
              <Badge color={competition.registrationStatus === 'tutup' ? 'rose' : 'blue'} size="sm">
                {competition.registrationStatus === 'tutup' ? 'Rekrutmen Tutup' : 'Rekrutmen Buka'}
              </Badge>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {getLevelLabel(competition.level)}
            </span>
          </div>

          {/* Judul & Penyelenggara */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
              <span>{competition.category}</span>
              {competition.competitionCategory && (
                <>
                  <span className="text-slate-300" aria-hidden="true">•</span>
                  <span className="text-slate-500 font-semibold truncate">
                    {competition.competitionCategory.name}
                  </span>
                </>
              )}
            </div>

            <h3 className="font-black text-base text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem]">
              <Link
                to={workspaceUrl}
                className="hover:text-blue-700 focus:outline-none focus-visible:underline transition-colors"
              >
                {competition.name}
              </Link>
            </h3>

            <p className="flex items-center gap-1.5 text-xs text-slate-500 font-medium min-w-0">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <span className="truncate" title={competition.organizer}>
                {competition.organizer}
              </span>
            </p>
          </div>

          {/* Deskripsi 2 baris */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {competition.description}
          </p>

          {/* Format & Aturan Tim Ringkas */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
              <Users className="w-3 h-3 text-blue-700" aria-hidden="true" />
              {competition.format === 'individu'
                ? 'Individu (1 peserta)'
                : `Beregu · ${competition.minTeamMembers}–${competition.maxTeamMembers} org`}
            </span>
            {competition.format === 'beregu' && competition.requireCrossStudyProgram && (
              <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200/70 font-semibold">
                Lintas Prodi
              </span>
            )}
            {competition.format === 'beregu' && competition.requireRoles && (
              <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200/70 font-semibold">
                Peran Wajib
              </span>
            )}
          </div>
        </div>

        {/* Indikator Kelengkapan 4 Modul Pembinaan */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 text-[11px]">
          <Link
            to={`/admin/konten/${competition.id}?tab=roadmap`}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white transition-colors min-w-0"
          >
            <BookOpenCheck
              className={`w-3.5 h-3.5 shrink-0 ${phaseCount > 0 ? 'text-emerald-600' : 'text-amber-500'}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold text-slate-400 leading-none">
                Roadmap
              </span>
              <span
                className={`font-bold truncate block mt-0.5 ${phaseCount > 0 ? 'text-slate-800' : 'text-amber-700'}`}
              >
                {phaseCount > 0 ? `${phaseCount} fase` : 'Belum diatur'}
              </span>
            </div>
          </Link>

          <Link
            to={`/admin/konten/${competition.id}?tab=poin`}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white transition-colors min-w-0"
          >
            <Award
              className={`w-3.5 h-3.5 shrink-0 ${hasCustomPoints ? 'text-blue-700' : 'text-slate-400'}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold text-slate-400 leading-none">
                Aturan Poin
              </span>
              <span className="font-bold text-slate-800 truncate block mt-0.5">
                {customRuleCount > 0
                  ? `${customRuleCount} khusus`
                  : competition.pointTemplate
                    ? `v${competition.pointTemplate.version}`
                    : 'Standar'}
              </span>
            </div>
          </Link>

          <Link
            to={`/admin/konten/${competition.id}?tab=konsultan`}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white transition-colors min-w-0"
          >
            <Contact
              className={`w-3.5 h-3.5 shrink-0 ${consultantCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold text-slate-400 leading-none">
                Konsultan
              </span>
              <span
                className={`font-bold truncate block mt-0.5 ${consultantCount > 0 ? 'text-slate-800' : 'text-slate-500'}`}
              >
                {consultantCount > 0 ? `${consultantCount} kontak` : 'Belum ada'}
              </span>
            </div>
          </Link>

          <Link
            to={`/admin/konten/${competition.id}?tab=seleksi`}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white transition-colors min-w-0"
          >
            <UsersRound
              className={`w-3.5 h-3.5 shrink-0 ${selectionCount > 0 || teamCount > 0 || targetCount > 0 ? 'text-blue-700' : 'text-slate-400'}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold text-slate-400 leading-none">
                Seleksi
              </span>
              <span className="font-bold text-slate-800 truncate block mt-0.5">
                {selectionCount > 0
                  ? `${selectionCount} tercatat`
                  : competition.format === 'individu'
                    ? `${targetCount} target`
                    : `${teamCount} tim`}
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Footer Aksi */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {competition.status === 'draft' && onQuickPublish && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              isLoading={isPublishing}
              onClick={() => onQuickPublish(competition)}
              leftIcon={<Send className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />}
            >
              Terbitkan
            </Button>
          )}
          {competition.status === 'published' && (
            <Link
              to={`/kompetisi/${competition.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Lihat halaman publik ${competition.name}`}
              title="Lihat halaman publik"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-700 min-h-[36px] px-2 rounded-lg hover:bg-white transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Publik</span>
            </Link>
          )}
        </div>

        <Link
          to={workspaceUrl}
          aria-label={`Kelola lomba ${competition.name}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-2xs transition-all group-hover:translate-x-0.5"
        >
          <span>Kelola Lomba</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
};
