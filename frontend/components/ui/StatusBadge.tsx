import React from 'react';
import { STATUS_LABELS_UR } from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_LABELS_UR[status] || {
    label: status,
    color: 'bg-slate-100 text-slate-800 border-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border font-urdu ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
}
