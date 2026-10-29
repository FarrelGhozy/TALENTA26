import React from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';

interface CompetitionFilterProps {
  search: string;
  onSearchChange: (val: string) => void;
  category: string;
  onCategoryChange: (val: string) => void;
  categories: string[];
  resultCount?: number;
  onReset?: () => void;
}

export const CompetitionFilter: React.FC<CompetitionFilterProps> = ({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories,
  resultCount,
  onReset,
}) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="cari-kompetisi"
            type="search"
            placeholder="Cari nama kompetisi atau kata kunci..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[40px] transition-all"
            aria-label="Cari kompetisi"
          />
        </div>

        {typeof resultCount === 'number' && (
          <div className="flex items-center gap-2 text-xs text-slate-500" aria-live="polite">
            <span className="font-semibold text-slate-800">{resultCount}</span> kompetisi ditemukan
            {onReset && (search || category !== 'semua') && (
              <button
                onClick={onReset}
                className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-semibold ml-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 scrollbar-none" role="group" aria-label="Filter kategori kompetisi">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 inline-flex items-center gap-1">
          <Filter className="w-3 h-3" />
          Kategori:
        </span>
        <button
          onClick={() => onCategoryChange('semua')}
          aria-pressed={category === 'semua'}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all min-h-[36px] ${
            category === 'semua'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 border border-slate-200/80 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          Semua Kategori
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            aria-pressed={category === cat}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all min-h-[36px] ${
              category === cat
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 border border-slate-200/80 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
};