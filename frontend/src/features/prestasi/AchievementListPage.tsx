import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, CheckCircle2, Clock, Plus, Search, Filter, AlertTriangle, X } from 'lucide-react';
import { Achievement } from '../../types';
import { achievementService } from '@talenta/services';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { PageLoading } from '../../components/ui/Skeleton';
import { AchievementTable } from './components/AchievementTable';

type StatusFilter = 'semua' | 'menunggu' | 'perlu_perbaikan' | 'disetujui' | 'ditolak';

export const AchievementListPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { notify } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua');
  const [query, setQuery] = useState('');

  // State untuk modal revisi
  const [revisionItem, setRevisionItem] = useState<Achievement | null>(null);
  const [revisedName, setRevisedName] = useState('');
  const [revisedOrganizer, setRevisedOrganizer] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionFiles, setRevisionFiles] = useState<File[]>([]);
  const [submittingRevision, setSubmittingRevision] = useState(false);

  const fetchAchievements = () => {
    if (!currentUser) return;
    achievementService
      .getAll(currentUser.id)
      .then((data) => {
        setAchievements(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAchievements();
  }, [currentUser]);

  const openRevisionModal = (item: Achievement) => {
    setRevisionItem(item);
    setRevisedName(item.nama);
    setRevisedOrganizer(item.penyelenggara);
    setRevisionNote('');
    setRevisionFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      notify('Maksimal 3 berkas bukti yang diizinkan.', 'error');
      return;
    }
    for (const f of files) {
      if (f.size > 8 * 1024 * 1024) {
        notify(`Berkas '${f.name}' melebihi batas maksimal 8 MB.`, 'error');
        return;
      }
    }
    setRevisionFiles(files);
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionItem) return;
    setSubmittingRevision(true);
    try {
      if (achievementService.submitRevision) {
        await achievementService.submitRevision(
          revisionItem.id,
          {
            name: revisedName.trim(),
            organizer: revisedOrganizer.trim(),
            note: revisionNote.trim() || 'Perbaikan berkas oleh mahasiswa',
          },
          revisionFiles.length > 0 ? revisionFiles : undefined
        );
      }
      notify('Revisi pengajuan berhasil dikirimkan. Status kembali menunggu verifikasi.');
      setRevisionItem(null);
      fetchAchievements();
    } catch (err: any) {
      notify(err.message || 'Gagal mengirim revisi.', 'error');
    } finally {
      setSubmittingRevision(false);
    }
  };

  if (loading) return <PageLoading message="Memuat rekap data prestasi..." />;

  const verifiedCount = achievements.filter((a) => a.status === 'disetujui').length;
  const pendingCount = achievements.filter((a) => a.status === 'menunggu').length;

  const filtered = achievements.filter((a) => {
    const matchStatus = statusFilter === 'semua' || a.status === statusFilter;
    const q = query.toLowerCase();
    const matchQuery =
      !q || a.nama.toLowerCase().includes(q) || a.penyelenggara.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const filters: { id: StatusFilter; label: string }[] = [
    { id: 'semua', label: 'Semua Status' },
    { id: 'menunggu', label: 'Menunggu Verifikasi' },
    { id: 'perlu_perbaikan', label: 'Perlu Perbaikan' },
    { id: 'disetujui', label: 'Telah Disahkan' },
    { id: 'ditolak', label: 'Ditolak' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Portofolio Capaian
            </span>
            <span className="text-[11px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
              {achievements.length} Total Prestasi
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Pencatatan Prestasi Mahasiswa
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Rekam jejak seluruh capaian kompetisi pembinaan Belmawa dan keikutsertaan mandiri yang telah diajukan.
          </p>
        </div>

        <Link to="/app/prestasi/baru">
          <Button size="md" leftIcon={<Plus className="w-4 h-4" />}>
            Ajukan Prestasi Mandiri
          </Button>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Prestasi Terverifikasi
            </span>
            <div className="text-3xl font-black text-emerald-600 mt-1" aria-label={`${verifiedCount} terverifikasi`}>
              {verifiedCount}
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5 font-medium">Sah masuk SK dan transkrip</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Menunggu Verifikasi
            </span>
            <div className="text-3xl font-black text-amber-500 mt-1" aria-label={`${pendingCount} menunggu`}>
              {pendingCount}
            </div>
            <p className="text-[10px] text-amber-700 mt-0.5 font-medium">Dalam telaah verifikator</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Total Pengajuan
            </span>
            <div className="text-3xl font-black text-slate-800 mt-1">
              {achievements.length}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Seluruh rekam jejak</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama kegiatan / penyelenggara..."
              aria-label="Cari prestasi"
              className="w-full pl-9 pr-3 py-2 min-h-[40px] text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
          <p className="text-xs text-slate-500 font-medium" aria-live="polite">
            <span className="font-bold text-slate-800">{filtered.length}</span> pengajuan ditampilkan
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 scrollbar-none" role="group" aria-label="Filter status prestasi">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 inline-flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Status:
          </span>
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              aria-pressed={statusFilter === f.id}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all min-h-[36px] ${
                statusFilter === f.id
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 border border-slate-200/80 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            Daftar Riwayat Pengajuan
          </h2>
        </div>
        <AchievementTable
          achievements={filtered}
          onRevise={openRevisionModal}
        />
      </div>

      {/* Modal Revisi Berkas */}
      {revisionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Formulir Revisi Pengajuan
              </h3>
              <button
                type="button"
                onClick={() => setRevisionItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {revisionItem.catatan && (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-xs">
                <strong className="block font-bold">Catatan Perbaikan dari Verifikator:</strong>
                <p className="mt-1">{revisionItem.catatan}</p>
              </div>
            )}

            <form onSubmit={handleSubmitRevision} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama Kegiatan / Capaian
                </label>
                <input
                  type="text"
                  value={revisedName}
                  onChange={(e) => setRevisedName(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Penyelenggara
                </label>
                <input
                  type="text"
                  value={revisedOrganizer}
                  onChange={(e) => setRevisedOrganizer(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Unggah Berkas Bukti Baru / Perbaikan (Opsional, PDF/JPG/PNG max 8 MB)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {revisionFiles.length > 0 && (
                  <p className="text-[11px] text-emerald-600 mt-1 font-semibold">
                    {revisionFiles.length} berkas baru dipilih
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Catatan Tindak Lanjut Perbaikan
                </label>
                <textarea
                  rows={2}
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="Contoh: Sudah diperbarui SK pengesahan dari rektorat..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRevisionItem(null)}
                  disabled={submittingRevision}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submittingRevision}
                >
                  Kirim Revisi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
