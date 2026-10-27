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
    <div className={`min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased text-slate-900 ${isUrdu ? 'font-urdu' : 'font-sans'}`}>
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
        className={`fixed inset-y-0 ${
          isUrdu ? 'right-0 border-l' : 'left-0 border-r'
        } w-72 bg-navy-950 text-white z-50 md:hidden flex flex-col transition-transform duration-200 ease-in-out border-navy-800 ${
          mobileMenuOpen
            ? 'translate-x-0'
            : isUrdu
            ? 'translate-x-full'
            : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-navy-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm truncate">
              {isUrdu ? BUSINESS_IDENTITY.nameUr : BUSINESS_IDENTITY.name}
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-navy-900"
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-navy-900 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-navy-850 text-xs text-slate-400 text-center">
          {t('managerTitle')}: {BUSINESS_IDENTITY.manager}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16">
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Crystal HD Dancing Live Ticker (Pinned at Bottom) */}
      <CrystalLiveTicker />
    </div>
  );
}
