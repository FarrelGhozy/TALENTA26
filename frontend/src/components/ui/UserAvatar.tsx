import React, { useEffect, useState } from 'react';
import { assetUrl } from '../../lib/asset';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'rounded';
export type AvatarTone = 'blue' | 'amber' | 'slate' | 'emerald' | 'orange';

interface UserAvatarProps {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  tone?: AvatarTone;
  className?: string;
  decorative?: boolean;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

const TONE_CLASSES: Record<AvatarTone, string> = {
  blue: 'bg-blue-700 text-white border-blue-200',
  amber: 'bg-amber-600 text-white border-amber-300',
  slate: 'bg-slate-700 text-white border-slate-300',
  emerald: 'bg-emerald-700 text-white border-emerald-200',
  orange: 'bg-orange-600 text-white border-orange-200',
};

export function getUserInitials(name?: string): string {
  if (!name || !name.trim()) return 'MH';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = 'md',
  shape = 'circle',
  tone = 'blue',
  className = '',
  decorative = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
  const baseClass = `shrink-0 border object-cover ${SIZE_CLASSES[size]} ${shapeClass}`;

  if (src && !imgFailed) {
    return (
      <img
        src={assetUrl(src)}
        alt={decorative ? '' : `Foto profil ${name}`}
        aria-hidden={decorative ? true : undefined}
        loading="lazy"
        onError={() => setImgFailed(true)}
        className={`${baseClass} border-slate-200 bg-slate-100 ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `Inisial ${name}`}
      className={`${baseClass} ${TONE_CLASSES[tone]} font-black inline-flex items-center justify-center select-none ${className}`}
    >
      {getUserInitials(name)}
    </div>
  );
};
