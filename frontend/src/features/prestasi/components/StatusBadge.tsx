import React from 'react';
import { AchievementStatus, AchievementType } from '../../../types';
import { formatAchievementStatus, formatAchievementType } from '../../../lib/format';

const TYPE_STYLES: Record<AchievementType, string> = {
  juara_1: 'bg-amber-100 text-amber-900 border border-amber-300',
  juara_2: 'bg-slate-200 text-slate-800 border border-slate-300',
  juara_3: 'bg-orange-100 text-orange-900 border border-orange-300',
  best_delegate: 'bg-blue-100 text-blue-900 border border-blue-300',
  penghargaan: 'bg-sky-100 text-blue-900 border border-sky-300',
  nominasi: 'bg-blue-50 text-blue-800 border border-blue-200',
  partisipasi: 'bg-slate-100 text-slate-600 border border-slate-200',
};

export const AchievementStatusBadge: React.FC<{ status: AchievementStatus }> = ({ status }) => {
  const { label, color } = formatAchievementStatus(status);
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${color}`}>
      {label}
    </span>
  );
};

export const AchievementTypeBadge: React.FC<{ type: AchievementType }> = ({ type }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${TYPE_STYLES[type]}`}
    >
      {formatAchievementType(type)}
    </span>
  );
};
