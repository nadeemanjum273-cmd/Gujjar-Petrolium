'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, PlusCircle, Fuel, User, Clock, LogOut, LogIn } from 'lucide-react';
import { BUSINESS_IDENTITY } from '@/lib/constants';
import { formatKarachiDateTime } from '@/lib/formatters';
import { getStoredUser, clearStoredAuth, UserProfile } from '@/lib/api';

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const router = useRouter();
  const [currentDate] = useState(() => new Date());
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const handleLogout = () => {
    clearStoredAuth();
    setUser(null);
    router.push('/login');
  };

  const getRoleLabelUr = (role?: string) => {
    switch (role) {
      case 'MANAGER':
        return 'مجاز منیجر';
      case 'STAFF':
        return 'پمپ آپریٹر';
      case 'READ_ONLY':
        return 'صرف معائنہ';
      default:
        return 'پٹرول پمپ منیجر';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between">
      {/* Mobile Toggle & Brand Icon */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="p-2 -mr-2 text-slate-600 hover:text-slate-900 md:hidden rounded-lg hover:bg-slate-100"
          aria-label="مینو کھولیں"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center">
            <Fuel className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 font-urdu truncate max-w-[170px]">
            {BUSINESS_IDENTITY.nameUr}
          </span>
        </div>
      </div>

      {/* Date & Time (Karachi) */}
      <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Clock className="w-3.5 h-3.5 text-teal-600" />
        <span className="ltr-text font-mono">{formatKarachiDateTime(currentDate, 'full')}</span>
      </div>

      {/* Quick Action & Manager Profile */}
      <div className="flex items-center gap-3">
        <Link
          href="/transactions/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl font-urdu shadow-sm transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>نیا لین دین</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
            <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800">{user.name}</div>
              <div className="text-[10px] text-emerald-600 font-urdu">{getRoleLabelUr(user.role)}</div>
            </div>
            <button
              onClick={handleLogout}
              title="لاگ آؤٹ کریں"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mr-1 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800">{BUSINESS_IDENTITY.manager}</div>
              <div className="text-[10px] text-slate-400 font-urdu">پٹرول پمپ منیجر</div>
            </div>
            <Link
              href="/login"
              title="لاگ ان کریں"
              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors mr-1"
            >
              <LogIn className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
