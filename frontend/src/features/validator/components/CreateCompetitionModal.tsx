import React, { useEffect, useState } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { validatorContentService } from '@talenta/services';
import type { ValidatorCompetitionItem } from '../../../services/types';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import {
  createEmptyCompetitionForm,
  formStateToCompetitionPayload,
  type CompetitionFormState,
} from '../types';
import { CompetitionFormFields } from './CompetitionFormFields';

interface CreateCompetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (created: ValidatorCompetitionItem, openImmediately: boolean) => void;
}

export const CreateCompetitionModal: React.FC<CreateCompetitionModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { notify } = useToast();
  const [form, setForm] = useState<CompetitionFormState>(createEmptyCompetitionForm);
  const [submittingMode, setSubmittingMode] = useState<'draft' | 'open' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(createEmptyCompetitionForm());
      setSubmittingMode(null);
    }
  }, [isOpen]);

  const handleSubmit = async (openImmediately: boolean) => {
    if (!form.name.trim() || !form.organizer.trim() || !form.category.trim() || !form.description.trim()) {
      notify('Lengkapi nama kompetisi, penyelenggara, kategori, dan deskripsi terlebih dahulu.', 'error');
      return;
    }

    setSubmittingMode(openImmediately ? 'open' : 'draft');
    try {
      const payload = formStateToCompetitionPayload(form);
      const created = await validatorContentService.createCompetition(payload);
      notify(`Draft perlombaan "${created.name}" berhasil dibuat.`, 'success');
      onCreated(created, openImmediately);
    } catch (err: any) {
      notify(err?.message || 'Gagal membuat draft perlombaan.', 'error');
    } finally {
      setSubmittingMode(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submittingMode) onClose();
      }}
      title="Buat Lomba Baru (Draft)"
      size="2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <p className="text-[11px] text-slate-500">
            Lomba baru disimpan sebagai <strong>Draft</strong>. Roadmap, aturan poin, dan konsultan dapat langsung diatur setelah dibuat.
          </p>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={Boolean(submittingMode)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={submittingMode === 'draft'}
              disabled={Boolean(submittingMode)}
              onClick={() => void handleSubmit(false)}
              leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Simpan Draft
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={submittingMode === 'open'}
              disabled={Boolean(submittingMode)}
              onClick={() => void handleSubmit(true)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Simpan &amp; Atur Lomba
            </Button>
          </div>
        </div>
      }
    >
      <form
        id="create-competition-form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(false);
        }}
      >
        <CompetitionFormFields form={form} onChange={setForm} compact />
      </form>
    </Modal>
  );
};
