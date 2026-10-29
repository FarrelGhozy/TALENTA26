import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ShieldCheck, Heart, ExternalLink, GraduationCap } from 'lucide-react';

export const Footer: React.FC = () => {
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
              <img
                src="/images/logo-icon.png"
                alt="Logo TALENTA UNIDA Gontor"
                className="w-9 h-9 rounded-xl shadow-md object-cover border border-white/20"
              />
              <span className="font-black text-white tracking-tight text-lg">
                TALENTA UNIDA Gontor
              </span>
              <span className="text-[10px] bg-blue-500/25 text-sky-300 font-bold px-2 py-0.5 rounded border border-blue-400/40">
                2026
              </span>
            </div>
            <p className="text-xs text-slate-300/90 leading-relaxed max-w-md">
              Platform pembinaan dan pendataan prestasi mahasiswa Universitas Darussalam Gontor. Mengintegrasikan pemetaan potensi talenta, pembentukan tim komplementer, roadmap persiapan mandiri, dan verifikasi capaian resmi Belmawa.
            </p>
            <div className="flex items-center gap-2 text-xs text-sky-200 font-semibold bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-700/50 w-fit backdrop-blur-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              Sesuai Standar Belmawa Kemendikbudristek & Simkatmawa
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              Navigasi Cepat
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  to="/kompetisi"
                  className="hover:text-white text-slate-300 transition-colors inline-flex items-center gap-2 font-medium group"
                >
                  <Trophy className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
                  Katalog Kompetisi Belmawa
                </Link>
              </li>
              <li>
                <Link
                  to="/masuk"
                  className="hover:text-white text-slate-300 transition-colors inline-flex items-center gap-2 font-medium group"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
                  Pilih Role Demo & Masuk
                </Link>
              </li>
              <li>
                <a
                  href="https://unida.gontor.ac.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white text-slate-300 transition-colors inline-flex items-center gap-2 font-medium group"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
                  Website Resmi UNIDA Gontor
                </a>
              </li>
            </ul>
          </div>

          {/* Ethics / Principles */}
          <div className="space-y-4">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              Nilai & Prinsip
            </h4>
            <ul className="space-y-2 text-xs text-slate-300/80 leading-relaxed">
              <li>• Menjunjung tinggi nilai keislaman, keikhlasan, dan kesungguhan (*Mujahadah*).</li>
              <li>• Rekomendasi tim bersifat objektif untuk melengkapi keahlian antar-fakultas.</li>
              <li>• Seluruh berkas prestasi diverifikasi otentisitasnya oleh pihak universitas.</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-900/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © 2026 Universitas Darussalam Gontor — TALENTA Pembinaan Mahasiswa.
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Untuk generasi khaira ummah berprestasi</span>
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
};