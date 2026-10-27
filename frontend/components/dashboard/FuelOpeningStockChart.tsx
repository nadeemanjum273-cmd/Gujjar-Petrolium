'use client';

import React, { useState } from 'react';
import { Fuel, ArrowUpRight, Gauge, Info } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface FuelSegment {
  nameKey: string;
  defaultName: string;
  percentage: number;
  liters: number;
  capacity: number;
  color: string;
  hoverColor: string;
  glowColor: string;
  code: string;
}

export function FuelOpeningStockChart() {
  const { isUrdu, t } = useLanguage();
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  const segments: FuelSegment[] = [
    {
      nameKey: 'petrol',
      defaultName: 'Petrol (Super)',
      percentage: 51.6,
      liters: 12900,
      capacity: 25000,
      color: '#2563eb', // Rich Blue
      hoverColor: '#1d4ed8',
      glowColor: 'rgba(37, 99, 235, 0.4)',
      code: 'PETROL',
    },
    {
      nameKey: 'diesel',
      defaultName: 'Diesel (HSD)',
      percentage: 25.4,
      liters: 6350,
      capacity: 25000,
      color: '#ea580c', // Bright Flame Orange
      hoverColor: '#c2410c',
      glowColor: 'rgba(234, 88, 12, 0.4)',
      code: 'DIESEL',
    },
    {
      nameKey: 'mobilOil',
      defaultName: 'Mobil Oil / Lubricants',
      percentage: 23.0,
      liters: 5750,
      capacity: 10000,
      color: '#eab308', // Amber Gold
      hoverColor: '#ca8a04',
      glowColor: 'rgba(234, 179, 8, 0.4)',
      code: 'MOBIL',
    },
  ];

  // Calculate SVG pie slice coordinates
  let cumulativeAngle = 0;
  const radius = 80;
  const cx = 100;
  const cy = 100;

  const slices = segments.map((seg, idx) => {
    const angle = (seg.percentage / 100) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;
    const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    // Mid angle for text label positioning
    const midAngle = startAngle + angle / 2;
    const midRad = ((midAngle - 90) * Math.PI) / 180;
    const labelRadius = radius * 0.65;
    const lx = cx + labelRadius * Math.cos(midRad);
    const ly = cy + labelRadius * Math.sin(midRad);

    return {
      ...seg,
      pathData,
      lx,
      ly,
      index: idx,
    };
  });

  const totalVolume = segments.reduce((acc, curr) => acc + curr.liters, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm pop-out-card flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {t('fuelOpeningStock')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isUrdu ? 'آج صبح 06:00 بجے کا ریکارڈ شدہ ٹینک لیول' : 'Recorded at 06:00 AM Shift Opening'}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
          <Gauge className="w-5 h-5" />
        </div>
      </div>

      {/* Chart Section */}
      <div className="flex flex-col sm:flex-row items-center justify-around py-5 gap-6">
        {/* SVG Pie Chart */}
        <div className="relative w-52 h-52 flex-shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md select-none">
            {slices.map((slice) => {
              const isHovered = activeSegment === slice.index;
              return (
                <g key={slice.code}>
                  <path
                    d={slice.pathData}
                    fill={isHovered ? slice.hoverColor : slice.color}
                    className="cursor-pointer transition-all duration-300"
                    style={{
                      transformOrigin: '100px 100px',
                      transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                      filter: isHovered ? `drop-shadow(0 0 10px ${slice.glowColor})` : 'none',
                    }}
                    onMouseEnter={() => setActiveSegment(slice.index)}
                    onMouseLeave={() => setActiveSegment(null)}
                  />
                  {/* Percentage text label inside slice */}
                  <text
                    x={slice.lx}
                    y={slice.ly}
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none font-mono"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
                  >
                    {slice.percentage}%
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Center Info Badge on hover */}
          {activeSegment !== null && (
            <div className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-white/95 backdrop-blur-sm shadow-lg flex flex-col items-center justify-center pointer-events-none text-center border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                {segments[activeSegment].defaultName.split(' ')[0]}
              </span>
              <span className="text-xs font-extrabold text-slate-900 font-mono">
                {segments[activeSegment].liters.toLocaleString()} L
              </span>
            </div>
          )}
        </div>

        {/* Legend on the right */}
        <div className="flex-1 w-full space-y-3">
          {segments.map((seg, idx) => {
            const isHovered = activeSegment === idx;
            return (
              <div
                key={seg.code}
                onMouseEnter={() => setActiveSegment(idx)}
                onMouseLeave={() => setActiveSegment(null)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isHovered
                    ? 'border-slate-300 bg-slate-50/90 shadow-sm scale-[1.02]'
                    : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 transition-transform"
                      style={{
                        backgroundColor: seg.color,
                        boxShadow: isHovered ? `0 0 8px ${seg.color}` : 'none',
                        transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                    <span className="font-bold text-slate-800">{t(seg.nameKey)}</span>
                  </div>
                  <span className="font-extrabold text-slate-900 font-mono">
                    {seg.percentage}%
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{seg.liters.toLocaleString()} L</span>
                  <span className="text-slate-400">/ {seg.capacity.toLocaleString()} L</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-teal-600" />
          <span>{isUrdu ? 'کل ذخیرہ شدہ مقدار:' : 'Total Fuel Stored:'}</span>
        </span>
        <span className="font-bold text-slate-800 font-mono">
          {totalVolume.toLocaleString()} Liters
        </span>
      </div>
    </div>
  );
}
