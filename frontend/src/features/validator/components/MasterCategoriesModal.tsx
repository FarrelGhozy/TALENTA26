import React, { useState } from 'react';
import { FolderTree, Plus } from 'lucide-react';
import { validatorContentService } from '@talenta/services';
import type { CompetitionCategoryItem } from '../../../types';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { formatAchievementType } from '../../../lib/format';

interface MasterCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CompetitionCategoryItem[];
  onRefresh: () => Promise<void>;
}

export const MasterCategoriesModal: React.FC<MasterCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onRefresh,
}) => {
  const { notify } = useToast();
  const [newCatForm, setNewCatForm] = useState({ code: '', name: '', description: '' });
  const [newSubForm, setNewSubForm] = useState({ categoryId: '', code: '', name: '', description: '' });
  const [savingCat, setSavingCat] = useState(false);
  const [savingSub, setSavingSub] = useState(false);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatorContentService.createCompetitionCategory) return;
    setSavingCat(true);
    try {
      await validatorContentService.createCompetitionCategory(newCatForm);
      setNewCatForm({ code: '', name: '', description: '' });
      notify('Jenis lomba baru berhasil ditambahkan.', 'success');
      await onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Gagal menambah jenis lomba.', 'error');
    } finally {
      setSavingCat(false);
    }
  };

  const handleCreateSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatorContentService.createCompetitionSubCategory) return;
    setSavingSub(true);
    try {
      await validatorContentService.createCompetitionSubCategory(newSubForm);
      setNewSubForm({ categoryId: newSubForm.categoryId, code: '', name: '', description: '' });
      notify('Sub-lomba / divisi baru berhasil ditambahkan.', 'success');
      await onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Gagal menambah sub-lomba.', 'error');
    } finally {
      setSavingSub(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Master Jenis & Sub-Lomba (Lintas Kompetisi)"
      size="2xl"
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-3.5 text-xs text-slate-600 leading-relaxed">
          <strong className="text-blue-950">Data rujukan global:</strong> Master Jenis &amp; Sub-Lomba dipakai bersama oleh seluruh kompetisi untuk menentukan pilihan cabang lomba saat mahasiswa mengajukan prestasi serta aturan pengecualian poin.
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <form
            onSubmit={handleCreateCategory}
            className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
          >
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Tambah Master Jenis Lomba
            </h4>
            <Input
              label="Kode Unik"
              value={newCatForm.code}
              onChange={(e) => setNewCatForm({ ...newCatForm, code: e.target.value })}
              placeholder="contoh: debat-ilmiah"
              required
            />
            <Input
              label="Nama Jenis Lomba"
              value={newCatForm.name}
              onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })}
              placeholder="contoh: Debat & Bahasa"
              required
            />
            <Input
              label="Keterangan (Opsional)"
              value={newCatForm.description}
              onChange={(e) => setNewCatForm({ ...newCatForm, description: e.target.value })}
              placeholder="Ringkasan cakupan rumpun lomba"
            />
            <Button
              type="submit"
              size="sm"
              isLoading={savingCat}
              leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Tambah Jenis
            </Button>
          </form>

          <form
            onSubmit={handleCreateSubCategory}
            className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
          >
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Tambah Master Sub-Lomba / Divisi
            </h4>
            <Select
              label="Induk Jenis Lomba"
              value={newSubForm.categoryId}
              onChange={(e) => setNewSubForm({ ...newSubForm, categoryId: e.target.value })}
              options={[
                { value: '', label: 'Pilih jenis lomba...' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              required
            />
            <Input
              label="Kode Sub-Lomba"
              value={newSubForm.code}
              onChange={(e) => setNewSubForm({ ...newSubForm, code: e.target.value })}
              placeholder="contoh: kdbi"
              required
            />
            <Input
              label="Nama Sub-Lomba / Divisi"
              value={newSubForm.name}
              onChange={(e) => setNewSubForm({ ...newSubForm, name: e.target.value })}
              placeholder="contoh: Kompetisi Debat Bahasa Indonesia"
              required
            />
            <Button
              type="submit"
              size="sm"
              isLoading={savingSub}
              leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Tambah Sub-Lomba
            </Button>
          </form>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-blue-700" aria-hidden="true" />
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Daftar Jenis &amp; Sub-Lomba Terdaftar ({categories.length})
            </h4>
          </div>

          {categories.length === 0 ? (
            <p className="text-xs text-slate-500 p-4 rounded-xl border border-dashed border-slate-200 text-center">
              Belum ada master jenis lomba terdaftar.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <strong className="text-slate-900 block truncate">{cat.name}</strong>
                      <span className="text-[10px] font-mono text-slate-400">{cat.code}</span>
                    </div>
                    <Badge color="blue" size="sm">
                      {cat.subCategories.length} sub
                    </Badge>
                  </div>
                  {cat.subCategories.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Belum ada sub-lomba</p>
                  ) : (
                    <ul className="space-y-1 text-slate-600 pl-3.5 list-disc">
                      {cat.subCategories.map((sub) => (
                        <li key={sub.id}>
                          <span className="font-medium text-slate-700">{sub.name}</span>
                          {sub.pointRules && sub.pointRules.length > 0
                            ? ` (${sub.pointRules.map((r) => `${formatAchievementType(r.result)}: ${r.points}`).join(', ')})`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
