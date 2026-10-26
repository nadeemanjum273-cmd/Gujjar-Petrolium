'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setStoredAuth } from '@/lib/api';
import { ShieldCheck, User, Lock, ArrowLeft, Fuel, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('asad');
  const [password, setPassword] = useState('Asad@Gujjar2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await api.login({ username, password });
      setSuccess(`خوش آمدید، ${res.user.name}! ڈیش بورڈ پر منتقل کیا جا رہا ہے...`);
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'صارف کا نام یا پاس ورڈ غلط ہے۔');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoUser = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 text-right font-sans" dir="rtl">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Pump Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4 shadow-lg shadow-emerald-500/10">
            <Fuel className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            گجر پیٹرولیم، کوٹ گجراں
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            کھاتہ اور وصولی مینجمنٹ سسٹم — ایڈمن لاگ ان
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center justify-between border-b border-slate-700 pb-3">
            <span>سسٹم میں داخل ہوں</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </h2>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-start gap-2.5">
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                صارف کا نام (Username)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-2.5 px-3.5 pr-10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="مثلاً: asad"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                پاس ورڈ (Password)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-2.5 px-3.5 pr-10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="••••••••••••"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <span>تصدیق ہو رہی ہے...</span>
              ) : (
                <>
                  <span>لاگ ان کریں</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Selection */}
          <div className="mt-6 pt-5 border-t border-slate-700/60">
            <p className="text-xs text-slate-400 text-center mb-3">
              ٹیسٹ اور جائزہ کیلئے پہلے سے مجاز اکاؤنٹس:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectDemoUser('asad', 'Asad@Gujjar2026')}
                className="bg-slate-700/50 hover:bg-slate-700 text-slate-200 text-xs py-2 px-2 rounded-lg border border-slate-600 text-center transition-colors"
              >
                <div className="font-semibold text-emerald-400">محمد اسد</div>
                <div className="text-[10px] text-slate-400">مجاز منیجر</div>
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemoUser('operator', 'Staff@Gujjar2026')}
                className="bg-slate-700/50 hover:bg-slate-700 text-slate-200 text-xs py-2 px-2 rounded-lg border border-slate-600 text-center transition-colors"
              >
                <div className="font-semibold text-blue-400">آپریٹر</div>
                <div className="text-[10px] text-slate-400">پمپ عملہ</div>
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemoUser('viewer', 'Viewer@Gujjar2026')}
                className="bg-slate-700/50 hover:bg-slate-700 text-slate-200 text-xs py-2 px-2 rounded-lg border border-slate-600 text-center transition-colors"
              >
                <div className="font-semibold text-purple-400">آڈیٹر</div>
                <div className="text-[10px] text-slate-400">صرف معائنہ</div>
              </button>
            </div>
          </div>
        </div>

        {/* Pump Security Notice */}
        <p className="mt-6 text-center text-xs text-slate-500">
          حفاظتی اطلاع: تمام لاگ ان اور انتظامی کارروائیوں کا آڈٹ ٹریل گوگل شیٹس میں محفوظ ہوتا ہے۔
        </p>
      </div>
    </div>
  );
}
