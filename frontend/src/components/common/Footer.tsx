import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { UscBrand } from './UscBrand';

export const Footer: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const portalPath = currentUser ? (currentRole === 'mahasiswa' ? '/app/beranda' : '/admin') : '/masuk';
  const portalLabel = currentUser ? (currentRole === 'mahasiswa' ? 'Beranda Mahasiswa' : 'Portal Admin') : 'Masuk';
  const linkClass = 'inline-flex min-h-[36px] items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-blue-800';

  return (
    <footer className="mt-20 border-t border-slate-200 bg-[#f5f9fb] text-slate-700">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_0.7fr_1fr] lg:gap-20">
          <div className="space-y-5">
            <UscBrand variant="lockup" tone="dark" size="md" />
            <p className="max-w-md text-sm leading-7 text-slate-600">
              UNIDA Student Championship (USC) adalah ruang pembinaan lomba dan pencatatan prestasi mahasiswa Universitas Darussalam Gontor.
              Temukan peluang, siapkan perjalanan, dan catat capaian bersama USC.
            </p>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900">Jelajahi</h2>
            <ul className="space-y-1">
              <li><Link to="/kompetisi" className={linkClass}>Katalog Lomba</Link></li>
              <li><Link to="/ranking" className={linkClass}>Papan Peringkat</Link></li>
              <li><Link to={portalPath} className={linkClass}>{portalLabel}</Link></li>
              {!currentUser && <li><Link to="/daftar" className={linkClass}>Daftar Mahasiswa</Link></li>}
              <li><a href="https://unida.gontor.ac.id" target="_blank" rel="noopener noreferrer" className={linkClass}>Website UNIDA <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900">Tentang USC</h2>
            <p className="text-sm leading-7 text-slate-600">Prestasi diajukan dengan bukti privat dan melalui proses verifikasi. Identitas mahasiswa pada rilis awal diisi secara mandiri.</p>
          </div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-2 border-t border-slate-200 pt-6 text-xs leading-6 text-slate-500 sm:flex-row">
          <span>UNIDA Student Championship · Universitas Darussalam Gontor</span>
          <span>Untuk generasi khaira ummah berprestasi</span>
        </div>
      </div>
    </footer>
  );
};
