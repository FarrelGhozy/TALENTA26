import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, helper, id, className = '', ...props }) => {
  const inputId = id || props.name;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helper && !error ? `${inputId}-helper` : undefined;

  return (
    <div className="w-full space-y-1">
      {label ? (
        <label htmlFor={inputId} className="block text-xs font-bold text-slate-700">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={errorId || helperId}
        className={`w-full rounded-xl border px-3.5 py-2.5 min-h-[42px] text-xs text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 ${
          error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50/60 focus:bg-white'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-rose-600 font-medium">{error}</p>
      ) : helper ? (
        <p id={helperId} className="text-[11px] text-slate-400">{helper}</p>
      ) : null}
    </div>
  );
};