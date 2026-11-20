import React, { useState } from 'react';
import { Mail, Check, X, Send } from 'lucide-react';
import { Invite, User } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { formatInviteStatus } from '../PartnerPage';

interface InviteListProps {
  invites: Invite[];
  allUsers: User[];
  currentUserId: string;
  onRespond: (inviteId: string, status: 'diterima' | 'ditolak') => Promise<void>;
}

export const InviteList: React.FC<InviteListProps> = ({
  invites,
  allUsers,
  currentUserId,
  onRespond,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const incoming = invites.filter((i) => i.ke === currentUserId && i.status === 'diajukan');
  const outgoing = invites.filter((i) => i.dari === currentUserId);

  const getUser = (id: string) => allUsers.find((u) => u.id === id);
  const getUserName = (id: string) => getUser(id)?.nama || id;

  const handleAction = async (inviteId: string, status: 'diterima' | 'ditolak') => {
    setProcessingId(inviteId);
    try {
      await onRespond(inviteId, status);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Undangan Masuk */}
      <section aria-labelledby="inv-masuk" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 id="inv-masuk" className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-700" />
            Undangan Bergabung ke Tim ({incoming.length})
          </h3>
        </div>

        {incoming.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-1">
            <p className="text-xs font-semibold text-slate-700">Belum Ada Undangan Masuk</p>
            <p className="text-[11px] text-slate-400">
              Ketika ada rekan tim lain yang mengajak kamu bergabung, undangannya akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {incoming.map((inv) => {
              const sender = getUser(inv.dari);
              return (
                <Card key={inv.id} className="p-4 sm:p-5 bg-white border-slate-200 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">
                        {getUserName(inv.dari).substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{getUserName(inv.dari)}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {sender ? `${sender.prodi} • ${sender.peranBisa.join(', ')} • ` : ''}
                          Mengajak bergabung ke tim
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">Kode Tim: {inv.teamId}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={processingId === inv.id}
                        isLoading={processingId === inv.id}
                        onClick={() => handleAction(inv.id, 'ditolak')}
                        leftIcon={<X className="w-3.5 h-3.5" />}
                      >
                        Tolak
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={processingId === inv.id}
                        isLoading={processingId === inv.id}
                        onClick={() => handleAction(inv.id, 'diterima')}
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                      >
                        Terima & Bergabung
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Undangan Keluar */}
      <section aria-labelledby="inv-keluar" className="space-y-3 pt-2 border-t border-slate-100">
        <h3 id="inv-keluar" className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Send className="w-4 h-4 text-slate-500" />
          Riwayat Undangan Keluar ({outgoing.length})
        </h3>

        {outgoing.length === 0 ? (
          <div className="text-center py-6 bg-white rounded-2xl border border-slate-200/80 p-4">
            <p className="text-xs text-slate-400">Kamu belum mengirimkan undangan ke siapa pun.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {outgoing.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs shadow-2xs"
              >
                <div className="truncate min-w-0">
                  <span className="text-slate-500 text-[11px] block">Kepada:</span>
                  <strong className="text-slate-800 truncate block">{getUserName(inv.ke)}</strong>
                </div>
                <Badge
                  color={
                    inv.status === 'diterima'
                      ? 'emerald'
                      : inv.status === 'ditolak'
                      ? 'rose'
                      : inv.status === 'kedaluwarsa'
                      ? 'slate'
                      : 'amber'
                  }
                  size="sm"
                  dot
                >
                  {formatInviteStatus(inv.status)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};