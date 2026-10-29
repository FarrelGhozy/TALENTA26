import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'slate' | 'indigo' | 'emerald' | 'amber' | 'orange' | 'rose' | 'purple' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  color = 'slate',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const colors = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200/80',
    indigo: 'bg-blue-50/90 text-blue-800 border-blue-200/80',
    emerald: 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80',
    amber: 'bg-amber-50/90 text-amber-800 border-amber-200/80',
    orange: 'bg-orange-50/90 text-orange-800 border-orange-200/80',
    rose: 'bg-rose-50/90 text-rose-800 border-rose-200/80',
    purple: 'bg-sky-50/90 text-blue-800 border-blue-200/80',
    blue: 'bg-blue-50/90 text-blue-800 border-blue-200/80',
  };

  const dotColors = {
    slate: 'bg-slate-400',
    indigo: 'bg-blue-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    orange: 'bg-orange-500',
    rose: 'bg-rose-500',
    purple: 'bg-blue-600',
    blue: 'bg-blue-600',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs font-semibold px-2.5 py-0.5',
    lg: 'text-sm font-semibold px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-2xs select-none tracking-tight ${colors[color]} ${sizes[size]} ${className}`}
      {...props}
    >
      {dot && <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[color]}`} />}
      {children}
    </span>
  );
};