import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'white' | 'outline-white';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-bold transition-all duration-150 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98] select-none';

  const variants = {
    primary:
      'bg-blue-700 text-white shadow-sm hover:bg-blue-800 hover:shadow-md hover:shadow-blue-600/20 focus-visible:ring-blue-600',
    secondary:
      'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/90 focus-visible:ring-slate-400',
    outline:
      'border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900 focus-visible:ring-blue-500 shadow-2xs',
    ghost:
      'text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-300',
    danger:
      'bg-rose-600 text-white shadow-sm hover:bg-rose-700 hover:shadow-md hover:shadow-rose-500/20 focus-visible:ring-rose-500',
    success:
      'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20 focus-visible:ring-emerald-500',
    white:
      'bg-white text-blue-900 hover:bg-blue-50 border border-slate-200/60 shadow-md focus-visible:ring-white',
    'outline-white':
      'border-2 border-white/90 bg-white/10 text-white hover:bg-white hover:text-blue-950 focus-visible:ring-white shadow-xs backdrop-blur-xs',
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5 min-h-[36px]',
    md: 'text-sm px-4.5 py-2 gap-2 min-h-[40px]',
    lg: 'text-base px-5.5 py-2.5 gap-2.5 min-h-[46px]',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      aria-disabled={disabled || isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0"
        />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};