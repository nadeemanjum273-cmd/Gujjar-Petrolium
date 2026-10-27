'use client';

import React from 'react';
import Link from 'next/link';
import { Fuel, Truck, FileText, Users, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface HeroStatProps {
  totalFuels?: number;
  totalSuppliers?: number;
  totalInvoices?: number;
  totalCustomers?: number;
}

export function FuelFlowStatCards({
  totalFuels = 3,
  totalSuppliers = 10,
  totalInvoices = 2,
  totalCustomers = 16,
}: HeroStatProps) {
  const { isUrdu, t } = useLanguage();

  const cards = [
    {
      id: 'fuels',
      title: t('totalFuels'),
      value: totalFuels,
      icon: Fuel,
      bgGradient: 'bg-gradient-to-br from-[#22c55e] to-[#15803d]',
      popOutClass: 'pop-out-green',
      glow: 'shadow-green-500/20',
      href: '/settings',
      badge: isUrdu ? '3 پروڈکٹس فعال' : '3 Grades Active',
    },
    {
      id: 'suppliers',
      title: t('totalSupplier'),
      value: totalSuppliers,
      icon: Truck,
      bgGradient: 'bg-gradient-to-br from-[#0284c7] to-[#0369a1]',
      popOutClass: 'pop-out-blue',
      glow: 'shadow-sky-500/20',
      href: '/reports',
      badge: isUrdu ? 'PSO, Shell, Attock' : 'PSO, Shell, Attock',
    },
    {
      id: 'invoices',
      title: t('totalInvoices'),
      value: totalInvoices,
      icon: FileText,
      bgGradient: 'bg-gradient-to-br from-[#f43f5e] to-[#be123c]',
      popOutClass: 'pop-out-rose',
      glow: 'shadow-rose-500/20',
      href: '/receipts',
      badge: isUrdu ? 'آج جاری شدہ' : 'Today Generated',
    },
    {
      id: 'customers',
      title: t('totalCustomers'),
      value: totalCustomers,
      icon: Users,
      bgGradient: 'bg-gradient-to-br from-[#6366f1] to-[#4338ca]',
      popOutClass: 'pop-out-purple',
      glow: 'shadow-indigo-500/20',
      href: '/customers',
      badge: isUrdu ? '16 رجسٹرڈ کھاتے' : '16 Active Ledgers',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Link
            key={c.id}
            href={c.href}
            className={`pop-out-card ${c.popOutClass} ${c.bgGradient} rounded-3xl p-6 text-white cursor-pointer relative overflow-hidden group select-none shadow-lg`}
          >
            {/* Ambient Background Sheen Effect */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl" />
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

            <div className="flex items-center justify-between relative z-10">
              {/* Left Large Icon Container */}
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-inner transition-transform duration-300 group-hover:scale-110">
                <Icon className="w-9 h-9 text-white drop-shadow-md" />
              </div>

              {/* Right Value & Title */}
              <div className={`text-${isUrdu ? 'left' : 'right'} flex flex-col`}>
                <span className="text-4xl lg:text-5xl font-black tracking-tight font-mono drop-shadow-sm leading-none">
                  {c.value}
                </span>
                <span className="text-sm font-bold text-white/95 mt-1.5 drop-shadow-sm">
                  {c.title}
                </span>
                <span className="text-[11px] text-white/75 font-medium mt-0.5">
                  {c.badge}
                </span>
              </div>
            </div>

            {/* Bottom Subtle Pill */}
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-white/80">
              <span className="font-medium">
                {isUrdu ? 'کھولیں اور تفصیل دیکھیں' : 'Click to inspect'}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
