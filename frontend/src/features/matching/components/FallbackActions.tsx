import React from 'react';
import { Link } from 'react-router-dom';

export const FallbackActions: React.FC = () => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-3 mt-4">
      <div aria-hidden="true" className="text-2xl">🤝</div>
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
        <a
          href="https://wa.me/628120000001?text=Halo%20Admin%20TALENTA,%20saya%20butuh%20bantuan%20mencari%20tim"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 min-h-[40px]"
        >
          Hubungi Admin Pembinaan
        </a>
      </div>
      <p className="text-[11px] text-slate-400">Butuh bantuan? Hubungi admin via WhatsApp di atas.</p>
    </div>
  );
};
