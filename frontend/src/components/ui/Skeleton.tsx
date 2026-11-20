import React from 'react';

export const Skeleton: React.FC<{ className?: string; label?: string }> = ({
  className = '',
  label = 'Memuat konten…',
}) => {
  return (
    <div role="status" aria-live="polite" aria-label={label} className={`animate-pulse ${className}`}>
      <div className="bg-slate-200 rounded-lg h-4 w-full" />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export const PageLoading: React.FC<{ message?: string }> = ({ message = 'Memuat…' }) => {
  return (
    <div role="status" aria-live="polite" className="p-8 space-y-3">
      <Skeleton className="max-w-md mx-auto" label={message} />
      <Skeleton className="max-w-sm mx-auto" label={message} />
      <p className="text-center text-xs text-slate-400">{message}</p>
    </div>
  );
};
