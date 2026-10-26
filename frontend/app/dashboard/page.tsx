'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowDownLeft,
  AlertTriangle,
  Users,
  Receipt,
  PlusCircle,
  ExternalLink,
  MessageSquare,
  Fuel,
  RefreshCw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { formatPKR, formatKarachiDateTime } from '@/lib/formatters';
import {
  Transaction,
  PumpFinancialSummary,
  OverdueReportResponse,
  Customer,
} from '@/types';

export default function DashboardPage() {
  const [summary, setSummary] = useState<PumpFinancialSummary | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [overdueReport, setOverdueReport] = useState<OverdueReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, txnsData, overdueData] = await Promise.all([
        api.getPumpSummary().catch(() => null),
        api.getTransactions().catch(() => []),
        api.getOverdueReport(15).catch(() => null),
      ]);

      if (summaryData) setSummary(summaryData);
      setRecentTxns(txnsData.slice(-6).reverse());
      if (overdueData) setOverdueReport(overdueData);
    } catch (err: any) {
      setError(err?.message || 'ڈیٹا لوڈ کرنے میں دشواری پیش آئی ہے۔');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Top Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-urdu">
              ڈیش بورڈ
            </h1>
            <p className="text-xs lg:text-sm text-slate-500 font-urdu mt-1">
              گجر پیٹرولیم کوٹ گجراں — کھاتہ اور مالیاتی خلاصہ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تازہ کریں</span>
            </button>
            <Link
              href="/transactions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-900 hover:bg-navy-850 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>نیا لین دین</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-urdu">
            {error}
          </div>
        )}

        {loading && !summary ? (
          <LoadingSpinner message="ڈیش بورڈ کا ڈیٹا لوڈ کیا جا رہا ہے..." />
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                title="کل بقایا واجبات"
                value={summary?.total_receivables || 0}
                isCurrency
                tone="rose"
                icon={<Wallet className="w-6 h-6" />}
              />
              <StatCard
                title="کل اوورڈیو کھاتے"
                value={summary?.total_overdue_customers || 0}
                subtitle="15 دن سے زائد پرانے"
                tone="amber"
                icon={<AlertTriangle className="w-6 h-6" />}
              />
              <StatCard
                title="فعال کسٹمرز"
                value={summary?.total_active_customers || 0}
                subtitle="رجسٹرڈ کھاتہ دار"
                tone="teal"
                icon={<Users className="w-6 h-6" />}
              />
              <StatCard
                title="زیرِ تصدیق رسیدیں"
                value={summary?.total_pending_receipts_amount || 0}
                isCurrency
                subtitle="تصدیق طلب رقم"
                tone="default"
                icon={<Receipt className="w-6 h-6" />}
              />
              <StatCard
                title="آج کی وصولی"
                value="25,000"
                isCurrency
                subtitle="کیش اور آن لائن ٹرانسفر"
                tone="teal"
                icon={<ArrowDownLeft className="w-6 h-6" />}
              />
            </div>

            {/* Split Section: Recent Transactions & Overdue Reminders */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Recent Transactions Table (2 Cols Wide) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-urdu">حالیہ لین دین</h2>
                    <p className="text-xs text-slate-500 font-urdu mt-0.5">پمپ کے آخری ریکارڈ شدہ اندراجات</p>
                  </div>
                  <Link
                    href="/customers"
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 font-urdu"
                  >
                    <span>تمام کسٹمرز</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="flex-1 overflow-x-auto">
                  {recentTxns.length === 0 ? (
                    <EmptyState title="کوئی حالیہ لین دین نہیں ہے" />
                  ) : (
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50/80 text-slate-500 font-urdu border-b border-slate-200/60">
                        <tr>
                          <th className="py-3 px-4">شناخت / تاریخ</th>
                          <th className="py-3 px-4">کسٹمر</th>
                          <th className="py-3 px-4">تفصیل / فیول</th>
                          <th className="py-3 px-4">رقم (PKR)</th>
                          <th className="py-3 px-4">اسٹیٹس</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-urdu">
                        {recentTxns.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-800">{t.id}</div>
                              <div className="text-[11px] text-slate-400 ltr-text font-mono">
                                {formatKarachiDateTime(t.transaction_date, 'dateOnly')}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <Link
                                href={`/customers/${t.customer_id}`}
                                className="font-semibold text-teal-700 hover:underline"
                              >
                                {t.customer_id}
                              </Link>
                              {t.vehicle_number && (
                                <div className="text-[11px] text-slate-500 ltr-text font-mono">
                                  {t.vehicle_number}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-slate-800 font-medium truncate max-w-[200px]">
                                {t.description}
                              </div>
                              {t.liters && (
                                <div className="text-[11px] text-slate-500">
                                  {t.liters} لٹر @ PKR {t.rate_per_liter}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`font-bold ${
                                  t.type === 'CREDIT_SALE' ? 'text-rose-600' : 'text-emerald-600'
                                }`}
                              >
                                {t.type === 'CREDIT_SALE' ? '+' : '-'} {formatPKR(t.amount)}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <StatusBadge status={t.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Right Column: Overdue Reminders Queue (1 Col Wide) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 font-urdu">مجوزہ ریمائنڈرز</h2>
                      <p className="text-[11px] text-slate-500 font-urdu">واجب الادا ادھار کھاتے</p>
                    </div>
                  </div>
                  <Link
                    href="/reminders"
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 font-urdu"
                  >
                    سب دیکھیں
                  </Link>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px]">
                  {(!overdueReport || overdueReport.customers.length === 0) ? (
                    <EmptyState title="کوئی اوورڈیو کھاتہ نہیں ملا" description="تمام کسٹمرز کے واجبات معیاد کے اندر ہیں۔" />
                  ) : (
                    overdueReport.customers.slice(0, 5).map((item) => (
                      <div
                        key={item.customer_id}
                        className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 space-y-2 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-slate-900 font-urdu">
                              {item.customer_name}
                            </div>
                            <div className="text-[11px] text-slate-500 ltr-text font-mono">
                              {item.phone}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 font-urdu">
                            {item.days_overdue} دن تاخیر
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-xs">
                          <span className="text-slate-500 font-urdu">بقایا رقم:</span>
                          <span className="font-bold text-rose-600">
                            {formatPKR(item.outstanding_balance)}
                          </span>
                        </div>

                        <Link
                          href={`/customers/${item.customer_id}`}
                          className="w-full mt-2 block text-center py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold font-urdu transition-colors"
                        >
                          کھاتہ چیک کریں
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
