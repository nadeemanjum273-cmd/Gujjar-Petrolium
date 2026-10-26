'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  FileText,
  MessageSquare,
  Receipt,
  Settings,
  ShieldCheck,
  X,
  Fuel,
} from 'lucide-react';
import { BUSINESS_IDENTITY } from '@/lib/constants';

const MOBILE_NAV_ITEMS = [
  { label: 'ڈیش بورڈ', href: '/dashboard', icon: LayoutDashboard },
  { label: 'گاہک / کسٹمرز', href: '/customers', icon: Users },
  { label: 'نیا لین دین', href: '/transactions/new', icon: PlusCircle },
  { label: 'واجبات کی رپورٹ', href: '/reports/overdue', icon: FileText },
  { label: 'واٹس ایپ ریمائنڈرز', href: '/reminders', icon: MessageSquare },
  { label: 'ادائیگی کی رسیدیں', href: '/receipts', icon: Receipt },
  { label: 'سیٹنگز', href: '/settings', icon: Settings },
  { label: 'آڈٹ لاگ', href: '/audit', icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased text-slate-900 font-urdu">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-150"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-72 bg-navy-950 text-white z-50 md:hidden flex flex-col transition-transform duration-200 ease-in-out border-l border-navy-800 ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-navy-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm truncate font-urdu">{BUSINESS_IDENTITY.nameUr}</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-navy-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {MOBILE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-urdu font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'text-slate-300 hover:bg-navy-900 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-navy-850 text-xs text-slate-400 text-center font-urdu">
          مجاز منیجر: {BUSINESS_IDENTITY.manager}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
