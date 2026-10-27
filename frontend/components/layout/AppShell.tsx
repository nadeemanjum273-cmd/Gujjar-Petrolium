'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CrystalLiveTicker } from './CrystalLiveTicker';
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
  Truck,
  Layers,
} from 'lucide-react';
import { BUSINESS_IDENTITY } from '@/lib/constants';
import { useLanguage } from '@/lib/LanguageContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isUrdu, t, dir } = useLanguage();

  const mobileNavItems = [
    { label: t('navDashboard'), href: '/dashboard', icon: LayoutDashboard },
    { label: t('navCustomer'), href: '/customers', icon: Users },
    { label: t('navSupplier'), href: '/reports', icon: Truck },
    { label: t('navFuels'), href: '/settings', icon: Fuel },
    { label: t('navInvoices'), href: '/receipts', icon: Receipt },
    { label: t('navNewTransaction'), href: '/transactions/new', icon: PlusCircle },
    { label: t('navReports'), href: '/reports/overdue', icon: FileText },
    { label: t('navReminders'), href: '/reminders', icon: MessageSquare },
    { label: t('navSettings'), href: '/settings', icon: Settings },
    { label: t('navAudit'), href: '/audit', icon: ShieldCheck },
  ];

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased text-slate-900 w-full overflow-x-clip ${isUrdu ? 'font-urdu' : 'font-sans'}`}>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Slide-over Drawer (ONLY mounted when mobileMenuOpen is true to avoid RTL overflow) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel: Clean White Theme */}
          <div
            className={`fixed inset-y-0 ${
              isUrdu ? 'right-0' : 'left-0'
            } w-72 max-w-[85vw] bg-white text-slate-800 flex flex-col border-slate-200 shadow-2xl animate-in ${
              isUrdu ? 'slide-in-from-right' : 'slide-in-from-left'
            } duration-200 z-50`}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
                  <Fuel className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-slate-900 truncate">
                  {isUrdu ? BUSINESS_IDENTITY.nameUr : BUSINESS_IDENTITY.name}
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/25'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-100 text-xs text-slate-500 text-center font-medium">
              {t('managerTitle')}: {BUSINESS_IDENTITY.manager}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-28 sm:pb-20 w-full overflow-x-clip">
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5 sm:space-y-6">
          {children}
        </main>
      </div>

      {/* Crystal HD Dancing Live Ticker (Pinned at Bottom) */}
      <CrystalLiveTicker />
    </div>
  );
}
