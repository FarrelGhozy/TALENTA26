import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { Competition, User } from '../../types';
import { competitionService, userService } from '../../services/factory';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { PageLoading } from '../../components/ui/Skeleton';
import { StepIdentitas } from './components/StepIdentitas';
import { StepMinatSkill } from './components/StepMinatSkill';
import { StepTarget } from './components/StepTarget';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ProfilePage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();
  const needTarget = searchParams.get('need') === 'target';

  const [step, setStep] = useState(needTarget ? 3 : 1);
  const [userData, setUserData] = useState<Partial<User>>({});
  const [targetSlug, setTargetSlug] = useState('');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    Promise.all([
      userService.getById(currentUser.id),
      userService.getProfile(currentUser.id),
      competitionService.getAll(),
    ])
      .then(([u, prof, comps]) => {
        if (cancelled) return;
        if (u) setUserData(u);
        if (prof?.targetKompetisiSlug) setTargetSlug(prof.targetKompetisiSlug);
        setCompetitions(comps);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setFormError('Gagal memuat profil. Coba muat ulang halaman.');
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const handleUserChange = (field: keyof User, val: unknown) => {
    setUserData((prev) => ({ ...prev, [field]: val }));
    setFormError('');
  };

  const validateStep = (s: number): string => {
    if (s === 1) {
      if (!userData.nama || userData.nama.trim().length < 3) return 'Nama lengkap minimal 3 karakter.';
      if (!userData.prodi || !userData.prodi.trim()) return 'Program studi wajib diisi.';
      if (!userData.angkatan || userData.angkatan < 2018 || userData.angkatan > 2030)
        return 'Angkatan harus antara 2018–2030.';
      if (!userData.email || !EMAIL_RE.test(userData.email)) return 'Email kampus tidak valid.';
    }
    if (s === 2) {
      if ((userData.minat || []).length === 0) return 'Pilih minimal 1 minat (maks 5).';
      if ((userData.skill || []).length === 0) return 'Tambahkan minimal 1 keahlian.';
      if ((userData.peranBisa || []).length === 0) return 'Pilih minimal 1 peran tim yang bisa dijalani.';
    }
    if (s === 3) {
      if (!targetSlug) return 'Pilih 1 target kompetisi utama.';
      if ((userData.ketersediaan?.hari || []).length === 0) return 'Pilih minimal 1 hari ketersediaan.';
    }
    return '';
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError('');
    setStep((s) => Math.min(3, s + 1));
  };

  const goToStep = (s: number) => {
    if (s < step) {
      setStep(s);
      setFormError('');
      return;
    }
    const err = validateStep(step);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError('');
    setStep(s);
  };

  const handleSaveAndFinish = async () => {
    for (const s of [1, 2, 3]) {
      const err = validateStep(s);
      if (err) {
        setFormError(err);
        setStep(s);
        return;
      }
    }
    if (!currentUser) return;
    setSaving(true);
    try {
      await userService.updateProfile(currentUser.id, userData);
      if (targetSlug) {
        await userService.setTargetCompetition(currentUser.id, targetSlug);
      }
      notify('Profil berhasil disimpan! Mengarahkan ke pencarian partner...');
      navigate('/app/partner');
    } catch {
      setFormError('Gagal menyimpan profil. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading message="Memuat profil mahasiswa..." />;

  const steps = [
    { num: 1, title: 'Identitas Diri', desc: 'Data dasar & prodi' },
    { num: 2, title: 'Minat & Skill', desc: 'Peran & keahlian' },
    { num: 3, title: 'Waktu & Target', desc: 'Jadwal & kompetisi' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Pengaturan Talenta
          </span>
          <span className="text-[11px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
            Langkah {step} dari 3
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          Kelola Profil & Minat
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Data ini menjadi dasar sistem pencocokan partner tim yang saling melengkapi keahlian.
        </p>
      </div>

      {needTarget && (
        <div role="alert" className="p-4 bg-amber-50 border border-amber-200/90 text-amber-950 rounded-2xl text-xs font-medium flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Kamu perlu memilih target kompetisi terlebih dahulu untuk mengaktifkan rekomendasi partner tim.</span>
        </div>
      )}

      {/* Stepper Tabs */}
      <ol aria-label="Langkah pengisian profil" className="grid grid-cols-3 gap-2.5">
        {steps.map((s) => {
          const isActive = step === s.num;
          const isDone = s.num < step;

          return (
            <li key={s.num}>
              <button
                type="button"
                onClick={() => goToStep(s.num)}
                aria-current={isActive ? 'step' : undefined}
                className={`w-full p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer min-h-[52px] ${
                  isActive
                    ? 'bg-blue-50/90 border-blue-600 text-blue-950 shadow-xs'
                    : isDone
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-white border-slate-200/80 text-slate-500 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isActive
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isDone ? '✓' : s.num}
                  </div>
                  <span className="text-xs font-bold truncate leading-tight">{s.title}</span>
                </div>
                <span className="text-[10px] text-slate-400 block pl-7 truncate">{s.desc}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {formError && (
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Form Content Card */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs">
        {step === 1 && <StepIdentitas user={userData} onChange={handleUserChange} />}
        {step === 2 && <StepMinatSkill user={userData} onChange={handleUserChange} />}
        {step === 3 && (
          <StepTarget
            user={userData}
            targetSlug={targetSlug}
            competitions={competitions}
            onUserChange={handleUserChange}
            onTargetChange={(slug) => {
              setTargetSlug(slug);
              setFormError('');
            }}
          />
        )}

        <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-100">
          {step > 1 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStep(step - 1)}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Kembali
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            {step < 3 ? (
              <Button size="sm" onClick={goNext} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Lanjut
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSaveAndFinish}
                isLoading={saving}
                rightIcon={<Users className="w-3.5 h-3.5" />}
              >
                Simpan & Cari Partner
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};