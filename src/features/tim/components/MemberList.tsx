import React from 'react';
import { User, TeamMember } from '../../../types';
import { Badge } from '../../../components/ui/Badge';

interface MemberListProps {
  members: TeamMember[];
  allUsers: User[];
  currentUserId: string;
}

export const MemberList: React.FC<MemberListProps> = ({ members, allUsers, currentUserId }) => {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">
          Susunan Anggota Tim ({members.length})
        </h3>
        <span className="text-[11px] text-slate-400">
          Status aktif terkonfirmasi
        </span>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {members.map((m, idx) => {
          const user = allUsers.find((u) => u.id === m.userId);
          const isMe = m.userId === currentUserId;
          const isLeader = idx === 0;

          return (
            <li
              key={m.userId}
              className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.nama}
                      className="w-10 h-10 shrink-0 rounded-2xl object-cover border border-slate-200 shadow-xs"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-900 text-white font-black text-xs flex items-center justify-center shadow-xs"
                    >
                      {user ? user.nama.substring(0, 2).toUpperCase() : '??'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {user?.nama || m.userId}
                      </h4>
                      {isMe && (
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                          Saya
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {user?.prodi || 'Mahasiswa'} • Angkatan {user?.angkatan || '-'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1">
                  {isLeader && (
                    <Badge color="amber" size="sm" dot title="Ketua Tim">
                      Ketua
                    </Badge>
                  )}
                  <Badge color={m.status === 'diterima' ? 'emerald' : 'amber'} size="sm">
                    {m.status === 'diterima' ? 'Aktif' : 'Menunggu'}
                  </Badge>
                </div>
              </div>

              {user && (
                <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-slate-100">
                  {user.peranBisa.slice(0, 3).map((r) => (
                    <Badge key={r} color="blue" size="sm" className="capitalize">
                      {r}
                    </Badge>
                  ))}
                  {user.skill.slice(0, 2).map((s) => (
                    <Badge key={s.nama} color="emerald" size="sm">
                      {s.nama} · Lv{s.level}
                    </Badge>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};