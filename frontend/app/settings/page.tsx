'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Fuel,
  UserCheck,
  MapPin,
  Clock,
  Shield,
  CreditCard,
  Building,
  CheckCircle2,
  RefreshCw,
  BellRing,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import { SystemSettings } from '@/types';
import { BUSINESS_IDENTITY } from '@/lib/constants';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSettings();
      setSettings(data);
    } catch (err: any) {
      setError(err?.message || 'سیٹنگز لوڈ کرنے میں ناکامی ہوئی۔');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 font-urdu">
              کاروباری ترتیبات اور سیٹنگز
            </h1>
            <p className="text-xs text-slate-500 font-urdu mt-0.5">
              گجر پیٹرولیم کوٹ گجراں — کاروباری شناخت، بینک اکاؤنٹس اور ریکوری قوانین
            </p>
          </div>
          <button
            onClick={loadSettings}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تازہ کریں</span>
          </button>
        </div>

        {loading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner text="سیٹنگز لوڈ ہو رہی ہیں..." />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Business Identity Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-urdu">
                    کاروباری شناخت (Business Identity)
                  </h2>
                  <p className="text-xs text-slate-400 font-urdu">سرکاری کاروباری معلومات</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-urdu">
                <div>
                  <span className="text-slate-500 block mb-1">اردو کاروباری نام:</span>
                  <div className="font-bold text-slate-900 text-sm font-urdu">
                    {settings?.business_name_ur || BUSINESS_IDENTITY.nameUr}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">انگریزی نام:</span>
                  <div className="font-bold text-slate-900 text-sm font-mono">
                    {settings?.business_name || BUSINESS_IDENTITY.name}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">سرکاری مجاز منیجر:</span>
                  <div className="font-bold text-teal-700 text-sm flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-teal-600" />
                    <span>{settings?.manager_name || BUSINESS_IDENTITY.manager}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">مقام و پتہ:</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{settings?.location_ur || BUSINESS_IDENTITY.location}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">کرنسی اور ٹائم زون:</span>
                  <div className="font-mono text-slate-800">
                    {settings?.currency || 'PKR'} (روپے) • {settings?.timezone || 'Asia/Karachi'} (PKT)
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">رابطہ فون:</span>
                  <div className="font-mono text-slate-800">
                    {settings?.contact_phone || '0300-1234567'}
                  </div>
                </div>
              </div>
            </div>

            {/* Recovery & Messaging Rules */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-urdu">
                    کھاتہ ریکوری و ریمائنڈر قوانین
                  </h2>
                  <p className="text-xs text-slate-400 font-urdu">اوورڈیو اور پیغامات کی پالیسی</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-urdu">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1">اوورڈیو کی حد (Threshold):</span>
                  <div className="text-xl font-black font-mono text-amber-700">
                    {settings?.overdue_threshold_days || 15} دن
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    اس مدت کے بعد اکاؤنٹ اوورڈیو شمار ہوگا
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1">کول ڈاؤن وقفہ (Cooldown):</span>
                  <div className="text-xl font-black font-mono text-slate-800">
                    {settings?.cooldown_days_between_reminders || 3} دن
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    دو ریمائنڈرز کے درمیان کم از کم وقفہ
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1">میسجنگ موڈ:</span>
                  <div className="text-xl font-black font-mono text-teal-700">
                    {settings?.messaging_mode || 'DRY_RUN'}
                  </div>
                  <span className="text-[11px] text-teal-600 mt-1 block font-urdu">
                    فیز 3 ٹیسٹ و پیش نظارہ موڈ
                  </span>
                </div>
              </div>
            </div>

            {/* Designated Bank Accounts */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-urdu">
                    مجاز بینک اکاؤنٹس برائے وصولی
                  </h2>
                  <p className="text-xs text-slate-400 font-urdu">گاہکوں کے لیے ادائیگی کے بینک کھاتے</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(settings?.bank_accounts || []).map((bank, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs font-urdu"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">
                        {bank.bank_name_ur || bank.bank_name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                        فعال اکاؤنٹ
                      </span>
                    </div>
                    <div className="text-slate-600">
                      عنوان کھاتہ (Title): <strong className="text-slate-800">{bank.account_title}</strong>
                    </div>
                    <div className="text-slate-600">
                      اکاؤنٹ نمبر / IBAN:
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5 tracking-wider">
                        {bank.account_number}
                      </div>
                    </div>
                    {bank.branch_name && (
                      <div className="text-slate-400 text-[11px]">
                        برانچ: {bank.branch_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
