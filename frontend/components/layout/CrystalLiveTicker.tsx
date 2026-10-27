'use client';

import React, { useState, useEffect } from 'react';
import {
  Fuel,
  TrendingUp,
  Clock,
  ShieldCheck,
  Zap,
  Droplets,
  Truck,
  Sparkles,
  Wallet,
  Activity,
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { BUSINESS_IDENTITY } from '@/lib/constants';

export function CrystalLiveTicker() {
  const { isUrdu, t } = useLanguage();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString(isUrdu ? 'ur-PK' : 'en-US', {
          timeZone: 'Asia/Karachi',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isUrdu]);

  const tickerItems = [
    {
      id: 'live',
      badge: (
        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-rose-400 live-indicator-pulse" />
          <span>{isUrdu ? 'لائیو اسٹیشن نشریات' : 'LIVE CRYSTAL FEED'}</span>
        </span>
      ),
      content: isUrdu
        ? 'گجر پیٹرولیم کوٹ گجراں — تمام نوزلز و پیمانہ جات 100% فعال'
        : 'Gujjar Petrolium Kot Gujjran — All Dispensers 100% Operational',
    },
    {
      id: 'petrol',
      icon: <Fuel className="w-3.5 h-3.5 text-emerald-400 crystal-dancing-icon" />,
      title: isUrdu ? 'پیٹرول (Super)' : 'Super Petrol',
      value: 'PKR 280.00 / L',
      status: isUrdu ? 'مستحکم' : 'Stable',
      statusColor: 'text-emerald-400',
    },
    {
      id: 'diesel',
      icon: <Truck className="w-3.5 h-3.5 text-sky-400 crystal-dancing-icon" />,
      title: isUrdu ? 'ڈیزل (HSD)' : 'High Speed Diesel',
      value: 'PKR 285.00 / L',
      status: isUrdu ? 'مستحکم' : 'Stable',
      statusColor: 'text-sky-400',
    },
    {
      id: 'mobil',
      icon: <Droplets className="w-3.5 h-3.5 text-amber-400 crystal-dancing-icon" />,
      title: isUrdu ? 'موبل آئل' : 'Mobil Lubricant',
      value: 'PKR 950.00 / L',
      status: isUrdu ? 'دستیاب' : 'In Stock',
      statusColor: 'text-amber-400',
    },
    {
      id: 'recovery',
      icon: <Wallet className="w-3.5 h-3.5 text-teal-300 crystal-dancing-icon" />,
      title: isUrdu ? 'آج کی کل وصولی' : "Today's Recovery",
      value: 'PKR 25,000',
      status: isUrdu ? 'کیش و آن لائن' : 'Cash & Online',
      statusColor: 'text-teal-300',
    },
    {
      id: 'stock',
      icon: <Activity className="w-3.5 h-3.5 text-indigo-300 crystal-dancing-icon" />,
      title: isUrdu ? 'ٹینک اوپننگ اسٹاک' : 'Opening Tank Stock',
      value: isUrdu ? 'پیٹرول 51.6% • ڈیزل 25.4% • دیگر 23%' : 'Petrol 51.6% • Diesel 25.4% • Super 23%',
      status: isUrdu ? 'مناسب ذخیرہ' : 'Healthy Levels',
      statusColor: 'text-emerald-400',
    },
    {
      id: 'power',
      icon: <Zap className="w-3.5 h-3.5 text-yellow-300 crystal-dancing-icon" />,
      title: isUrdu ? 'پاور بیک اپ' : 'Power System',
      value: isUrdu ? 'سولر ہائبرڈ و جنریٹر فعال' : 'Solar Hybrid & Generator Standby Active',
      status: '230V OK',
      statusColor: 'text-yellow-300',
    },
    {
      id: 'manager',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-teal-400 crystal-dancing-icon" />,
      title: isUrdu ? 'مجاز ڈیوٹی منیجر' : 'Duty Manager',
      value: BUSINESS_IDENTITY.manager,
      status: isUrdu ? 'کوٹ گجراں، پنجاب' : 'Kot Gujjran Station',
      statusColor: 'text-teal-400',
    },
    {
      id: 'clock',
      icon: <Clock className="w-3.5 h-3.5 text-cyan-300 crystal-dancing-icon" />,
      title: isUrdu ? 'کراچی معیاری وقت' : 'Karachi Time (PST)',
      value: timeStr || '09:40 AM',
      status: 'PST',
      statusColor: 'text-cyan-300',
    },
  ];

  const renderTickerTrack = () => (
    <div className="flex items-center gap-6 px-4">
      {tickerItems.map((item, idx) => (
        <div
          key={`${item.id}-${idx}`}
          className="crystal-pill inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap text-slate-200 select-none shadow-sm"
        >
          {item.badge ? (
            item.badge
          ) : (
            <>
              <div className="p-1 rounded-full bg-white/10 flex items-center justify-center">
                {item.icon}
              </div>
              <span className="text-slate-400 font-medium">{item.title}:</span>
              <span className="font-bold text-white tracking-wide">{item.value}</span>
              {item.status && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 ${item.statusColor}`}>
                  {item.status}
                </span>
              )}
            </>
          )}
          <span className="text-slate-600 px-1">◆</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 crystal-hd-bar overflow-hidden py-2 select-none">
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
