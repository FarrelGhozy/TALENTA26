import React from 'react';
import { UserMinus } from 'lucide-react';
import { TeamMember } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { UserAvatar } from '../../../components/ui/UserAvatar';

interface MemberListProps {
  members: TeamMember[];
  leaderId?: string;
  currentUserId: string;
  isLeader?: boolean;
  isLocked?: boolean;
  removingUserId?: string | null;
  onRemoveMember?: (targetUserId: string, name: string) => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  leaderId,
  currentUserId,
  isLeader = false,
  isLocked = false,
  removingUserId = null,
  onRemoveMember,
}) => {
  return (
    <ul className="space-y-2.5">
      {members.map((m, idx) => {
        const isMe = m.userId === currentUserId;
        const memberIsLeader = leaderId ? m.userId === leaderId : idx === 0;
        const displayName = m.nama || 'Mahasiswa';
        const primaryRole = m.roleInTeam || (memberIsLeader ? 'Ketua Tim' : 'Anggota');
        const extraRoles = (m.peranBisa || []).filter(
          (r) => r.toLowerCase() !== primaryRole.toLowerCase()
        );
        const subMeta = [primaryRole, m.prodi, ...extraRoles.slice(0, 2)]
          .filter(Boolean)
          .join(' · ');

        return (
          <li
            key={m.userId}
            className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar
                src={m.avatarUrl}
                name={displayName}
                size="md"
                shape="circle"
                tone={memberIsLeader ? 'blue' : 'emerald'}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h4 className="text-xs font-extrabold text-slate-900 truncate">
                    {displayName}
                  </h4>
                  {isMe && (
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                      Saya
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{subMeta}</p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
              <Badge color={memberIsLeader ? 'emerald' : 'slate'} size="sm">
                {memberIsLeader ? 'Ketua' : 'Aktif'}
              </Badge>
              {isLeader && !memberIsLeader && !isLocked && onRemoveMember && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 px-2"
                  isLoading={removingUserId === m.userId}
                  onClick={() => onRemoveMember(m.userId, displayName)}
                  aria-label={`Keluarkan ${displayName} dari tim`}
                  title={`Keluarkan ${displayName}`}
                >
                  <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
