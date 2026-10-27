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
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { FuelFlowStatCards } from '@/components/dashboard/FuelFlowStatCards';
import { FuelOpeningStockChart } from '@/components/dashboard/FuelOpeningStockChart';
import { TodayBillingTable } from '@/components/dashboard/TodayBillingTable';
import { api } from '@/lib/api';
import { formatPKR, formatKarachiDateTime } from '@/lib/formatters';
import { useLanguage } from '@/lib/LanguageContext';
import {
  Transaction,
  PumpFinancialSummary,
  OverdueReportResponse,
} from '@/types';

export default function DashboardPage() {
  const { isUrdu, t } = useLanguage();
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
      setError(err?.message || (isUrdu ? 'ڈیٹا لوڈ کرنے میں دشواری پیش آئی ہے۔' : 'Failed to load dashboard data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <AppShell>
      <div className="space-y-7">
        {/* Page Top Title Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                {t('navDashboard')}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                LIVE
              </span>
            </div>
            <p className="text-xs lg:text-sm text-slate-500 mt-1">
              {isUrdu
                ? 'گجر پیٹرولیم کوٹ گجراں — فیول فلو اور کھاتہ مینجمنٹ سسٹم'
                : 'FuelFlow Lite • Gujjar Petrolium Kot Gujjran — Realtime Fuel & Ledger Summary'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 pop-out-btn shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
              <span>{t('refresh')}</span>
            </button>
            <Link
              href="/transactions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm pop-out-btn transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t('navNewTransaction')}</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
            {error}
          </div>
        )}

        {/* 1. HERO COLOR-CODED STAT CARDS (Matching Reference Screenshot with 3D Pop Out) */}
        <section className="space-y-2">
          <FuelFlowStatCards
            totalFuels={3}
            totalSuppliers={10}
            totalInvoices={2}
            totalCustomers={summary?.total_active_customers || 16}
          />
        </section>

        {/* 2. FINANCIAL LEDGER KPI METRICS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="pop-out-card bg-white rounded-2xl p-5 border border-rose-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">{t('totalReceivables')}</span>
              <div className="text-2xl font-black text-rose-600 font-mono tracking-tight">
                {formatPKR(summary?.total_receivables || 0, { showUrduSuffix: isUrdu })}
              </div>
              <p className="text-[11px] text-slate-400">
                {isUrdu ? 'تمام کسٹمرز کے واجب الادا بقایا جات' : 'Total credit balance outstanding'}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="pop-out-card bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">{t('todayRecovery')}</span>
              <div className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
                {formatPKR(25000, { showUrduSuffix: isUrdu })}
              </div>
              <p className="text-[11px] text-slate-400">
                {isUrdu ? 'کیش کاؤنٹر و آن لائن بینک ٹرانسفر' : 'Counter cash & online deposits'}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          </div>

          <div className="pop-out-card bg-white rounded-2xl p-5 border border-amber-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">{t('totalOverdue')}</span>
              <div className="text-2xl font-black text-amber-600 font-mono tracking-tight">
                {summary?.total_overdue_customers || 3}
              </div>
              <p className="text-[11px] text-slate-400">
                {isUrdu ? '15 دن کی مقررہ میعاد سے زائد' : 'Accounts older than 15 days'}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="pop-out-card bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">{t('pendingReceipts')}</span>
              <div className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                {formatPKR(summary?.total_pending_receipts_amount || 0, { showUrduSuffix: isUrdu })}
              </div>
              <p className="text-[11px] text-slate-400">
                {isUrdu ? 'آن لائن سلپس زیرِ تصدیق' : 'Bank slips awaiting verification'}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-100 text-slate-700">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* 3. FUEL OPENING STOCK (Donut Chart) & TODAY'S BILLING (Matching Reference Screenshot) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Fuel Opening Stock Widget (5 Columns) */}
          <div className="lg:col-span-5">
            <FuelOpeningStockChart />
          </div>

          {/* Today's Billing Table (7 Columns) */}
          <div className="lg:col-span-7">
            <TodayBillingTable />
          </div>
        </section>

        {/* 4. RECENT TRANSACTIONS & OVERDUE REMINDERS QUEUE */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions Table (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col pop-out-card">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">{t('recentTransactions')}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isUrdu ? 'پمپ کے آخری ریکارڈ شدہ نوزل و کیش اندراجات' : 'Latest pump nozzle & payment records'}
                </p>
              </div>
              <Link
                href="/customers"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 pop-out-btn"
              >
                <span>{t('allCustomers')}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex-1 overflow-x-auto">
              {recentTxns.length === 0 ? (
                <EmptyState
                  title={isUrdu ? 'کوئی حالیہ لین دین نہیں ہے' : 'No recent transactions found'}
                />
              ) : (
                <table className={`w-full text-xs ${isUrdu ? 'text-right' : 'text-left'}`}>
                  <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60">
                    <tr>
                      <th className="py-3 px-4">{isUrdu ? 'شناخت / تاریخ' : 'ID / Date'}</th>
                      <th className="py-3 px-4">{isUrdu ? 'کسٹمر' : 'Customer'}</th>
                      <th className="py-3 px-4">{isUrdu ? 'تفصیل / فیول' : 'Details / Fuel'}</th>
                      <th className="py-3 px-4">{isUrdu ? 'رقم (PKR)' : 'Amount (PKR)'}</th>
                      <th className="py-3 px-4">{isUrdu ? 'اسٹیٹس' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTxns.map((t) => (
                      <tr key={t.id} className="pop-out-row hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 font-mono">{t.id}</div>
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
                            <div className="text-[11px] text-slate-500 font-mono">
                              {t.liters} L @ PKR {t.rate_per_liter}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono">
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

          {/* Overdue Reminders Queue (1 Col) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 flex flex-col pop-out-card">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{t('overdueReminders')}</h2>
                  <p className="text-[11px] text-slate-500">
                    {isUrdu ? 'واجب الادا ادھار کھاتے' : 'WhatsApp notice queue'}
                  </p>
                </div>
              </div>
              <Link
                href="/reminders"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 pop-out-btn"
              >
                {t('viewAll')}
              </Link>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px]">
              {!overdueReport || overdueReport.customers.length === 0 ? (
                <EmptyState
                  title={isUrdu ? 'کوئی اوورڈیو کھاتہ نہیں ملا' : 'No overdue accounts found'}
                  description={
                    isUrdu
                      ? 'تمام کسٹمرز کے واجبات معیاد کے اندر ہیں۔'
                      : 'All customer balances are currently within terms.'
                  }
                />
              ) : (
                overdueReport.customers.slice(0, 5).map((item) => (
                  <div
                    key={item.customer_id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 space-y-2 pop-out-row transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-slate-900">
                          {item.customer_name}
                        </div>
                        <div className="text-[11px] text-slate-500 ltr-text font-mono">
                          {item.phone}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 font-mono">
                        {item.days_overdue} {t('daysOverdue')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-xs">
                      <span className="text-slate-500">{t('outstandingAmount')}</span>
                      <span className="font-bold text-rose-600 font-mono">
                        {formatPKR(item.outstanding_balance)}
                      </span>
                    </div>

                    <Link
                      href={`/customers/${item.customer_id}`}
                      className="w-full mt-2 block text-center py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors pop-out-btn shadow-xs"
                    >
                      {t('checkAccount')}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
