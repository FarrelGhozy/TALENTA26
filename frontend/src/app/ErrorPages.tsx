import React from 'react';
import { Link, useRouteError } from 'react-router-dom';
import { Compass, ShieldAlert, AlertTriangle, ArrowRight, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-5 bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xs my-8">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-inner">
        <Compass className="w-8 h-8" />
      </div>
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Halaman Tidak Ditemukan (404)</h1>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Alamat yang kamu tuju tidak ditemukan atau sudah dipindahkan. Gunakan navigasi utama untuk kembali ke alur pembinaan.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5 pt-2">
        <Link to="/">
          <Button size="sm" leftIcon={<Home className="w-3.5 h-3.5" />}>
            Beranda Publik
          </Button>
        </Link>
        <Link to="/kompetisi">
          <Button size="sm" variant="outline">
            Katalog Lomba
          </Button>
        </Link>
      </div>
    </div>
  );
};

export const ForbiddenPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-5 bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xs my-8">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Akses Terbatas (403)</h1>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Peran akun yang aktif saat ini tidak memiliki hak akses ke halaman ini. Silakan ganti peran di login demo atau hubungi pengelola.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5 pt-2">
        <Link to="/masuk">
          <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Pilih Peran Lain
          </Button>
        </Link>
        <Link to="/">
          <Button size="sm" variant="outline">
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
};

export const RouteErrorPage: React.FC = () => {
  const error = useRouteError() as Error | null;
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-5 bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xs my-8">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Terjadi Kendala Memuat Halaman</h1>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          {error?.message || 'Silakan muat ulang halaman atau kembali ke beranda aplikasi.'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5 pt-2">
        <Link to="/">
          <Button size="sm">Kembali ke Beranda</Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Muat Ulang
        </Button>
      </div>
    </div>
  );
};