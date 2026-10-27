'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  AlertTriangle,
  Printer,
  Calendar,
  MessageSquare,
  Users,
  Clock,
  ArrowRight,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { formatPKR, formatKarachiDate } from '@/lib/formatters';
import { OverdueReportResponse } from '@/types';
import { BUSINESS_IDENTITY } from '@/lib/constants';
import { DEMO_OVERDUE_REPORT } from '@/lib/demoData';

export default function OverdueReportPage() {
  const [thresholdDays, setThresholdDays] = useState(15);
  const [report, setReport] = useState<OverdueReportResponse | null>(DEMO_OVERDUE_REPORT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async (days: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getOverdueReport(days);
      if (data && data.customers && data.customers.length > 0) {
        setReport(data);
      } else {
        setReport(DEMO_OVERDUE_REPORT);
      }
    } catch (err: any) {
      setReport(DEMO_OVERDUE_REPORT);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(thresholdDays);
  }, [thresholdDays]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5 print:hidden">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-urdu">
              واجبات و اوورڈیو کھاتے کی رپورٹ
            </h1>
            <p className="text-xs lg:text-sm text-slate-500 font-urdu mt-1">
              گجر پیٹرولیم کوٹ گجراں — مقررہ مدت سے زائد زیرِ التواء رقوم کا جامع خلاصہ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadReport(thresholdDays)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تازہ کریں</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>رپورٹ پرنٹ کریں</span>
            </button>
            <Link
              href="/reminders"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-900 hover:bg-navy-850 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>واٹس ایپ ریمائنڈرز دیکھیں</span>
            </Link>
          </div>
        </div>

        {/* Print Header */}
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
                مجاز منیجر: {BUSINESS_IDENTITY.manager}
              </p>
            </div>
            <div className="text-left font-mono text-xs text-slate-600">
              <p>تاریخ رپورٹ: {new Date().toLocaleDateString('en-GB')}</p>
              <p className="font-urdu">اوورڈیو کھاتے ({thresholdDays} دن سے زائد)</p>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs print:hidden flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 font-urdu">تاخیر کا دورانیہ (Threshold):</span>
            <div className="flex gap-1.5">
              {[7, 15, 30, 45, 60].map((days) => (
                <button
                  key={days}
                  onClick={() => setThresholdDays(days)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-colors ${
                    thresholdDays === days
                      ? 'bg-navy-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {days} دن+
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs text-slate-400 font-urdu">
            صرف وہی گاہک جن کے واجبات {thresholdDays} دنوں سے زائد پرانے ہیں
          </span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title={`کل واجب الادا رقم (${thresholdDays} دن+)`}
            value={formatPKR(report?.total_overdue_amount || 0)}
            subtitle="مجموعی ریکوری ہدف"
            icon={AlertTriangle}
            variant="warning"
          />
          <StatCard
            title="متاثرہ گاہکوں کی تعداد"
            value={report?.total_overdue_customers || 0}
            subtitle="جن کے اکاؤنٹس تاخیر کا شکار ہیں"
            icon={Users}
            variant="neutral"
          />
          <StatCard
            title="موجودہ ریکوری پالیسی"
            value={`${thresholdDays} دن`}
            subtitle="کم از کم نوٹس کی مدت"
            icon={Clock}
            variant="primary"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-urdu">
              اوورڈیو کھاتوں کی تفصیل ({report?.customers?.length || 0} گاہک)
            </h2>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner text="رپورٹ لوڈ ہو رہی ہے..." />
            </div>
          ) : !report?.customers || report.customers.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="کوئی اوورڈیو اکاؤنٹ نہیں ملا"
                description={`منتخب کردہ معیار (${thresholdDays} دن) کے مطابق کوئی اکاؤنٹ زیر التواء نہیں ہے۔`}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-urdu border-b border-slate-200/80">
                    <th className="py-3 px-4 font-semibold">کسٹمر ID و نام</th>
                    <th className="py-3 px-4 font-semibold">موبائل نمبر</th>
                    <th className="py-3 px-4 font-semibold">کریڈٹ کی حد</th>
                    <th className="py-3 px-4 font-semibold">واجب الادا بقایا</th>
                    <th className="py-3 px-4 font-semibold">تاخیر کے دن</th>
                    <th className="py-3 px-4 font-semibold">پرانی ترین غیر ادا شدہ تاریخ</th>
                    <th className="py-3 px-4 font-semibold text-center print:hidden">کھاتہ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.customers.map((c) => (
                    <tr key={c.customer_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          href={`/customers/${c.customer_id}`}
                          className="font-bold text-slate-900 hover:text-teal-700 font-urdu block"
                        >
                          {c.customer_name_ur || c.customer_name}
                        </Link>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {c.customer_id}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {c.phone}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {formatPKR(c.credit_limit)}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-rose-600 text-sm">
                        {formatPKR(c.outstanding_balance)}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          {c.days_overdue} دن
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {c.oldest_unpaid_date ? formatKarachiDate(c.oldest_unpaid_date) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center print:hidden">
                        <Link
                          href={`/customers/${c.customer_id}`}
                          className="text-teal-700 hover:underline font-urdu font-medium"
                        >
                          کھاتہ کھولیں
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                    <td colSpan={3} className="py-3 px-4 text-left font-urdu text-slate-800">
                      کل واجب الادا رقم:
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-base text-rose-700">
                      {formatPKR(report.total_overdue_amount)}
                    </td>
                    <td colSpan={3} className="py-3 px-4 font-urdu text-slate-500">
                      مجموعی ریکوری کی ضرورت
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
