'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Phone,
  Truck,
  CreditCard,
  Calendar,
  Printer,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { formatPKR, formatKarachiDate, formatKarachiDateTime } from '@/lib/formatters';
import { CustomerLedgerResponse, LedgerEntry } from '@/types';
import { BUSINESS_IDENTITY } from '@/lib/constants';

export default function CustomerLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [ledgerData, setLedgerData] = useState<CustomerLedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const loadLedger = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCustomerLedger(customerId);
      setLedgerData(data);
    } catch (err: any) {
      setError(err?.message || 'کھاتہ لوڈ کرنے میں ناکامی ہوئی۔');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  // Filtered transactions
  const filteredEntries = useMemo(() => {
    if (!ledgerData) return [];
    return ledgerData.ledger_entries.filter((entry) => {
      if (typeFilter !== 'ALL' && entry.type !== typeFilter) return false;
      if (startDate && entry.transaction_date < startDate) return false;
      if (endDate && entry.transaction_date > endDate) return false;
      return true;
    });
  }, [ledgerData, startDate, endDate, typeFilter]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <LoadingSpinner text="کسٹمر کھاتہ لوڈ ہو رہا ہے..." />
        </div>
      </AppShell>
    );
  }

  if (error || !ledgerData) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto py-12">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-lg font-bold text-rose-900 font-urdu">ریکارڈ نہیں ملا</h2>
            <p className="text-sm text-rose-700 font-urdu">{error || 'گاہک کا کھاتہ دستیاب نہیں ہے۔'}</p>
            <div className="pt-2">
              <Link
                href="/customers"
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-urdu font-medium"
              >
                <ArrowRight className="w-4 h-4" />
                <span>گاہکوں کی فہرست پر واپس جائیں</span>
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const { customer } = ledgerData;
  const balanceNum = Number(ledgerData.outstanding_balance || 0);
  const creditLimitNum = Number(ledgerData.credit_limit || 0);
  const availableCreditNum = Number(ledgerData.available_credit || 0);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4 print:hidden">
          <div className="flex items-center gap-3">
            <Link
              href="/customers"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
              title="واپس"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-black text-slate-900 font-urdu">
                  {customer.name_ur || customer.name}
                </h1>
                <StatusBadge status={customer.status} />
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                شناخت: {customer.id} {customer.phone && `• فون: ${customer.phone}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>کھاتہ پرنٹ کریں</span>
            </button>
            <Link
              href={`/transactions/new?customer_id=${customer.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-900 hover:bg-navy-850 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>نیا اندراج / لین دین</span>
            </Link>
          </div>
        </div>

        {/* Print Header (Visible only on print) */}
        <div className="hidden print:block border-b-2 border-navy-900 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-navy-950 font-urdu">
                {BUSINESS_IDENTITY.nameUr}
              </h1>
              <p className="text-xs text-slate-600 font-urdu">
                {BUSINESS_IDENTITY.subtitleUr} • کوٹ گجراں، پنجاب
              </p>
              <p className="text-xs text-slate-500 mt-1">
                منیجر: {BUSINESS_IDENTITY.manager} • رابطہ: 0300-1234567
              </p>
            </div>
            <div className="text-left font-mono text-xs text-slate-600">
              <p>تاریخ اجراء: {new Date().toLocaleDateString('en-GB')}</p>
              <p className="font-urdu">کسٹمر اکاؤنٹ کھاتہ نقل</p>
            </div>
          </div>
        </div>

        {/* Customer Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-urdu mb-1">موجودہ واجب الادا بقایا</div>
            <div className={`text-xl font-black font-mono ${balanceNum > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {formatPKR(balanceNum)}
            </div>
            <div className="text-[11px] text-slate-400 font-urdu mt-1 flex items-center gap-1">
              {balanceNum > 0 ? (
                <>
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>
                    {ledgerData.days_overdue > 0
                      ? `${ledgerData.days_overdue} دن سے زائد واجب الادا`
                      : 'باقاعدہ اکاؤنٹ'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>کوئی بقایا نہیں</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-urdu mb-1">کریڈٹ کی حد (Limit)</div>
            <div className="text-xl font-black font-mono text-slate-800">
              {formatPKR(creditLimitNum)}
            </div>
            <div className="text-[11px] text-slate-400 font-urdu mt-1">
              باقی کریڈٹ گنجائش: <span className="font-mono font-semibold text-slate-600">{formatPKR(availableCreditNum)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-urdu mb-1">کل منظور شدہ خریداری (Debits)</div>
            <div className="text-xl font-black font-mono text-rose-600">
              {formatPKR(ledgerData.total_approved_debits)}
            </div>
            <div className="text-[11px] text-slate-400 font-urdu mt-1">
              کل ادھار پیٹرول و ڈیزل
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-urdu mb-1">کل موصول شدہ رقم (Credits)</div>
            <div className="text-xl font-black font-mono text-emerald-600">
              {formatPKR(ledgerData.total_approved_credits)}
            </div>
            <div className="text-[11px] text-slate-400 font-urdu mt-1">
              کل کیش و بینک ادائیگیاں
            </div>
          </div>
        </div>

        {/* Customer Details Ribbon */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-urdu">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Phone className="w-3.5 h-3.5 text-teal-600" />
              <span>موبائل:</span>
              <span className="font-mono font-semibold text-slate-900">{customer.phone || 'درج نہیں'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Truck className="w-3.5 h-3.5 text-teal-600" />
              <span>رجسٹرڈ گاڑیاں:</span>
              <span className="font-semibold text-slate-900">
                {customer.vehicle_numbers && customer.vehicle_numbers.length > 0
                  ? customer.vehicle_numbers.join('، ')
                  : 'کوئی نہیں'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span>واٹس ایپ رضامندی:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                customer.whatsapp_consent ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {customer.whatsapp_consent ? 'رضامند (حاصل شدہ)' : 'غیر فعال'}
              </span>
            </div>
          </div>
          {customer.notes && (
            <div className="text-slate-500 italic">
              نوٹ: {customer.notes}
            </div>
          )}
        </div>

        {/* Filters Bar (Hidden on Print) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 font-urdu">
              <Filter className="w-3.5 h-3.5 text-teal-600" />
              <span>فلٹرز:</span>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 font-urdu">قسم:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-urdu focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="ALL">تمام اندراجات</option>
                <option value="CREDIT_SALE">ادھار سیل (Debit)</option>
                <option value="PAYMENT">وصولی / رقم (Credit)</option>
                <option value="ADJUSTMENT">ایڈجسٹمنٹ</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 font-urdu">شروع تاریخ:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 font-urdu">اختتامی تاریخ:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {(startDate || endDate || typeFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setTypeFilter('ALL');
                }}
                className="text-xs text-teal-700 hover:underline font-urdu px-2"
              >
                فلٹرز ختم کریں
              </button>
            )}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-urdu">
              تفصیلی کھاتہ و لین دین ({filteredEntries.length} اندراجات)
            </h2>
            <span className="text-xs text-slate-400 font-urdu">
              نظام الاوقات: کراچی (PKT)
            </span>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="کوئی لین دین نہیں ملا"
                description="منتخب کردہ فلٹرز کے مطابق کوئی اندراج ریکارڈ میں موجود نہیں ہے۔"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-urdu border-b border-slate-200/80">
                    <th className="py-3 px-4 font-semibold">تاریخ</th>
                    <th className="py-3 px-4 font-semibold">تفصیل / پرچی نمبر</th>
                    <th className="py-3 px-4 font-semibold">گاڑی نمبر</th>
                    <th className="py-3 px-4 font-semibold">لیٹر / ریٹ</th>
                    <th className="py-3 px-4 font-semibold">حالت</th>
                    <th className="py-3 px-4 font-semibold text-rose-700">نام (Debit)</th>
                    <th className="py-3 px-4 font-semibold text-emerald-700">جمع (Credit)</th>
                    <th className="py-3 px-4 font-semibold text-slate-900">میزان (Balance)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.map((entry) => {
                    const isDebit = Number(entry.debit_amount) > 0;
                    const isCredit = Number(entry.credit_amount) > 0;

                    return (
                      <tr key={entry.transaction_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {formatKarachiDate(entry.transaction_date)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 font-urdu">
                            {entry.description}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            ID: {entry.transaction_id} {entry.slip_number && `• پرچی: ${entry.slip_number}`}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                          {entry.vehicle_number || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {entry.liters ? (
                            <span>
                              {entry.liters}L @ {entry.rate_per_liter}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusBadge status={entry.status} />
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-rose-600 whitespace-nowrap">
                          {isDebit ? formatPKR(entry.debit_amount) : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 whitespace-nowrap">
                          {isCredit ? formatPKR(entry.credit_amount) : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-slate-900 whitespace-nowrap bg-slate-50/50">
                          {entry.is_approved ? formatPKR(entry.running_balance) : (
                            <span className="text-slate-400 italic text-[11px] font-urdu">زیرِ تصدیق</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-300">
                    <td colSpan={5} className="py-3 px-4 text-left font-urdu text-slate-800">
                      کل منظور شدہ میزان (Final Balance):
                    </td>
                    <td className="py-3 px-4 font-mono text-rose-700">
                      {formatPKR(ledgerData.total_approved_debits)}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-700">
                      {formatPKR(ledgerData.total_approved_credits)}
                    </td>
                    <td className="py-3 px-4 font-mono text-base text-slate-900">
                      {formatPKR(ledgerData.outstanding_balance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Print Disclaimer / Signatures */}
        <div className="hidden print:block pt-12 border-t border-slate-300 mt-8">
          <div className="grid grid-cols-2 gap-8 text-xs font-urdu">
            <div className="border-t border-slate-400 pt-2 text-center">
              دستخط کسٹمر / نمائندہ
            </div>
            <div className="border-t border-slate-400 pt-2 text-center">
              دستخط مجاز منیجر (محمد اسد)
            </div>
          </div>
          <p className="text-[10px] text-slate-400 text-center font-mono mt-6">
            کمپیوٹر سے تیار کردہ دستاویز — گجر پیٹرولیم کوٹ گجراں
          </p>
        </div>
      </div>
    </AppShell>
  );
}
