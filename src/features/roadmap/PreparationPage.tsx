import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Competition, Consultant, Roadmap } from '../../types';
import { competitionService, consultantService, roadmapService } from '../../services/factory';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { RoadmapChecklist } from './components/RoadmapChecklist';
import { DeadlineList } from './components/DeadlineList';
import { ConsultantCard } from './components/ConsultantCard';
import { AiBoxMock } from './components/AiBoxMock';
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
    if (!slug || !currentUser) return;
    try {
      const updated = await roadmapService.toggleChecklist(currentUser.id, slug, taskId);
      setChecklist({ ...updated });
      if (updated[taskId]) notify('Tugas ditandai selesai! Pertahankan progresmu.', 'info');
    } catch {
      notify('Gagal menyimpan progres. Coba lagi.', 'error');
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
  const completedTasks = Object.values(checklist).filter(Boolean).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link to="/app/beranda" className="hover:text-blue-700 font-medium">
          Beranda
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/kompetisi/${competition.slug}`} className="hover:text-blue-700 font-medium">
          {competition.namaResmi}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span aria-current="page" className="text-slate-700 font-bold">
          Ruang Persiapan Mandiri
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
              Belmawa 2026
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
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
              <span className="text-emerald-600 font-bold">Lengkap! 🎉</span>
            )}
          </div>
        </div>
      </div>

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
              description="Admin program dan dosen pembimbing sedang menyusun kurikulum persiapan untuk kompetisi ini."
            />
          ) : (
            <RoadmapChecklist
              fase={roadmap.fase}
              checklist={checklist}
              onToggle={handleToggleChecklist}
            />
          )}
        </div>

        <div className="space-y-5">
          <DeadlineList deadlines={competition.jadwal} />
          <ConsultantCard consultants={consultants} />
          <AiBoxMock />
        </div>
      </div>
    </div>
  );
};