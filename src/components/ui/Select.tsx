import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({ label, error, options, id, className = '', ...props }) => {
  const selectId = id || props.name;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="w-full space-y-1">
      {label ? (
        <label htmlFor={selectId} className="block text-xs font-bold text-slate-700">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={errorId}
        className={`w-full rounded-xl border px-3.5 py-2.5 min-h-[42px] text-xs text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/60 focus:bg-white cursor-pointer ${
          error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? <p id={errorId} role="alert" className="text-xs text-rose-600 font-medium">{error}</p> : null}
    </div>
  );
};