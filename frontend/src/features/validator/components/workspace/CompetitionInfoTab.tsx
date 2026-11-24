import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { validatorContentService } from '@talenta/services';
import type { ValidatorCompetitionItem } from '../../../../services/types';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';
import {
  competitionToFormState,
  formStateToCompetitionPayload,
  type CompetitionFormState,
} from '../../types';
import { CompetitionFormFields } from '../CompetitionFormFields';

interface CompetitionInfoTabProps {
  competition: ValidatorCompetitionItem;
  onUpdated: () => Promise<void>;
}

export const CompetitionInfoTab: React.FC<CompetitionInfoTabProps> = ({
  competition,
  onUpdated,
}) => {
  const { notify } = useToast();
  const initialSnapshot = useMemo(() => competitionToFormState(competition), [competition]);
  const [form, setForm] = useState<CompetitionFormState>(initialSnapshot);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initialSnapshot);
  }, [initialSnapshot]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialSnapshot),
    [form, initialSnapshot]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatorContentService.updateCompetition) return;

    setSaving(true);
    try {
      const payload = formStateToCompetitionPayload(form);
      await validatorContentService.updateCompetition(competition.id, payload);
      notify('Profil, jadwal, dan aturan perlombaan berhasil diperbarui.', 'success');
      await onUpdated();
    } catch (err: any) {
      notify(err?.message || 'Gagal menyimpan perubahan perlombaan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <CompetitionFormFields form={form} onChange={setForm} />

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs">
          {isDirty ? (
            <span className="font-bold text-amber-800">
              Ada perubahan yang belum disimpan pada profil lomba ini.
            </span>
          ) : (
            <span className="text-slate-500">
              Seluruh perubahan profil &amp; aturan sudah tersimpan.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!isDirty || saving}
            onClick={() => setForm(initialSnapshot)}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Reset
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={saving}
            disabled={!isDirty}
            leftIcon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
          >
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </form>
  );
};
