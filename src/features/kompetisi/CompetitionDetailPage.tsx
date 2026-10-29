import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Target,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  ListOrdered,
} from 'lucide-react';
import { Competition, Profile } from '../../types';
import { competitionService, userService } from '../../services/factory';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { PageLoading } from '../../components/ui/Skeleton';
import { ScheduleTimeline } from './components/ScheduleTimeline';
import { TeamRuleBox } from './components/TeamRuleBox';

const VALID_TABS = ['ringkasan', 'syarat', 'jadwal'] as const;

export const CompetitionDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { notify } = useToast();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const activeTab = (searchParams.get('tab') as string) || 'ringkasan';

  const setActiveTab = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });
  };

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    Promise.all([
      competitionService.getBySlug(slug),
      currentUser ? userService.getProfile(currentUser.id) : Promise.resolve(null),
    ])
      .then(([comp, prof]) => {
        if (cancelled) return;
        setCompetition(comp);
        setProfile(prof);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, currentUser]);

  const handleSelectAsTarget = async () => {
    if (!currentUser) {
      navigate(`/masuk?redirect=${encodeURIComponent(`/kompetisi/${slug}`)}`);
      return;
    }
    if (!slug) return;
    setSaving(true);
    try {
      await userService.setTargetCompetition(currentUser.id, slug);
      notify('Target kompetisi berhasil diperbarui.');
      navigate('/app/profil?need=target');
    } catch {
      notify('Gagal memilih target. Coba lagi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading message="Memuat detail kompetisi..." />;
  if (!competition) {
    return (
      <div className="p-12 text-center space-y-4">
        <p role="alert" className="text-rose-500 text-sm font-semibold">Kompetisi tidak ditemukan.</p>
        <Link to="/kompetisi" className="text-xs font-bold text-blue-700 underline">
          Kembali ke katalog lomba
        </Link>
      </div>
    );
  }

  const isCurrentTarget = profile?.targetKompetisiSlug === competition.slug;
  const currentTab = VALID_TABS.includes(activeTab as never) ? activeTab : 'ringkasan';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link to="/kompetisi" className="hover:text-blue-700 transition-colors font-medium">
          Katalog Lomba
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span aria-current="page" className="text-slate-700 font-bold truncate max-w-md">
          {competition.namaResmi}
        </span>
      </nav>

      {/* Main Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge color="blue" size="md" dot>
            {competition.kategori}
          </Badge>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider inline-flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Tingkat {competition.tingkat} • Belmawa 2026
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
            {competition.namaResmi}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            {competition.deskripsi}
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          {isCurrentTarget ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge color="emerald" size="lg" dot>
                Target Pembinaan Aktif Kamu
              </Badge>
              <Link to={`/app/kompetisi/${competition.slug}/persiapan`}>
                <Button size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Buka Ruang Persiapan
                </Button>
              </Link>
            </div>
          ) : (
            <Button
              size="md"
              onClick={handleSelectAsTarget}
              isLoading={saving}
              leftIcon={<Target className="w-4 h-4" />}
            >
              Pilih sebagai Target Kompetisi Saya
            </Button>
          )}
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
        <Tabs
          tabs={[
            { id: 'ringkasan', label: 'Tahapan Perlombaan' },
            { id: 'syarat', label: 'Syarat & Ketentuan Tim' },
            { id: 'jadwal', label: 'Jadwal & Seleksi Internal' },
          ]}
          activeTab={currentTab}
          onChange={setActiveTab}
        />

        <div id={`panel-${currentTab}`} role="tabpanel" aria-labelledby={`tab-${currentTab}`}>
          {currentTab === 'ringkasan' && (
            <div className="space-y-4 text-xs text-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <ListOrdered className="w-4 h-4 text-blue-700" />
                <h2 className="font-bold text-slate-800 text-sm">Alur Tahapan Pelaksanaan Lomba</h2>
              </div>
              <ol className="space-y-2.5">
                {competition.tahapan.map((t, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70"
                  >
                    <span className="w-6 h-6 rounded-lg bg-blue-700 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-700 leading-relaxed pt-0.5">{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {currentTab === 'syarat' && (
            <TeamRuleBox komposisi={competition.komposisi} syarat={competition.syarat} />
          )}

          {currentTab === 'jadwal' && (
            <ScheduleTimeline
              jadwalResmi={competition.jadwal}
              seleksiInternal={competition.seleksiInternal}
            />
          )}
        </div>
      </div>
    </div>
  );
};