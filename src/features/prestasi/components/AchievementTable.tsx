import React from 'react';
import { Achievement } from '../../../types';
import { formatDate, formatAchievementCategory, formatAchievementLevel } from '../../../lib/format';
import { AchievementStatusBadge, AchievementTypeBadge } from './StatusBadge';

export const AchievementTable: React.FC<{
  achievements: Achievement[];
  onSelect?: (achievement: Achievement) => void;
}> = ({ achievements, onSelect }) => {
  if (achievements.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
        Belum ada riwayat pengajuan prestasi untuk filter ini.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-xs">
        <caption className="sr-only">Riwayat pengajuan prestasi mahasiswa</caption>
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
          <tr>
            <th scope="col" className="py-3 px-4">Nama Kegiatan</th>
            <th scope="col" className="py-3 px-4">Kategori & Tingkat</th>
            <th scope="col" className="py-3 px-4">Capaian</th>
            <th scope="col" className="py-3 px-4">Tanggal</th>
            <th scope="col" className="py-3 px-4">Status Verifikasi</th>
            {onSelect && <th scope="col" className="py-3 px-4 text-right">Aksi</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {achievements.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
              <td className="py-3 px-4 font-medium text-slate-900">
                <div>{item.nama}</div>
                <div className="text-[10px] text-slate-400">{item.penyelenggara}</div>
                {item.catatan && (
                  <div className="mt-1 text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                    <strong>Catatan Verifikator:</strong> {item.catatan}
                  </div>
                )}
              </td>
              <td className="py-3 px-4">
                <div>{formatAchievementCategory(item.kategori)}</div>
                <div className="text-[10px] text-slate-400">{formatAchievementLevel(item.tingkat)}</div>
              </td>
              <td className="py-3 px-4">
                <AchievementTypeBadge type={item.jenisCapaian} />
              </td>
              <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                <time dateTime={item.tanggal}>{formatDate(item.tanggal)}</time>
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                <AchievementStatusBadge status={item.status} />
              </td>
              {onSelect && (
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <button
                    onClick={() => onSelect(item)}
                    aria-label={`Periksa pengajuan ${item.nama}`}
                    className="font-bold text-blue-700 hover:text-blue-900 min-h-[36px] px-2.5 py-1 rounded-lg hover:bg-blue-50 cursor-pointer"
                  >
                    Periksa →
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
