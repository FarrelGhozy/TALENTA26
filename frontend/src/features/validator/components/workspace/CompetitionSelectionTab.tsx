import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RotateCcw,
  UsersRound,
} from 'lucide-react';
import { validatorContentService } from '@talenta/services';
import type {
  CompetitionParticipantOption,
  ValidatorCompetitionItem,
  ValidatorSelectionItem,
} from '../../../../services/types';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Badge } from '../../../../components/ui/Badge';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { useToast } from '../../../../components/ui/Toast';

interface CompetitionSelectionTabProps {
  competition: ValidatorCompetitionItem;
  selections: ValidatorSelectionItem[];
  onUpdated: () => Promise<void>;
}

const EMPTY_SELECTION_FORM = {
  teamId: '',
  userId: '',
  stage: '',
  result: 'menunggu' as 'menunggu' | 'lolos' | 'tidak',
  organizerVerified: false,
  notes: '',
};

export const CompetitionSelectionTab: React.FC<CompetitionSelectionTabProps> = ({
  competition,
  selections,
  onUpdated,
}) => {
  const { notify } = useToast();
  const [participants, setParticipants] = useState<CompetitionParticipantOption>({
    teams: [],
    individuals: [],
  });
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'semua' | 'menunggu' | 'lolos' | 'tidak'>('semua');
  const [form, setForm] = useState(EMPTY_SELECTION_FORM);
  const [reviewingLabel, setReviewingLabel] = useState<string | null>(null);

  const loadParticipants = useCallback(async () => {
    if (!validatorContentService.getCompetitionParticipants) {
      setLoadingParticipants(false);
      return;
    }
    setLoadingParticipants(true);
    try {
      const res: any = await validatorContentService.getCompetitionParticipants(competition.id);
      setParticipants({
        teams: Array.isArray(res?.teams)
          ? res.teams.map((t: any) => ({
              ...t,
              memberNames: Array.isArray(t.memberNames) ? t.memberNames : [],
            }))
          : [],
        individuals: Array.isArray(res?.individuals)
          ? res.individuals
          : Array.isArray(res?.students)
            ? res.students.map((s: any) => ({ ...s, userId: s.userId || s.id }))
            : [],
      });
    } catch {
      setParticipants({ teams: [], individuals: [] });
    } finally {
      setLoadingParticipants(false);
    }
  }, [competition.id]);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  const isIndividu = competition.format === 'individu';
  const totalParticipants = isIndividu
    ? participants.individuals.length
    : participants.teams.length;
  const passedConfirmedCount = selections.filter(
    (s) => s.result === 'lolos' && s.organizerVerified
  ).length;
  const pendingCount = selections.filter((s) => s.result === 'menunggu').length;

  const scoredTeamIds = useMemo(
    () => new Set(selections.map((s) => s.teamId || s.team?.id).filter(Boolean)),
    [selections]
  );
  const scoredUserIds = useMemo(
    () =>
      new Set(
        selections
          .map((s) => s.userId || s.participant?.id || s.user?.id)
          .filter(Boolean)
      ),
    [selections]
  );

  const unscoredTeams = participants.teams.filter((t) => !scoredTeamIds.has(t.id));
  const unscoredIndividuals = participants.individuals.filter((i) => !scoredUserIds.has(i.userId));

  const filteredSelections = useMemo(() => {
    if (statusFilter === 'semua') return selections;
    return selections.filter((s) => s.result === statusFilter);
  }, [selections, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await validatorContentService.saveSelection({
        competitionId: competition.id,
        teamId: isIndividu ? undefined : form.teamId || undefined,
        userId: isIndividu ? form.userId || undefined : undefined,
        stage: form.stage.trim(),
        result: form.result,
        organizerVerified: form.organizerVerified,
        notes: form.notes.trim() || undefined,
      });
      setForm(EMPTY_SELECTION_FORM);
      setReviewingLabel(null);
      notify('Hasil seleksi internal berhasil dicatat.', 'success');
      await Promise.all([onUpdated(), loadParticipants()]);
    } catch (err: any) {
      notify(err?.message || 'Gagal menyimpan hasil seleksi internal.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const prefillForReview = (item: ValidatorSelectionItem, participantName: string) => {
    setForm({
      teamId: item.teamId || item.team?.id || '',
      userId: item.userId || item.participant?.id || item.user?.id || '',
      stage: item.stage,
      result: (['menunggu', 'lolos', 'tidak'].includes(item.result)
        ? item.result
        : 'menunggu') as 'menunggu' | 'lolos' | 'tidak',
      organizerVerified: Boolean(item.organizerVerified),
      notes: item.notes || '',
    });
    setReviewingLabel(participantName);
  };

  return (
    <div className="space-y-5">
      {/* Ringkasan Mini KPI */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500">
            {isIndividu ? 'Mahasiswa Target Aktif' : 'Tim Aktif Terdaftar'}
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {loadingParticipants ? '—' : totalParticipants}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/50 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800">Menunggu Keputusan</span>
          <p className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800">Delegasi Lolos Terkonfirmasi</span>
          <p className="text-2xl font-black text-emerald-900 mt-1">{passedConfirmedCount}</p>
        </div>
      </div>

      {/* Peserta Belum Dinilai (Akses 1-klik) */}
      {!loadingParticipants && (isIndividu ? unscoredIndividuals.length > 0 : unscoredTeams.length > 0) && (
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-blue-950">
              {isIndividu
                ? `Mahasiswa Belum Tercatat Seleksi (${unscoredIndividuals.length})`
                : `Tim Aktif Belum Tercatat Seleksi (${unscoredTeams.length})`}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {isIndividu
              ? unscoredIndividuals.map((ind) => (
                  <button
                    key={ind.userId}
                    type="button"
                    onClick={() => {
                      setForm({
                        ...EMPTY_SELECTION_FORM,
                        userId: ind.userId,
                        stage: 'Seleksi Internal Kampus',
                      });
                      setReviewingLabel(ind.fullName);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-xl bg-white hover:bg-blue-700 hover:text-white border border-blue-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                  >
                    <span>
                      {ind.fullName} ({ind.nim})
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">
                      Nilai
                    </span>
                  </button>
                ))
              : unscoredTeams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setForm({
                        ...EMPTY_SELECTION_FORM,
                        teamId: t.id,
                        stage: 'Seleksi Internal Kampus',
                      });
                      setReviewingLabel(t.name);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-xl bg-white hover:bg-blue-700 hover:text-white border border-blue-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                  >
                    <span>{t.name}</span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">
                      Nilai
                    </span>
                  </button>
                ))}
          </div>
        </div>
      )}

      {/* Formulir Catat / Nilai Seleksi Internal */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-blue-700" aria-hidden="true" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              {reviewingLabel
                ? `Catat / Perbarui Nilai: ${reviewingLabel}`
                : 'Catat Hasil Seleksi Internal'}
            </h3>
          </div>
          {(reviewingLabel || form.teamId || form.userId || form.stage) && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setForm(EMPTY_SELECTION_FORM);
                setReviewingLabel(null);
              }}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Reset Form
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {loadingParticipants ? (
            <div className="sm:col-span-2 flex items-center gap-2 text-xs text-slate-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" aria-hidden="true" />
              <span>Memuat daftar peserta lomba...</span>
            </div>
          ) : isIndividu ? (
            <Select
              label="Pilih Peserta Individu"
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value, teamId: '' })}
              options={[
                {
                  value: '',
                  label: participants.individuals.length
                    ? 'Pilih mahasiswa peserta...'
                    : 'Belum ada mahasiswa memilih target lomba ini',
                },
                ...participants.individuals.map((ind) => ({
                  value: ind.userId,
                  label: `${ind.fullName} (${ind.nim} - ${ind.studyProgram})`,
                })),
              ]}
              required
            />
          ) : (
            <Select
              label="Pilih Tim Peserta"
              value={form.teamId}
              onChange={(e) => setForm({ ...form, teamId: e.target.value, userId: '' })}
              options={[
                {
                  value: '',
                  label: participants.teams.length
                    ? 'Pilih tim peserta...'
                    : 'Belum ada tim terbentuk pada lomba ini',
                },
                ...participants.teams.map((t) => ({
                  value: t.id,
                  label: `${t.name} (${t.memberNames.join(', ') || t.status})`,
                })),
              ]}
              required
            />
          )}

          <Input
            label="Tahap Seleksi"
            value={form.stage}
            onChange={(e) => setForm({ ...form, stage: e.target.value })}
            placeholder="contoh: Presentasi Internal Kampus"
            required
          />

          <Select
            label="Hasil Seleksi"
            value={form.result}
            onChange={(e) =>
              setForm({
                ...form,
                result: e.target.value as 'menunggu' | 'lolos' | 'tidak',
              })
            }
            options={[
              { value: 'menunggu', label: 'Menunggu Keputusan' },
              { value: 'lolos', label: 'Lolos (Delegasi Resmi)' },
              { value: 'tidak', label: 'Tidak Lolos' },
            ]}
          />

          <Input
            label="Catatan Berita Acara / Penilai (Opsional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="contoh: Proposal layak maju ke tahap nasional"
          />
        </div>

        <label className="flex min-h-[44px] items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.organizerVerified}
            onChange={(e) => setForm({ ...form, organizerVerified: e.target.checked })}
            className="accent-blue-700 w-4 h-4 shrink-0"
          />
          <span>
            Hasil telah dikonfirmasi panitia/pembina (jika <strong>Lolos</strong> pada lomba beregu, keanggotaan tim otomatis dikunci)
          </span>
        </label>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            isLoading={saving}
            leftIcon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
          >
            Simpan Hasil Seleksi
          </Button>
        </div>
      </form>

      {/* Daftar Riwayat & Hasil Seleksi Lomba Ini */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Riwayat Hasil Seleksi Lomba Ini ({selections.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'semua', label: 'Semua' },
                { id: 'menunggu', label: 'Menunggu' },
                { id: 'lolos', label: 'Lolos' },
                { id: 'tidak', label: 'Tidak Lolos' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                className={`px-3 py-1.5 min-h-[34px] rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                  statusFilter === opt.id
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {filteredSelections.length === 0 ? (
          <EmptyState
            icon={<UsersRound className="w-6 h-6" aria-hidden="true" />}
            title={
              selections.length === 0
                ? 'Belum ada catatan seleksi internal'
                : 'Tidak ada data seleksi pada filter ini'
            }
            description={
              selections.length === 0
                ? 'Gunakan formulir di atas atau klik tombol Nilai pada peserta terdaftar untuk mencatat hasil seleksi internal.'
                : 'Pilih filter status lain untuk melihat seluruh catatan seleksi lomba ini.'
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {filteredSelections.map((item) => {
              const participantName =
                item.team?.name ||
                item.participant?.studentProfile?.fullName ||
                item.user?.studentProfile?.fullName ||
                item.user?.fullName ||
                'Peserta';
              const badgeColor =
                item.result === 'lolos'
                  ? 'emerald'
                  : item.result === 'tidak'
                    ? 'rose'
                    : 'amber';
              const resultLabel =
                item.result === 'lolos'
                  ? 'Lolos'
                  : item.result === 'tidak'
                    ? 'Tidak Lolos'
                    : 'Menunggu';

              return (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-slate-900">{participantName}</strong>
                      <Badge color={badgeColor} dot size="sm">
                        {resultLabel}
                      </Badge>
                      {item.organizerVerified && (
                        <Badge color="blue" size="sm">
                          Terkonfirmasi Panitia
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Tahap: <strong className="text-slate-700">{item.stage}</strong>
                      {item.notes ? ` • Catatan: ${item.notes}` : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => prefillForReview(item, participantName)}
                  >
                    Tinjau / Nilai
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
