import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  Award,
} from 'lucide-react';
import { Achievement, User } from '../../types';
import { achievementService, userService } from '../../services/factory';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatAchievementCategory, formatAchievementLevel } from '../../lib/format';
import { AchievementStatusBadge, AchievementTypeBadge } from '../prestasi/components/StatusBadge';
import { DecisionPanel } from './components/DecisionPanel';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { PageLoading } from '../../components/ui/Skeleton';

export const VerificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    achievementService
      .getById(id)
      .then(async (data) => {
        if (cancelled) return;
        setAchievement(data);
        if (data) {
          const u = await userService.getById(data.userId);
          if (!cancelled) setAuthor(u);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDecision = async (
    status: 'disetujui' | 'perlu_perbaikan' | 'ditolak',
    catatan: string
  ) => {
    if (!id) return;
    setProcessing(true);
    try {
      await achievementService.verify(id, status, catatan);
      notify(
        status === 'disetujui'
          ? 'Prestasi resmi disetujui & masuk database institusi.'
          : status === 'perlu_perbaikan'
          ? 'Catatan revisi dikirimkan ke mahasiswa.'
          : 'Pengajuan prestasi ditolak.',
        status === 'ditolak' ? 'error' : 'success'
      );
      navigate('/verifikasi');
    } catch {
      notify('Gagal menyimpan keputusan verifikasi.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <PageLoading message="Memuat berkas pengajuan..." />;
  if (!achievement) {
    return (
      <div className="p-12 text-center space-y-4">
        <p role="alert" className="text-rose-500 text-xs font-semibold">Data pengajuan tidak ditemukan.</p>
        <Link to="/verifikasi" className="text-xs font-bold text-blue-700 underline">
          Kembali ke antrean verifikasi
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Antrean Verifikasi Prestasi
            </span>
            <span className="text-[11px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded border border-slate-200">
              ID: {achievement.id}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Pemeriksaan Bukti Capaian
          </h1>
        </div>

        <Link
          to="/verifikasi"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Antrean
        </Link>
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
                {achievement.bukti.map((b, idx) => (
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
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                      Tersedia
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Simulated certificate viewer mockup */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/60 via-slate-50 to-white border border-slate-200 text-center space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                Pratinjau Sertifikat Dokumen
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-inner max-w-xs mx-auto space-y-1">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest">SERTIFIKAT PENGHARGAAN</div>
                <div className="text-xs font-black text-blue-950 truncate">{achievement.nama}</div>
                <div className="text-[10px] font-bold text-emerald-600">
                  Diberikan kepada: {author?.nama || 'Mahasiswa'}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                *Tampilan visual verifikasi metadata sertifikat digital.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <DecisionPanel onDecision={handleDecision} isLoading={processing} />
    </div>
  );
};