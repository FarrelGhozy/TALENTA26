import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  FolderTree,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { validatorContentService } from '@talenta/services';
import type {
  PointTemplateItem,
  ValidatorCompetitionItem,
} from '../../../../services/types';
import type { AchievementLevel, AchievementType, CompetitionCategoryItem } from '../../../../types';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Badge } from '../../../../components/ui/Badge';
import { useToast } from '../../../../components/ui/Toast';
import { formatAchievementType } from '../../../../lib/format';

interface CompetitionPointsTabProps {
  competition: ValidatorCompetitionItem;
  categories: CompetitionCategoryItem[];
  templates: PointTemplateItem[];
  onOpenMasterCategories: () => void;
  onUpdated: () => Promise<void>;
}

interface CustomRuleRow {
  subCategoryId: string;
  level: AchievementLevel;
  result: AchievementType;
  points: number;
  description: string;
}

export const CompetitionPointsTab: React.FC<CompetitionPointsTabProps> = ({
  competition,
  categories,
  templates,
  onOpenMasterCategories,
  onUpdated,
}) => {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pointTemplateId, setPointTemplateId] = useState('');
  const [competitionCategoryId, setCompetitionCategoryId] = useState('');
  const [pointDescription, setPointDescription] = useState('');
  const [customRules, setCustomRules] = useState<CustomRuleRow[]>([]);

  const loadPointConfig = useCallback(async () => {
    if (!validatorContentService.getCompetitionPointConfig) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await validatorContentService.getCompetitionPointConfig(competition.id);
      setPointTemplateId(res?.pointTemplateId || '');
      setCompetitionCategoryId(res?.competitionCategory?.id || competition.competitionCategoryId || '');
      setPointDescription(res?.pointDescription || '');
      setCustomRules(
        Array.isArray(res?.customRules)
          ? res.customRules.map((r: any) => ({
              subCategoryId: r.subCategoryId || '',
              level: r.level,
              result: r.result,
              points: Number(r.points ?? 0),
              description: r.description || '',
            }))
          : []
      );
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat konfigurasi aturan poin perlombaan.');
    } finally {
      setLoading(false);
    }
  }, [competition.id, competition.competitionCategoryId]);

  useEffect(() => {
    void loadPointConfig();
  }, [loadPointConfig]);

  const activeCategory = categories.find((c) => c.id === competitionCategoryId);
  const activeSubCats = activeCategory?.subCategories || [];

  const activeTemplate =
    templates.find((t) => t.id === pointTemplateId) ||
    templates.find((t) => t.isActive) ||
    templates[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatorContentService.saveCompetitionPointConfig) return;
    setSaving(true);
    try {
      await validatorContentService.saveCompetitionPointConfig(competition.id, {
        pointTemplateId: pointTemplateId || null,
        competitionCategoryId: competitionCategoryId || null,
        pointDescription: pointDescription.trim() || null,
        customRules: customRules.map((r) => ({
          subCategoryId: r.subCategoryId || null,
          level: r.level,
          result: r.result,
          points: Number(r.points),
          description: r.description.trim() || undefined,
        })),
      });
      notify('Konfigurasi aturan poin perlombaan berhasil disimpan.', 'success');
      await onUpdated();
    } catch (err: any) {
      notify(err?.message || 'Gagal menyimpan konfigurasi poin perlombaan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-2.5 text-xs text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" aria-hidden="true" />
        <span>Memuat konfigurasi aturan poin {competition.name}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-3">
        <p className="text-xs font-semibold text-rose-800">{error}</p>
        <Button size="sm" variant="outline" onClick={() => void loadPointConfig()}>
          Coba Muat Ulang
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Bagian 1: Rujukan Template & Rumpun Lomba */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-700" aria-hidden="true" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Template Poin Rujukan &amp; Rumpun Lomba
            </h3>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenMasterCategories}
            leftIcon={<FolderTree className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Kelola Master Jenis &amp; Sub-Lomba
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Template Poin Rujukan (Opsional)"
            value={pointTemplateId}
            onChange={(e) => setPointTemplateId(e.target.value)}
            options={[
              { value: '', label: 'Ikuti Template Aktif Kampus (Default)' },
              ...templates.map((t) => ({
                value: t.id,
                label: `${t.name} (v${t.version})${t.isActive ? ' — Aktif' : ''}`,
              })),
            ]}
          />

          <Select
            label="Jenis / Rumpun Lomba"
            value={competitionCategoryId}
            onChange={(e) => setCompetitionCategoryId(e.target.value)}
            options={[
              { value: '', label: 'Pilih Jenis Lomba...' },
              ...categories.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.subCategories.length} sub-lomba)`,
              })),
            ]}
          />
        </div>

        {activeTemplate && activeTemplate.rules.length > 0 && (
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold text-slate-700">
                Pratinjau Bobot Dasar: {activeTemplate.name} (v{activeTemplate.version})
              </span>
              <Badge color="blue" size="sm">
                {pointTemplateId ? 'Dipilih khusus' : 'Template default aktif'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeTemplate.rules.slice(0, 12).map((rule, i) => (
                <span
                  key={`${rule.level}-${rule.result}-${i}`}
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 font-medium"
                >
                  <span className="capitalize text-slate-500">{rule.level}</span> ·{' '}
                  {formatAchievementType(rule.result)}:{' '}
                  <strong className="text-blue-800">{rule.points}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Keterangan Bobot Poin Perlombaan (Tampil saat Verifikasi &amp; Katalog Publik)
          </label>
          <textarea
            rows={2}
            value={pointDescription}
            onChange={(e) => setPointDescription(e.target.value)}
            placeholder="Contoh: PKM dengan pendanaan Dikti memperoleh bobot khusus sesuai sub-lomba dan tingkat capaian..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>
      </div>

      {/* Bagian 2: Aturan Poin Khusus Perlombaan & Sub-Lomba */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Pengecualian / Aturan Poin Khusus ({customRules.length})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Aturan khusus di bawah akan menggantikan bobot template dasar untuk kombinasi sub-lomba, tingkat, dan capaian tertentu.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
            onClick={() =>
              setCustomRules((prev) => [
                ...prev,
                {
                  subCategoryId: '',
                  level: (competition.level as AchievementLevel) || 'nasional',
                  result: 'juara_1',
                  points: 20,
                  description: '',
                },
              ])
            }
          >
            Tambah Aturan Khusus
          </Button>
        </div>

        {customRules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">
              Belum ada aturan poin pengecualian khusus.
            </p>
            <p className="text-[11px] text-slate-500">
              Perlombaan ini otomatis memakai bobot dari template poin rujukan di atas.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {customRules.map((rule, idx) => (
              <div
                key={idx}
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 items-end p-3.5 rounded-xl bg-slate-50 border border-slate-200"
              >
                <div className="lg:col-span-3">
                  <Select
                    label="Sub-Lomba"
                    value={rule.subCategoryId}
                    onChange={(e) => {
                      const next = [...customRules];
                      next[idx] = { ...next[idx], subCategoryId: e.target.value };
                      setCustomRules(next);
                    }}
                    options={[
                      { value: '', label: 'Semua Sub-Lomba' },
                      ...activeSubCats.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                  />
                </div>
                <div className="lg:col-span-2">
                  <Select
                    label="Tingkat"
                    value={rule.level}
                    onChange={(e) => {
                      const next = [...customRules];
                      next[idx] = { ...next[idx], level: e.target.value as AchievementLevel };
                      setCustomRules(next);
                    }}
                    options={[
                      { value: 'lokal', label: 'Lokal' },
                      { value: 'nasional', label: 'Nasional' },
                      { value: 'internasional', label: 'Internasional' },
                    ]}
                  />
                </div>
                <div className="lg:col-span-3">
                  <Select
                    label="Capaian"
                    value={rule.result}
                    onChange={(e) => {
                      const next = [...customRules];
                      next[idx] = { ...next[idx], result: e.target.value as AchievementType };
                      setCustomRules(next);
                    }}
                    options={[
                      { value: 'juara_1', label: 'Juara 1' },
                      { value: 'juara_2', label: 'Juara 2' },
                      { value: 'juara_3', label: 'Juara 3' },
                      { value: 'finalis', label: 'Finalis' },
                      { value: 'penghargaan_khusus', label: 'Penghargaan Khusus' },
                      { value: 'partisipasi', label: 'Partisipasi' },
                    ]}
                  />
                </div>
                <div className="lg:col-span-1">
                  <Input
                    label="Poin"
                    type="number"
                    min={0}
                    value={String(rule.points)}
                    onChange={(e) => {
                      const next = [...customRules];
                      next[idx] = { ...next[idx], points: Number(e.target.value) };
                      setCustomRules(next);
                    }}
                  />
                </div>
                <div className="lg:col-span-2">
                  <Input
                    label="Keterangan"
                    value={rule.description}
                    onChange={(e) => {
                      const next = [...customRules];
                      next[idx] = { ...next[idx], description: e.target.value };
                      setCustomRules(next);
                    }}
                    placeholder="Catatan..."
                  />
                </div>
                <div className="lg:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="danger-outline"
                    className="px-2.5"
                    aria-label={`Hapus aturan poin khusus baris ${idx + 1}`}
                    title="Hapus aturan poin"
                    onClick={() => setCustomRules((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          isLoading={saving}
          leftIcon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
        >
          Simpan Konfigurasi Poin
        </Button>
      </div>
    </form>
  );
};
