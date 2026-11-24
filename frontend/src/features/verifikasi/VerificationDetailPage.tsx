import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  Award,
  Download,
  RotateCcw,
  Users,
  AlertTriangle,
  History,
} from 'lucide-react';
import { Achievement } from '../../types';
import { achievementService } from '@talenta/services';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatAchievementCategory, formatAchievementLevel } from '../../lib/format';
import { AchievementStatusBadge, AchievementTypeBadge } from '../prestasi/components/StatusBadge';
import { DecisionPanel } from './components/DecisionPanel';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageLoading } from '../../components/ui/Skeleton';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { useAdminNav } from '../admin/AdminNavContext';

function formatDecisionAction(action?: string): string {
  switch ((action || '').toLowerCase()) {
    case 'approve':
      return 'Disetujui';
    case 'request_changes':
      return 'Diminta Perbaikan';
    case 'reject':
      return 'Ditolak';
    case 'correct':
      return 'Koreksi Keputusan';
    default:
      return action || 'Keputusan';
  }
}

export const VerificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { refreshNavCounts } = useAdminNav();
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionTarget, setCorrectionTarget] = useState<'ditolak' | 'perlu_perbaikan'>('ditolak');

  const loadData = (isCancelled?: () => boolean) => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    achievementService
      .getById(id, 'admin')
      .then((data) => {
        if (isCancelled?.()) return;
        setAchievement(data);
        setLoading(false);
      })
      .catch((err: any) => {
        if (isCancelled?.()) return;
        setLoadError(err?.message || 'Gagal memuat berkas pengajuan prestasi.');
        setLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    loadData(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDecision = async (
    status: 'disetujui' | 'perlu_perbaikan' | 'ditolak',
    catatan: string,
    override?: { overridePoints: number; overrideReason: string }
  ) => {
    if (!id || !achievement) return;
    setProcessing(true);
    try {
      await achievementService.verify(id, status, catatan, achievement.version, {
        overridePoints: override?.overridePoints,
        overrideReason: override?.overrideReason,
        idempotencyKey: `ui-${id}-v${achievement.version || 1}`,
      });
      void refreshNavCounts();
      notify(
        status === 'disetujui'
          ? 'Prestasi disetujui validator. Poin lomba telah dicatat ke buku besar.'
          : status === 'perlu_perbaikan'
          ? 'Catatan revisi berhasil dikirimkan ke mahasiswa.'
          : 'Pengajuan prestasi ditolak.',
        status === 'ditolak' ? 'error' : 'success'
      );
      navigate('/admin/prestasi');
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CONFLICT') {
        notify('Status pengajuan telah diubah oleh validator lain. Memuat ulang data...', 'error');
        loadData();
      } else {
        notify(err.message || 'Gagal menyimpan keputusan verifikasi.', 'error');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleCorrection = async () => {
    if (!id || !achievement) return;
    if (correctionReason.trim().length < 5) {
      notify('Alasan koreksi wajib diisi minimal 5 karakter.', 'error');
      return;
    }
    setProcessing(true);
    try {
      if (achievementService.correct) {
        await achievementService.correct(id, correctionReason.trim(), achievement.version, correctionTarget);
        void refreshNavCounts();
        notify('Koreksi keputusan berhasil disimpan. Poin lomba telah dibalikkan secara otomatis.');
        setShowCorrectionModal(false);
        navigate('/admin/prestasi');
      }
    } catch (err: any) {
      notify(err.message || 'Gagal mengoreksi keputusan.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <PageLoading message="Memuat berkas pengajuan..." />;
  if (loadError || !achievement) {
    return (
      <div className="p-12 text-center space-y-4">
        <p role="alert" className="text-rose-500 text-xs font-semibold">
          {loadError || 'Data pengajuan tidak ditemukan.'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="primary" onClick={() => loadData()}>
            Muat Ulang
          </Button>
          <Link to="/admin/prestasi">
            <Button size="sm" variant="outline">Kembali ke Antrean</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isApproved = achievement.status === 'disetujui';
  const activeEvidences = achievement.bukti.filter((b) => b.isActive !== false);
  const archivedEvidences = achievement.bukti.filter((b) => b.isActive === false);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Antrean Verifikasi Prestasi
            </span>
            <span className="text-[11px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded border border-slate-200">
              ID: {achievement.id}
            </span>
            <span className="text-[11px] bg-blue-50 text-blue-800 font-mono px-2 py-0.5 rounded border border-blue-200">
              v{achievement.version || 1}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Pemeriksaan Bukti Capaian
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isApproved && (
            <Button
              variant="warning-outline"
              size="sm"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => setShowCorrectionModal(true)}
            >
              Koreksi Keputusan
            </Button>
          )}
          <Link
            to="/admin/prestasi"
            className="text-xs font-bold text-slate-800 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-400 inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-xl border border-slate-300 bg-white shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Kembali ke Antrean
          </Link>
        </div>
      </div>

      {achievement.potentialDuplicateOfId && (
        <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong className="block">Terdeteksi Potensi Duplikasi Pengajuan</strong>
            <p className="mt-0.5">
              Nama kegiatan dan tanggal pelaksanaan pengajuan ini mirip dengan pengajuan lain ({achievement.potentialDuplicateOfId}). Periksa apakah anggota kelompok lain sudah mengajukan prestasi yang sama.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Info Kegiatan */}
        <Card className="bg-white border-slate-200/90 shadow-2xs">
          <CardHeader className="py-3.5">
            <CardTitle level={2} className="text-xs flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-700" aria-hidden="true" />
              <span>Detail Kegiatan & Capaian</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                Nama Kegiatan
              </span>
              <strong className="text-slate-900 text-sm block mt-0.5 leading-snug">
                {achievement.nama}
              </strong>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                Penyelenggara
              </span>
              <span className="text-slate-700 font-medium block mt-0.5">
                {achievement.penyelenggara}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                  Kategori & Tingkat
                </span>
                <span className="font-semibold text-slate-800">
                  {formatAchievementCategory(achievement.kategori)} ({formatAchievementLevel(achievement.tingkat)})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                  Jenis & Sub-Lomba
                </span>
                <span className="font-semibold text-slate-800">
                  {achievement.competitionCategoryName || '-'}
                  {achievement.subCategoryName || achievement.subCompetitionName
                    ? ` • ${achievement.subCategoryName || achievement.subCompetitionName}`
                    : ''}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider mb-1">
                  Jenis Capaian
                </span>
                <AchievementTypeBadge type={achievement.jenisCapaian} />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                  Tanggal Kegiatan
                </span>
                <time dateTime={achievement.tanggal} className="font-semibold text-slate-700">
                  {formatDate(achievement.tanggal)}
                </time>
              </div>
            </div>

            {achievement.competitionName && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                  Tautan Lomba Katalog
                </span>
                <span className="font-bold text-blue-800">{achievement.competitionName}</span>
              </div>
            )}

            {achievement.deskripsi && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700">
                <span className="font-bold block text-[10px] uppercase text-slate-400 mb-0.5">Deskripsi:</span>
                <p className="leading-relaxed">{achievement.deskripsi}</p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                Status Verifikasi
              </span>
              <AchievementStatusBadge status={achievement.status} />
            </div>

            {achievement.catatan && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                <span className="font-bold block">Catatan Terakhir:</span>
                <p className="mt-0.5">{achievement.catatan}</p>
              </div>
            )}

            {achievement.dariSeleksiInternal && (
              <div className="text-[11px] text-blue-900 bg-blue-50 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Berasal dari <strong>Seleksi Internal Kampus</strong> — pastikan nama peserta sinkron dengan berita acara internal.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Mahasiswa, Peserta Kelompok & Dokumen */}
        <Card className="bg-white border-slate-200/90 shadow-2xs">
          <CardHeader className="py-3.5">
            <CardTitle level={2} className="text-xs flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Identitas Peserta & Berkas Bukti</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                  Mahasiswa Pengaju:
                </span>
                <Badge color={achievement.participationType === 'kelompok' ? 'blue' : 'slate'} size="sm">
                  {achievement.participationType === 'kelompok' ? 'Prestasi Kelompok' : 'Individu'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={achievement.submitterAvatarUrl}
                  name={achievement.submitterName || achievement.userId}
                  size="md"
                />
                <div className="min-w-0">
                  <strong className="text-slate-900 text-sm block truncate">
                    {achievement.submitterName || achievement.userId}
                  </strong>
                  <div className="text-[11px] text-slate-500">
                    {achievement.submitterNim ? `NIM ${achievement.submitterNim} • ` : ''}
                    {achievement.submitterProdi || 'Data prodi tidak tercatat'}
                  </div>
                </div>
              </div>
            </div>

            {achievement.participants && achievement.participants.length > 0 && (
              <div className="space-y-2">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                  Anggota Terdaftar ({achievement.participants.length} Mahasiswa)
                  {achievement.teamName ? ` • ${achievement.teamName}` : ''}
                </span>
                <ul className="space-y-1.5">
                  {achievement.participants.map((p) => (
                    <li
                      key={p.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-[11px]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar src={p.avatarUrl} name={p.fullName} size="sm" />
                        <div className="min-w-0">
                          <strong className="text-slate-900 block truncate">{p.fullName}</strong>
                          <span className="text-slate-500 block truncate">
                            {p.nim || '-'} • {p.studyProgram || '-'}
                          </span>
                        </div>
                      </div>
                      {p.isSubmitter && <Badge color="blue" size="sm">Pengaju</Badge>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider mb-2">
                Berkas Bukti Aktif ({activeEvidences.length}):
              </span>
              <ul className="space-y-2">
                {activeEvidences.map((b, idx) => {
                  const downloadUrl = b.id && achievementService.getEvidenceDownloadUrl
                    ? achievementService.getEvidenceDownloadUrl(b.id)
                    : null;

                  return (
                    <li
                      key={b.id || idx}
                      className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-5 h-5 text-blue-700 shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 truncate block text-xs" title={b.nama}>
                            {b.nama}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {(b.size / 1024).toFixed(0)} KB • Dokumen Bukti
                          </span>
                        </div>
                      </div>

                      {downloadUrl ? (
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs border border-blue-200 transition-colors shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                          Unduh
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                          Tersedia
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {archivedEvidences.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Berkas Lama Digantikan ({archivedEvidences.length}):
                </span>
                {archivedEvidences.map((b, i) => (
                  <div key={b.id || i} className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span className="truncate">{b.nama}</span>
                    {b.id && achievementService.getEvidenceDownloadUrl && (
                      <a
                        href={achievementService.getEvidenceDownloadUrl(b.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 underline shrink-0"
                      >
                        Unduh Arsip
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {achievement.status === 'menunggu' && (
        <DecisionPanel
          pointRecommendation={achievement.pointRecommendation}
          isCompetition={achievement.kategori === 'kompetisi'}
          isGroup={achievement.participationType === 'kelompok'}
          participantsCount={achievement.participants?.length || 1}
          onDecision={handleDecision}
          isLoading={processing}
        />
      )}

      {/* Jejak Keputusan & Revisi */}
      {((achievement.decisions && achievement.decisions.length > 0) ||
        (achievement.revisions && achievement.revisions.length > 0)) && (
        <Card className="bg-white border-slate-200/90 shadow-2xs">
          <CardHeader className="py-3.5">
            <CardTitle level={2} className="text-xs flex items-center gap-2">
              <History className="w-4 h-4 text-blue-700" aria-hidden="true" />
              <span>Jejak Keputusan Validator & Revisi</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {achievement.decisions?.map((d) => (
              <div key={d.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong className="text-slate-900">
                    {formatDecisionAction(d.action)} • {d.decidedBy?.fullName || 'Validator'}
                  </strong>
                  <span className="text-[11px] text-slate-400">{formatDate(d.createdAt)}</span>
                </div>
                {d.awardedPoints !== null && d.awardedPoints !== undefined && (
                  <div className="text-[11px] font-bold text-emerald-700">
                    Poin: {d.awardedPoints} (Rekomendasi: {d.calculatedPoints ?? '-'})
                    {d.overrideReason ? ` — Override: ${d.overrideReason}` : ''}
                  </div>
                )}
                {d.reason && <p className="text-slate-600">{d.reason}</p>}
              </div>
            ))}

            {achievement.revisions?.map((rev) => (
              <div key={rev.id} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                <div className="flex justify-between gap-2">
                  <strong className="text-amber-950">Revisi dari v{rev.versionNumber}</strong>
                  <span className="text-[11px] text-slate-400">{formatDate(rev.createdAt)}</span>
                </div>
                {rev.note && <p className="text-slate-700">{rev.note}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Modal Koreksi Keputusan Aksesibel */}
      <Modal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        title="Koreksi Keputusan Persetujuan"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCorrectionModal(false)}
              disabled={processing}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCorrection}
              isLoading={processing}
            >
              Simpan Koreksi
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Koreksi ini akan <strong>membalikkan poin lomba seluruh anggota di buku besar</strong> secara atomik dan mencatat jejak audit perbaikan keputusan.
          </p>

          <div className="space-y-2">
            <label htmlFor="koreksi-target" className="text-xs font-bold text-slate-700 block">
              Ubah Status Menjadi:
            </label>
            <select
              id="koreksi-target"
              value={correctionTarget}
              onChange={(e) => setCorrectionTarget(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="ditolak">Ditolak (Batalkan Poin & Gugurkan)</option>
              <option value="perlu_perbaikan">Perlu Perbaikan (Minta Revisi)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="koreksi-alasan" className="text-xs font-bold text-slate-700 block">
              Alasan Koreksi Resmi:
            </label>
            <textarea
              id="koreksi-alasan"
              rows={3}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="Contoh: Klarifikasi panitia menyatakan piagam tidak sah / nama salah..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
