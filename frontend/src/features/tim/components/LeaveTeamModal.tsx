import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

interface LeaveTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export const LeaveTeamModal: React.FC<LeaveTeamModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Konfirmasi Keluar dari Tim"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} isLoading={isLoading}>
            Ya, Keluar Tim
          </Button>
        </>
      }
    >
      <p>
        Apakah kamu yakin ingin keluar dari tim saat ini?
      </p>
      <p className="text-xs text-slate-500 mt-2">
        Status tim akan kembali menjadi <strong>Mencari</strong> dan kamu dapat mencari tim baru atau menerima undangan lainnya sebelum seleksi internal dimulai.
      </p>
    </Modal>
  );
};
