import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="py-12 px-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-gradient-to-b from-white to-slate-50/50 shadow-2xs">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 border border-blue-100/80 text-blue-700 flex items-center justify-center text-2xl shadow-inner">
        {icon || '🔍'}
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1.5">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">{description}</p>
      {action ? <div className="flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
};
