import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, GraduationCap, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuth } from './AuthContext';

export const RegisterPage: React.FC = () => {
  const { currentUser, currentRole, registerMahasiswa, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && currentUser) {
      const target = currentRole === 'mahasiswa' ? '/app/beranda' : '/admin';
      navigate(target, { replace: true });
    }
  }, [isLoading, currentUser, currentRole, navigate]);

  const [formData, setFormData] = useState({
    nim: '',
    fullName: '',
    email: '',
    studyProgram: 'Teknik Informatika',
    faculty: 'Sains dan Teknologi',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [success, setSuccess] = useState(false);

  const prodiOptions = [
    { value: 'Teknik Informatika', label: 'Teknik Informatika' },
    { value: 'Sistem Informasi', label: 'Sistem Informasi' },
    { value: 'Teknologi Informasi', label: 'Teknologi Informasi' },
    { value: 'Pendidikan Agama Islam', label: 'Pendidikan Agama Islam' },
    { value: 'Hukum Ekonomi Syariah', label: 'Hukum Ekonomi Syariah' },
    { value: 'Manajemen', label: 'Manajemen' },
    { value: 'Hubungan Internasional', label: 'Hubungan Internasional' },
    { value: 'Farmasi', label: 'Farmasi' },
  ];

  const fakultasOptions = [
    { value: 'Sains dan Teknologi', label: 'Sains dan Teknologi' },
    { value: 'Tarbiyah', label: 'Tarbiyah' },
    { value: 'Syariah', label: 'Syariah' },
    { value: 'Ekonomi dan Manajemen', label: 'Ekonomi dan Manajemen' },
    { value: 'Humaniora', label: 'Humaniora' },
    { value: 'Ilmu Kesehatan', label: 'Ilmu Kesehatan' },
  ];

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    // Validasi lokal selaras dengan aturan backend
    const errors: Record<string, string> = {};
    const trimmedNim = formData.nim.trim();
    const trimmedName = formData.fullName.trim();
    const trimmedEmail = formData.email.trim();
    if (trimmedNim.length < 5 || trimmedNim.length > 32) {
      errors.nim = 'NIM harus terdiri dari 5–32 karakter';
    }
    if (trimmedName.length < 2 || trimmedName.length > 150) {
      errors.fullName = 'Nama lengkap minimal 2 karakter';
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Format email tidak valid';
    }
    if (formData.password.length < 8 || formData.password.length > 128) {
      errors.password = 'Kata sandi harus 8–128 karakter';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Konfirmasi kata sandi tidak cocok';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      await registerMahasiswa({
        nim: formData.nim.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        studyProgram: formData.studyProgram,
        faculty: formData.faculty,
        phone: formData.phone.trim() || undefined,
        password: formData.password,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/app/beranda', { replace: true });
      }, 1500);
    } catch (err: unknown) {
      if (err && typeof err === 'object') {
        const errorObj = err as { message?: string; fieldErrors?: Record<string, string> };
        if (errorObj.fieldErrors) {
          setFieldErrors(errorObj.fieldErrors);
        }
        setGeneralError(errorObj.message || 'Pendaftaran gagal. Periksa kembali isian formulir.');
      } else {
        setGeneralError('Terjadi kesalahan saat mendaftar. Silakan coba kembali.');
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 sm:py-12 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-200/60 uppercase tracking-widest">
          <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
          Universitas Darussalam Gontor
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Pendaftaran Mahasiswa
        </h1>
        <p className="text-sm text-slate-600">
          Buat akun TALENTA untuk mengikuti pembinaan, membentuk tim lomba, dan mencatat prestasi.
        </p>
      </div>

      {success ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-lg font-bold text-emerald-900">Pendaftaran Berhasil!</h2>
          <p className="text-sm text-emerald-700">
            Akun mahasiswa Anda telah aktif. Mengalihkan Anda langsung ke portal mahasiswa...
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4"
        >
          {generalError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
            >
              {generalError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="NIM (Nomor Induk Mahasiswa)"
              required
              value={formData.nim}
              onChange={(e) => handleChange('nim', e.target.value)}
              placeholder="Contoh: 432026101"
              error={fieldErrors.nim}
            />

            <Input
              label="Nama Lengkap"
              required
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="Nama sesuai identitas"
              error={fieldErrors.fullName}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Aktif"
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="nama@unida.gontor.ac.id"
              error={fieldErrors.email}
            />

            <Input
              label="Nomor WhatsApp (Opsional)"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="08123456789"
              error={fieldErrors.phone}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Fakultas"
              options={fakultasOptions}
              value={formData.faculty}
              onChange={(e) => handleChange('faculty', e.target.value)}
              error={fieldErrors.faculty}
            />

            <Select
              label="Program Studi"
              options={prodiOptions}
              value={formData.studyProgram}
              onChange={(e) => handleChange('studyProgram', e.target.value)}
              error={fieldErrors.studyProgram}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Kata Sandi"
              type="password"
              required
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              helper="Minimal 8 karakter"
              error={fieldErrors.password}
            />

            <Input
              label="Konfirmasi Kata Sandi"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              error={fieldErrors.confirmPassword}
            />
          </div>

          <Button
            type="submit"
            className="w-full mt-4"
            isLoading={isLoading}
            rightIcon={<UserPlus className="w-4 h-4" />}
          >
            Daftar Sebagai Mahasiswa
          </Button>

          <div className="pt-2 text-center text-xs text-slate-500">
            Sudah memiliki akun?{' '}
            <Link
              to="/masuk"
              className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1"
            >
              Masuk ke Portal
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};
