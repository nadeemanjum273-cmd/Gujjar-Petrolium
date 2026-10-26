'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  BookOpen,
  MessageSquare,
  Receipt,
  FileText,
  Settings,
  ShieldCheck,
  Fuel,
  UserCheck,
} from 'lucide-react';
import { BUSINESS_IDENTITY } from '@/lib/constants';

const NAV_ITEMS = [
  { label: 'ڈیش بورڈ', href: '/dashboard', icon: LayoutDashboard },
  { label: 'گاہک / کسٹمرز', href: '/customers', icon: Users },
  { label: 'نیا لین دین', href: '/transactions/new', icon: PlusCircle },
  { label: 'واجبات کی رپورٹ', href: '/reports/overdue', icon: FileText },
  { label: 'واٹس ایپ ریمائنڈرز', href: '/reminders', icon: MessageSquare },
  { label: 'ادائیگی کی رسیدیں', href: '/receipts', icon: Receipt },
  { label: 'سیٹنگز', href: '/settings', icon: Settings },
  { label: 'آڈٹ لاگ', href: '/audit', icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-navy-950 text-slate-100 flex flex-col border-l border-navy-850 h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-navy-850 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
          <Fuel className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white font-urdu truncate leading-tight">
            {BUSINESS_IDENTITY.nameUr}
          </h1>
          <p className="text-[11px] text-teal-400 font-urdu truncate mt-0.5">
            {BUSINESS_IDENTITY.subtitleUr}
          </p>
        </div>
      </div>

      {/* Manager Status Chip */}
      <div className="px-4 py-3 mx-3 my-3 bg-navy-900/90 rounded-xl border border-navy-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <UserCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <div className="truncate">
            <div className="text-[10px] text-slate-400 font-urdu">مجاز منیجر</div>
            <div className="font-semibold text-slate-100 truncate">{BUSINESS_IDENTITY.manager}</div>
          </div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="آن لائن" />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-urdu font-medium transition-colors ${
                isActive
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                  : 'text-slate-300 hover:bg-navy-900 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-navy-850 text-[11px] text-slate-400 text-center font-urdu">
        کوٹ گجراں، پنجاب • PKR (روپے)
      </div>
    </aside>
  );
}
