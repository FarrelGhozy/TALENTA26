import React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export const FallbackActions: React.FC = () => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-3 mt-4">
      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mx-auto">
        <Users className="w-5 h-5" aria-hidden="true" />
      </div>
      <h4 className="text-sm font-bold text-slate-800">Belum Menemukan Rekan Tim yang Cocok?</h4>
      <p className="text-xs text-slate-500 max-w-md mx-auto">
        Coba langkah alternatif berikut agar persiapan kompetisimu tetap berjalan lancar:
      </p>

      <div className="flex flex-wrap justify-center gap-2 pt-1">
        <Link
          to="/app/profil"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 min-h-[40px]"
        >
          Sesuaikan Jadwal / Peran
        </Link>
        <Link
          to="/kompetisi"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 min-h-[40px]"
        >
          Pilih Target Lomba Lain
        </Link>
        <Link
          to="/app/tim"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 min-h-[40px]"
        >
          Buat Tim Manual & Undang Nanti
        </Link>
      </div>
      <p className="text-[11px] text-slate-400">
        Butuh arahan pembina? Cek kontak konsultan terkurasi pada halaman Ruang Persiapan lomba target Anda.
      </p>
    </div>
  );
};
