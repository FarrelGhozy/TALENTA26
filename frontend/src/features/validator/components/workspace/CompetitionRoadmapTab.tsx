import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpenCheck,
  Link2,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { validatorContentService } from '@talenta/services';
import type { ValidatorCompetitionItem, ValidatorRoadmapDetail } from '../../../../services/types';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { useToast } from '../../../../components/ui/Toast';

interface CompetitionRoadmapTabProps {
  competition: ValidatorCompetitionItem;
  onUpdated: () => Promise<void>;
}

export const CompetitionRoadmapTab: React.FC<CompetitionRoadmapTabProps> = ({
  competition,
  onUpdated,
}) => {
  const { notify } = useToast();
  const [phases, setPhases] = useState<ValidatorRoadmapDetail['phases']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedResourceKeys, setExpandedResourceKeys] = useState<Record<string, boolean>>({});

  const loadRoadmap = useCallback(async () => {
    if (!validatorContentService.getRoadmap) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await validatorContentService.getRoadmap(competition.slug);
      setPhases(Array.isArray(res?.phases) ? res.phases : []);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat roadmap perlombaan.');
    } finally {
      setLoading(false);
    }
  }, [competition.slug]);

  useEffect(() => {
    void loadRoadmap();
  }, [loadRoadmap]);

  const addPhase = () => {
    setPhases((prev) => [
      ...prev,
      {
        orderIndex: prev.length + 1,
        title: `Fase ${prev.length + 1}`,
        description: '',
        tasks: [{ orderIndex: 1, title: '', isRequired: true }],
      },
    ]);
  };

  const movePhase = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= phases.length) return;
    setPhases((prev) => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const normalized = phases.map((p, pIdx) => ({
        id: p.id,
        orderIndex: pIdx + 1,
        title: p.title.trim(),
        description: p.description?.trim() || undefined,
        targetDays:
          p.targetDays !== undefined && p.targetDays !== null && Number(p.targetDays) > 0
            ? Number(p.targetDays)
            : undefined,
        tasks: (p.tasks || []).map((t, tIdx) => ({
          id: t.id,
          orderIndex: tIdx + 1,
          title: t.title.trim(),
          description: t.description?.trim() || undefined,
          isRequired: t.isRequired ?? true,
          resourceTitle: t.resourceTitle?.trim() || undefined,
          resourceUrl: t.resourceUrl?.trim() || undefined,
        })),
      }));

      const saved: any = await validatorContentService.saveRoadmap(competition.slug, normalized);
      if (Array.isArray(saved?.phases)) {
        setPhases(saved.phases);
      }
      notify('Roadmap persiapan berhasil disimpan tanpa menghapus progres mahasiswa.', 'success');
      await onUpdated();
    } catch (err: any) {
      notify(err?.message || 'Gagal menyimpan roadmap persiapan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-2.5 text-xs text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" aria-hidden="true" />
        <span>Memuat roadmap persiapan {competition.name}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-3">
        <p className="text-xs font-semibold text-rose-800">{error}</p>
        <Button size="sm" variant="outline" onClick={() => void loadRoadmap()}>
          Coba Muat Ulang
        </Button>
      </div>
    );
  }

  const totalTasks = phases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 text-xs text-emerald-950">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong className="block">Editor Roadmap Non-Destruktif</strong>
            <p className="text-[11px] text-emerald-800/90 mt-0.5">
              Mengubah judul, urutan, atau menambah tugas baru tetap mempertahankan progres checklist mahasiswa yang sudah selesai pada tugas sebelumnya.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-extrabold text-emerald-900 bg-white/80 border border-emerald-200 px-3 py-1 rounded-full shrink-0 self-start sm:self-center">
          {phases.length} Fase · {totalTasks} Tugas
        </span>
      </div>

      {phases.length === 0 ? (
        <EmptyState
          icon={<BookOpenCheck className="w-6 h-6" aria-hidden="true" />}
          title="Belum ada roadmap persiapan"
          description={`Susun fase belajar dan daftar tugas terstruktur untuk membimbing peserta ${competition.name}.`}
          action={
            <Button
              type="button"
              size="sm"
              onClick={addPhase}
              leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
            >
              Buat Fase Pertama
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {phases.map((phase, pIdx) => (
            <div
              key={phase.id || `phase-${pIdx}`}
              className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden"
            >
              {/* Header Fase */}
              <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-blue-700 text-white text-xs font-black flex items-center justify-center shrink-0">
                    {pIdx + 1}
                  </span>
                  <div>
                    <strong className="text-xs font-extrabold text-slate-900">
                      Fase #{pIdx + 1}
                    </strong>
                    <span className="text-[11px] text-slate-500 ml-2">
                      ({phase.tasks?.length || 0} tugas)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="px-2"
                    disabled={pIdx === 0}
                    aria-label={`Pindahkan fase ${pIdx + 1} ke atas`}
                    onClick={() => movePhase(pIdx, -1)}
                  >
                    <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="px-2"
                    disabled={pIdx === phases.length - 1}
                    aria-label={`Pindahkan fase ${pIdx + 1} ke bawah`}
                    onClick={() => movePhase(pIdx, 1)}
                  >
                    <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger-outline"
                    leftIcon={<Trash2 className="w-3.5 h-3.5" aria-hidden="true" />}
                    onClick={() => setPhases((prev) => prev.filter((_, i) => i !== pIdx))}
                  >
                    Hapus Fase
                  </Button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid gap-3.5 sm:grid-cols-12">
                  <div className="sm:col-span-5">
                    <Input
                      label="Judul Fase"
                      value={phase.title}
                      onChange={(e) => {
                        const next = [...phases];
                        next[pIdx] = { ...next[pIdx], title: e.target.value };
                        setPhases(next);
                      }}
                      placeholder="contoh: Pemahaman Pedoman & Eksplorasi Ide"
                      required
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <Input
                      label="Ringkasan / Target Fase"
                      value={phase.description || ''}
                      onChange={(e) => {
                        const next = [...phases];
                        next[pIdx] = { ...next[pIdx], description: e.target.value };
                        setPhases(next);
                      }}
                      placeholder="Target luaran yang dicapai pada fase ini"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Target (Hari)"
                      type="number"
                      min={1}
                      value={phase.targetDays ? String(phase.targetDays) : ''}
                      onChange={(e) => {
                        const next = [...phases];
                        const val = e.target.value ? Number(e.target.value) : null;
                        next[pIdx] = { ...next[pIdx], targetDays: val };
                        setPhases(next);
                      }}
                      placeholder="14"
                    />
                  </div>
                </div>

                {/* Daftar Tugas Fase */}
                <div className="space-y-2.5 pl-3 border-l-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Daftar Tugas / Checklist
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                      onClick={() => {
                        const next = [...phases];
                        next[pIdx] = {
                          ...next[pIdx],
                          tasks: [
                            ...(next[pIdx].tasks || []),
                            {
                              orderIndex: (next[pIdx].tasks?.length || 0) + 1,
                              title: '',
                              isRequired: true,
                            },
                          ],
                        };
                        setPhases(next);
                      }}
                    >
                      Tambah Tugas
                    </Button>
                  </div>

                  {(phase.tasks || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      Belum ada tugas pada fase ini.
                    </p>
                  ) : (
                    (phase.tasks || []).map((task, tIdx) => {
                      const taskKey = task.id || `${pIdx}-${tIdx}`;
                      const showResource =
                        Boolean(expandedResourceKeys[taskKey]) ||
                        Boolean(task.resourceUrl) ||
                        Boolean(task.resourceTitle);

                      return (
                        <div
                          key={taskKey}
                          className="rounded-xl bg-slate-50/80 border border-slate-200 p-3 space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-end">
                            <div className="flex-1">
                              <Input
                                label={`Tugas ${tIdx + 1}`}
                                value={task.title}
                                onChange={(e) => {
                                  const next = [...phases];
                                  const nextTasks = [...(next[pIdx].tasks || [])];
                                  nextTasks[tIdx] = { ...nextTasks[tIdx], title: e.target.value };
                                  next[pIdx] = { ...next[pIdx], tasks: nextTasks };
                                  setPhases(next);
                                }}
                                placeholder="contoh: Bedah 3 proposal pemenang tahun sebelumnya"
                                required
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 px-3 min-h-[42px] rounded-xl bg-white border border-slate-200 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={task.isRequired !== false}
                                  onChange={(e) => {
                                    const next = [...phases];
                                    const nextTasks = [...(next[pIdx].tasks || [])];
                                    nextTasks[tIdx] = {
                                      ...nextTasks[tIdx],
                                      isRequired: e.target.checked,
                                    };
                                    next[pIdx] = { ...next[pIdx], tasks: nextTasks };
                                    setPhases(next);
                                  }}
                                  className="accent-blue-700 w-4 h-4"
                                />
                                <span>Wajib</span>
                              </label>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="px-2.5"
                                aria-label={`Atur tautan sumber belajar tugas ${tIdx + 1}`}
                                title="Tautan sumber belajar (opsional)"
                                onClick={() =>
                                  setExpandedResourceKeys((prev) => ({
                                    ...prev,
                                    [taskKey]: !showResource,
                                  }))
                                }
                              >
                                <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="danger-outline"
                                className="px-2.5"
                                aria-label={`Hapus tugas ${task.title || tIdx + 1}`}
                                title="Hapus tugas"
                                onClick={() => {
                                  const next = [...phases];
                                  next[pIdx] = {
                                    ...next[pIdx],
                                    tasks: next[pIdx].tasks.filter((_, idx) => idx !== tIdx),
                                  };
                                  setPhases(next);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </Button>
                            </div>
                          </div>

                          {showResource && (
                            <div className="grid gap-2.5 sm:grid-cols-2 pt-1 border-t border-slate-200/70">
                              <Input
                                label="Judul Sumber Belajar (Opsional)"
                                value={task.resourceTitle || ''}
                                onChange={(e) => {
                                  const next = [...phases];
                                  const nextTasks = [...(next[pIdx].tasks || [])];
                                  nextTasks[tIdx] = {
                                    ...nextTasks[tIdx],
                                    resourceTitle: e.target.value,
                                  };
                                  next[pIdx] = { ...next[pIdx], tasks: nextTasks };
                                  setPhases(next);
                                }}
                                placeholder="contoh: Panduan Resmi Belmawa"
                              />
                              <Input
                                label="Tautan Sumber Belajar (Opsional)"
                                value={task.resourceUrl || ''}
                                onChange={(e) => {
                                  const next = [...phases];
                                  const nextTasks = [...(next[pIdx].tasks || [])];
                                  nextTasks[tIdx] = {
                                    ...nextTasks[tIdx],
                                    resourceUrl: e.target.value,
                                  };
                                  next[pIdx] = { ...next[pIdx], tasks: nextTasks };
                                  setPhases(next);
                                }}
                                placeholder="https://..."
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addPhase}
          leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
        >
          Tambah Fase Baru
        </Button>

        <Button
          type="submit"
          size="sm"
          isLoading={saving}
          leftIcon={<BookOpenCheck className="w-4 h-4" aria-hidden="true" />}
        >
          Simpan Roadmap ({phases.length} Fase)
        </Button>
      </div>
    </form>
  );
};
