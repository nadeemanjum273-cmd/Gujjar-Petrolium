'use client';

import React from 'react';
import {
  Fuel,
  Zap,
  Droplets,
  Truck,
  Activity,
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface TickerItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  value: string;
  labelColor: string;
  pillBorder: string;
  iconBg: string;
  status?: string;
  statusColor?: string;
}

export function CrystalLiveTicker() {
  const { isUrdu } = useLanguage();

  const tickerItems: TickerItem[] = [
    {
      id: 'petrol',
      icon: <Fuel className="w-3.5 h-3.5 text-emerald-400 crystal-dancing-icon" />,
      title: isUrdu ? 'پیٹرول (Super)' : 'Super Petrol',
      value: 'PKR 280.00 / L',
      labelColor: 'text-emerald-400',
      pillBorder: 'border-emerald-500/30 hover:border-emerald-400/60',
      iconBg: 'bg-emerald-500/15',
      status: isUrdu ? 'مستحکم' : 'Stable',
      statusColor: 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30',
    },
    {
      id: 'diesel',
      icon: <Truck className="w-3.5 h-3.5 text-sky-400 crystal-dancing-icon" />,
      title: isUrdu ? 'ڈیزل (HSD)' : 'High Speed Diesel',
      value: 'PKR 285.00 / L',
      labelColor: 'text-sky-400',
      pillBorder: 'border-sky-500/30 hover:border-sky-400/60',
      iconBg: 'bg-sky-500/15',
      status: isUrdu ? 'مستحکم' : 'Stable',
      statusColor: 'text-sky-300 bg-sky-500/20 border border-sky-500/30',
    },
    {
      id: 'mobil',
      icon: <Droplets className="w-3.5 h-3.5 text-amber-400 crystal-dancing-icon" />,
      title: isUrdu ? 'موبل آئل' : 'Mobil Lubricant',
      value: 'PKR 950.00 / L',
      labelColor: 'text-amber-400',
      pillBorder: 'border-amber-500/30 hover:border-amber-400/60',
      iconBg: 'bg-amber-500/15',
      status: isUrdu ? 'دستیاب' : 'In Stock',
      statusColor: 'text-amber-300 bg-amber-500/20 border border-amber-500/30',
    },
    {
      id: 'stock',
      icon: <Activity className="w-3.5 h-3.5 text-indigo-400 crystal-dancing-icon" />,
      title: isUrdu ? 'ٹینک اوپننگ اسٹاک' : 'Opening Tank Stock',
      value: isUrdu ? 'پیٹرول 51.6% • ڈیزل 25.4% • موبل 23%' : 'Petrol 51.6% • Diesel 25.4% • Mobil 23%',
      labelColor: 'text-indigo-400',
      pillBorder: 'border-indigo-500/30 hover:border-indigo-400/60',
      iconBg: 'bg-indigo-500/15',
      status: isUrdu ? 'مناسب ذخیرہ' : 'Healthy Levels',
      statusColor: 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30',
    },
    {
      id: 'power',
      icon: <Zap className="w-3.5 h-3.5 text-yellow-400 crystal-dancing-icon" />,
      title: isUrdu ? 'پاور سسٹم' : 'Power System',
      value: isUrdu ? 'سولر ہائبرڈ و جنریٹر فعال' : 'Solar Hybrid & Generator Active',
      labelColor: 'text-yellow-400',
      pillBorder: 'border-yellow-500/30 hover:border-yellow-400/60',
      iconBg: 'bg-yellow-500/15',
      status: '230V OK',
      statusColor: 'text-yellow-300 bg-yellow-500/20 border border-yellow-500/30',
    },
  ];

  const renderTickerTrack = () => (
    <div className="flex items-center gap-6 px-4">
      {tickerItems.map((item, idx) => (
        <div
          key={`${item.id}-${idx}`}
          className={`crystal-pill inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap select-none shadow-sm border ${item.pillBorder}`}
        >
          {/* Dancing Icon */}
          <div className={`p-1.5 rounded-full ${item.iconBg} flex items-center justify-center`}>
            {item.icon}
          </div>

          {/* Colourful Combination Label */}
          <span className={`font-bold tracking-tight text-xs ${item.labelColor}`}>
            {item.title}:
          </span>

          {/* Remaining Data in Crisp Pure White */}
          <span className="font-extrabold text-white tracking-wide font-mono drop-shadow-sm text-xs">
            {item.value}
          </span>

          {/* Optional Status Pill */}
          {item.status && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${item.statusColor}`}>
              {item.status}
            </span>
          )}

          <span className="text-slate-600 px-1">◆</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 crystal-hd-bar overflow-hidden py-1.5 sm:py-2 select-none">
      {/* HD Glass Glow Highlights */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-transparent to-cyan-500/10 pointer-events-none" />

      {/* Marquee Container moving right to left */}
      <div className="relative flex overflow-hidden">
        <div className="animate-marquee-hd">
          {renderTickerTrack()}
          {renderTickerTrack()}
        </div>
      </div>
    </div>
  );
}
