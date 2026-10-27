import React from 'react';
import { formatPKR } from '@/lib/formatters';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  isCurrency?: boolean;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'teal' | 'amber' | 'rose';
  variant?: 'primary' | 'warning' | 'danger' | 'neutral';
}

export function StatCard({
  title,
  value,
  subtitle,
  isCurrency = false,
  icon,
  tone,
  variant,
}: StatCardProps) {
  // Map variant to tone
  const effectiveTone = tone || (
    variant === 'primary' ? 'teal' :
    variant === 'warning' ? 'amber' :
    variant === 'danger' ? 'rose' : 'default'
  );

  const toneClasses = {
    default: {
      card: 'bg-white border-slate-200/80',
      icon: 'bg-slate-100 text-slate-700',
      value: 'text-slate-900',
    },
    teal: {
      card: 'bg-white border-teal-200/80 shadow-sm',
      icon: 'bg-teal-50 text-teal-600',
      value: 'text-teal-700',
    },
    amber: {
      card: 'bg-white border-amber-200/80 shadow-sm',
      icon: 'bg-amber-50 text-amber-600',
      value: 'text-amber-700',
    },
    rose: {
      card: 'bg-white border-rose-200/80 shadow-sm',
      icon: 'bg-rose-50 text-rose-600',
      value: 'text-rose-700',
    },
  }[effectiveTone];

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="w-5 h-5" />;
    }
    return null;
  };

  const displayVal = isCurrency ? formatPKR(value, { showUrduSuffix: true }) : value;

  return (
    <div
      className={`rounded-2xl p-5 border pop-out-card cursor-pointer ${toneClasses.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-500">{title}</span>
          <div className={`text-2xl lg:text-3xl font-extrabold tracking-tight font-mono ${toneClasses.value}`}>
            {displayVal}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 pt-0.5">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-xl flex-shrink-0 ${toneClasses.icon}`}>
            {renderIcon()}
          </div>
        )}
      </div>
    </div>
  );
}
