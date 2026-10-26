import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl my-4">
      <div className="w-12 h-12 rounded-full bg-slate-200/70 text-slate-500 flex items-center justify-center mb-3">
        <Inbox className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-800 font-urdu">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mt-1 font-urdu">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-semibold hover:bg-navy-850 font-urdu transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
