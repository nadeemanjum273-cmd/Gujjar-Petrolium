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
      // Clean formatted date and time without GMT/timezone suffix
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
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between shadow-xs select-none">
      {/* Left: Mobile Menu Toggle only (Brand is already in Sidebar) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="p-2 -mr-2 text-slate-600 hover:text-slate-900 md:hidden rounded-lg hover:bg-slate-100 pop-out-btn"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile-only brand badge (hidden on desktop to avoid duplicate) */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center">
            <Fuel className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 truncate">
            {isUrdu ? BUSINESS_IDENTITY.nameUr : BUSINESS_IDENTITY.name}
          </span>
        </div>
      </div>

      {/* Center: Clean Live Date & Time (without GMT or Pakistan Standard Time suffix) */}
      <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 font-mono">
        <Clock className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
        <span className="ltr-text font-semibold">{currentTime || '...'}</span>
      </div>

      {/* Right Controls: Clean Language Selector & User Profile */}
      <div className="flex items-center gap-3">
        {/* Language Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all pop-out-btn shadow-xs cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-teal-600" />
            <span>{lang === 'ur' ? 'اردو (Urdu)' : 'English (US)'}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {langDropdownOpen && (
            <div
              className={`absolute mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 ${
                isUrdu ? 'left-0' : 'right-0'
              } animate-in fade-in slide-in-from-top-2 duration-150`}
            >
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                {t('selectLanguage')}
              </div>
              <button
                onClick={() => changeLanguage('ur')}
                className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                  lang === 'ur' ? 'text-teal-700 font-bold bg-teal-50/50' : 'text-slate-700'
                }`}
              >
                <span className="font-urdu">اردو (پاکستانی ورژن)</span>
                {lang === 'ur' && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                  lang === 'en' ? 'text-teal-700 font-bold bg-teal-50/50' : 'text-slate-700'
                }`}
              >
                <span className="font-sans">English (Standard)</span>
                {lang === 'en' && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
              </button>
            </div>
          )}
        </div>

        {/* User Profile */}
        {user ? (
          <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-inner">
              <User className="w-4 h-4" />
            </div>
            <div className="text-right hidden xl:block">
              <div className="text-xs font-bold text-slate-800">{user.name}</div>
              <div className="text-[10px] text-emerald-600 font-semibold">{t('managerTitle')}</div>
            </div>
            <button
              onClick={handleLogout}
              title={t('logout')}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors pop-out-btn cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 shadow-inner">
              <User className="w-4 h-4" />
            </div>
            <div className="text-right hidden xl:block">
              <div className="text-xs font-bold text-slate-800">{BUSINESS_IDENTITY.manager}</div>
              <div className="text-[10px] text-slate-400 font-semibold">{t('managerTitle')}</div>
            </div>
            <Link
              href="/login"
              title={t('login')}
              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors pop-out-btn"
            >
              <LogIn className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
