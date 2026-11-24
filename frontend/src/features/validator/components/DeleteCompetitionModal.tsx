import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { validatorContentService } from '@talenta/services';
import type { CompetitionDeletePreview, ValidatorCompetitionItem } from '../../../services/types';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import { getStatusBadgeColor, getStatusLabel } from '../types';

interface DeleteCompetitionModalProps {
  target: ValidatorCompetitionItem | null;
  onClose: () => void;
  onDeleted: (deletedId: string) => void;
}

export const DeleteCompetitionModal: React.FC<DeleteCompetitionModalProps> = ({
  target,
  onClose,
  onDeleted,
}) => {
  const { notify } = useToast();
  const [preview, setPreview] = useState<CompetitionDeletePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadPreview = async (item: ValidatorCompetitionItem) => {
    setPreview(null);
    setError('');
    setConfirmText('');
    if (!validatorContentService.getCompetitionDeletePreview) return;
    setLoading(true);
    try {
      const res = await validatorContentService.getCompetitionDeletePreview(item.id);
      setPreview(res);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat pratinjau dampak penghapusan lomba.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (target) {
      void loadPreview(target);
    } else {
      setPreview(null);
      setError('');
      setConfirmText('');
      setLoading(false);
    }
  }, [target?.id]);

  const handleClose = () => {
    if (deleting) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (!target || !validatorContentService.deleteCompetition) return;
    if (preview?.requiresTypedConfirmation && confirmText.trim().toUpperCase() !== 'HAPUS') {
      return;
    }

    setDeleting(true);
    try {
      const result = await validatorContentService.deleteCompetition(target.id);
      const preservedNote =
        result.preservedAchievementsCount > 0
          ? ` ${result.preservedAchievementsCount} input prestasi mahasiswa tetap dipertahankan.`
          : '';
      notify(`Kompetisi "${result.name}" berhasil dihapus.${preservedNote}`, 'success');
      onDeleted(target.id);
    } catch (err: any) {
      notify(err?.message || 'Gagal menghapus kompetisi.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(target)}
      onClose={handleClose}
      title="Hapus Perlombaan Permanen"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={deleting}>
            Batal
          </Button>
          <Button
            variant="danger"
            size="sm"
            isLoading={deleting}
            disabled={
              loading ||
              Boolean(error) ||
              !preview ||
              (preview.requiresTypedConfirmation && confirmText.trim().toUpperCase() !== 'HAPUS')
            }
            onClick={handleConfirm}
            leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Hapus Permanen
          </Button>
        </div>
      }
    >
      {target && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-slate-900 truncate">{target.name}</p>
              <p className="text-[11px] text-slate-500">{target.organizer}</p>
            </div>
            <Badge color={getStatusBadgeColor(target.status)} size="sm">
              {getStatusLabel(target.status)}
            </Badge>
          </div>

          {loading && (
            <div className="flex items-center gap-2.5 py-6 justify-center text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" aria-hidden="true" />
              <span>Menghitung data terkait yang terdampak...</span>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-rose-800 space-y-2">
              <p className="font-semibold">{error}</p>
              <Button size="sm" variant="outline" onClick={() => void loadPreview(target)}>
                Coba Muat Ulang
              </Button>
            </div>
          )}

          {preview && !loading && (
            <>
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-2">
                <div className="flex items-start gap-2 text-rose-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
                  <div>
                    <p className="font-bold text-xs">Data terkait lomba yang akan ikut terhapus permanen:</p>
                    <p className="text-[11px] text-rose-700/90">
                      Tindakan ini tidak dapat dibatalkan. Gunakan aksi <strong>Arsipkan</strong> jika hanya ingin menyembunyikan lomba dari katalog publik.
                    </p>
                  </div>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-rose-900">
                  <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                    <span>Target mahasiswa</span>
                    <strong>
                      {preview.counts.targets}
                      {preview.counts.activeTargets > 0 ? ` (${preview.counts.activeTargets} aktif)` : ''}
                    </strong>
                  </li>
                  <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                    <span>Tim &amp; keanggotaan</span>
                    <strong>
                      {preview.counts.teams} tim / {preview.counts.teamMembers} org
                    </strong>
                  </li>
                  <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                    <span>Pengajuan &amp; undangan tim</span>
                    <strong>{preview.counts.teamJoinRequests + preview.counts.teamInvites}</strong>
                  </li>
                  <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                    <span>Roadmap &amp; tugas persiapan</span>
                    <strong>
                      {preview.counts.roadmaps} ({preview.counts.roadmapTasks} tugas)
                    </strong>
                  </li>
                  <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                    <span>Progres checklist mahasiswa</span>
                    <strong>{preview.counts.roadmapProgress}</strong>
                  </li>
                  <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                    <span>Kontak konsultan</span>
                    <strong>{preview.counts.consultants}</strong>
                  </li>
                  <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                    <span>Catatan seleksi internal</span>
                    <strong>{preview.counts.selections}</strong>
                  </li>
                  <li className="rounded-lg bg-white/80 border border-rose-100 px-2.5 py-1.5 flex items-center justify-between">
                    <span>Aturan poin khusus lomba</span>
                    <strong>{preview.counts.customPointRules}</strong>
                  </li>
                </ul>
                {preview.counts.lockedSelectionTeams > 0 && (
                  <p className="text-[11px] font-semibold text-rose-800 bg-rose-100/80 rounded-lg px-2.5 py-1.5">
                    Perhatian: Terdapat {preview.counts.lockedSelectionTeams} tim berstatus terkunci seleksi internal yang akan ikut terhapus.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-start gap-2.5 text-emerald-900">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" aria-hidden="true" />
                <div className="space-y-0.5">
                  <p className="font-bold text-xs">
                    Input Prestasi Mahasiswa Tetap Aman ({preview.counts.preservedAchievements} pengajuan)
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    Seluruh input prestasi mahasiswa, berkas bukti, riwayat verifikasi, catatan poin, dan papan peringkat <strong>tidak akan terhapus</strong>. Tautan katalog lomba/tim pada prestasi tersebut hanya dilepas secara otomatis.
                  </p>
                </div>
              </div>

              {preview.requiresTypedConfirmation && (
                <div className="space-y-1.5 pt-1">
                  <Input
                    label='Ketik "HAPUS" untuk mengonfirmasi penghapusan permanen'
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="HAPUS"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-slate-500">
                    Konfirmasi ketik diwajibkan karena perlombaan ini berstatus terbit atau memiliki target/tim/seleksi terkait.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
};
