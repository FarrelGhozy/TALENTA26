import React from 'react';
import { AlertCircle, ChevronRight, FileText } from 'lucide-react';
import { Achievement } from '../../../types';
import { formatDate, formatAchievementCategory, formatAchievementLevel } from '../../../lib/format';
import { AchievementStatusBadge, AchievementTypeBadge } from './StatusBadge';

export const AchievementTable: React.FC<{
  achievements: Achievement[];
  onSelect?: (achievement: Achievement) => void;
}> = ({ achievements, onSelect }) => {
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
              {onSelect && <th scope="col" className="py-3.5 px-4 text-right">Aksi</th>}
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
                    <div className="font-bold text-xs text-slate-900 leading-snug">{item.nama}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.penyelenggara}</div>
                    {item.catatan && (
                      <div className="mt-1.5 text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200/90 flex items-start gap-1.5 shadow-2xs">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-amber-950">Catatan Verifikator BAAK:</strong>
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
                  {onSelect && (
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelect(item)}
                        aria-label={`Periksa pengajuan ${item.nama}`}
                        className="font-extrabold text-blue-700 hover:text-blue-900 min-h-[36px] px-3 py-1.5 rounded-xl hover:bg-blue-50 cursor-pointer inline-flex items-center gap-1 transition-colors"
                      >
                        Periksa <ChevronRight className="w-3.5 h-3.5" />
                      </button>
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
