import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ShieldCheck, Heart, ExternalLink, GraduationCap } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-16 pt-12 pb-8 text-slate-500 text-xs">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <img
                src="/images/logo-icon.png"
                alt="Logo TALENTA UNIDA Gontor"
                className="w-8 h-8 rounded-xl shadow-xs object-cover border border-blue-900/10"
              />
              <span className="font-black text-blue-950 tracking-tight text-base">
                TALENTA UNIDA Gontor
              </span>
              <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-200/80">
                2026
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              Platform pembinaan dan pendataan prestasi mahasiswa Universitas Darussalam Gontor. Mengintegrasikan pemetaan potensi talenta, pembentukan tim komplementer, roadmap persiapan mandiri, dan verifikasi capaian resmi Belmawa.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Sesuai Standar Belmawa Kemendikbudristek & Simkatmawa
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Navigasi Cepat
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/kompetisi" className="hover:text-blue-700 transition-colors inline-flex items-center gap-1.5 font-medium">
                  <Trophy className="w-3.5 h-3.5 text-blue-600" />
                  Katalog Kompetisi Belmawa
                </Link>
              </li>
              <li>
                <Link to="/masuk" className="hover:text-blue-700 transition-colors inline-flex items-center gap-1.5 font-medium">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                  Pilih Role Demo & Masuk
                </Link>
              </li>
              <li>
                <a
                  href="https://unida.gontor.ac.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-700 transition-colors inline-flex items-center gap-1.5 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  Website Resmi UNIDA Gontor
                </a>
              </li>
            </ul>
          </div>

          {/* Ethics / Principles */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Nilai & Prinsip
            </h4>
            <ul className="space-y-1.5 text-[11px] text-slate-500 leading-relaxed">
              <li>• Menjunjung tinggi nilai keislaman, keikhlasan, dan kesungguhan (*Mujahadah*).</li>
              <li>• Rekomendasi tim bersifat objektif untuk melengkapi keahlian antar-fakultas.</li>
              <li>• Seluruh berkas prestasi diverifikasi otentisitasnya oleh pihak universitas.</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <div>
            © 2026 Universitas Darussalam Gontor — TALENTA Pembinaan Mahasiswa.
          </div>
          <div className="flex items-center gap-1">
            Untuk generasi khaira ummah berprestasi <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline ml-0.5" />
          </div>
        </div>
      </div>
    </footer>
  );
};