import { assetUrl } from '../../lib/asset';

interface TalentaMarkProps {
  tone?: 'color' | 'light';
  className?: string;
}

/** Identitas Simpul Talenta; teks merek disediakan oleh elemen di sebelahnya. */
export function TalentaMark({ tone = 'color', className = '' }: TalentaMarkProps) {
  return (
    <img
      src={assetUrl(`images/talenta-mark${tone === 'light' ? '-light' : ''}.svg`)}
      alt=""
      aria-hidden="true"
      width={36}
      height={36}
      className={`h-9 w-9 shrink-0 object-contain ${className}`}
    />
  );
}
