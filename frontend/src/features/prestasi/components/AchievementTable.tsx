import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronRight, FileText, Edit3, Users, XCircle } from 'lucide-react';
import { Achievement } from '../../../types';
import { formatDate, formatAchievementCategory, formatAchievementLevel } from '../../../lib/format';
import { AchievementStatusBadge, AchievementTypeBadge } from './StatusBadge';
import { UserAvatar } from '../../../components/ui/UserAvatar';

export const AchievementTable: React.FC<{
  achievements: Achievement[];
  onSelect?: (achievement: Achievement) => void;
  onRevise?: (achievement: Achievement) => void;
  onCancel?: (achievement: Achievement) => void;
  studentDetailBasePath?: string;
  currentUserId?: string;
  showSubmitter?: boolean;
}> = ({
  achievements,
  onSelect,
  onRevise,
  onCancel,
  studentDetailBasePath,
  currentUserId,
  showSubmitter = false,
}) => {
  if (achievements.length === 0) {
    return (
      <div className="text-center py-12 text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/90 p-6 space-y-2">
        <FileText className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="font-semibold text-slate-600">Belum ada riwayat pengajuan prestasi untuk filter ini.</p>
        <p className="text-[11px] text-slate-400">Silakan ubah filter status atau ajukan prestasi mandiri baru.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <caption className="sr-only">Riwayat pengajuan prestasi mahasiswa</caption>
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
            <tr>
              <th scope="col" className="py-3.5 px-4.5">Nama Kegiatan & Penyelenggara</th>
              <th scope="col" className="py-3.5 px-4">Kategori & Tingkat</th>
              <th scope="col" className="py-3.5 px-4">Capaian</th>
              <th scope="col" className="py-3.5 px-4">Tanggal</th>
              <th scope="col" className="py-3.5 px-4">Status Verifikasi</th>
              {(onSelect || onRevise || onCancel || studentDetailBasePath) && (
                <th scope="col" className="py-3.5 px-4 text-right">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {achievements.map((item) => {
              const isRevision = item.status === 'perlu_perbaikan';
              const isApproved = item.status === 'disetujui';

              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    isRevision
                      ? 'bg-amber-50/40 hover:bg-amber-50/70'
                      : isApproved
                      ? 'hover:bg-slate-50/70'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  <td className="py-3.5 px-4.5 font-medium text-slate-900 max-w-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {studentDetailBasePath ? (
                        <Link
                          to={`${studentDetailBasePath}/${item.id}`}
                          className="font-bold text-xs text-slate-900 hover:text-blue-700 leading-snug"
                        >
                          {item.nama}
                        </Link>
                      ) : (
                        <div className="font-bold text-xs text-slate-900 leading-snug">{item.nama}</div>
                      )}
                      {item.participationType === 'kelompok' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          <Users className="w-3 h-3" aria-hidden="true" />
                          Kelompok
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {item.penyelenggara}
                      {item.subCategoryName || item.subCompetitionName
                        ? ` • ${item.subCategoryName || item.subCompetitionName}`
                        : ''}
                    </div>
                    {showSubmitter && item.submitterName && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <UserAvatar
                          src={item.submitterAvatarUrl}
                          name={item.submitterName}
                          size="xs"
                        />
                        <div className="text-[11px] text-slate-600 font-semibold leading-tight min-w-0 truncate">
                          {item.submitterName}
                          {item.submitterNim ? ` (${item.submitterNim})` : ''}
                          {item.submitterProdi ? ` · ${item.submitterProdi}` : ''}
                        </div>
                      </div>
                    )}
                    {item.catatan && (
                      <div className="mt-1.5 text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200/90 flex items-start gap-1.5 shadow-2xs">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <strong className="block text-amber-950">Catatan verifikator:</strong>
                          <span>{item.catatan}</span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{formatAchievementCategory(item.kategori)}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {formatAchievementLevel(item.tingkat)}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <AchievementTypeBadge type={item.jenisCapaian} />
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-medium">
                    <time dateTime={item.tanggal}>{formatDate(item.tanggal)}</time>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <AchievementStatusBadge status={item.status} />
                  </td>
                  {(onSelect || onRevise || onCancel || studentDetailBasePath) && (
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {onSelect && (
                          <button
                            type="button"
                            onClick={() => onSelect(item)}
                            aria-label={`Periksa pengajuan ${item.nama}`}
                            className="font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 hover:border-blue-300 shadow-2xs min-h-[36px] px-3 py-1.5 rounded-xl cursor-pointer inline-flex items-center gap-1 transition-colors text-xs"
                          >
                            Periksa <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {studentDetailBasePath && (
                          <Link
                            to={`${studentDetailBasePath}/${item.id}`}
                            aria-label={`Detail pengajuan ${item.nama}`}
                            className="font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 hover:border-blue-300 shadow-2xs min-h-[36px] px-3 py-1.5 rounded-xl inline-flex items-center gap-1 transition-colors text-xs"
                          >
                            Detail <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </Link>
                        )}
                        {onRevise &&
                          item.status === 'perlu_perbaikan' &&
                          (!currentUserId || item.userId === currentUserId) && (
                          <button
                            type="button"
                            onClick={() => onRevise(item)}
                            aria-label={`Revisi pengajuan ${item.nama}`}
                            className="font-bold text-amber-900 bg-amber-50/90 hover:bg-amber-100 min-h-[36px] px-3 py-1.5 rounded-xl cursor-pointer inline-flex items-center gap-1.5 transition-colors text-xs border border-amber-300 hover:border-amber-400 shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            Revisi
                          </button>
                        )}
                        {onCancel &&
                          item.status === 'menunggu' &&
                          (!currentUserId || item.userId === currentUserId) && (
                          <button
                            type="button"
                            onClick={() => onCancel(item)}
                            aria-label={`Batalkan pengajuan ${item.nama}`}
                            className="font-bold text-rose-700 bg-rose-50/80 hover:bg-rose-100 min-h-[36px] px-3 py-1.5 rounded-xl cursor-pointer inline-flex items-center gap-1 transition-colors text-xs border border-rose-300 hover:border-rose-400 shadow-2xs"
                          >
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            Batalkan
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
