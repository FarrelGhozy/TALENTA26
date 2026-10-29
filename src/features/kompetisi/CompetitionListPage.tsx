import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Competition } from '../../types';
import { competitionService } from '../../services/factory';
import { CompetitionCard } from './components/CompetitionCard';
import { CompetitionFilter } from './components/CompetitionFilter';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoading } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';

export const CompetitionListPage: React.FC = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('semua');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    competitionService
      .getAll()
      .then((data) => {
        if (cancelled) return;
        setCompetitions(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Gagal memuat katalog kompetisi. Coba muat ulang.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = Array.from(new Set(competitions.map((c) => c.kategori)));

  const filtered = competitions.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.namaResmi.toLowerCase().includes(q) || c.deskripsi.toLowerCase().includes(q);
    const matchCat = category === 'semua' || c.kategori === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Kurikulum Pembinaan Nasional
          </span>
          <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
            Tahun 2026
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          Katalog Kompetisi Pembinaan Mahasiswa
        </h1>
        <p className="text-xs text-slate-500 mt-1" aria-live="polite">
          {loading ? 'Memuat daftar kompetisi…' : `${filtered.length} dari ${competitions.length} kompetisi Belmawa siap diikuti.`}
        </p>
      </div>

      <CompetitionFilter
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        resultCount={filtered.length}
        onReset={() => {
          setSearch('');
          setCategory('semua');
        }}
      />

      {loading ? (
        <PageLoading message="Memuat katalog kompetisi..." />
      ) : error ? (
        <div className="p-12 text-center space-y-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <p role="alert" className="text-xs text-rose-600 font-semibold">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Muat Ulang Halaman
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-8 h-8 text-blue-700" />}
          title="Tidak Ada Kompetisi yang Sesuai"
          description="Coba ubah kata kunci pencarian atau pilih kategori lain untuk melihat daftar kompetisi."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearch('');
                setCategory('semua');
              }}
            >
              Reset Filter Pencarian
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((comp) => (
            <CompetitionCard key={comp.slug} competition={comp} />
          ))}
        </div>
      )}
    </div>
  );
};