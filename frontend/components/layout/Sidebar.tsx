'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Truck,
  Users,
  Fuel,
  FileText,
  BarChart3,
  ChevronRight,
  UserCheck,
  MessageSquare,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { BUSINESS_IDENTITY } from '@/lib/constants';

export function Sidebar() {
  const pathname = usePathname();
  const { isUrdu, t } = useLanguage();

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
    <aside className="w-64 bg-white text-slate-800 flex flex-col border-l border-slate-200/80 h-screen sticky top-0 z-30 select-none pb-12 shadow-xs">
      {/* Brand Header: Clean White Theme */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Fuel className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-black text-slate-900 truncate tracking-tight">
            {isUrdu ? BUSINESS_IDENTITY.nameUr : BUSINESS_IDENTITY.name}
          </h1>
          <p className="text-[11px] text-teal-600 font-semibold truncate mt-0.5">
            {isUrdu ? BUSINESS_IDENTITY.locationUr : 'Kot Gujjran, Punjab'}
          </p>
        </div>
      </div>

      {/* Manager Status Chip with 3D Pop Out */}
      <div className="px-3.5 py-2.5 mx-3 my-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs pop-out-nav shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 border border-teal-200/50">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <div className="text-[10px] text-slate-400 font-medium">{t('managerTitle')}</div>
            <div className="font-bold text-slate-800 truncate text-[11px]">
              {BUSINESS_IDENTITY.manager}
            </div>
          </div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title={t('online')} />
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
        <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {isUrdu ? 'مرکزی مینو' : 'MAIN MENU'}
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
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold pop-out-nav transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 border border-blue-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.hasSub && (
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      isActive ? 'text-white/80' : 'text-slate-400'
                    } ${isUrdu ? 'rotate-180' : ''}`}
                  />
                )}
              </div>
            </Link>
          );
        })}

        <div className="pt-3 px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {isUrdu ? 'ٹولز اور فیچرز' : 'TOOLS & UTILITIES'}
        </div>

        {utilityNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold pop-out-nav transition-all cursor-pointer ${
                isActive
                  ? 'bg-teal-50 text-teal-800 border border-teal-200 font-bold'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 font-mono font-bold border border-teal-200/60">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
