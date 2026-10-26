import React from 'react';

export function LoadingSpinner({
  message,
  text,
}: {
  message?: string;
  text?: string;
}) {
  const displayMsg = text || message || 'لوڈ ہو رہا ہے...';
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 space-y-3">
      <div className="w-9 h-9 border-3 border-teal-500/20 border-t-teal-600 rounded-full animate-spin" />
      <span className="text-sm font-medium text-slate-500 font-urdu">{displayMsg}</span>
    </div>
  );
}
