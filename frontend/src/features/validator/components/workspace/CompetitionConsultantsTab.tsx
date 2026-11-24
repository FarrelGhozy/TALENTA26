import React, { useState } from 'react';
import {
  Clock,
  Contact,
  Edit3,
  MessageCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { validatorContentService } from '@talenta/services';
import type {
  ValidatorCompetitionItem,
  ValidatorConsultantItem,
} from '../../../../services/types';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Badge } from '../../../../components/ui/Badge';
import { Modal } from '../../../../components/ui/Modal';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { useToast } from '../../../../components/ui/Toast';

interface CompetitionConsultantsTabProps {
  competition: ValidatorCompetitionItem;
  consultants: ValidatorConsultantItem[];
  onUpdated: () => Promise<void>;
}

const EMPTY_FORM = {
  name: '',
  field: '',
  whatsappNumber: '',
  capacityNote: '',
};

export const CompetitionConsultantsTab: React.FC<CompetitionConsultantsTabProps> = ({
  competition,
  consultants,
  onUpdated,
}) => {
  const { notify } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ValidatorConsultantItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (item: ValidatorConsultantItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      field: item.field,
      whatsappNumber: item.whatsappNumber,
      capacityNote: item.capacityNote || '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const rawDigits = form.whatsappNumber.replace(/\D/g, '');
    const normalizedWa = rawDigits.startsWith('0') ? `62${rawDigits.slice(1)}` : rawDigits;
    if (!/^62\d{8,13}$/.test(normalizedWa)) {
      notify('Nomor WhatsApp tidak valid. Gunakan format 08... atau 628... (10–15 digit).', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingId && validatorContentService.updateConsultant) {
        await validatorContentService.updateConsultant(editingId, {
          name: form.name.trim(),
          field: form.field.trim(),
          whatsappNumber: form.whatsappNumber.trim(),
          capacityNote: form.capacityNote.trim(),
        });
        notify(`Kontak "${form.name.trim()}" berhasil diperbarui.`, 'success');
      } else {
        await validatorContentService.createConsultant({
          competitionSlug: competition.slug,
          name: form.name.trim(),
          field: form.field.trim(),
          whatsappNumber: form.whatsappNumber.trim(),
          capacityNote: form.capacityNote.trim() || undefined,
        });
        notify(`Kontak konsultasi "${form.name.trim()}" berhasil diterbitkan.`, 'success');
      }
      closeForm();
      await onUpdated();
    } catch (err: any) {
      notify(err?.message || 'Gagal menyimpan kontak konsultasi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: ValidatorConsultantItem) => {
    if (!validatorContentService.updateConsultant) return;
    setTogglingId(item.id);
    try {
      const nextStatus = item.status === 'published' ? 'archived' : 'published';
      await validatorContentService.updateConsultant(item.id, { status: nextStatus });
      notify(
        nextStatus === 'published'
          ? `Kontak "${item.name}" berhasil diterbitkan.`
          : `Kontak "${item.name}" berhasil diarsipkan.`,
        'info'
      );
      await onUpdated();
    } catch (err: any) {
      notify(err?.message || 'Gagal memperbarui status kontak.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !validatorContentService.deleteConsultant) return;
    setDeleting(true);
    try {
      await validatorContentService.deleteConsultant(deleteTarget.id);
      notify(`Kontak "${deleteTarget.name}" berhasil dihapus.`, 'success');
      setDeleteTarget(null);
      await onUpdated();
    } catch (err: any) {
      notify(err?.message || 'Gagal menghapus kontak konsultasi.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const publishedCount = consultants.filter((c) => c.status === 'published').length;

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            Kontak Dosen / Konsultan Pembimbing ({consultants.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {publishedCount} kontak aktif tampil pada Ruang Persiapan peserta <strong>{competition.name}</strong>. Dosen/konsultan tidak memerlukan akun aplikasi.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={openCreateForm}
          leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
        >
          Tambah Kontak Konsultan
        </Button>
      </div>

      {/* Daftar Kontak Konsultan */}
      {consultants.length === 0 ? (
        <EmptyState
          icon={<Contact className="w-6 h-6" aria-hidden="true" />}
          title="Belum ada kontak konsultan untuk lomba ini"
          description={`Tambahkan kontak WhatsApp dosen pembimbing atau konsultan yang bersedia mendampingi peserta ${competition.name}.`}
          action={
            <Button
              type="button"
              size="sm"
              onClick={openCreateForm}
              leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
            >
              Tambah Kontak Pertama
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2">
          {consultants.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between gap-3.5"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-extrabold text-slate-900 truncate">{c.name}</h4>
                    <p className="text-xs font-semibold text-blue-700 mt-0.5">{c.field}</p>
                  </div>
                  <Badge color={c.status === 'published' ? 'emerald' : 'slate'} dot size="sm">
                    {c.status === 'published' ? 'Terbit' : 'Arsip'}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-slate-600 pt-1">
                  <p className="inline-flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span className="font-mono font-semibold text-slate-700">{c.whatsappNumber}</span>
                  </p>
                  {c.capacityNote && (
                    <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{c.capacityNote}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                {validatorContentService.updateConsultant && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditForm(c)}
                      leftIcon={<Edit3 className="w-3.5 h-3.5" aria-hidden="true" />}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      isLoading={togglingId === c.id}
                      onClick={() => void handleToggleStatus(c)}
                    >
                      {c.status === 'published' ? 'Arsipkan' : 'Terbitkan'}
                    </Button>
                  </>
                )}
                {validatorContentService.deleteConsultant && (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger-outline"
                    aria-label={`Hapus kontak ${c.name}`}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" aria-hidden="true" />}
                    onClick={() => setDeleteTarget(c)}
                  >
                    Hapus
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit Kontak */}
      <Modal
        isOpen={formOpen}
        onClose={() => {
          if (!saving) closeForm();
        }}
        title={editingId ? 'Edit Kontak Konsultan' : `Tambah Kontak Konsultan — ${competition.name}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={closeForm} disabled={saving}>
              Batal
            </Button>
            <Button
              type="submit"
              form="consultant-modal-form"
              size="sm"
              isLoading={saving}
              leftIcon={<Contact className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              {editingId ? 'Simpan Perubahan' : 'Terbitkan Kontak'}
            </Button>
          </div>
        }
      >
        <form id="consultant-modal-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nama Dosen / Konsultan"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="contoh: Dr. Ahmad Pembina, M.Kom."
            required
          />
          <Input
            label="Bidang Keahlian"
            value={form.field}
            onChange={(e) => setForm({ ...form, field: e.target.value })}
            placeholder="contoh: Rekayasa Perangkat Lunak / Riset"
            required
          />
          <Input
            label="Nomor WhatsApp (Format 628...)"
            value={form.whatsappNumber}
            onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
            placeholder="contoh: 6281234567890"
            required
          />
          <Input
            label="Catatan Jadwal / Kuota (Opsional)"
            value={form.capacityNote}
            onChange={(e) => setForm({ ...form, capacityNote: e.target.value })}
            placeholder="contoh: Senin–Rabu 13.00–15.00 WIB"
          />
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        title="Hapus Kontak Konsultan"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Batal
            </Button>
            <Button variant="danger" size="sm" isLoading={deleting} onClick={handleDelete}>
              Hapus Kontak
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus kontak <strong>{deleteTarget?.name}</strong> dari perlombaan <strong>{competition.name}</strong>?
        </p>
      </Modal>
    </div>
  );
};
