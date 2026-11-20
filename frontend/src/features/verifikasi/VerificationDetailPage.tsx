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
} from 'lucide-react';
import { Achievement, User } from '../../types';
import { achievementService, userService } from '@talenta/services';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatAchievementCategory, formatAchievementLevel } from '../../lib/format';
import { AchievementStatusBadge, AchievementTypeBadge } from '../prestasi/components/StatusBadge';
import { DecisionPanel } from './components/DecisionPanel';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageLoading } from '../../components/ui/Skeleton';

export const VerificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionTarget, setCorrectionTarget] = useState<'ditolak' | 'perlu_perbaikan'>('ditolak');

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    achievementService
      .getById(id)
      .then(async (data) => {
        setAchievement(data);
        if (data) {
          const u = await userService.getById(data.userId);
          setAuthor(u);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDecision = async (
    status: 'disetujui' | 'perlu_perbaikan' | 'ditolak',
    catatan: string
  ) => {
    if (!id || !achievement) return;
    setProcessing(true);
    try {
      await achievementService.verify(id, status, catatan, achievement.version);
      notify(
        status === 'disetujui'
          ? 'Prestasi resmi disetujui. Poin lomba telah dicatat ke buku besar.'
          : status === 'perlu_perbaikan'
          ? 'Catatan revisi berhasil dikirimkan ke mahasiswa.'
          : 'Pengajuan prestasi ditolak.',
        status === 'ditolak' ? 'error' : 'success'
      );
      navigate('/validator/prestasi');
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
        notify('Koreksi keputusan berhasil disimpan. Poin lomba telah dibalikkan secara otomatis.');
        setShowCorrectionModal(false);
        navigate('/validator/prestasi');
      }
    } catch (err: any) {
      notify(err.message || 'Gagal mengoreksi keputusan.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <PageLoading message="Memuat berkas pengajuan..." />;
  if (!achievement) {
    return (
      <div className="p-12 text-center space-y-4">
        <p role="alert" className="text-rose-500 text-xs font-semibold">Data pengajuan tidak ditemukan.</p>
        <Link to="/validator/prestasi" className="text-sm font-bold text-blue-700 underline">
          Kembali ke antrean verifikasi
        </Link>
      </div>
    );
  }

  const isApproved = achievement.status === 'disetujui';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
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
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="w-3.5 h-3.5 text-amber-600" />}
              onClick={() => setShowCorrectionModal(true)}
            >
              Koreksi Keputusan
            </Button>
          )}
          <Link
            to="/validator/prestasi"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Antrean
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Info Kegiatan */}
        <Card className="bg-white border-slate-200/90 shadow-2xs">
          <CardHeader className="py-3.5">
            <CardTitle level={2} className="text-xs flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-700" />
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
                  Kategori
                </span>
                <span className="font-semibold text-slate-800">
                  {formatAchievementCategory(achievement.kategori)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                  Tingkat Wilayah
                </span>
                <span className="font-semibold text-slate-800">
                  {formatAchievementLevel(achievement.tingkat)}
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
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  Berasal dari <strong>Seleksi Internal Kampus</strong> — pastikan nama tim sinkron dengan berita acara rektorat/panitia.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Mahasiswa & Dokumen */}
        <Card className="bg-white border-slate-200/90 shadow-2xs">
          <CardHeader className="py-3.5">
            <CardTitle level={2} className="text-xs flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Identitas Mahasiswa & Berkas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                Mahasiswa Pengaju:
              </span>
              <strong className="text-slate-900 text-sm block">
                {author?.nama || achievement.userId}
              </strong>
              <div className="text-[11px] text-slate-500">
                {author ? `${author.prodi} • Angkatan ${author.angkatan} • ${author.email}` : 'Data pengaju tidak ditemukan'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider mb-2">
                Berkas Bukti Pendukung:
              </span>
              <ul className="space-y-2">
                {achievement.bukti.map((b, idx) => {
                  const downloadUrl = b.id && achievementService.getEvidenceDownloadUrl
                    ? achievementService.getEvidenceDownloadUrl(b.id)
                    : null;

                  return (
                    <li
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-5 h-5 text-blue-700 shrink-0" />
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
                          <Download className="w-3.5 h-3.5" />
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

            {/* Certificate Status Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/70 via-slate-50 to-white border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  Verifikasi Berkas Privat
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Tersimpan di RustFS S3
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Berkas disimpan privat di server institusi. Hanya mahasiswa pemilik dan validator berwenang yang dapat mengalirkan berkas secara langsung.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isApproved && (
        <DecisionPanel onDecision={handleDecision} isLoading={processing} />
      )}

      {/* Modal Koreksi Keputusan */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              Koreksi Keputusan Persetujuan
            </h3>
            <p className="text-xs text-slate-500">
              Koreksi ini akan <strong>membalikkan poin lomba di buku besar</strong> secara atomik dan mencatat jejak audit perbaikan keputusan.
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
                placeholder="Contoh: Klarifikasi panitia menyatakan piagam fiktif / nama salah..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
                disabled={processing}
              >
                Simpan Koreksi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
