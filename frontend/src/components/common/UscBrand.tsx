import React from 'react';
import { assetUrl } from '../../lib/asset';

export type UscBrandVariant =
  | 'responsive-nav'
  | 'lockup'
  | 'compact'
  | 'stacked'
  | 'emblem';

export interface UscBrandProps {
  /** Tata letak identitas sesuai ruang yang tersedia. */
  variant?: UscBrandVariant;
  /** 'dark' untuk latar terang (tinta navy), 'light' untuk latar gelap (tinta putih + medalion emblem). */
  tone?: 'dark' | 'light';
  /** Skala ukuran komponen. */
  size?: 'sm' | 'md' | 'lg';
  /** Lencana opsional di samping singkatan USC (mis. "Admin"). */
  badge?: string;
  /** Subjudul opsional untuk varian compact atau stacked. */
  subtitle?: string;
  /** Prioritaskan pemuatan untuk logo above-the-fold (navbar). */
  priority?: boolean;
  className?: string;
}

const EMBLEM_SIZES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

const WORDMARK_SIZES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-6',
  md: 'h-7 sm:h-8',
  lg: 'h-9 sm:h-10',
};

const EmblemPicture: React.FC<{
  tone: 'dark' | 'light';
  sizeClass: string;
  useLarge?: boolean;
  priority?: boolean;
}> = ({ tone, sizeClass, useLarge = false, priority = false }) => {
  const webpSrc = assetUrl(useLarge ? 'images/usc-emblem-512.webp' : 'images/usc-emblem.webp');
  const pngSrc = assetUrl(useLarge ? 'images/usc-emblem-512.png' : 'images/usc-emblem.png');
  const dim = useLarge ? 512 : 192;

  const img = (
    <picture className="block h-full w-full">
      <source srcSet={webpSrc} type="image/webp" />
      <img
        src={pngSrc}
        alt=""
        aria-hidden="true"
        width={dim}
        height={dim}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        className="h-full w-full object-contain select-none"
      />
    </picture>
  );

  // Pada latar gelap, beri medalion terang tipis agar bagian navy 3D emblem tetap kontras 100%.
  if (tone === 'light') {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-white/95 p-1 shadow-xs ring-1 ring-blue-200/70 ${sizeClass}`}
      >
        {img}
      </span>
    );
  }

  return <span className={`inline-flex shrink-0 items-center justify-center ${sizeClass}`}>{img}</span>;
};

const WordmarkPicture: React.FC<{
  tone: 'dark' | 'light';
  heightClass: string;
  priority?: boolean;
}> = ({ tone, heightClass, priority = false }) => {
  const base = tone === 'light' ? 'images/usc-wordmark-light' : 'images/usc-wordmark-dark';

  return (
    <picture className="block shrink-0">
      <source srcSet={assetUrl(`${base}.webp`)} type="image/webp" />
      <img
        src={assetUrl(`${base}.png`)}
        alt=""
        aria-hidden="true"
        width={408}
        height={83}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        className={`${heightClass} w-auto object-contain select-none`}
      />
    </picture>
  );
};

/**
 * Identitas resmi aplikasi UNIDA Student Championship (USC).
 * Memakai pasangan <picture> WebP + PNG dari master resmi serta teks aksesibel `sr-only`.
 */
export const UscBrand: React.FC<UscBrandProps> = ({
  variant = 'lockup',
  tone = 'dark',
  size = 'md',
  badge,
  subtitle,
  priority = false,
  className = '',
}) => {
  if (variant === 'emblem') {
    return (
      <span className={`inline-flex items-center justify-center ${className}`}>
        <EmblemPicture
          tone={tone}
          sizeClass={EMBLEM_SIZES[size]}
          useLarge={size === 'lg'}
          priority={priority}
        />
      </span>
    );
  }

  if (variant === 'stacked') {
    return (
      <div className={`inline-flex flex-col items-center gap-3 ${className}`}>
        <EmblemPicture tone={tone} sizeClass={EMBLEM_SIZES.lg} useLarge priority={priority} />
        <WordmarkPicture tone={tone} heightClass={WORDMARK_SIZES[size]} priority={priority} />
        <span className="sr-only">UNIDA Student Championship (USC)</span>
        {subtitle && (
          <span
            className={`text-xs font-semibold tracking-wide ${
              tone === 'light' ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            {subtitle}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}>
        <EmblemPicture tone={tone} sizeClass={EMBLEM_SIZES[size]} priority={priority} />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight text-sm sm:text-base leading-none ${
                tone === 'light' ? 'text-white' : 'text-blue-950'
              }`}
            >
              USC
            </span>
            {badge && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70">
                {badge}
              </span>
            )}
          </span>
          <span
            className={`text-[10px] font-semibold block truncate mt-1 leading-tight ${
              tone === 'light' ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            {subtitle || 'UNIDA Student Championship'}
          </span>
        </span>
      </span>
    );
  }

  if (variant === 'responsive-nav') {
    return (
      <span className={`inline-flex items-center gap-2.5 sm:gap-3 min-w-0 ${className}`}>
        <EmblemPicture tone={tone} sizeClass="h-9 w-9 sm:h-10 sm:w-10" priority={priority} />
        {/* Mobile (< sm): ringkas USC + UNIDA Gontor agar tidak sempit/overflow */}
        <span className="sm:hidden min-w-0">
          <span
            className={`font-black tracking-tight block text-base leading-none ${
              tone === 'light' ? 'text-white' : 'text-blue-950'
            }`}
          >
            USC
          </span>
          <span
            className={`text-[10px] font-semibold block leading-tight mt-0.5 truncate ${
              tone === 'light' ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            UNIDA Gontor
          </span>
        </span>
        {/* Tablet & Desktop (>= sm): Wordmark grafis penuh transparan */}
        <span className="hidden sm:inline-flex items-center">
          <WordmarkPicture tone={tone} heightClass="h-7 lg:h-[30px]" priority={priority} />
        </span>
        <span className="sr-only">UNIDA Student Championship (USC)</span>
      </span>
    );
  }

  // Default: variant === 'lockup' (Emblem + Wordmark grafis penuh)
  return (
    <span className={`inline-flex items-center gap-3 min-w-0 ${className}`}>
      <EmblemPicture tone={tone} sizeClass={EMBLEM_SIZES[size]} priority={priority} />
      <WordmarkPicture tone={tone} heightClass={WORDMARK_SIZES[size]} priority={priority} />
      <span className="sr-only">UNIDA Student Championship (USC)</span>
    </span>
  );
};
