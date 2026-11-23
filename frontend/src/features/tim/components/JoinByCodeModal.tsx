import React, { useState } from 'react';
import { Hash, ArrowRight } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

interface JoinByCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (inviteCode: string) => Promise<void>;
}

export const JoinByCodeModal: React.FC<JoinByCodeModalProps> = ({
  isOpen,
  onClose,
  onJoin,
}) => {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length < 4) {
      setError('Masukkan kode undangan tim dari ketua.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onJoin(cleaned);
      setCode('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal bergabung dengan kode tersebut. Periksa kembali kode dari ketua tim.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Masuk Tim dengan Kode Undangan"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          Minta kode undangan aktif kepada ketua tim yang sudah membuat ruang tim pada kompetisi yang sama.
        </p>

        <div className="space-y-1.5">
          <Input
            label="Kode Undangan Tim"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
            placeholder="Contoh: TLN-XXXX-XXXX"
            error={error || undefined}
            required
            autoFocus
          />
          <p className="text-[11px] text-slate-400 inline-flex items-center gap-1">
            <Hash className="w-3 h-3" aria-hidden="true" />
            <span>Format kode tim bersifat unik dan dapat diubah oleh ketua kapan saja.</span>
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={submitting}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Gabung Tim
          </Button>
        </div>
      </form>
    </Modal>
  );
};
