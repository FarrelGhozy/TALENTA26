import React, { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { TeamJoinRequestItem } from '../../../types';
import { teamService } from '@talenta/services';
import { useToast } from '../../../components/ui/Toast';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { UserAvatar } from '../../../components/ui/UserAvatar';

function formatRequestStatus(status: TeamJoinRequestItem['status']) {
  switch (status) {
    case 'menunggu':
      return { label: 'Menunggu Persetujuan', color: 'amber' as const };
    case 'disetujui':
      return { label: 'Disetujui', color: 'emerald' as const };
    case 'ditolak':
      return { label: 'Ditolak', color: 'rose' as const };
    case 'dibatalkan':
      return { label: 'Dibatalkan', color: 'slate' as const };
    case 'kedaluwarsa':
      return { label: 'Kedaluwarsa', color: 'slate' as const };
    default:
      return { label: status, color: 'slate' as const };
  }
}

interface MyJoinRequestsPanelProps {
  requests: TeamJoinRequestItem[];
  hasActiveTeam: boolean;
  onReload: () => Promise<void>;
  onBrowseTeams: () => void;
  onGoToMyTeam: () => void;
}

export const MyJoinRequestsPanel: React.FC<MyJoinRequestsPanelProps> = ({
  requests,
  hasActiveTeam,
  onReload,
  onBrowseTeams,
  onGoToMyTeam,
}) => {
  const { notify } = useToast();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancelRequest = async (requestId: string) => {
    if (!teamService.cancelJoinRequest) return;
    setCancellingId(requestId);
    try {
      await teamService.cancelJoinRequest(requestId);
      notify('Pengajuan bergabung berhasil dibatalkan.', 'info');
      await onReload();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Gagal membatalkan pengajuan.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
        <p className="text-sm font-bold text-slate-800">Belum Ada Pengajuan Bergabung</p>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Pilih salah satu tim terbuka pada tab Cari Tim Terbuka untuk mengirim pengajuan bergabung
          kepada ketua tim.
        </p>
        <div className="pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onBrowseTeams}
            leftIcon={<Search className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Lihat Tim Terbuka
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const st = formatRequestStatus(req.status);
        return (
          <div
            key={req.id}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900">
                  {req.team?.name || 'Tim Kompetisi'}
                </h3>
                <Badge color={st.color} size="sm" dot>
                  {st.label}
                </Badge>
              </div>
              {req.team?.leaderName && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <UserAvatar
                    src={req.team.leaderAvatarUrl}
                    name={req.team.leaderName}
                    size="xs"
                    shape="circle"
                    tone="blue"
                  />
                  <span>
                    Ketua: <strong className="text-slate-700">{req.team.leaderName}</strong>
                  </span>
                </div>
              )}
              <p className="text-xs text-slate-500">
                {req.team?.competitionName || ''}
                {req.preferredRole ? ` · Peran dilamar: ${req.preferredRole}` : ''}
              </p>
              {req.note && <p className="text-xs text-slate-600 italic">&ldquo;{req.note}&rdquo;</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {req.status === 'menunggu' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  isLoading={cancellingId === req.id}
                  onClick={() => handleCancelRequest(req.id)}
                >
                  Batalkan Pengajuan
                </Button>
              )}
              {req.status === 'disetujui' && hasActiveTeam && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onGoToMyTeam}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  Buka Ruang Tim
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
