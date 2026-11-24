import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, MessageSquare, Award, Edit2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { PointRecommendation } from '../../../types';

interface DecisionPanelProps {
  pointRecommendation?: PointRecommendation | null;
  isCompetition?: boolean;
  isGroup?: boolean;
  participantsCount?: number;
  onDecision: (
    status: 'disetujui' | 'perlu_perbaikan' | 'ditolak',
    catatan: string,
    override?: { overridePoints: number; overrideReason: string }
  ) => Promise<void>;
  isLoading: boolean;
}

const TEMPLATE_REASONS = [
  'Sertifikat belum mencantumkan cap / tanda tangan resmi penyelenggara.',
  'Nama mahasiswa pada sertifikat berbeda dengan data induk institusi.',
  'Resolusi berkas buram dan nomor SK kejuaraan tidak terbaca jelas.',
  'Mohon lampirkan surat tugas pembimbing atau berita acara lomba.',
];

export const DecisionPanel: React.FC<DecisionPanelProps> = ({
  pointRecommendation,
  isCompetition = true,
  isGroup = false,
  participantsCount = 1,
  onDecision,
  isLoading,
}) => {
  const [catatan, setCatatan] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<'disetujui' | 'perlu_perbaikan' | 'ditolak' | null>(null);

  const [enableOverride, setEnableOverride] = useState(false);
  const [overridePoints, setOverridePoints] = useState<string>(
    pointRecommendation ? String(pointRecommendation.calculatedPoints) : '0'
  );
  const [overrideReason, setOverrideReason] = useState('');

  const textareaId = 'catatan-verifikator';
  const errorId = 'catatan-error';

  const appendReason = (reason: string) => {
    setCatatan((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${reason}` : reason;
    });
    setError('');
  };

  const requestAction = (status: 'disetujui' | 'perlu_perbaikan' | 'ditolak') => {
    setError('');
    if ((status === 'perlu_perbaikan' || status === 'ditolak') && catatan.trim().length < 5) {
      setError('Catatan / alasan wajib diisi minimal 5 karakter untuk penolakan atau permintaan perbaikan.');
      document.getElementById(textareaId)?.focus();
      return;
    }

    if (status === 'disetujui' && isCompetition && enableOverride) {
      const parsed = Number(overridePoints);
      if (!Number.isInteger(parsed) || parsed < 0) {
        setError('Nilai override poin harus berupa bilangan bulat minimal 0.');
        return;
      }
      if (overrideReason.trim().length < 3) {
        setError('Alasan perubahan poin (override) wajib diisi minimal 3 karakter.');
        return;
      }
    }

    if (status === 'ditolak') {
      setConfirming(status);
      return;
    }
    void handleAction(status);
  };

  const handleAction = async (status: 'disetujui' | 'perlu_perbaikan' | 'ditolak') => {
    setConfirming(null);
    const override =
      status === 'disetujui' && isCompetition && enableOverride
        ? { overridePoints: Number(overridePoints), overrideReason: overrideReason.trim() }
        : undefined;
    await onDecision(status, catatan, override);
  };

  return (
    <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-700" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-900">Keputusan & Telaah Verifikasi Berkas</h2>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">Verifikasi Validator</span>
      </div>

      {/* Ringkasan Poin Otomatis & Override Validator */}
      {pointRecommendation && (
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-blue-700" aria-hidden="true" />
                Kalkulasi Poin Otomatis: {pointRecommendation.calculatedPoints} Poin
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {pointRecommendation.explanation}
              </p>
              {isGroup && (
                <p className="text-[11px] font-bold text-blue-800">
                  Prestasi kelompok: poin penuh akan diberikan kepada seluruh {participantsCount} anggota terdaftar saat disetujui.
                </p>
              )}
            </div>

            {isCompetition && (
              <button
                type="button"
                onClick={() => {
                  const next = !enableOverride;
                  setEnableOverride(next);
                  if (next) setOverridePoints(String(pointRecommendation.calculatedPoints));
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  enableOverride
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                {enableOverride ? 'Batalkan Ubah Poin' : 'Ubah Poin (Override)'}
              </button>
            )}
          </div>

          {isCompetition && enableOverride && (
            <div className="pt-3 border-t border-blue-200/70 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label htmlFor="override-points" className="block font-bold text-slate-800 mb-1">
                  Poin Baru (Bulat &ge; 0)
                </label>
                <input
                  id="override-points"
                  type="number"
                  min={0}
                  step={1}
                  value={overridePoints}
                  onChange={(e) => setOverridePoints(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-bold text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="override-reason" className="block font-bold text-slate-800 mb-1">
                  Alasan Perubahan Poin (Wajib)
                </label>
                <input
                  id="override-reason"
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Contoh: Penyesuaian bobot sub-lomba / penghargaan khusus panitia"
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-slate-900"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-700">
          Catatan / Alasan Verifikator (Wajib diisi jika perlu perbaikan atau ditolak)
        </label>

        {/* Quick Rationale Template Chips */}
        <div className="space-y-1.5 pb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Template Catatan Cepat (1-Klik):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_REASONS.map((r, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => appendReason(r)}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900 transition-colors text-left cursor-pointer"
              >
                + {r}
              </button>
            ))}
          </div>
        </div>

        <textarea
          id={textareaId}
          rows={3}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error) || undefined}
          placeholder="Tuliskan catatan perbaikan berkas sertifikat atau alasan penolakan yang jelas bagi mahasiswa..."
          disabled={isLoading}
          className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[92px] disabled:bg-slate-50 transition-all bg-slate-50/50"
        />
        {error && <p id={errorId} role="alert" className="text-xs text-rose-600 font-medium mt-1">{error}</p>}
      </div>

      {confirming === 'ditolak' ? (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 space-y-3">
          <p className="font-semibold">
            Konfirmasi Penolakan: Pengajuan yang ditolak tidak akan dihitung sebagai prestasi terverifikasi. Lanjutkan?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirming(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleAction('ditolak')}
              isLoading={isLoading}
              leftIcon={<XCircle className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Ya, Tetap Tolak Pengajuan
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            variant="warning-outline"
            size="sm"
            disabled={isLoading}
            onClick={() => requestAction('perlu_perbaikan')}
            leftIcon={<AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Minta Revisi Dokumen
          </Button>
          <Button
            variant="danger-outline"
            size="sm"
            disabled={isLoading}
            onClick={() => requestAction('ditolak')}
            leftIcon={<XCircle className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Tolak
          </Button>
          <Button
            size="sm"
            variant="success"
            disabled={isLoading}
            onClick={() => requestAction('disetujui')}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Setujui Prestasi
          </Button>
        </div>
      )}
    </div>
  );
};
