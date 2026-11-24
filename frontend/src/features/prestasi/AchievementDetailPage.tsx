import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Download,
  FileText,
  History,
  Send,
  Trash2,
  Users,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  Achievement,
  AchievementCategory,
  AchievementLevel,
  AchievementType,
  CompetitionCategoryItem,
} from '../../types';
import { achievementService } from '@talenta/services';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { PageLoading } from '../../components/ui/Skeleton';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { AchievementStatusBadge, AchievementTypeBadge } from './components/StatusBadge';
import { formatAchievementCategory, formatAchievementLevel, formatDate } from '../../lib/format';

export const AchievementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { notify } = useToast();

  const [item, setItem] = useState<Achievement | null>(null);
  const [categories, setCategories] = useState<CompetitionCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Full Revision Form State (ketika status === 'perlu_perbaikan' & pengaju)
  const [name, setName] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [category, setCategory] = useState<AchievementCategory>('kompetisi');
  const [level, setLevel] = useState<AchievementLevel>('nasional');
  const [result, setResult] = useState<AchievementType>('juara_1');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [competitionCategoryId, setCompetitionCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [subCompetitionName, setSubCompetitionName] = useState('');
  const [note, setNote] = useState('');
  const [replaceEvidenceIds, setReplaceEvidenceIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [submittingRevision, setSubmittingRevision] = useState(false);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    try {
      const [detail, cats] = await Promise.all([
        achievementService.getById(id),
        achievementService.getCompetitionCategories?.().catch(() => []) ?? Promise.resolve([]),
      ]);
      if (!detail) {
        setLoadError('Data prestasi tidak ditemukan.');
        setLoading(false);
        return;
      }
      setItem(detail);
      setCategories(cats);
      setName(detail.nama);
      setOrganizer(detail.penyelenggara);
      setCategory(detail.kategori);
      setLevel(detail.tingkat);
      setResult(detail.jenisCapaian);
      setEventDate(detail.tanggal);
      setDescription(detail.deskripsi || '');
      setCompetitionCategoryId(detail.competitionCategoryId || '');
      setSubCategoryId(detail.subCategoryId || '');
      setSubCompetitionName(detail.subCompetitionName || '');
      setReplaceEvidenceIds([]);
      setNewFiles([]);
      setNote('');
      setLoading(false);
    } catch (err: any) {
      setLoadError(err?.message || 'Gagal memuat detail prestasi.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleConfirmCancel = async () => {
    if (!item || !achievementService.cancel) return;
    setCancelling(true);
    try {
      await achievementService.cancel(item.id);
      notify('Pengajuan prestasi berhasil dibatalkan.');
      setCancelModalOpen(false);
      navigate('/app/prestasi');
    } catch (err: any) {
      notify(err?.message || 'Gagal membatalkan pengajuan.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const toggleReplaceEvidence = (evId: string) => {
    setReplaceEvidenceIds((prev) =>
      prev.includes(evId) ? prev.filter((x) => x !== evId) : [...prev, evId]
    );
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !achievementService.submitRevision) return;
    setSubmittingRevision(true);
    try {
      await achievementService.submitRevision(
        item.id,
        {
          name: name.trim(),
          organizer: organizer.trim(),
          category,
          level,
          result,
          eventDate,
          description: description.trim(),
          competitionCategoryId: competitionCategoryId || null,
          subCategoryId: subCategoryId || null,
          subCompetitionName: subCompetitionName.trim() || null,
          replaceEvidenceIds,
          note: note.trim() || 'Pengiriman revisi lengkap oleh mahasiswa',
        },
        newFiles
      );
      notify('Revisi lengkap berhasil dikirim! Status kembali Menunggu verifikasi.');
      await loadDetail();
    } catch (err: any) {
      notify(err?.message || 'Gagal mengirim revisi.', 'error');
    } finally {
      setSubmittingRevision(false);
    }
  };

  if (loading) return <PageLoading message="Memuat detail pengajuan prestasi..." />;
  if (loadError || !item) {
    return (
      <div className="max-w-2xl mx-auto p-10 text-center space-y-4">
        <p role="alert" className="text-sm font-semibold text-rose-600">{loadError || 'Data tidak ditemukan.'}</p>
        <Link to="/app/prestasi">
          <Button size="sm" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" aria-hidden="true" />}>
            Kembali ke Daftar Prestasi
          </Button>
        </Link>
      </div>
    );
  }

  const isSubmitter = currentUser?.id === item.userId;
  const activeEvidences = item.bukti.filter((b) => b.isActive !== false);
  const archivedEvidences = item.bukti.filter((b) => b.isActive === false);
  const activeCategoryObj = categories.find((c) => c.id === competitionCategoryId);
  const subCategories = activeCategoryObj?.subCategories?.filter((s) => s.isActive) || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/prestasi"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Kembali ke Portofolio Prestasi
        </Link>

        {isSubmitter && item.status === 'menunggu' && achievementService.cancel && (
          <Button
            size="sm"
            variant="danger-outline"
            onClick={() => setCancelModalOpen(true)}
            leftIcon={<XCircle className="w-4 h-4" aria-hidden="true" />}
          >
            Batalkan Pengajuan
          </Button>
        )}
      </div>

      {/* Ringkasan Utama */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <AchievementStatusBadge status={item.status} />
              <AchievementTypeBadge type={item.jenisCapaian} />
              {item.participationType === 'kelompok' && (
                <Badge color="blue" size="sm">Kelompok / Tim</Badge>
              )}
            </div>
            <h1 className="text-xl font-black text-slate-900">{item.nama}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Penyelenggara: <strong className="text-slate-700">{item.penyelenggara}</strong> •{' '}
              <time dateTime={item.tanggal}>{formatDate(item.tanggal)}</time>
            </p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            Versi v{item.version || 1}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-100">
          <div>
            <span className="text-slate-400 block">Kategori & Tingkat</span>
            <strong className="text-slate-800">
              {formatAchievementCategory(item.kategori)} ({formatAchievementLevel(item.tingkat)})
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block">Jenis & Sub-Lomba</span>
            <strong className="text-slate-800">
              {item.competitionCategoryName || '-'}
              {item.subCategoryName || item.subCompetitionName
                ? ` / ${item.subCategoryName || item.subCompetitionName}`
                : ''}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block">Keterkaitan Katalog</span>
            <strong className="text-slate-800">{item.competitionName || 'Lomba Eksternal'}</strong>
          </div>
        </div>

        {item.deskripsi && (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            {item.deskripsi}
          </p>
        )}

        {item.catatan && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="block">Catatan Validator:</strong>
              <p className="mt-0.5">{item.catatan}</p>
            </div>
          </div>
        )}

        {item.pointRecommendation && (
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 flex items-start gap-2.5">
            <Award className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-bold text-blue-900">
                Estimasi Perolehan Poin: {item.pointRecommendation.calculatedPoints} poin
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">{item.pointRecommendation.explanation}</p>
            </div>
          </div>
        )}
      </div>

      {/* Anggota Kelompok */}
      {item.participants && item.participants.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-700" aria-hidden="true" />
            Peserta Terdaftar ({item.participants.length} Mahasiswa)
          </h2>
          {item.teamName && (
            <p className="text-xs text-slate-500">Tim: <strong className="text-slate-800">{item.teamName}</strong></p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {item.participants.map((p) => (
              <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar src={p.avatarUrl} name={p.fullName} size="sm" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{p.fullName}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {p.nim || '-'} • {p.studyProgram || '-'}
                    </div>
                  </div>
                </div>
                {p.isSubmitter && <Badge color="blue" size="sm">Pengaju</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Berkas Bukti Aktif & Arsip */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-700" aria-hidden="true" />
          Dokumen Bukti Pendukung
        </h2>
        <div className="space-y-2">
          {activeEvidences.map((ev) => (
            <div key={ev.id || ev.nama} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-slate-900">{ev.nama}</div>
                <div className="text-[11px] text-slate-500">{(ev.size / 1024).toFixed(0)} KB</div>
              </div>
              {ev.id && achievementService.getEvidenceDownloadUrl && (
                <a
                  href={achievementService.getEvidenceDownloadUrl(ev.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-blue-700 font-bold hover:bg-blue-50"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  Unduh
                </a>
              )}
            </div>
          ))}
        </div>

        {archivedEvidences.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400">Berkas Versi Sebelumnya (Diganti saat Revisi):</span>
            {archivedEvidences.map((ev) => (
              <div key={ev.id} className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>{ev.nama}</span>
                {ev.id && achievementService.getEvidenceDownloadUrl && (
                  <a
                    href={achievementService.getEvidenceDownloadUrl(ev.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 underline"
                  >
                    Arsip
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Revisi Penuh bila perlu_perbaikan */}
      {isSubmitter && item.status === 'perlu_perbaikan' && achievementService.submitRevision && (
        <form onSubmit={handleSubmitRevision} className="bg-white p-6 rounded-2xl border-2 border-amber-300 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-black text-slate-900">Formulir Revisi Pengajuan Lengkap</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbaiki data capaian yang diminta validator dan tandai berkas lama bila ingin menggantinya dengan berkas baru.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input label="Nama Kegiatan" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Penyelenggara" value={organizer} onChange={(e) => setOrganizer(e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Select
              label="Kategori"
              value={category}
              onChange={(e) => setCategory(e.target.value as AchievementCategory)}
              options={[
                { value: 'kompetisi', label: 'Kompetisi' },
                { value: 'konferensi', label: 'Konferensi' },
                { value: 'olahraga', label: 'Olahraga' },
                { value: 'seni', label: 'Seni' },
                { value: 'nominasi', label: 'Nominasi' },
                { value: 'lain', label: 'Lainnya' },
              ]}
            />
            <Select
              label="Tingkat"
              value={level}
              onChange={(e) => setLevel(e.target.value as AchievementLevel)}
              options={[
                { value: 'lokal', label: 'Lokal' },
                { value: 'nasional', label: 'Nasional' },
                { value: 'internasional', label: 'Internasional' },
              ]}
            />
            <Select
              label="Capaian"
              value={result}
              onChange={(e) => setResult(e.target.value as AchievementType)}
              options={[
                { value: 'juara_1', label: 'Juara 1' },
                { value: 'juara_2', label: 'Juara 2' },
                { value: 'juara_3', label: 'Juara 3' },
                { value: 'finalis', label: 'Finalis' },
                { value: 'penghargaan_khusus', label: 'Penghargaan Khusus' },
                { value: 'partisipasi', label: 'Partisipasi' },
              ]}
            />
            <Input label="Tanggal" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
          </div>

          {categories.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Select
                label="Jenis / Rumpun Lomba"
                value={competitionCategoryId}
                onChange={(e) => {
                  setCompetitionCategoryId(e.target.value);
                  setSubCategoryId('');
                }}
                options={[
                  { value: '', label: 'Kosongkan / Eksternal' },
                  ...categories.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              {subCategories.length > 0 ? (
                <Select
                  label="Sub-Lomba"
                  value={subCategoryId}
                  onChange={(e) => setSubCategoryId(e.target.value)}
                  options={[
                    { value: '', label: 'Kosongkan' },
                    ...subCategories.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
              ) : (
                <Input
                  label="Nama Divisi / Sub-Lomba"
                  value={subCompetitionName}
                  onChange={(e) => setSubCompetitionName(e.target.value)}
                />
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          {activeEvidences.some((ev) => Boolean(ev.id)) && (
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-slate-800">
                Ganti Berkas Lama (Tandai berkas yang ingin diganti saat mengirim berkas baru):
              </div>
              {activeEvidences.map((ev) =>
                ev.id ? (
                  <label key={ev.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceEvidenceIds.includes(ev.id)}
                      onChange={() => toggleReplaceEvidence(ev.id!)}
                    />
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
                    <span>Ganti "{ev.nama}"</span>
                  </label>
                ) : null
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Unggah Berkas Baru / Tambahan (PDF/JPG/PNG, maks. 8 MB)
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setNewFiles(Array.from(e.target.files || []))}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Perbaikan untuk Validator</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Jelaskan perbaikan yang telah dilakukan..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              isLoading={submittingRevision}
              rightIcon={<Send className="w-4 h-4" aria-hidden="true" />}
            >
              Kirim Revisi Lengkap
            </Button>
          </div>
        </form>
      )}

      {/* Riwayat Keputusan Validator */}
      {item.decisions && item.decisions.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-700" aria-hidden="true" />
            Riwayat Keputusan Validator
          </h2>
          <div className="space-y-2.5">
            {item.decisions.map((d) => (
              <div key={d.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-slate-900">
                    {d.action.toUpperCase()} • Oleh {d.decidedBy?.fullName || 'Validator'}
                  </strong>
                  <span className="text-[11px] text-slate-400">{formatDate(d.createdAt)}</span>
                </div>
                {d.awardedPoints !== null && d.awardedPoints !== undefined && (
                  <div className="text-[11px] text-emerald-700 font-bold">
                    Poin Diberikan: {d.awardedPoints} poin
                    {d.overrideReason ? ` (Override: ${d.overrideReason})` : ''}
                  </div>
                )}
                {d.reason && <p className="text-slate-600">{d.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Konfirmasi Batalkan Pengajuan"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)}>
              Kembali
            </Button>
            <Button variant="danger" size="sm" isLoading={cancelling} onClick={handleConfirmCancel}>
              Ya, Batalkan Pengajuan
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Apakah Anda yakin ingin membatalkan pengajuan <strong>{item.nama}</strong>?
        </p>
      </Modal>
    </div>
  );
};
