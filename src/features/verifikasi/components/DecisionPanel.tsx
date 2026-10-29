import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, MessageSquare } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface DecisionPanelProps {
  onDecision: (status: 'disetujui' | 'perlu_perbaikan' | 'ditolak', catatan: string) => Promise<void>;
  isLoading: boolean;
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({ onDecision, isLoading }) => {
  const [catatan, setCatatan] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<'disetujui' | 'perlu_perbaikan' | 'ditolak' | null>(null);
  const textareaId = 'catatan-verifikator';
  const errorId = 'catatan-error';

  const requestAction = (status: 'disetujui' | 'perlu_perbaikan' | 'ditolak') => {
    setError('');
    if ((status === 'perlu_perbaikan' || status === 'ditolak') && catatan.trim().length < 5) {
      setError('Catatan / alasan wajib diisi minimal 5 karakter untuk penolakan atau permintaan perbaikan.');
      document.getElementById(textareaId)?.focus();
      return;
    }
    if (status === 'ditolak') {
      setConfirming(status);
      return;
    }
    void handleAction(status);
  };

  const handleAction = async (status: 'disetujui' | 'perlu_perbaikan' | 'ditolak') => {
    setConfirming(null);
    await onDecision(status, catatan);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-blue-700" />
        <h2 className="text-sm font-bold text-slate-900">Keputusan & Telaah Verifikasi Berkas</h2>
      </div>

      <div>
        <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-700 mb-1.5">
          Catatan / Alasan Verifikator (Wajib diisi jika perlu perbaikan atau ditolak)
        </label>
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
        {error && <p id={errorId} role="alert" className="text-xs text-rose-600 font-medium mt-1.5">{error}</p>}
      </div>

      {confirming === 'ditolak' ? (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 space-y-3">
          <p className="font-semibold">
            Konfirmasi Penolakan: Pengajuan yang ditolak tidak akan dihitung sebagai prestasi sah di institusi. Lanjutkan?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirming(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleAction('ditolak')}
              isLoading={isLoading}
              leftIcon={<XCircle className="w-3.5 h-3.5" />}
            >
              Ya, Tetap Tolak Pengajuan
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => requestAction('perlu_perbaikan')}
            leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
          >
            Minta Perbaikan Bukti
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            onClick={() => requestAction('ditolak')}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            leftIcon={<XCircle className="w-3.5 h-3.5" />}
          >
            Tolak
          </Button>
          <Button
            size="sm"
            variant="success"
            disabled={isLoading}
            onClick={() => requestAction('disetujui')}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Setujui & Sahkan Prestasi
          </Button>
        </div>
      )}
    </div>
  );
};