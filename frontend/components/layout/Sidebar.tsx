'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Truck,
  Layers,
  Users,
  Fuel,
  FileText,
  BarChart3,
  UserCircle2,
  Palette,
  ChevronRight,
  UserCheck,
  PlusCircle,
  MessageSquare,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { BUSINESS_IDENTITY } from '@/lib/constants';

export function Sidebar() {
  const pathname = usePathname();
  const { isUrdu, t } = useLanguage();

  // Navigation structure with 3D pop-out styling and genuine Gujjar Petrolium options
  const primaryNavItems = [
    {
      label: t('navDashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
      hasSub: false,
    },
    {
      label: t('navCustomer'),
      href: '/customers',
      icon: Users,
      badge: null,
      hasSub: true,
    },
    {
      label: t('navFuels'),
      href: '/settings',
      icon: Fuel,
      badge: '3',
      hasSub: true,
    },
    {
      label: t('navInvoices'),
      href: '/receipts',
      icon: FileText,
      badge: null,
      hasSub: false,
    },
    {
      label: t('navSupplier'),
      href: '/reports',
      icon: Truck,
      badge: null,
      hasSub: true,
    },
    {
      label: t('navReports'),
      href: '/reports/overdue',
      icon: BarChart3,
      badge: null,
      hasSub: true,
    },
  ];

  const utilityNavItems = [
    {
      label: t('navReminders'),
      href: '/reminders',
      icon: MessageSquare,
      badge: 'WhatsApp',
    },
    {
      label: t('navAudit'),
      href: '/audit',
      icon: ShieldCheck,
      badge: null,
    },
    {
      label: t('navSettings'),
      href: '/settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-navy-950 text-slate-100 flex flex-col border-l border-navy-850 h-screen sticky top-0 z-30 select-none pb-12">
      {/* Brand Header: 100% Gujjar Petrolium */}
      <div className="p-4 border-b border-navy-850 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-navy-950 flex items-center justify-center flex-shrink-0 shadow-md">
          <Fuel className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-black text-white truncate tracking-tight">
            {isUrdu ? BUSINESS_IDENTITY.nameUr : BUSINESS_IDENTITY.name}
          </h1>
          <p className="text-[10px] text-teal-400/90 truncate mt-0.5">
            {isUrdu ? BUSINESS_IDENTITY.locationUr : 'Kot Gujjran, Punjab'}
          </p>
        </div>
      </div>

      {/* Manager Status Chip with 3D Pop Out */}
      <div className="px-3.5 py-2.5 mx-3 my-2.5 bg-navy-900/90 rounded-xl border border-navy-800 flex items-center justify-between text-xs pop-out-nav">
        <div className="flex items-center gap-2 min-w-0">
          <UserCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <div className="truncate">
            <div className="text-[10px] text-slate-400">{t('managerTitle')}</div>
            <div className="font-semibold text-slate-100 truncate text-[11px]">
              {BUSINESS_IDENTITY.manager}
            </div>
          </div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title={t('online')} />
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {isUrdu ? 'مرکزی مینو' : 'Main Menu'}
        </div>

        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium pop-out-nav transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30 border border-blue-500'
                  : 'text-slate-300 hover:bg-navy-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-navy-800 text-slate-300 font-mono">
                    {item.badge}
                  </span>
                )}
                {item.hasSub && (
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                      isUrdu ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </div>
            </Link>
          );
        })}

        <div className="pt-3 px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {isUrdu ? 'ٹولز اور فیچرز' : 'Tools & Utilities'}
        </div>

        {utilityNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium pop-out-nav transition-all cursor-pointer ${
                isActive
                  ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:bg-navy-900/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-navy-800 text-teal-400 font-mono">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-navy-850 text-[10px] text-slate-400 text-center font-mono">
        Kot Gujjran • Gujjar Petrolium • PKR
      </div>
    </aside>
  );
}
