import React from 'react';
import { Search, RotateCcw, Filter, ChevronDown } from 'lucide-react';

interface CompetitionFilterProps {
  search: string;
  onSearchChange: (val: string) => void;
  category: string;
  onCategoryChange: (val: string) => void;
  categories: string[];
  level?: string;
  onLevelChange?: (val: string) => void;
  format?: string;
  onFormatChange?: (val: string) => void;
  resultCount?: number;
  onReset?: () => void;
}

export const CompetitionFilter: React.FC<CompetitionFilterProps> = ({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories,
  level = 'semua',
  onLevelChange,
  format = 'semua',
  onFormatChange,
  resultCount,
  onReset,
}) => {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search aria-hidden="true" className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="cari-kompetisi"
            type="search"
            placeholder="Cari nama atau kata kunci..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-base rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[48px] transition-all"
            aria-label="Cari kompetisi"
          />
        </div>

        {typeof resultCount === 'number' && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600" aria-live="polite">
            <span className="font-semibold text-slate-800">{resultCount}</span> kompetisi ditemukan
            {onReset && (search || category !== 'semua' || level !== 'semua' || format !== 'semua') && (
              <button
                onClick={onReset}
                className="inline-flex items-center gap-1 min-h-[44px] px-2 rounded-lg text-blue-700 hover:bg-blue-50 hover:text-blue-900 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full" role="group" aria-label="Filter kategori kompetisi">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mr-1 inline-flex items-center gap-1">
          <Filter aria-hidden="true" className="w-4 h-4" />
          Kategori:
        </span>
        <button
          onClick={() => onCategoryChange('semua')}
          aria-pressed={category === 'semua'}
          className={`px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer transition-all min-h-[44px] ${
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
            className={`max-w-full px-3 py-2 rounded-xl text-sm text-left font-semibold whitespace-normal break-words cursor-pointer transition-all min-h-[44px] ${
              category === cat
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 border border-slate-200/80 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {(onLevelChange || onFormatChange) && (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-sm">
          {onLevelChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Tingkat:</span>
              <div className="relative">
                <select
                  aria-label="Filter tingkat lomba"
                  value={level}
                  onChange={(e) => onLevelChange(e.target.value)}
                  className="appearance-none pl-3 pr-9 py-2 rounded-xl border border-slate-300 bg-slate-50 min-h-[44px] text-sm font-semibold text-slate-800"
                >
                  <option value="semua">Semua Tingkat</option>
                  <option value="lokal">Lokal</option>
                  <option value="nasional">Nasional</option>
                  <option value="internasional">Internasional</option>
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          )}
          {onFormatChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Format:</span>
              <div className="relative">
                <select
                  aria-label="Filter format lomba"
                  value={format}
                  onChange={(e) => onFormatChange(e.target.value)}
                  className="appearance-none pl-3 pr-9 py-2 rounded-xl border border-slate-300 bg-slate-50 min-h-[44px] text-sm font-semibold text-slate-800"
                >
                  <option value="semua">Semua Format</option>
                  <option value="individu">Individu</option>
                  <option value="beregu">Beregu</option>
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
