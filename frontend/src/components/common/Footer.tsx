import React from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  GraduationCap,
  Heart,
  Medal,
  ShieldCheck,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { TalentaMark } from './TalentaMark';

export const Footer: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const portalPath = currentUser
    ? currentRole === 'mahasiswa'
      ? '/app/beranda'
      : '/admin'
    : '/masuk';
  const portalLabel = currentUser
    ? currentRole === 'mahasiswa'
      ? 'Buka Beranda Mahasiswa'
      : 'Buka Portal Admin'
    : 'Masuk';

  return (
    <footer className="bg-gradient-to-b from-[#081226] via-[#060e20] to-[#040814] text-slate-300 border-t border-blue-900/60 mt-20 pt-16 pb-10 relative overflow-hidden">
      {/* Ambient Blue Background Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <TalentaMark tone="light" />
              <span className="font-black text-white tracking-tight text-lg">
                TALENTA UNIDA Gontor
              </span>
            </div>
            <p className="text-xs text-slate-300/90 leading-relaxed max-w-md">
              Platform pembinaan dan pendataan prestasi mahasiswa Universitas Darussalam Gontor. Menghubungkan katalog lomba, rekrutmen tim terbuka &amp; kode undangan, roadmap persiapan mandiri, serta pencatatan capaian prestasi terverifikasi.
            </p>
            <div className="flex items-center gap-2 text-xs text-sky-200 font-semibold bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-700/50 w-fit backdrop-blur-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              Sistem Pembinaan dan Pencatatan Prestasi Kampus
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h2 className="font-bold text-white text-xs uppercase tracking-wider">
              Navigasi Cepat
            </h2>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  to="/kompetisi"
                  className="hover:text-white text-slate-300 transition-colors inline-flex items-center gap-2 font-medium py-0.5 group"
                >
                  <Trophy className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" aria-hidden="true" />
                  Katalog Kompetisi
                </Link>
              </li>
              <li>
                <Link
                  to="/ranking"
                  className="hover:text-white text-slate-300 transition-colors inline-flex items-center gap-2 font-medium py-0.5 group"
                >
                  <Medal className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" aria-hidden="true" />
                  Papan Peringkat
                </Link>
              </li>
              <li>
                <Link
                  to={portalPath}
                  className="hover:text-white text-slate-300 transition-colors inline-flex items-center gap-2 font-medium py-0.5 group"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" aria-hidden="true" />
                  {portalLabel}
                </Link>
              </li>
              {!currentUser && (
                <li>
                  <Link
                    to="/daftar"
                    className="hover:text-white text-slate-300 transition-colors inline-flex items-center gap-2 font-medium py-0.5 group"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" aria-hidden="true" />
                    Daftar Akun Mahasiswa
                  </Link>
                </li>
              )}
              <li>
                <a
                  href="https://unida.gontor.ac.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white text-slate-300 transition-colors inline-flex items-center gap-2 font-medium py-0.5 group"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" aria-hidden="true" />
                  Website Resmi UNIDA Gontor
                </a>
              </li>
            </ul>
          </div>

          {/* Ethics / Principles */}
          <div className="space-y-4">
            <h2 className="font-bold text-white text-xs uppercase tracking-wider">
              Nilai &amp; Prinsip
            </h2>
            <ul className="space-y-2 text-xs text-slate-300/85 leading-relaxed">
              <li>• Menjunjung tinggi nilai keislaman, keikhlasan, dan kesungguhan (<em>Mujahadah</em>).</li>
              <li>• Pembentukan tim melalui rekrutmen terbuka dan kode undangan yang dikelola ketua tim.</li>
              <li>• Pengesahan prestasi diverifikasi secara transparan oleh validator kampus; dokumen bukti tetap privat.</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-900/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            TALENTA — Pembinaan Mahasiswa. Identitas pendaftar bersifat isian mandiri kampus.
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Untuk generasi khaira ummah berprestasi</span>
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 inline" aria-hidden="true" />
          </div>
        </div>
      </div>
    </footer>
  );
};
