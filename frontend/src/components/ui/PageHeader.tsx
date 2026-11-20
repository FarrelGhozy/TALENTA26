import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, description, actions }) => (
  <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="max-w-3xl space-y-1.5">
      {eyebrow ? (
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p>
      ) : null}
      <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
      <p className="text-base leading-7 text-slate-600">{description}</p>
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);
