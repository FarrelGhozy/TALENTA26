import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, GraduationCap, LockKeyhole, Medal, Trophy } from 'lucide-react';
import { TalentaMark } from './TalentaMark';

const footerLinks = [
  { to: '/kompetisi', label: 'Katalog Lomba', icon: Trophy },
  { to: '/ranking', label: 'Ranking Prestasi', icon: Medal },
  { to: '/masuk', label: 'Masuk ke Portal', icon: GraduationCap },
];

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-slate-800 bg-[#0B1428] px-4 pb-8 pt-12 text-slate-300 sm:px-6 sm:pt-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-4 lg:gap-16">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <TalentaMark tone="light" />
              <span className="text-base font-extrabold tracking-tight text-white sm:text-lg">
                TALENTA UNIDA Gontor
              </span>
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400">
              Ruang pembinaan lomba dan pengelolaan prestasi mahasiswa Universitas Darussalam
              Gontor. Temukan peluang, siapkan diri atau tim, dan catat capaianmu.
            </p>
            <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-blue-200">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              Berkas bukti prestasi bersifat privat.
            </p>
          </div>
          <nav aria-label="Navigasi footer">
            <h2 className="text-xs font-bold uppercase tracking-widest text-white">
              Jelajahi TALENTA
            </h2>
            <ul className="mt-4">
              {footerLinks.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-300 transition-colors hover:text-white"
                  >
                    <item.icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-white">
              Pembinaan yang terarah
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-slate-400">
              {[
                'Informasi lomba dikelola validator.',
                'Roadmap mengikuti kebutuhan lomba.',
                'Capaian ditinjau oleh validator.',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-blue-300" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="https://unida.gontor.ac.id"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-blue-200 hover:text-white"
            >
              Website UNIDA Gontor
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs leading-relaxed text-slate-400">
          <p>TALENTA — Dari potensi, menuju prestasi.</p>
          <p>Untuk generasi khaira ummah berprestasi.</p>
        </div>
      </div>
    </footer>
  );
};
