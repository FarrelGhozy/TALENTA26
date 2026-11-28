import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface WorkspaceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  to?: string;
  status?: string;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({ title, description, icon: Icon, to, status }) => {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        {status ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{status}</span> : null}
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-extrabold text-slate-950">{title}</h2>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </>
  );

  const classes = 'flex min-h-48 flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md';
  return to ? <Link to={to} className={classes}>{content}</Link> : <div className={classes}>{content}</div>;
};
