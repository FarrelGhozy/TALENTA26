import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, ArrowRight, ArrowLeft, AlertCircle, UserCheck, Target, Layers, Check } from 'lucide-react';
import { Competition, Team, User } from '../../types';
import { competitionService, teamService, userService } from '@talenta/services';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PageLoading } from '../../components/ui/Skeleton';
import { StepIdentitas } from './components/StepIdentitas';
import { StepMinatSkill } from './components/StepMinatSkill';
import { StepTarget } from './components/StepTarget';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ProfilePage: React.FC = () => {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();
  const needTarget = searchParams.get('need') === 'target';

  const [step, setStep] = useState(needTarget ? 3 : 1);
  const [userData, setUserData] = useState<Partial<User>>({});
  const [targetSlug, setTargetSlug] = useState('');
  const [initialTargetSlug, setInitialTargetSlug] = useState('');
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmSwitchOpen, setConfirmSwitchOpen] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    Promise.all([
      userService.getById(currentUser.id),
      userService.getProfile(currentUser.id),
      competitionService.getAll(),
      teamService.getTeamByUserId(currentUser.id).catch(() => null),
    ])
      .then(([u, prof, comps, team]) => {
        if (cancelled) return;
        if (u) setUserData(u);
        if (prof?.targetKompetisiSlug) {
          setTargetSlug(prof.targetKompetisiSlug);
          setInitialTargetSlug(prof.targetKompetisiSlug);
        }
        setActiveTeam(team && team.status !== 'arsip' ? team : null);
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
      if (!userData.angkatan || userData.angkatan < 1900 || userData.angkatan > new Date().getFullYear() + 1)
        return 'Masukkan tahun angkatan yang valid.';
      if (!userData.email || !EMAIL_RE.test(userData.email)) return 'Email kampus tidak valid.';
    }
    if (s === 2) {
      if ((userData.minat || []).length === 0) return 'Pilih minimal 1 minat.';
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

  const handleUploadAvatar = async (file: File) => {
    if (!userService.uploadAvatar) return;
    setUploadingAvatar(true);
    try {
      const res = await userService.uploadAvatar(file);
      const sep = res.avatarUrl.includes('?') ? '&' : '?';
      const cacheBusted = `${res.avatarUrl}${sep}t=${Date.now()}`;
      setUserData((prev) => ({ ...prev, avatar: cacheBusted }));
      await refreshUser();
      notify('Foto profil privat berhasil diperbarui!');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!userService.deleteAvatar) return;
    setUploadingAvatar(true);
    try {
      await userService.deleteAvatar();
      setUserData((prev) => ({ ...prev, avatar: '' }));
      await refreshUser();
      notify('Foto profil berhasil dihapus.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfileOnly = async () => {
    const err = validateStep(step);
    if (err) {
      setFormError(err);
      return;
    }
    if (!currentUser) return;
    setSaving(true);
    setFormError('');
    try {
      await userService.updateProfile(currentUser.id, userData);
      await refreshUser();
      notify('Perubahan profil berhasil disimpan!');
    } catch (e: any) {
      const msg = e?.message || 'Gagal menyimpan profil. Coba lagi.';
      setFormError(msg);
      notify(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const executeSaveAll = async () => {
    if (!currentUser) return;
    setSaving(true);
    setConfirmSwitchOpen(false);
    setFormError('');
    try {
      await userService.updateProfile(currentUser.id, userData);
      if (targetSlug) {
        await userService.setTargetCompetition(currentUser.id, targetSlug);
      }
      await refreshUser();
      notify('Profil & target kompetisi berhasil diperbarui!');
      const chosenComp = competitions.find((c) => c.slug === targetSlug);
      const isIndividu =
        chosenComp?.format === 'individu' ||
        (chosenComp && chosenComp.komposisi.min === 1 && chosenComp.komposisi.max === 1);
      if (isIndividu && targetSlug) {
        navigate(`/app/kompetisi/${targetSlug}/persiapan`);
      } else {
        navigate('/app/tim');
      }
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan profil. Coba lagi.';
      setFormError(msg);
      notify(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const err = validateStep(step);
    if (err) {
      setFormError(err);
      return;
    }
    if (!currentUser) return;
    if (initialTargetSlug && targetSlug && targetSlug !== initialTargetSlug && activeTeam) {
      setConfirmSwitchOpen(true);
      return;
    }
    await executeSaveAll();
  };

  if (loading) return <PageLoading message="Memuat profil dan minat mahasiswa..." />;

  const stepsMeta = [
    { num: 1, label: 'Identitas & Akademik', icon: UserCheck, desc: 'NIM, prodi & foto' },
    { num: 2, label: 'Minat, Skill & Peran', icon: Layers, desc: 'Keahlian komplementer tim' },
    { num: 3, label: 'Target Belmawa & Waktu', icon: Target, desc: 'Kompetisi & ketersediaan' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Pengaturan Akun Binaan
          </span>
          <span className="text-[11px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
            Langkah {step} dari 3
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          Profil, Keahlian & Target Kompetisi
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Data profil ini ditampilkan secara aman saat kamu mengajukan bergabung ke tim, mengikuti roadmap, dan mengajukan prestasi kampus.
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-3 gap-2">
        {stepsMeta.map((s) => {
          const isDone = s.num < step;
          const isCurrent = s.num === step;
          const Icon = s.icon;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => goToStep(s.num)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-blue-50/90 border-blue-600 shadow-xs ring-1 ring-blue-600/20'
                  : isDone
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    isCurrent
                      ? 'bg-blue-700 text-white'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : s.num}
                </div>
                <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-blue-700' : isDone ? 'text-emerald-600' : 'text-slate-400'}`} />
              </div>
              <div className="mt-2">
                <div className="text-xs font-extrabold text-slate-900 truncate">{s.label}</div>
                <div className="text-[10px] text-slate-400 truncate">{s.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {formError && (
        <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs">
        {step === 1 && (
          <StepIdentitas
            user={userData}
            onChange={handleUserChange}
            onUploadAvatar={userService.uploadAvatar ? handleUploadAvatar : undefined}
            onDeleteAvatar={userService.deleteAvatar ? handleDeleteAvatar : undefined}
            uploadingAvatar={uploadingAvatar}
          />
        )}
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

        {/* Footer Navigation Buttons */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setFormError('');
                setStep((s) => s - 1);
              }}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Kembali
            </Button>
          ) : (
            <span />
          )}

          <div className="flex flex-wrap gap-2">
            {step < 3 ? (
              <>
                <Button
                  type="button"
                  size="md"
                  variant="outline"
                  onClick={handleSaveProfileOnly}
                  isLoading={saving}
                >
                  Simpan Profil
                </Button>
                <Button
                  type="button"
                  size="md"
                  onClick={goNext}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Lanjutkan Langkah
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="md"
                variant="primary"
                onClick={handleSaveAll}
                isLoading={saving}
                rightIcon={<Users className="w-4 h-4" aria-hidden="true" />}
              >
                {(() => {
                  const chosen = competitions.find((c) => c.slug === targetSlug);
                  const isInd = chosen?.format === 'individu' || (chosen && chosen.komposisi.min === 1 && chosen.komposisi.max === 1);
                  return isInd ? 'Simpan & Mulai Persiapan' : 'Simpan & Pilih Cara Bergabung';
                })()}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={confirmSwitchOpen}
        onClose={() => setConfirmSwitchOpen(false)}
        title="Konfirmasi Ganti Target Kompetisi"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmSwitchOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" isLoading={saving} onClick={executeSaveAll}>
              Ya, Ganti Target
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Anda saat ini tergabung dalam tim aktif <strong className="text-slate-900">{activeTeam?.nama}</strong>.
          Mengganti target kompetisi akan mengeluarkan Anda dari tim lama secara otomatis (kepemimpinan dialihkan ke anggota terlama jika Anda ketua, atau tim diarsipkan bila Anda anggota terakhir) serta membatalkan pengajuan gabung yang masih menunggu pada kompetisi lama. Pergantian target ditolak bila tim sudah terkunci seleksi internal.
        </p>
      </Modal>
    </div>
  );
};
