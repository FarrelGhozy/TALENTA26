import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Achievement } from '../../types';
import { achievementService } from '../../services/factory';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { AchievementForm } from './components/AchievementForm';

export const AchievementNewPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: Omit<Achievement, 'id' | 'status' | 'institutionId'>) => {
    setLoading(true);
    try {
      await achievementService.create(data);
      notify('Pengajuan prestasi terkirim. Status: Menunggu verifikasi.');
      navigate('/app/prestasi');
    } catch {
      notify('Gagal mengirim pengajuan. Coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 space-y-3">
        <p role="alert" className="text-sm text-rose-600">Sesi tidak valid. Silakan masuk ulang.</p>
        <Link to="/masuk" className="text-xs font-bold text-blue-700 underline">Ke halaman masuk</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 max-w-xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Formulir Prestasi Mandiri</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dapat diajukan untuk kejuaraan eksternal, konferensi internasional, olahraga, seni, maupun seleksi internal.
            Status awal selalu <strong>Menunggu verifikasi</strong>.
          </p>
        </div>
        <Link to="/app/prestasi" className="text-xs text-slate-500 hover:text-slate-800 min-h-[36px] inline-flex items-center shrink-0">
          ← Kembali
        </Link>
      </div>

      <AchievementForm
        userId={currentUser.id}
        onSubmit={handleSubmit}
        isLoading={loading}
      />
    </div>
  );
};
