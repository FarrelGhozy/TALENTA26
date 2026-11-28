import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Hash,
  Info,
  Plus,
  Search,
} from 'lucide-react';
import { Competition } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

interface TeamOnboardingHubProps {
  competition: Competition;
  onCreateNew: () => void;
  onBrowseTeams: () => void;
  onOpenCodeModal: () => void;
  openTeamsCount?: number;
  pendingRequestsCount?: number;
  onViewRequests?: () => void;
  embedded?: boolean;
}

export const TeamOnboardingHub: React.FC<TeamOnboardingHubProps> = ({
  competition,
  onCreateNew,
  onBrowseTeams,
  onOpenCodeModal,
  openTeamsCount,
  pendingRequestsCount = 0,
  onViewRequests,
  embedded = false,
}) => {
  const isClosed = competition.registrationStatus === 'tutup';

  return (
    <div className={embedded ? 'space-y-5' : 'max-w-5xl mx-auto space-y-6'}>
      {!embedded && (
        <>
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link to="/app/beranda" className="hover:text-blue-700 font-medium">
              Beranda
            </Link>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            <Link to="/app/profil" className="hover:text-blue-700 font-medium">
              Profil &amp; Target
            </Link>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            <span aria-current="page" className="text-slate-700 font-bold">
              Cara Mengikuti Lomba
            </span>
          </nav>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Langkah Setelah Profil Selesai
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight mt-1">
                Mau ikut lomba dengan cara apa?
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Kamu sudah memilih kompetisi target. Sekarang pilih cara membentuk atau bergabung
                dengan tim.
              </p>
            </div>
            <Badge color="emerald" size="md" dot>
              Profil &amp; Target Tersimpan
            </Badge>
          </div>
        </>
      )}

      {embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Mau ikut lomba dengan cara apa?
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih salah satu jalur di bawah untuk membentuk tim baru, mengajukan gabung ke tim
              terbuka, atau masuk dengan kode undangan.
            </p>
          </div>
          <Badge color="emerald" size="sm" dot>
            Profil &amp; Target Tersimpan
          </Badge>
        </div>
      )}

      {/* 4-step journey bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" aria-label="Tahapan bergabung lomba">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-bold">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>1. Isi Profil</span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-bold">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>2. Pilih Kompetisi</span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-500 text-blue-900 text-xs font-extrabold ring-1 ring-blue-500/20">
          <span>3. Cara Bergabung</span>
        </div>
        <Link
          to={`/app/kompetisi/${competition.slug}/persiapan`}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
        >
          <span>4. Persiapan</span>
        </Link>
      </div>

      {!embedded && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#10347A] via-[#154194] to-[#1A4DB0] text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-white/15 px-2.5 py-1 rounded-full">
              Target Kompetisi Aktif
            </span>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              {competition.namaResmi}
            </h2>
            <p className="text-xs text-blue-100">
              Kompetisi beregu &middot; Ketentuan {competition.komposisi.min}–
              {competition.komposisi.max} anggota
              {isClosed ? ' · Pendaftaran internal sedang ditutup' : ' · Rekrutmen internal terbuka'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link to={`/app/kompetisi/${competition.slug}/persiapan`}>
              <Button
                size="sm"
                variant="white"
                leftIcon={<BookOpen className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                Lihat Roadmap Awal
              </Button>
            </Link>
          </div>
        </div>
      )}

      {pendingRequestsCount > 0 && onViewRequests && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-amber-950 leading-relaxed">
              Kamu memiliki <strong>{pendingRequestsCount} pengajuan bergabung</strong> yang sedang
              menunggu keputusan ketua tim. Kamu tetap bisa memantau statusnya atau memilih jalur
              lain.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="warning-outline"
            className="shrink-0"
            onClick={onViewRequests}
          >
            Lihat Pengajuan Saya
          </Button>
        </div>
      )}

      {isClosed && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold"
        >
          Pendaftaran / rekrutmen internal untuk kompetisi ini sedang ditutup oleh pengelola lomba.
          Kamu tetap bisa membuka roadmap persiapan atau memilih target kompetisi lain di halaman
          Profil.
        </div>
      )}

      {/* 3 Path Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Path 1: Buat Tim Baru */}
        <button
          type="button"
          disabled={isClosed}
          onClick={onCreateNew}
          className="group text-left p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between gap-5 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Plus className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Buat Tim Baru</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Saya mau jadi ketua tim, menentukan kebutuhan anggota, dan membuka rekrutmen
                terbuka atau privat.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 group-hover:translate-x-0.5 transition-transform">
            <span>Buat Tim</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        </button>

        {/* Path 2: Cari Tim Terbuka */}
        <button
          type="button"
          onClick={onBrowseTeams}
          className="group text-left p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between gap-5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Search className="w-5 h-5" aria-hidden="true" />
              </div>
              {typeof openTeamsCount === 'number' && (
                <Badge color={openTeamsCount > 0 ? 'emerald' : 'slate'} size="sm">
                  {openTeamsCount} Terbuka
                </Badge>
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Cari Tim Terbuka</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Saya belum punya tim. Tampilkan tim {competition.namaResmi} yang sedang mencari
                anggota.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 group-hover:translate-x-0.5 transition-transform">
            <span>Lihat Tim</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        </button>

        {/* Path 3: Sudah Punya Tim */}
        <button
          type="button"
          disabled={isClosed}
          onClick={onOpenCodeModal}
          className="group text-left p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between gap-5 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Hash className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Sudah Punya Tim</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Ketua tim sudah membuat ruang. Saya ingin langsung masuk menggunakan kode undangan
                tim.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 group-hover:translate-x-0.5 transition-transform">
            <span>Masukkan Kode</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        </button>
      </div>

      {/* Info Footer Callout */}
      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900">Alur kolaborasi mandiri:</strong> profil dan target
          lomba telah disimpan. Kamu memilih sendiri salah satu jalur di atas tanpa dipasangkan
          otomatis. Meskipun tim belum lengkap, kamu tetap dapat membuka materi roadmap persiapan
          lebih awal.
        </p>
      </div>
    </div>
  );
};
