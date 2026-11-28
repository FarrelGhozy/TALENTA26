import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  Check,
  ChevronRight,
  Layers,
  UserCheck,
} from 'lucide-react';
import { Competition, Consultant, Roadmap } from '../../types';
import { competitionService, consultantService, roadmapService } from '@talenta/services';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { RoadmapChecklist } from './components/RoadmapChecklist';
import { DeadlineList } from './components/DeadlineList';
import { ConsultantCard } from './components/ConsultantCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoading } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';

export const PreparationPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { currentUser } = useAuth();
  const { notify } = useToast();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!slug || !currentUser) return;
    let cancelled = false;
    Promise.all([
      competitionService.getBySlug(slug),
      roadmapService.getByCompetition(slug),
      consultantService.getByCompetition(slug),
      roadmapService.getChecklist(currentUser.id, slug),
    ])
      .then(([comp, road, cons, chk]) => {
        if (cancelled) return;
        setCompetition(comp);
        setRoadmap(road);
        setConsultants(cons);
        setChecklist(chk);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Gagal memuat ruang persiapan.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, currentUser]);

  const handleToggleChecklist = async (taskId: string) => {
    if (!slug || !currentUser || togglingTaskId) return;
    setTogglingTaskId(taskId);
    try {
      const updated = await roadmapService.toggleChecklist(currentUser.id, slug, taskId);
      setChecklist({ ...updated });
      if (updated[taskId]) notify('Tugas ditandai selesai! Pertahankan progresmu.', 'info');
    } catch {
      notify('Gagal menyimpan progres. Coba lagi.', 'error');
    } finally {
      setTogglingTaskId(null);
    }
  };

  if (loading) return <PageLoading message="Memuat kurikulum dan ruang persiapan..." />;
  if (loadError) {
    return (
      <div className="p-12 text-center space-y-4">
        <p role="alert" className="text-xs text-rose-600 font-semibold">{loadError}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Muat Ulang
        </Button>
      </div>
    );
  }

  if (!competition) {
    return <div className="p-12 text-center text-rose-500 text-xs font-semibold">Kompetisi tidak ditemukan.</div>;
  }

  const totalTasks = roadmap?.fase.reduce((acc, f) => acc + f.latihan.length, 0) || 0;
  const completedTasks =
    roadmap?.fase.reduce(
      (acc, f, pIdx) =>
        acc + f.latihan.filter((_, lIdx) => Boolean(checklist[`p${pIdx}-l${lIdx}`])).length,
      0
    ) || 0;
  const progressPercent = totalTasks > 0 ? Math.min(100, Math.round((completedTasks / totalTasks) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link to="/app/beranda" className="hover:text-blue-700 font-medium">
          Beranda
        </Link>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <Link to="/app/persiapan" className="hover:text-blue-700 font-medium">
          Ruang Persiapan
        </Link>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <span aria-current="page" className="text-slate-700 font-bold truncate max-w-xs sm:max-w-md">
          {competition.namaResmi}
        </span>
      </nav>

      {/* Hero Card with Progress */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Ruang Belajar & Persiapan Mandiri
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
              Persiapan
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-blue-950 tracking-tight leading-snug sm:text-3xl">
            {competition.namaResmi}
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
            Ikuti silabus tahapan persiapan di bawah ini. Selesaikan setiap latihan mandiri untuk memperbesar peluang lolos seleksi internal dan nasional.
          </p>
        </div>

        {/* Progress Tracker Card */}
        <div
          className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 w-full md:w-60 shrink-0 shadow-2xs"
          role="status"
          aria-label={`Progres persiapan ${progressPercent} persen`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Progres Belajar:</span>
            <span className="text-blue-700 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden" aria-hidden="true">
            <div
              className="h-full bg-gradient-to-r from-blue-700 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-medium flex items-center justify-between">
            <span>{completedTasks} dari {totalTasks} tugas selesai</span>
            {progressPercent === 100 && (
              <span className="text-emerald-600 font-bold">Lengkap</span>
            )}
          </div>
        </div>
      </div>

      {/* Panel Khusus Jalur Kompetisi Individu (Visual 5) */}
      {(competition.format === 'individu' ||
        (competition.komposisi.min === 1 && competition.komposisi.max === 1)) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-700" aria-hidden="true" />
                Alur otomatis untuk lomba individu
              </h2>
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Tidak perlu membentuk tim
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
              <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Profil</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Pilih Lomba</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-500 text-blue-900">
                3. Persiapan
              </div>
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500">
                4. Seleksi
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 text-xs">
            <h2 className="text-sm font-extrabold text-slate-900">Aturan yang dibaca sistem</h2>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Jenis kompetisi</span>
              <strong className="text-slate-900 uppercase">Individu</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Kapasitas peserta</span>
              <strong className="text-slate-900">1 peserta</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Fitur buat/cari tim</span>
              <strong className="text-slate-900">Disembunyikan</strong>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Checklist & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-700" />
              Roadmap Belajar & Indikator Target
            </h2>
            <span className="text-[11px] text-slate-400">
              Template Terstandarisasi
            </span>
          </div>

          {!roadmap || roadmap.fase.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8 text-blue-700" />}
              title="Template Roadmap Belum Tersedia"
              description="Validator sedang menyusun roadmap persiapan untuk kompetisi ini."
            />
          ) : (
            <RoadmapChecklist
              fase={roadmap.fase}
              checklist={checklist}
              onToggle={handleToggleChecklist}
              busyTaskId={togglingTaskId}
            />
          )}
        </div>

        <div className="space-y-5">
          <DeadlineList deadlines={competition.jadwal} />
          <ConsultantCard consultants={consultants} />
        </div>
      </div>
    </div>
  );
};
