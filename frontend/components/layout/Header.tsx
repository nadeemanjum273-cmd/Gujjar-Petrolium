'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Fuel,
  User,
  Clock,
  LogOut,
  LogIn,
  Globe,
  ChevronDown,
} from 'lucide-react';
import { BUSINESS_IDENTITY } from '@/lib/constants';
import { getStoredUser, clearStoredAuth, UserProfile } from '@/lib/api';
import { useLanguage, Language } from '@/lib/LanguageContext';

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const router = useRouter();
  const { lang, setLang, isUrdu, t } = useLanguage();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());

    const updateClock = () => {
      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Karachi',
      };
      const formatted = new Intl.DateTimeFormat(isUrdu ? 'ur-PK' : 'en-US', dateOptions).format(now);
      setCurrentTime(formatted);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [isUrdu]);

  const handleLogout = () => {
    clearStoredAuth();
    setUser(null);
    router.push('/login');
  };

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    setLangDropdownOpen(false);
  };

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between shadow-xs select-none w-full max-w-full">
      {/* Left / Start: Mobile Menu Toggle & Compact Brand */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          className="p-1.5 sm:p-2 text-slate-700 hover:text-slate-900 md:hidden rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer flex-shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Mobile Brand Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:hidden min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Fuel className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate max-w-[130px] xs:max-w-[170px]">
            {isUrdu ? 'گجر پیٹرولیم' : 'Gujjar Petrolium'}
          </span>
        </div>
      </div>

      {/* Center: Live Karachi Date & Time (Desktop only) */}
      <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 font-mono">
        <Clock className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
        <span className="ltr-text font-semibold">{currentTime || '...'}</span>
      </div>

      {/* Right / End: Compact Language Selector & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Language Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-xs cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-teal-600" />
            <span>{lang === 'ur' ? 'اردو' : 'English'}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {langDropdownOpen && (
            <div
              className={`absolute mt-1.5 w-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 ${
                isUrdu ? 'left-0' : 'right-0'
              } animate-in fade-in duration-150`}
            >
              <button
                onClick={() => changeLanguage('ur')}
                className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                  lang === 'ur' ? 'text-teal-700 font-bold bg-teal-50/50' : 'text-slate-700'
                }`}
              >
                <span className="font-urdu">اردو (پاکستانی)</span>
                {lang === 'ur' && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                  lang === 'en' ? 'text-teal-700 font-bold bg-teal-50/50' : 'text-slate-700'
                }`}
              >
                <span className="font-sans">English</span>
                {lang === 'en' && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
              </button>
            </div>
          )}
        </div>

        {/* User Profile */}
        {user ? (
          <div className="flex items-center gap-1.5 pr-1.5 sm:pr-2 border-r border-slate-200">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-inner flex-shrink-0">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="text-right hidden xl:block">
              <div className="text-xs font-bold text-slate-800">{user.name}</div>
              <div className="text-[10px] text-emerald-600 font-semibold">{t('managerTitle')}</div>
            </div>
            <button
              onClick={handleLogout}
              title={t('logout')}
              className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pr-1.5 sm:pr-2 border-r border-slate-200">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 shadow-inner flex-shrink-0">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="text-right hidden xl:block">
              <div className="text-xs font-bold text-slate-800">{BUSINESS_IDENTITY.manager}</div>
              <div className="text-[10px] text-slate-400 font-semibold">{t('managerTitle')}</div>
            </div>
            <Link
              href="/login"
              title={t('login')}
              className="p-1 sm:p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
